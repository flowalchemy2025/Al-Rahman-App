import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { backendUsers } from "../services/apiClient";
import { setupProfileModalStyles as styles } from "../styles";
import { COLORS } from "../styles/theme";

const SetupProfileModal = ({
  visible,
  user,
  onComplete,
  onClose,
  isForced,
}) => {
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [loading, setLoading] = useState(false);

  // Pre-fill the form if the user already has data (for editing)
  useEffect(() => {
    if (user && visible) {
      setFullName(user.full_name || "");
      setMobileNumber(user.mobile_number || "");
    }
  }, [user, visible]);

  const handleSave = async () => {
    if (!fullName.trim() || !mobileNumber.trim()) {
      return Alert.alert("Error", "Please fill out all fields.");
    }
    if (mobileNumber.trim().length !== 10) {
      return Alert.alert(
        "Error",
        "Please enter a valid 10-digit mobile number.",
      );
    }

    setLoading(true);
    const updates = {
      full_name: fullName.trim(),
      mobile_number: mobileNumber.trim(),
    };

    try {
      const updatedUser = await backendUsers.updateMyProfile(updates);
      setLoading(false);
      Alert.alert(
        "Success",
        isForced ? "Profile setup complete!" : "Profile updated successfully!",
      );
      onComplete(updatedUser);
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", error?.response?.data?.error || "Could not update profile");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.card}>
          {/* Close Button - Only show if it is NOT a forced setup */}
          {!isForced && (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Icon name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}

          <Text style={styles.title}>
            {isForced ? "Welcome! 🎉" : "Edit Profile"}
          </Text>
          <Text style={styles.subtitle}>
            {isForced
              ? "Before you can continue, please complete your profile setup."
              : "Update your personal details below."}
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. John Doe"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              style={styles.input}
              placeholder="10-digit number"
              value={mobileNumber}
              onChangeText={setMobileNumber}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>Save Profile</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default SetupProfileModal;

