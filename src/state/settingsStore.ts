/**
 * Settings Store
 * 
 * Manages user settings using Zustand with persistence.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_FSRS_PARAMETERS } from '../utils/spacedRepetition';

export interface Settings {
  // ============================================
  // TEST DAY SETTINGS
  // ============================================
  
  /**
   * testDayLockoutEnabled
   * 
   * If true: No cards shown on test day
   * If false: Normal reviews on test day
   * 
   * Default: true
   */
  testDayLockoutEnabled: boolean;
  
  // ============================================
  // LEECH SETTINGS
  // ============================================
  
  /**
   * leechThreshold
   * 
   * Card is marked as leech when lapses >= this number
   * 
   * Default: 6
   */
  leechThreshold: number;
  
  /**
   * autoSuspendLeeches
   * 
   * If true: Automatically suspend cards when they become leeches
   * If false: Just flag them, let user decide
   * 
   * Default: false
   */
  autoSuspendLeeches: boolean;
  
  // ============================================
  // FSRS PARAMETERS
  // ============================================
  
  /**
   * fsrsParameters: 19 weights for FSRS-5 algorithm
   * Per-user parameters that can be optimized based on review history
   */
  fsrsParameters: number[];
  
  // ============================================
  // UI SETTINGS
  // ============================================
  
  /**
   * showIntervalHints
   * 
   * If true: Show intervals on rating buttons
   * If false: Just show button labels
   * 
   * Default: true
   */
  showIntervalHints: boolean;
  
  /**
   * hapticFeedback
   * 
   * If true: Vibrate on button press
   * If false: No vibration
   * 
   * Default: true
   */
  hapticFeedback: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  testDayLockoutEnabled: true,
  leechThreshold: 6,
  autoSuspendLeeches: false,
  fsrsParameters: DEFAULT_FSRS_PARAMETERS,
  showIntervalHints: true,
  hapticFeedback: true,
};

interface SettingsState {
  settings: Settings;
  
  // Actions
  updateSettings: (updates: Partial<Settings>) => void;
  resetSettings: () => void;
  updateFSRSParameters: (params: number[]) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
      
      resetSettings: () =>
        set({ settings: DEFAULT_SETTINGS }),
      
      updateFSRSParameters: (params) =>
        set((state) => ({
          settings: {
            ...state.settings,
            fsrsParameters: params,
          },
        })),
    }),
    {
      name: 'studyless-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
