import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { supabase } from "../services/supabase";

const ItemManagementScreen = ({ navigation, route }) => {
  const { user } = route.params;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [newItemName, setNewItemName] = useState("");

  const branchName = user.branches?.[0] || "Unknown Branch";

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setFetching(true);
    const { data } = await supabase
      .from("branch_items")
      .select("*")
      .eq("branch_name", branchName)
      .order("created_at", { ascending: false });
    if (data) setItems(data);
    setFetching(false);
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) return Alert.alert("Error", "Enter an item name");
    setLoading(true);
    const { error } = await supabase
      .from("branch_items")
      .insert([
        {
          item_name: newItemName.trim(),
          branch_name: branchName,
          created_by: user.id,
        },
      ]);
    setLoading(false);
    if (!error) {
      setNewItemName("");
      fetchItems();
    }
  };

  const handleDeleteItem = async (id) => {
    Alert.alert("Delete Item", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          const { error } = await supabase
            .from("branch_items")
            .delete()
            .eq("id", id);
          setLoading(false);
          if (!error) fetchItems();
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemCard}>
      <View>
        <Text style={styles.itemName}>{item.item_name}</Text>
        <Text style={styles.itemDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => handleDeleteItem(item.id)}
        style={{ padding: 8 }}
      >
        <Icon name="delete" size={24} color="#f44336" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Branch Items</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.branchSubtitle}>Branch: {branchName}</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="New Item Name"
            value={newItemName}
            onChangeText={setNewItemName}
          />
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleAddItem}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Icon name="add" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshing={fetching}
        onRefresh={fetchItems}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No items added yet.</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    backgroundColor: "#1E293B",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  formContainer: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#CBD5E1",
  },
  branchSubtitle: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 10,
    fontWeight: "bold",
  },
  inputRow: { flexDirection: "row", gap: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#F8FAFC",
  },
  addBtn: {
    backgroundColor: "#2563EB",
    width: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  itemCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 1,
  },
  itemName: { fontSize: 16, fontWeight: "bold", color: "#1E293B" },
  itemDate: { fontSize: 12, color: "#64748B" },
  emptyText: { textAlign: "center", color: "#64748B", marginTop: 20 },
});

export default ItemManagementScreen;

