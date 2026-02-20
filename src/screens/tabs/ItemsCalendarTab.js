import React, { useState, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import EntryCard from "../../components/EntryCard";
import {
  getPurchaseEntries,
  updateVendorComment,
} from "../../services/supabase";

const getLocalYYYYMMDD = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const ItemsCalendarTab = ({ user, navigation }) => {
  const today = getLocalYYYYMMDD();
  const [selectedDate, setSelectedDate] = useState(today);
  const [entries, setEntries] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(false);

  // Comment Modal State
  const [commentModal, setCommentModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [commentText, setCommentText] = useState("");

  // useFocusEffect automatically refreshes data when you switch back to this tab
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user]),
  );

  const loadData = async () => {
    setLoading(true);
    const filters = user.role === "Vendor" ? { vendorId: user.id } : {};
    const result = await getPurchaseEntries(filters);

    if (result.success) {
      // --- FIX: Filter data so Branches only see their own items ---
      let fetchedData = result.data;
      if (user.role === "Branch") {
        fetchedData = fetchedData.filter(
          (e) => e.branch_name === user.branches[0],
        );
      }

      setEntries(fetchedData);

      const marks = {};
      fetchedData.forEach((entry) => {
        const date = entry.created_at.split("T")[0];
        marks[date] = { marked: true, dotColor: "#76B7EF" };
      });
      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
        selectedColor: "#76B7EF",
      };
      setMarkedDates(marks);
    }
    setLoading(false);
  };

  const handleSaveComment = async () => {
    if (!selectedEntry) return;
    setLoading(true);
    const res = await updateVendorComment(selectedEntry.id, commentText);
    setLoading(false);
    setCommentModal(false);
    if (res.success) {
      Alert.alert("Success", "Comment saved");
      loadData();
    } else Alert.alert("Error", res.error);
  };

  const dayEntries = entries.filter(
    (e) => e.created_at.split("T")[0] === selectedDate,
  );

  const isToday = selectedDate === today;

  // --- FIX: Swapped "Worker" for "Branch" ---
  const canModify =
    user.role === "Super Admin" || (user.role === "Branch" && isToday);

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={(day) => {
          setSelectedDate(day.dateString);
          setMarkedDates((prev) => ({
            ...Object.keys(prev).reduce(
              (acc, key) => ({
                ...acc,
                [key]: {
                  marked: prev[key].marked,
                  dotColor: prev[key].dotColor,
                },
              }),
              {},
            ),
            [day.dateString]: {
              selected: true,
              selectedColor: "#76B7EF",
              marked: prev[day.dateString]?.marked,
            },
          }));
        }}
        markedDates={markedDates}
        theme={{
          selectedDayBackgroundColor: "#76B7EF",
          todayTextColor: "#76B7EF",
          arrowColor: "#76B7EF",
        }}
      />

      <View style={styles.headerRow}>
        <Text style={styles.dateTitle}>Items on {selectedDate}</Text>
        <TouchableOpacity
          onPress={loadData}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <Icon name="refresh" size={20} color="#76B7EF" />
          <Text style={{ color: "#76B7EF", marginLeft: 4 }}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={dayEntries}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadData} />
        }
        renderItem={({ item }) => (
          <EntryCard
            item={item}
            user={user}
            navigation={navigation}
            onAddComment={(entry) => {
              setSelectedEntry(entry);
              setCommentText(entry.vendor_comment || "");
              setCommentModal(true);
            }}
            onViewImage={() => {}}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No purchases on this day.</Text>
        }
        contentContainerStyle={{ paddingBottom: 80, paddingTop: 10 }}
      />

      {/* The FAB button will now appear for Branches if they select Today's date */}
      {canModify && user.role !== "Vendor" && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("AddItem", { user })}
        >
          <Icon name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Comment Modal */}
      <Modal visible={commentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Note/Comment</Text>
            <TextInput
              style={styles.input}
              placeholder="E.g., Price changed, Out of stock..."
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                onPress={() => setCommentModal(false)}
                style={styles.btnCancel}
              >
                <Text style={styles.btnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveComment}
                style={styles.btnSave}
              >
                <Text style={styles.btnTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  headerRow: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
  empty: { textAlign: "center", marginTop: 20, color: "#999" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#76B7EF",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "#fff", borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    height: 80,
    textAlignVertical: "top",
    marginBottom: 15,
  },
  modalBtns: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  btnCancel: { padding: 10 },
  btnSave: {
    backgroundColor: "#76B7EF",
    padding: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  btnTextCancel: { color: "#666" },
  btnTextSave: { color: "#fff", fontWeight: "bold" },
});

export default ItemsCalendarTab;
