import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from "../lib/supabase";
import { useFlashcardStore } from "../state/flashcardStore";
import { resetAnalytics, identifyUser } from "../services/analytics";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                if (mounted) {
                    setSession(session);
                    setUser(session?.user ?? null);
                }
                // Sync data from Supabase on app load
                try {
                  await useFlashcardStore.getState().syncWithSupabase();
                } catch (e) {
                  console.error("AuthContext: Sync on load failed", e);
                }
            } else {
                // Fallback: Try manual backup
                const backup = await AsyncStorage.getItem('supabase-session-backup');
                if (backup) {
                    const parsedSession = JSON.parse(backup);
                    // Re-hydrate Supabase client
                    const { data, error } = await supabase.auth.setSession({
                        access_token: parsedSession.access_token,
                        refresh_token: parsedSession.refresh_token,
                    });
                    
                    if (!error && data.session) {
                        if (mounted) {
                            setSession(data.session);
                            setUser(data.session.user);
                        }
                        // Sync data after restoring backup session
                        try {
                          await useFlashcardStore.getState().syncWithSupabase();
                        } catch (e) {
                          console.error("AuthContext: Sync after backup restore failed", e);
                        }
                    } else {
                        console.error("Failed to restore backup session", error);
                        await AsyncStorage.removeItem('supabase-session-backup');
                    }
                }
            }
        } catch (e) {
            console.error("Failed to get session", e);
        } finally {
            if (mounted) setIsLoading(false);
        }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setIsLoading(false);
      }
      
      // Manual Backup
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          AsyncStorage.setItem('supabase-session-backup', JSON.stringify(session)).catch(e => console.error("Backup save failed", e));
          
          // Sync data from Supabase when user signs in
          if (event === 'SIGNED_IN') {
            // Identify user for analytics
            identifyUser(session.user.id);
            
            try {
              await useFlashcardStore.getState().syncWithSupabase();
            } catch (e) {
              console.error("AuthContext: Sync failed", e);
            }
          }
      } else if (event === 'SIGNED_OUT') {
          AsyncStorage.removeItem('supabase-session-backup').catch(e => console.error("Backup remove failed", e));
      }
      
      if (event === 'SIGNED_OUT') {
        // Do not reset onboarding state automatically to prevent "logout" loop.
        // User must explicitly sign out via Settings to trigger navigate reset if needed.
      }
    });

    return () => {
        mounted = false;
        subscription.unsubscribe();
    };
  }, []);

  // Safety timeout
  useEffect(() => {
      const timer = setTimeout(() => {
          if (isLoading) {
              setIsLoading(false);
          }
      }, 5000);
      return () => clearTimeout(timer);
  }, [isLoading]);

  const signOut = async () => {
    try {
        await supabase.auth.signOut();
    } catch (e) {
        console.error("Sign out failed", e);
    }
    
    // Reset analytics to clear user identity
    resetAnalytics();
    
    // Explicitly reset onboarding only on manual sign out
    useFlashcardStore.setState({ hasCompletedOnboarding: false });
    
    // Force state update to ensure UI reflects sign out immediately
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
