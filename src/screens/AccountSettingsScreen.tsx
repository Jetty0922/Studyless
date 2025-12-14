import React, { useState, useEffect } from "react";
import { View, Text, Pressable, TextInput, Alert, ScrollView, Modal, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { useTheme } from "../utils/useTheme";
import { GlassCard } from "../components/ui";

export default function AccountSettingsScreen() {
  const { isDark } = useTheme();
  const navigation = useNavigation();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const getUser = async () => { const { data: { user } } = await supabase.auth.getUser(); setUser(user); };
    getUser();
  }, []);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: isDark ? "#0f172a" : "#f8fafc" },
      headerTintColor: isDark ? "#f1f5f9" : "#1e293b",
    });
  }, [navigation, isDark]);

  const resetEmailForm = () => { setNewEmail(""); setEmailPassword(""); setShowEmailModal(false); };
  const resetPasswordForm = () => { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setShowPasswordModal(false); };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) { Alert.alert("Error", "Please enter a new email address."); return; }
    if (!emailPassword) { Alert.alert("Error", "Please enter your current password to verify."); return; }
    if (!user?.email) { Alert.alert("Error", "User email not found."); return; }
    if (newEmail.trim() === user.email) { Alert.alert("Error", "New email is the same as your current email."); return; }
    setIsLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: emailPassword });
      if (verifyError) throw new Error("Current password is incorrect.");
      const { error: updateError } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (updateError) throw updateError;
      resetEmailForm();
      Alert.alert("Verification Email Sent", "Please check your new email address for a confirmation link.");
    } catch (error: any) { Alert.alert("Error", error.message || "Failed to update email."); } finally { setIsLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) { Alert.alert("Error", "Please enter your current password."); return; }
    if (!newPassword) { Alert.alert("Error", "Please enter a new password."); return; }
    if (newPassword.length < 6) { Alert.alert("Error", "New password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { Alert.alert("Error", "New passwords do not match."); return; }
    if (!user?.email) { Alert.alert("Error", "User email not found."); return; }
    setIsLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (verifyError) throw new Error("Current password is incorrect.");
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      resetPasswordForm();
      Alert.alert("Success", "Your password has been updated successfully.");
    } catch (error: any) { Alert.alert("Error", error.message || "Failed to update password."); } finally { setIsLoading(false); }
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { level: "", color: isDark ? "#334155" : "#e2e8f0", width: 0 };
    if (password.length < 6) return { level: "Too short", color: "#ef4444", width: 25 };
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    if (strength <= 1) return { level: "Weak", color: "#ef4444", width: 33 };
    if (strength === 2) return { level: "Fair", color: "#f97316", width: 50 };
    if (strength === 3) return { level: "Good", color: "#10b981", width: 75 };
    return { level: "Strong", color: "#10b981", width: 100 };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <View style={styles.container}>
      <LinearGradient colors={isDark ? ["#0f172a", "#1e1b4b"] : ["#f8fafc", "#eef2ff"]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View style={[styles.floatingShape, styles.shape1, { backgroundColor: isDark ? "#667eea" : "#a5b4fc" }]} />
      <View style={[styles.floatingShape, styles.shape2, { backgroundColor: isDark ? "#f093fb" : "#c4b5fd" }]} />

      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Current Email */}
            <GlassCard style={styles.section}>
              <Text style={[styles.sectionLabel, { color: isDark ? "#94a3b8" : "#64748b" }]}>CURRENT EMAIL</Text>
              <Text style={[styles.emailText, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>{user?.email || "Loading..."}</Text>
            </GlassCard>

            {/* Change Email */}
            <GlassCard style={styles.section}>
              <Text style={[styles.sectionLabel, { color: isDark ? "#94a3b8" : "#64748b" }]}>EMAIL</Text>
              <Pressable onPress={() => setShowEmailModal(true)} style={styles.settingRow}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.2)" : "#dbeafe" }]}>
                  <Ionicons name="mail" size={20} color="#3b82f6" />
                </View>
                <Text style={[styles.settingTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Change Email</Text>
                <Ionicons name="chevron-forward" size={20} color={isDark ? "#64748b" : "#94a3b8"} />
              </Pressable>
            </GlassCard>

            {/* Change Password */}
            <GlassCard style={styles.section}>
              <Text style={[styles.sectionLabel, { color: isDark ? "#94a3b8" : "#64748b" }]}>PASSWORD</Text>
              <Pressable onPress={() => setShowPasswordModal(true)} style={styles.settingRow}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(102, 126, 234, 0.2)" : "#eef2ff" }]}>
                  <Ionicons name="lock-closed" size={20} color="#667eea" />
                </View>
                <Text style={[styles.settingTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Change Password</Text>
                <Ionicons name="chevron-forward" size={20} color={isDark ? "#64748b" : "#94a3b8"} />
              </Pressable>
            </GlassCard>

            {/* Security Info */}
            <GlassCard style={styles.section}>
              <View style={styles.infoRow}>
                <Ionicons name="shield-checkmark" size={24} color="#10b981" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.infoTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Your account is secure</Text>
                  <Text style={[styles.infoSubtitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>Verify your password before making changes to your email or password.</Text>
                </View>
              </View>
            </GlassCard>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Change Email Modal */}
      <Modal visible={showEmailModal} transparent animationType="slide" onRequestClose={resetEmailForm}>
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={resetEmailForm} />
          <View style={[styles.modalContent, { backgroundColor: isDark ? "#1e293b" : "#ffffff" }]}>
            <View style={[styles.modalHandle, { backgroundColor: isDark ? "#334155" : "#e2e8f0" }]} />
            <Text style={[styles.modalTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Change Email</Text>
            <Text style={[styles.modalSubtitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>Enter your new email and password to verify.</Text>
            <Text style={[styles.inputLabel, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>New Email</Text>
            <TextInput value={newEmail} onChangeText={setNewEmail} placeholder="Enter new email" placeholderTextColor={isDark ? "#64748b" : "#94a3b8"} keyboardType="email-address" autoCapitalize="none" style={[styles.textInput, { backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderColor: isDark ? "#334155" : "#e2e8f0", color: isDark ? "#f1f5f9" : "#1e293b" }]} />
            <Text style={[styles.inputLabel, { color: isDark ? "#f1f5f9" : "#1e293b", marginTop: 16 }]}>Current Password</Text>
            <TextInput value={emailPassword} onChangeText={setEmailPassword} placeholder="Enter current password" placeholderTextColor={isDark ? "#64748b" : "#94a3b8"} secureTextEntry style={[styles.textInput, { backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderColor: isDark ? "#334155" : "#e2e8f0", color: isDark ? "#f1f5f9" : "#1e293b" }]} />
            <View style={styles.buttonRow}>
              <Pressable onPress={resetEmailForm} disabled={isLoading} style={[styles.cancelButton, { backgroundColor: isDark ? "#0f172a" : "#f8fafc" }]}><Text style={{ color: isDark ? "#f1f5f9" : "#1e293b", fontWeight: "600" }}>Cancel</Text></Pressable>
              <Pressable onPress={handleChangeEmail} disabled={isLoading} style={[styles.submitButton, { opacity: isLoading ? 0.7 : 1 }]}>
                <LinearGradient colors={["#667eea", "#764ba2"]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" />
                {isLoading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitButtonText}>Update Email</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide" onRequestClose={resetPasswordForm}>
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={resetPasswordForm} />
          <View style={[styles.modalContent, { backgroundColor: isDark ? "#1e293b" : "#ffffff" }]}>
            <View style={[styles.modalHandle, { backgroundColor: isDark ? "#334155" : "#e2e8f0" }]} />
            <Text style={[styles.modalTitle, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Change Password</Text>
            <Text style={[styles.modalSubtitle, { color: isDark ? "#64748b" : "#94a3b8" }]}>Enter your current password and choose a new one.</Text>
            <Text style={[styles.inputLabel, { color: isDark ? "#f1f5f9" : "#1e293b" }]}>Current Password</Text>
            <TextInput value={currentPassword} onChangeText={setCurrentPassword} placeholder="Enter current password" placeholderTextColor={isDark ? "#64748b" : "#94a3b8"} secureTextEntry style={[styles.textInput, { backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderColor: isDark ? "#334155" : "#e2e8f0", color: isDark ? "#f1f5f9" : "#1e293b" }]} />
            <Text style={[styles.inputLabel, { color: isDark ? "#f1f5f9" : "#1e293b", marginTop: 16 }]}>New Password</Text>
            <TextInput value={newPassword} onChangeText={setNewPassword} placeholder="Enter new password" placeholderTextColor={isDark ? "#64748b" : "#94a3b8"} secureTextEntry style={[styles.textInput, { backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderColor: isDark ? "#334155" : "#e2e8f0", color: isDark ? "#f1f5f9" : "#1e293b" }]} />
            {newPassword.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={[styles.strengthBar, { backgroundColor: isDark ? "#334155" : "#e2e8f0" }]}>
                  <View style={[styles.strengthFill, { backgroundColor: passwordStrength.color, width: `${passwordStrength.width}%` as any }]} />
                </View>
                <Text style={[styles.strengthText, { color: passwordStrength.color }]}>{passwordStrength.level}</Text>
              </View>
            )}
            <Text style={[styles.inputLabel, { color: isDark ? "#f1f5f9" : "#1e293b", marginTop: 16 }]}>Confirm Password</Text>
            <TextInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm new password" placeholderTextColor={isDark ? "#64748b" : "#94a3b8"} secureTextEntry style={[styles.textInput, { backgroundColor: isDark ? "#0f172a" : "#f8fafc", borderColor: isDark ? "#334155" : "#e2e8f0", color: isDark ? "#f1f5f9" : "#1e293b" }]} />
            <View style={styles.buttonRow}>
              <Pressable onPress={resetPasswordForm} disabled={isLoading} style={[styles.cancelButton, { backgroundColor: isDark ? "#0f172a" : "#f8fafc" }]}><Text style={{ color: isDark ? "#f1f5f9" : "#1e293b", fontWeight: "600" }}>Cancel</Text></Pressable>
              <Pressable onPress={handleChangePassword} disabled={isLoading} style={[styles.submitButton, { opacity: isLoading ? 0.7 : 1 }]}>
                <LinearGradient colors={["#667eea", "#764ba2"]} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" />
                {isLoading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitButtonText}>Update Password</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, marginBottom: 12 },
  emailText: { fontSize: 16, fontWeight: "500" },
  settingRow: { flexDirection: "row", alignItems: "center" },
  iconContainer: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 14 },
  settingTitle: { flex: 1, fontSize: 15, fontWeight: "600" },
  infoRow: { flexDirection: "row", alignItems: "flex-start" },
  infoTitle: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  infoSubtitle: { fontSize: 13, lineHeight: 18 },
  floatingShape: { position: "absolute", borderRadius: 100, opacity: 0.12 },
  shape1: { width: 180, height: 180, top: -60, right: -40 },
  shape2: { width: 120, height: 120, bottom: 200, left: -40 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 48, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  modalSubtitle: { fontSize: 14, marginBottom: 24 },
  inputLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  textInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  strengthContainer: { marginTop: 8 },
  strengthBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  strengthFill: { height: "100%", borderRadius: 2 },
  strengthText: { fontSize: 12, marginTop: 4 },
  buttonRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelButton: { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  submitButton: { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: "center", overflow: "hidden" },
  submitButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
});
