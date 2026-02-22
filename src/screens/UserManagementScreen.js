import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView,
} from "react-native";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { supabase } from "../services/supabase";
import {
  createUserAsAdmin,
  updateUserAsAdmin,
  deleteUserAsAdmin,
} from "../services/adminSupabase";
import { userManagementStyles as styles } from "../styles";
import { COLORS } from "../styles/theme";

const BRANCH_OPTIONS = ["Branch 1", "Branch 2", "Branch 3"];

const UserManagementScreen = ({ navigation, route }) => {
  const { user } = route.params;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Add User State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(
    user.role === "Super Admin" ? "Branch" : "Vendor",
  );
  const [selectedBranches, setSelectedBranches] = useState(
    user.role === "Branch" ? user.branches : [],
  );

  // Edit User State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    mobile_number: "",
    username: "",
    password: "",
    role: "",
    branches: [],
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setFetching(true);
    let query = supabase
      .from("users")
      .select("*")
      .neq("role", "Super Admin")
      .order("created_at", { ascending: false });
    if (user.role === "Branch")
      query = query
        .eq("role", "Vendor")
        .contains("branches", [user.branches[0]]);
    const { data, error } = await query;
    if (data) setUsers(data);
    else Alert.alert("Error", "Could not fetch users.");
    setFetching(false);
  };

  const toggleBranch = (branch, isEdit = false) => {
    const currentList = isEdit ? editForm.branches : selectedBranches;
    const isSingleSelect = isEdit
      ? editForm.role === "Branch"
      : role === "Branch";

    if (isSingleSelect) {
      isEdit
        ? setEditForm({ ...editForm, branches: [branch] })
        : setSelectedBranches([branch]);
    } else {
      const newList = currentList.includes(branch)
        ? currentList.filter((b) => b !== branch)
        : [...currentList, branch];
      isEdit
        ? setEditForm({ ...editForm, branches: newList })
        : setSelectedBranches(newList);
    }
  };

  const handleCreateUser = async () => {
    if (!username || !password || selectedBranches.length === 0)
      return Alert.alert(
        "Error",
        "Username, password, and at least 1 branch are required.",
      );
    setLoading(true);
    const result = await createUserAsAdmin(
      username.trim(),
      password,
      role,
      selectedBranches,
    );
    setLoading(false);
    if (result.success) {
      Alert.alert("Success", "User created!");
      setUsername("");
      setPassword("");
      if (user.role === "Super Admin") setSelectedBranches([]);
      fetchUsers();
    } else Alert.alert("Error", result.error);
  };

  const openEditModal = (targetUser) => {
    setEditingUser(targetUser);
    setEditForm({
      full_name: targetUser.full_name || "",
      mobile_number: targetUser.mobile_number || "",
      username: targetUser.username || "",
      password: "",
      role: targetUser.role,
      branches: targetUser.branches || [],
    });
    setEditModalVisible(true);
  };

  const handleUpdateUser = async () => {
    setLoading(true);
    const updates = { ...editForm };
    if (!updates.password) delete updates.password; // Don't update password if empty

    const result = await updateUserAsAdmin(
      editingUser.id,
      editingUser.user_id,
      editingUser.username,
      updates,
    );
    setLoading(false);

    if (result.success) {
      Alert.alert("Success", "User updated!");
      setEditModalVisible(false);
      fetchUsers();
    } else Alert.alert("Error", result.error);
  };

  const handleDeleteUser = async () => {
    Alert.alert(
      "Delete",
      `Are you sure you want to delete ${editingUser.username}?`,
      [
        { text: "Cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            const res = await deleteUserAsAdmin(
              editingUser.user_id,
              editingUser.id,
            );
            setLoading(false);
            if (res.success) {
              setEditModalVisible(false);
              fetchUsers();
            } else Alert.alert("Error", res.error);
          },
        },
      ],
    );
  };

  const renderUser = ({ item }) => (
    <View style={styles.userCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.userName}>
          {item.full_name || "Name Not Setup"}
        </Text>
        <Text style={styles.userDetails}>
          @{item.username} • {item.mobile_number || "No Phone"}
        </Text>
        <Text style={styles.userBranch}>
          Branches: {item.branches?.join(", ") || "None"}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 8 }}>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{item.role}</Text>
        </View>
        <TouchableOpacity
          style={styles.editBtnSmall}
          onPress={() => openEditModal(item)}
        >
          <Icon name="edit" size={16} color={COLORS.white} />
          <Text
            style={{
              color: COLORS.white,
              fontSize: 12,
              fontWeight: "bold",
              marginLeft: 4,
            }}
          >
            Edit
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Users</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={(item) => item.id.toString()}
        refreshing={fetching}
        onRefresh={fetchUsers}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              Add New{" "}
              {user.role === "Super Admin" ? "Branch / Vendor" : "Vendor"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {user.role === "Super Admin" && (
              <View style={styles.roleRow}>
                {["Branch", "Vendor"].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleChip,
                      role === r && styles.roleChipActive,
                    ]}
                    onPress={() => {
                      setRole(r);
                      setSelectedBranches([]);
                    }}
                  >
                    <Text
                      style={[
                        styles.roleTextDefault,
                        role === r && styles.roleTextActive,
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>
              Assign Branches {role === "Vendor" && "(Multi-Select)"}:
            </Text>
            <View style={styles.roleRow}>
              {BRANCH_OPTIONS.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[
                    styles.roleChip,
                    selectedBranches.includes(b) && styles.roleChipActive,
                  ]}
                  onPress={() => toggleBranch(b, false)}
                >
                  <Text
                    style={[
                      styles.roleTextDefault,
                      selectedBranches.includes(b) && styles.roleTextActive,
                    ]}
                  >
                    {b}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleCreateUser}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitBtnText}>Create User</Text>
              )}
            </TouchableOpacity>
          </View>
        }
      />

      {/* EDIT MODAL */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <Text style={styles.formTitle}>Edit User Details</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Icon name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={editForm.full_name}
              onChangeText={(t) => setEditForm({ ...editForm, full_name: t })}
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={editForm.mobile_number}
              onChangeText={(t) =>
                setEditForm({ ...editForm, mobile_number: t })
              }
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={editForm.username}
              onChangeText={(t) => setEditForm({ ...editForm, username: t })}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Reset Password (Optional)</Text>
            <TextInput
              style={styles.input}
              value={editForm.password}
              onChangeText={(t) => setEditForm({ ...editForm, password: t })}
              secureTextEntry
              placeholder="Leave blank to keep current"
            />

            <Text style={styles.label}>Assigned Branches:</Text>
            <View style={[styles.roleRow, { flexWrap: "wrap" }]}>
              {BRANCH_OPTIONS.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[
                    styles.roleChip,
                    editForm.branches.includes(b) && styles.roleChipActive,
                  ]}
                  onPress={() => toggleBranch(b, true)}
                >
                  <Text
                    style={[
                      styles.roleTextDefault,
                      editForm.branches.includes(b) && styles.roleTextActive,
                    ]}
                  >
                    {b}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.submitBtn, { flex: 1 }]}
                onPress={handleUpdateUser}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Save</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { flex: 1, backgroundColor: COLORS.danger },
                ]}
                onPress={handleDeleteUser}
                disabled={loading}
              >
                <Text style={styles.submitBtnText}>Delete User</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default UserManagementScreen;

