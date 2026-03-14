import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { backendItems } from "../services/apiClient";
import { itemManagementStyles as styles } from "../styles";
import { COLORS } from "../styles/theme";

const ItemManagementScreen = ({ navigation, route }) => {
  const { user } = route.params;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [editingPrice, setEditingPrice] = useState("");

  const branchName = user.branches?.[0] || "Unknown Branch";

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setFetching(true);
      const data = await backendItems.list({ branchName });
      setItems(data || []);
    } catch (error) {
      Alert.alert("Error", error?.response?.data?.error || "Could not fetch items.");
    } finally {
      setFetching(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) return Alert.alert("Error", "Enter an item name");
    if (newItemPrice.trim() && Number.isNaN(Number(newItemPrice))) {
      return Alert.alert("Error", "Enter a valid predefined price");
    }
    try {
      setLoading(true);
      await backendItems.create({
        item_name: newItemName.trim(),
        branch_name: branchName,
        created_by: user.id,
        predefined_price: newItemPrice.trim() ? Number(newItemPrice) : null,
      });
      setNewItemName("");
      setNewItemPrice("");
      fetchItems();
    } catch (error) {
      Alert.alert("Error", error?.response?.data?.error || "Could not add item.");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditingName(item.item_name || "");
    setEditingPrice(
      item.predefined_price === null || item.predefined_price === undefined
        ? ""
        : String(item.predefined_price)
    );
    setEditModalVisible(true);
  };

  const handleUpdateItem = async () => {
    if (!editingItem?.id) return;
    if (!editingName.trim()) return Alert.alert("Error", "Enter an item name");
    if (editingPrice.trim() && Number.isNaN(Number(editingPrice))) {
      return Alert.alert("Error", "Enter a valid predefined price");
    }

    try {
      setLoading(true);
      await backendItems.update(editingItem.id, {
        item_name: editingName.trim(),
        predefined_price: editingPrice.trim() ? Number(editingPrice) : null,
      });
      setEditModalVisible(false);
      setEditingItem(null);
      setEditingName("");
      setEditingPrice("");
      fetchItems();
    } catch (error) {
      Alert.alert("Error", error?.response?.data?.error || "Could not update item.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id) => {
    Alert.alert("Delete Item", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            await backendItems.remove(id);
            fetchItems();
          } catch (error) {
            Alert.alert("Error", error?.response?.data?.error || "Could not delete item.");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemName}>{item.item_name}</Text>
        <Text style={styles.itemPriceText}>
          {item.predefined_price
            ? `Predefined price: Rs ${Number(item.predefined_price).toFixed(2)}`
            : "Predefined price: Not set"}
        </Text>
        <Text style={styles.itemDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          onPress={() => openEditModal(item)}
          style={{ padding: 8 }}
        >
          <Icon name="edit" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDeleteItem(item.id)}
          style={{ padding: 8 }}
        >
          <Icon name="delete" size={24} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={COLORS.white} />
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
          <TextInput
            style={styles.priceInput}
            placeholder="Price"
            value={newItemPrice}
            onChangeText={setNewItemPrice}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleAddItem}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Icon name="add" size={24} color={COLORS.white} />
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

      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalCard}>
            <Text style={styles.editModalTitle}>Update Item</Text>
            <TextInput
              style={styles.editInput}
              placeholder="Item name"
              value={editingName}
              onChangeText={setEditingName}
            />
            <TextInput
              style={styles.editInput}
              placeholder="Predefined price (optional)"
              value={editingPrice}
              onChangeText={setEditingPrice}
              keyboardType="decimal-pad"
            />
            <Text style={styles.editHintText}>
              Leave predefined price empty to keep this item manual.
            </Text>
            <View style={styles.editModalActions}>
              <TouchableOpacity
                style={styles.editCancelBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editSaveBtn}
                onPress={handleUpdateItem}
                disabled={loading}
              >
                <Text style={styles.editSaveText}>
                  {loading ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ItemManagementScreen;

