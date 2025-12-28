import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, Alert, Switch, Linking, Share, TextInput, Modal, Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as FileSystem from 'expo-file-system';
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useFlashcardStore } from "../state/flashcardStore";
import { useTheme } from "../utils/useTheme";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Card } from "../components/ui";
import { isAdmin } from "../config/admin";

const DAILY_GOAL_OPTIONS = [10, 20, 30, 50, 100];

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();
  const stats = useFlashcardStore((s) => s.stats);
  const { colors, isDark, toggleTheme } = useTheme();

  const [dailyGoal, setDailyGoal] = useState(stats.dailyGoal || 20);
  const [reminderTime, setReminderTime] = useState<Date | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { 
    loadReminderTime(); 
    checkNotificationPermission();
  }, []);

  const loadReminderTime = async () => {
    const defaultTime = new Date();
    defaultTime.setHours(9, 0, 0, 0);
    setReminderTime(defaultTime);
  };

  const checkNotificationPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationsEnabled(status === 'granted');
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationsEnabled(status === 'granted');
      if (status === 'granted' && reminderTime) {
        await scheduleNotification(reminderTime);
      }
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
      setNotificationsEnabled(false);
    }
  };

  const handleDailyGoalChange = async (goal: number) => {
    setDailyGoal(goal);
    setShowGoalPicker(false);
    useFlashcardStore.setState((state) => ({ stats: { ...state.stats, dailyGoal: goal } }));
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) await supabase.from('profiles').update({ daily_goal: goal }).eq('id', currentUser.id);
  };

  const handleReminderTimeChange = async (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selectedDate) { 
      setReminderTime(selectedDate); 
      if (notificationsEnabled) {
        await scheduleNotification(selectedDate);
      }
    }
  };

  const scheduleNotification = async (time: Date) => {
    if (!Device.isDevice) {
      Alert.alert("Reminder Set", `Daily reminder at ${time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n\nNote: Notifications work on physical devices only.`);
      return;
    }
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: { title: "Time to Study!", body: "Your daily flashcard review is waiting.", sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: time.getHours(), minute: time.getMinutes() },
    });
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => { await signOut(); } }
    ]);
  };

  const handleExportData = async () => {
    const state = useFlashcardStore.getState();
    const data = { decks: state.decks, flashcards: state.flashcards, stats: state.stats, exportedAt: new Date().toISOString() };
    try {
      const json = JSON.stringify(data, null, 2);
      const path = `${FileSystem.documentDirectory}studyless-export-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
      await Share.share({ url: path, title: 'StudyLess Data Export' });
    } catch { Alert.alert("Export Failed", "Could not export data."); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") { 
      Alert.alert("Error", "Please type DELETE to confirm."); 
      return; 
    }
    setIsDeleting(true);
    try {
      // Get the current session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      // Call Edge Function to delete user and all data
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete account');
      }

      // Clear local state
      useFlashcardStore.setState({ 
        decks: [], 
        flashcards: [], 
        stats: { 
          currentStreak: 0, 
          longestStreak: 0, 
          totalCardsReviewed: 0, 
          dailyGoal: 20, 
          cardsReviewedToday: 0 
        }, 
        hasCompletedOnboarding: false 
      });
      
      // Sign out (will clear session)
      await signOut();
      
      setShowDeleteModal(false);
      setDeleteConfirmText("");
      Alert.alert("Account Deleted", "Your account and all data have been permanently deleted.");
    } catch (error: any) { 
      console.error("Delete account error:", error);
      Alert.alert("Error", error.message || "Failed to delete account. Please try again."); 
    } finally { 
      setIsDeleting(false); 
    }
  };

  const formatTime = (date: Date | null) => date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Not set";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Account Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ACCOUNT</Text>
              <Card variant="outlined" padding={0}>
                <View style={styles.settingRow}>
                  <Ionicons name="person-outline" size={20} color={colors.primary} style={styles.settingIcon} />
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>Email</Text>
                    <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{user?.email || "Not signed in"}</Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <Pressable onPress={() => navigation.navigate("AccountSettings")} style={styles.settingRow}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} style={styles.settingIcon} />
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>Security</Text>
                    <Text style={[styles.settingValue, { color: colors.textSecondary }]}>Change email or password</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </Pressable>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <Pressable onPress={handleSignOut} style={styles.settingRow}>
                  <Ionicons name="log-out-outline" size={20} color={colors.error} style={styles.settingIcon} />
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingTitle, { color: colors.error }]}>Sign Out</Text>
                  </View>
                </Pressable>
              </Card>
            </View>

            {/* Notifications Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>NOTIFICATIONS</Text>
              <Card variant="outlined" padding={0}>
                <View style={styles.settingRow}>
                  <Ionicons name="notifications-outline" size={20} color={colors.warning} style={styles.settingIcon} />
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>Daily Reminders</Text>
                    <Text style={[styles.settingValue, { color: colors.textSecondary }]}>Get reminded to study</Text>
                  </View>
                  <Switch 
                    value={notificationsEnabled} 
                    onValueChange={handleToggleNotifications}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#ffffff"
                  />
                </View>

                {notificationsEnabled && (
                  <>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <Pressable onPress={() => setShowTimePicker(true)} style={styles.settingRow}>
                      <Ionicons name="time-outline" size={20} color={colors.primary} style={styles.settingIcon} />
                      <View style={styles.settingInfo}>
                        <Text style={[styles.settingTitle, { color: colors.text }]}>Reminder Time</Text>
                        <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{formatTime(reminderTime)}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                    </Pressable>
                  </>
                )}
              </Card>
            </View>

            {/* Study Preferences */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>STUDY PREFERENCES</Text>
              <Card variant="outlined" padding={0}>
                <Pressable onPress={() => setShowGoalPicker(true)} style={styles.settingRow}>
                  <Ionicons name="trophy-outline" size={20} color={colors.success} style={styles.settingIcon} />
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>Daily Goal</Text>
                    <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{dailyGoal} cards per day</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </Pressable>
              </Card>
            </View>

            {/* Appearance */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>APPEARANCE</Text>
              <Card variant="outlined" padding={0}>
                <View style={styles.settingRow}>
                  <Ionicons name={isDark ? "moon-outline" : "sunny-outline"} size={20} color={colors.primary} style={styles.settingIcon} />
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>Dark Mode</Text>
                  </View>
                  <Switch 
                    value={isDark} 
                    onValueChange={toggleTheme}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#ffffff"
                  />
                </View>
              </Card>
            </View>

            {/* Data & Privacy */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DATA & PRIVACY</Text>
              <Card variant="outlined" padding={0}>
                <Pressable onPress={handleExportData} style={styles.settingRow}>
                  <Ionicons name="download-outline" size={20} color={colors.primary} style={styles.settingIcon} />
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>Export Data</Text>
                    <Text style={[styles.settingValue, { color: colors.textSecondary }]}>Download your flashcards</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </Pressable>
              </Card>
            </View>

            {/* About */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ABOUT</Text>
              <Card variant="outlined" padding={0}>
                <View style={styles.settingRow}>
                  <Ionicons name="information-circle-outline" size={20} color={colors.primary} style={styles.settingIcon} />
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>Version</Text>
                    <Text style={[styles.settingValue, { color: colors.textSecondary }]}>1.0.0</Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <Pressable onPress={() => Linking.openURL('mailto:support@studyless.app')} style={styles.settingRow}>
                  <Ionicons name="help-circle-outline" size={20} color={colors.primary} style={styles.settingIcon} />
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>Help & Support</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </Pressable>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <Pressable onPress={() => Linking.openURL('https://raw.githubusercontent.com/Jetty0922/studyless-legal/main/TERMS_OF_SERVICE.md')} style={styles.settingRow}>
                  <Ionicons name="document-text-outline" size={20} color={colors.primary} style={styles.settingIcon} />
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>Terms of Service</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </Pressable>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <Pressable onPress={() => Linking.openURL('https://raw.githubusercontent.com/Jetty0922/studyless-legal/main/PRIVACY_POLICY.md')} style={styles.settingRow}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.settingIcon} />
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>Privacy Policy</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </Pressable>
              </Card>
            </View>

            {/* Admin Debug */}
            {isAdmin(user?.email) && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.success }]}>ADMIN</Text>
                <Card variant="outlined" padding={0}>
                  <Pressable onPress={() => navigation.navigate("AdminDebug")} style={styles.settingRow}>
                    <Ionicons name="bug-outline" size={20} color={colors.success} style={styles.settingIcon} />
                    <View style={styles.settingInfo}>
                      <Text style={[styles.settingTitle, { color: colors.text }]}>Debug Tools</Text>
                      <Text style={[styles.settingValue, { color: colors.textSecondary }]}>Reset deck, force due, time travel</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </Pressable>
                </Card>
              </View>
            )}

            {/* Danger Zone */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.error }]}>DANGER ZONE</Text>
              <Card variant="outlined" padding={0}>
                <Pressable onPress={() => setShowDeleteModal(true)} style={styles.settingRow}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} style={styles.settingIcon} />
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingTitle, { color: colors.error }]}>Delete Account</Text>
                    <Text style={[styles.settingValue, { color: colors.textSecondary }]}>Permanently delete all data</Text>
                  </View>
                </Pressable>
              </Card>
            </View>

            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Goal Picker Modal */}
      <Modal visible={showGoalPicker} transparent animationType="fade" onRequestClose={() => setShowGoalPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowGoalPicker(false)}>
          <Card variant="elevated" style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Daily Goal</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>How many cards per day?</Text>
            <View style={styles.goalOptions}>
              {DAILY_GOAL_OPTIONS.map((goal) => (
                <Pressable 
                  key={goal} 
                  onPress={() => handleDailyGoalChange(goal)} 
                  style={[
                    styles.goalOption, 
                    { 
                      backgroundColor: dailyGoal === goal ? colors.primary : colors.surface,
                      borderColor: dailyGoal === goal ? colors.primary : colors.border,
                    }
                  ]}
                >
                  <Text style={{ 
                    color: dailyGoal === goal ? "#ffffff" : colors.text, 
                    fontWeight: "600" 
                  }}>
                    {goal} cards
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        </Pressable>
      </Modal>

      {/* Time Picker */}
      {showTimePicker && Platform.OS === 'ios' && (
        <Modal visible={showTimePicker} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowTimePicker(false)}>
          <SafeAreaView style={[styles.timePickerContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.timePickerHeader, { borderBottomColor: colors.border }]}>
              <Pressable onPress={() => setShowTimePicker(false)}>
                <Text style={[styles.timePickerButton, { color: colors.primary }]}>Cancel</Text>
              </Pressable>
              <Text style={[styles.timePickerTitle, { color: colors.text }]}>Reminder Time</Text>
              <Pressable onPress={() => setShowTimePicker(false)}>
                <Text style={[styles.timePickerButton, { color: colors.primary, fontWeight: "600" }]}>Done</Text>
              </Pressable>
            </View>
            <View style={styles.timePickerContent}>
              <DateTimePicker 
                value={reminderTime || new Date()} 
                mode="time" 
                display="spinner" 
                onChange={handleReminderTimeChange} 
                themeVariant={isDark ? "dark" : "light"}
              />
            </View>
          </SafeAreaView>
        </Modal>
      )}
      {showTimePicker && Platform.OS === 'android' && (
        <DateTimePicker 
          value={reminderTime || new Date()} 
          mode="time" 
          display="default" 
          onChange={handleReminderTimeChange}
        />
      )}

      {/* Delete Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowDeleteModal(false)}>
          <Pressable style={[styles.deleteModalCard, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.deleteIcon, { backgroundColor: colors.errorLight }]}>
              <Ionicons name="warning" size={32} color={colors.error} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete Account</Text>
            <Text style={[styles.deleteModalSubtitle, { color: colors.textSecondary }]}>
              This action cannot be undone. All your data will be permanently deleted.
            </Text>
            <Text style={[styles.deleteLabel, { color: colors.text }]}>
              Type <Text style={{ fontWeight: "700" }}>DELETE</Text> to confirm:
            </Text>
            <TextInput 
              value={deleteConfirmText} 
              onChangeText={setDeleteConfirmText} 
              placeholder="Type DELETE" 
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters" 
              style={[styles.deleteInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} 
            />
            <View style={styles.deleteButtons}>
              <Pressable 
                onPress={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }} 
                style={[styles.deleteButton, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
              >
                <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
              </Pressable>
              <Pressable 
                onPress={handleDeleteAccount} 
                disabled={isDeleting || deleteConfirmText !== "DELETE"} 
                style={[
                  styles.deleteButton, 
                  { 
                    backgroundColor: deleteConfirmText === "DELETE" ? colors.error : colors.border, 
                    opacity: isDeleting ? 0.7 : 1 
                  }
                ]}
              >
                <Text style={{ color: "#ffffff", fontWeight: "600" }}>{isDeleting ? "Deleting..." : "Delete Account"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: "600", letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  settingRow: { flexDirection: "row", alignItems: "center", padding: 14 },
  settingIcon: { marginRight: 14 },
  settingInfo: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: "500" },
  settingValue: { fontSize: 13, marginTop: 1 },
  divider: { height: 1, marginLeft: 48 },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { width: 300, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "600", marginBottom: 4, textAlign: "center" },
  modalSubtitle: { fontSize: 14, marginBottom: 20, textAlign: "center" },
  goalOptions: { gap: 8 },
  goalOption: { paddingVertical: 12, borderRadius: 8, alignItems: "center", borderWidth: 1 },
  deleteModalCard: { width: 320, borderRadius: 16, padding: 24 },
  deleteIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 16 },
  deleteModalSubtitle: { fontSize: 14, marginBottom: 20, textAlign: "center", lineHeight: 20 },
  deleteLabel: { fontSize: 14, marginBottom: 8 },
  deleteInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16, fontSize: 16 },
  deleteButtons: { flexDirection: "row", gap: 12 },
  deleteButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  timePickerContainer: { flex: 1 },
  timePickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  timePickerTitle: { fontSize: 17, fontWeight: "600" },
  timePickerButton: { fontSize: 16 },
  timePickerContent: { flex: 1, justifyContent: "center", alignItems: "center" },
});
