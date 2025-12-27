import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, Alert, Switch, Linking, Share, TextInput, Modal, Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
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
import { GlassCard } from "../components/ui";
import { isAdmin } from "../config/admin";

const DAILY_GOAL_OPTIONS = [10, 20, 30, 50, 100];

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();
  const stats = useFlashcardStore((s) => s.stats);
  const [dailyGoal, setDailyGoal] = useState(stats.dailyGoal || 20);
  const [reminderTime, setReminderTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { isDark, toggleTheme } = useTheme();

  useEffect(() => { loadReminderTime(); }, []);

  const loadReminderTime = async () => {
    const defaultTime = new Date();
    defaultTime.setHours(9, 0, 0, 0);
    setReminderTime(defaultTime);
  };

  const handleDailyGoalChange = async (goal: number) => {
    setDailyGoal(goal);
    setShowGoalPicker(false);
    useFlashcardStore.setState((state) => ({ stats: { ...state.stats, dailyGoal: goal } }));
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) await supabase.from('profiles').update({ daily_goal: goal }).eq('id', currentUser.id);
  };

  const handleReminderTimeChange = async (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedDate) { 
      setReminderTime(selectedDate); 
      await scheduleNotification(selectedDate); 
    }
  };

  const scheduleNotification = async (time: Date) => {
    // Skip notification scheduling on simulators but still save the time
    if (!Device.isDevice) {
      Alert.alert("Reminder Set", `Daily reminder at ${time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n\nNote: Notifications will work on physical devices.`);
      return;
    }
    
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') { Alert.alert("Permission Required", "Please enable notifications."); return; }
    }
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: { title: "Time to Study!", body: "Your daily flashcard review is waiting.", sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: time.getHours(), minute: time.getMinutes() },
    });
    Alert.alert("Reminder Set", `Daily reminder at ${time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure?", [
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
    if (deleteConfirmText !== "DELETE") { Alert.alert("Error", "Please type DELETE to confirm."); return; }
    setIsDeleting(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        await supabase.from('flashcards').delete().eq('user_id', currentUser.id);
        await supabase.from('decks').delete().eq('user_id', currentUser.id);
        await supabase.from('profiles').delete().eq('id', currentUser.id);
      }
      await signOut();
      useFlashcardStore.setState({ decks: [], flashcards: [], stats: { currentStreak: 0, longestStreak: 0, totalCardsReviewed: 0, dailyGoal: 20, cardsReviewedToday: 0 }, hasCompletedOnboarding: false });
      setShowDeleteModal(false);
      Alert.alert("Account Deleted", "Your account has been deleted.");
    } catch (error: any) { Alert.alert("Error", error.message || "Failed to delete account."); } finally { setIsDeleting(false); }
  };

  const formatTime = (date: Date | null) => date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Not set";

  return (
    <View style={styles.container}>
      <LinearGradient colors={isDark ? ["#0f172a", "#1e1b4b"] : ["#f8fafc", "#eef2ff"]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View style={[styles.floatingShape, styles.shape1, { backgroundColor: isDark ? "#667eea" : "#a5b4fc" }]} />
      <View style={[styles.floatingShape, styles.shape2, { backgroundColor: isDark ? "#f093fb" : "#c4b5fd" }]} />

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Settings</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Account Section */}
            <GlassCard style={styles.section}>
              <Text style={[styles.sectionTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Account</Text>
              
              <View style={styles.settingRow}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(96, 165, 250, 0.2)" : "#dbeafe" }]}>
                  <Ionicons name="person" size={20} color="#3b82f6" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>{user?.email || "Not signed in"}</Text>
                  <Text style={[styles.settingSubtitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>Your account email</Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]} />

              <Pressable onPress={() => navigation.navigate("AccountSettings")} style={styles.settingRow}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(102, 126, 234, 0.2)" : "#eef2ff" }]}>
                  <Ionicons name="shield-checkmark" size={20} color="#667eea" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Security</Text>
                  <Text style={[styles.settingSubtitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>Change email or password</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={isDark ? "#64748b" : "#94a3b8"} />
              </Pressable>

              <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]} />

              <Pressable onPress={handleSignOut} style={styles.settingRow}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "#fee2e2" }]}>
                  <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingTitle, { color: "#ef4444" }]}>Sign Out</Text>
                </View>
              </Pressable>
            </GlassCard>

            {/* Study Preferences */}
            <GlassCard style={styles.section}>
              <Text style={[styles.sectionTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Study Preferences</Text>

              <Pressable onPress={() => setShowGoalPicker(true)} style={styles.settingRow}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#d1fae5" }]}>
                  <Ionicons name="trophy" size={20} color="#10b981" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Daily Goal</Text>
                  <Text style={[styles.settingSubtitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>{dailyGoal} cards per day</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={isDark ? "#64748b" : "#94a3b8"} />
              </Pressable>

              <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]} />

              <Pressable onPress={() => setShowTimePicker(true)} style={styles.settingRow}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(249, 115, 22, 0.2)" : "#ffedd5" }]}>
                  <Ionicons name="notifications" size={20} color="#f97316" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Study Reminder</Text>
                  <Text style={[styles.settingSubtitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>Daily at {formatTime(reminderTime)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={isDark ? "#64748b" : "#94a3b8"} />
              </Pressable>
            </GlassCard>

            {/* Appearance */}
            <GlassCard style={styles.section}>
              <Text style={[styles.sectionTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Appearance</Text>

              <View style={styles.settingRow}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(102, 126, 234, 0.2)" : "#eef2ff" }]}>
                  <Ionicons name={isDark ? "moon" : "sunny"} size={20} color="#667eea" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Dark Mode</Text>
                  <Text style={[styles.settingSubtitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>{isDark ? "Enabled" : "Disabled"}</Text>
                </View>
                <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: isDark ? "#334155" : "#e2e8f0", true: "#667eea" }} thumbColor="#ffffff" />
              </View>
            </GlassCard>

            {/* Data & Privacy */}
            <GlassCard style={styles.section}>
              <Text style={[styles.sectionTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Data & Privacy</Text>

              <Pressable onPress={handleExportData} style={styles.settingRow}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(139, 92, 246, 0.2)" : "#ede9fe" }]}>
                  <Ionicons name="download" size={20} color="#8b5cf6" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Export Data</Text>
                  <Text style={[styles.settingSubtitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>Download your flashcards</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={isDark ? "#64748b" : "#94a3b8"} />
              </Pressable>

              <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]} />

              <View style={styles.settingRow}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#d1fae5" }]}>
                  <Ionicons name="cloud-done" size={20} color="#10b981" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Cloud Sync</Text>
                  <Text style={[styles.settingSubtitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>Data synced securely</Text>
                </View>
              </View>
            </GlassCard>

            {/* About */}
            <GlassCard style={styles.section}>
              <Text style={[styles.sectionTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>About</Text>

              <View style={styles.settingRow}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(96, 165, 250, 0.2)" : "#dbeafe" }]}>
                  <Ionicons name="information-circle" size={20} color="#3b82f6" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Studyless</Text>
                  <Text style={[styles.settingSubtitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>Version 1.0.0</Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]} />

              <Pressable onPress={() => Linking.openURL('mailto:support@studyless.app')} style={styles.settingRow}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#d1fae5" }]}>
                  <Ionicons name="help-circle" size={20} color="#10b981" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Help & Support</Text>
                  <Text style={[styles.settingSubtitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>Get help or send feedback</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={isDark ? "#64748b" : "#94a3b8"} />
              </Pressable>
            </GlassCard>

            {/* Admin Debug (only for admins) */}
            {isAdmin(user?.email) && (
              <GlassCard style={styles.section}>
                <Text style={[styles.sectionTitle, { color: "#22c55e" }]}>Admin Tools</Text>

                <Pressable onPress={() => navigation.navigate("AdminDebug")} style={styles.settingRow}>
                  <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(34, 197, 94, 0.2)" : "#dcfce7" }]}>
                    <Ionicons name="bug" size={20} color="#22c55e" />
                  </View>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Debug Tools</Text>
                    <Text style={[styles.settingSubtitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>Reset deck, force due, time travel</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={isDark ? "#64748b" : "#94a3b8"} />
                </Pressable>
              </GlassCard>
            )}

            {/* Danger Zone */}
            <GlassCard style={styles.section}>
              <Text style={[styles.sectionTitle, { color: "#ef4444" }]}>Danger Zone</Text>

              <Pressable onPress={() => setShowDeleteModal(true)} style={styles.settingRow}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "#fee2e2" }]}>
                  <Ionicons name="trash" size={20} color="#ef4444" />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingTitle, { color: "#ef4444" }]}>Delete Account</Text>
                  <Text style={[styles.settingSubtitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>Permanently delete your data</Text>
                </View>
              </Pressable>
            </GlassCard>

            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Goal Picker Modal */}
      <Modal visible={showGoalPicker} transparent animationType="fade" onRequestClose={() => setShowGoalPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowGoalPicker(false)}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? "#1e293b" : "#ffffff" }]}>
            <Text style={[styles.modalTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Daily Goal</Text>
            <Text style={[styles.modalSubtitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>How many cards per day?</Text>
            {DAILY_GOAL_OPTIONS.map((goal) => (
              <Pressable key={goal} onPress={() => handleDailyGoalChange(goal)} style={[styles.goalOption, { backgroundColor: dailyGoal === goal ? "#667eea" : (isDark ? "#0f172a" : "#f8fafc") }]}>
                <Text style={{ color: dailyGoal === goal ? "#ffffff" : (isDark ? "#f1f5f9" : "#1e293b"), fontWeight: "600" }}>{goal} cards</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setShowGoalPicker(false)} style={styles.modalCancel}>
              <Text style={{ color: isDark ? "#64748b" : "#94a3b8" }}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Time Picker */}
      {showTimePicker && Platform.OS === 'ios' && (
        <Modal visible={showTimePicker} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowTimePicker(false)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#1e293b" : "#ffffff" }}>
            <View style={[styles.timePickerHeader, { borderBottomColor: isDark ? "#334155" : "#e2e8f0" }]}>
              <Pressable onPress={() => setShowTimePicker(false)}>
                <Text style={styles.timePickerButton}>Cancel</Text>
              </Pressable>
              <Text style={[styles.timePickerTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Study Reminder</Text>
              <Pressable onPress={() => setShowTimePicker(false)}>
                <Text style={[styles.timePickerButton, { fontWeight: "600" }]}>Done</Text>
              </Pressable>
            </View>
            <View style={styles.timePickerContainer}>
              <DateTimePicker 
                value={reminderTime || new Date()} 
                mode="time" 
                display="spinner" 
                onChange={handleReminderTimeChange} 
                themeVariant={isDark ? "dark" : "light"}
                textColor={isDark ? "#f1f5f9" : "#1e293b"}
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
          <Pressable style={[styles.modalCard, { backgroundColor: isDark ? "#1e293b" : "#ffffff" }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.deleteIcon}>
              <Ionicons name="warning" size={32} color="#ef4444" />
            </View>
            <Text style={[styles.modalTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Delete Account</Text>
            <Text style={[styles.modalSubtitle, { color: isDark ? "#64748b" : "#94a3b8", textAlign: "center" }]}>This cannot be undone. All data will be deleted.</Text>
            <Text style={[styles.deleteLabel, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Type <Text style={{ fontWeight: "700" }}>DELETE</Text> to confirm:</Text>
            <TextInput value={deleteConfirmText} onChangeText={setDeleteConfirmText} placeholder="Type DELETE" placeholderTextColor={isDark ? "#64748b" : "#94a3b8"} autoCapitalize="characters" style={[styles.deleteInput, { backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderColor: isDark ? "#334155" : "#e2e8f0", color: isDark ? "#f1f5f9" : "#1e293b" }]} />
            <View style={styles.deleteButtons}>
              <Pressable onPress={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }} style={[styles.deleteButton, { backgroundColor: isDark ? "#0f172a" : "#f8fafc" }]}>
                <Text style={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleDeleteAccount} disabled={isDeleting || deleteConfirmText !== "DELETE"} style={[styles.deleteButton, { backgroundColor: deleteConfirmText === "DELETE" ? "#ef4444" : (isDark ? "#334155" : "#e2e8f0"), opacity: isDeleting ? 0.7 : 1 }]}>
                <Text style={{ color: "#ffffff", fontWeight: "700" }}>{isDeleting ? "Deleting..." : "Delete"}</Text>
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
  headerTitle: { fontSize: 34, fontWeight: "800", letterSpacing: -0.5 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  settingRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  iconContainer: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 14 },
  settingInfo: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  settingSubtitle: { fontSize: 13 },
  divider: { height: 1, marginVertical: 12 },
  floatingShape: { position: "absolute", borderRadius: 100, opacity: 0.12 },
  shape1: { width: 180, height: 180, top: -60, right: -40 },
  shape2: { width: 120, height: 120, bottom: 200, left: -40 },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { width: 320, borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  modalSubtitle: { fontSize: 14, marginBottom: 20 },
  goalOption: { paddingVertical: 14, borderRadius: 14, alignItems: "center", marginBottom: 8 },
  modalCancel: { paddingVertical: 12, alignItems: "center", marginTop: 8 },
  deleteIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(239,68,68,0.1)", alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 16 },
  deleteLabel: { fontSize: 14, marginBottom: 8 },
  deleteInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 },
  deleteButtons: { flexDirection: "row", gap: 12 },
  deleteButton: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  timePickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  timePickerTitle: { fontSize: 17, fontWeight: "600" },
  timePickerButton: { color: "#667eea", fontSize: 17 },
  timePickerContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 20 },
});
