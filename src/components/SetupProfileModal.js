import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { updateUserProfile } from "../services/supabase";

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

    const result = await updateUserProfile(user.id, updates);
    setLoading(false);

    if (result.success) {
      Alert.alert(
        "Success",
        isForced ? "Profile setup complete!" : "Profile updated successfully!",
      );
      onComplete(result.data);
    } else {
      Alert.alert("Error", result.error);
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
              <Icon name="close" size={24} color="#666" />
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
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save Profile</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    position: "relative", // Added to position the close button
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  button: {
    backgroundColor: "#76B7EF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default SetupProfileModal;
