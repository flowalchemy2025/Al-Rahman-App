import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { backendAuth } from "../services/apiClient";
import { loginStyles as styles } from "../styles";
import { COLORS } from "../styles/theme";

const LoginScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (loading) return;

    if (!username.trim() || !password) {
      return Alert.alert("Error", "Please enter username/mobile and password");
    }

    try {
      setLoading(true);
      const payload = await backendAuth.login(username.trim(), password);
      const user = payload?.user;

      if (!user) throw new Error("Login response is missing user profile");

      navigation.replace("Dashboard", { user });
    } catch (error) {
      Alert.alert(
        "Login Failed",
        error?.response?.data?.error || error?.message || "Unable to login",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Al Rahman Inventory Hub</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>
      </View>

      <View style={styles.formCard}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Username or Mobile</Text>
          <View style={styles.inputWrapper}>
            <Icon name="person-outline" size={20} color={COLORS.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Enter username or mobile"
              placeholderTextColor={COLORS.textSubtle}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrapper}>
            <Icon name="lock-outline" size={20} color={COLORS.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              placeholderTextColor={COLORS.textSubtle}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((prev) => !prev)}
              style={styles.passwordToggle}
              activeOpacity={0.7}
            >
              <Icon
                name={showPassword ? "visibility-off" : "visibility"}
                size={20}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>
      <View style={{ marginTop: 10, marginBottom: 20, alignItems: "center" }}>
        <Text style={{ color: COLORS.textMuted || "#888", fontSize: 12 }}>
          Version 1.0.0
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
