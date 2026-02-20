import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { signIn } from "../services/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LoginScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Branch");

  const roles = ["Super Admin", "Branch", "Vendor"];

  const handleLogin = async () => {
    if (!username || !password)
      return Alert.alert("Error", "Please enter credentials");

    setLoading(true);
    const result = await signIn(username, password, role);
    setLoading(false);

    if (result.success) {
      await AsyncStorage.setItem("user", JSON.stringify(result.data));
      navigation.replace("Dashboard", { user: result.data });
    } else {
      Alert.alert("Login Failed", result.error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Restaurant Purchase Manager</Text>
        <Text style={styles.subtitle}>Secure Access Only</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Username or Mobile</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <View style={styles.roleContainer}>
          <Text style={styles.label}>Select Role:</Text>
          <View style={styles.roleButtons}>
            {roles.map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.roleButton,
                  role === r && styles.roleButtonActive,
                ]}
                onPress={() => setRole(r)}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    role === r && styles.roleButtonTextActive,
                  ]}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    padding: 20,
  },
  header: { alignItems: "center", marginBottom: 30 },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  subtitle: { fontSize: 16, color: "#666", marginTop: 8 },
  form: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    elevation: 3,
  },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  roleContainer: { marginBottom: 20 },
  roleButtons: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roleButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#76B7EF",
  },
  roleButtonActive: { backgroundColor: "#76B7EF" },
  roleButtonText: { color: "#76B7EF", fontWeight: "600" },
  roleButtonTextActive: { color: "#fff" },
  button: {
    backgroundColor: "#76B7EF",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});

export default LoginScreen;
