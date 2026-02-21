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

const getLocalDateString = (dateInput) => {
  const date = dateInput ? new Date(dateInput) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const ItemsCalendarTab = ({ user, navigation }) => {
  const today = getLocalDateString();
  const [selectedDate, setSelectedDate] = useState(today);
  const [entries, setEntries] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(false);

  // Comment Modal State
  const [commentModal, setCommentModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [commentText, setCommentText] = useState("");

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
      let fetchedData = result.data;
      if (user.role === "Branch") {
        fetchedData = fetchedData.filter(
          (e) => e.branch_name === user.branches[0],
        );
      }

      setEntries(fetchedData);

      const marks = {};
      fetchedData.forEach((entry) => {
        const date = getLocalDateString(entry.created_at);
        marks[date] = { marked: true, dotColor: "#2563EB" };
      });

      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
        selectedColor: "#2563EB",
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
    (e) => getLocalDateString(e.created_at) === selectedDate,
  );

  const isToday = selectedDate === today;
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
              selectedColor: "#2563EB",
              marked: prev[day.dateString]?.marked,
            },
          }));
        }}
        markedDates={markedDates}
        theme={{
          selectedDayBackgroundColor: "#2563EB",
          todayTextColor: "#2563EB",
          arrowColor: "#2563EB",
        }}
      />

      <View style={styles.headerRow}>
        <Text style={styles.dateTitle}>Items on {selectedDate}</Text>
        <TouchableOpacity
          onPress={loadData}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <Icon name="refresh" size={20} color="#2563EB" />
          <Text style={{ color: "#2563EB", marginLeft: 4 }}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={dayEntries}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadData} />
        }
        renderItem={({ item }) => {
          // 🚨 ADDED ROUTING LOGIC HERE 🚨
          const handleCardPress = () => {
            const entryDate = getLocalDateString(item.created_at);
            const isEditable =
              user.role === "Super Admin" ||
              (user.role === "Branch" && entryDate === today);

            if (isEditable) {
              navigation.navigate("EditEntry", { entry: item, user });
            } else {
              navigation.navigate("ViewEntry", { entry: item, user });
            }
          };

          return (
            <EntryCard
              item={item}
              user={user}
              navigation={navigation}
              onPress={handleCardPress} // <-- Passing the new dynamic route here
              onAddComment={(entry) => {
                setSelectedEntry(entry);
                setCommentText(entry.vendor_comment || "");
                setCommentModal(true);
              }}
              onViewImage={() => {}}
            />
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>No purchases on this day.</Text>
        }
        contentContainerStyle={{ paddingBottom: 80, paddingTop: 10 }}
      />

      {/* FAB Button logic handles adding new items for today */}
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
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  headerRow: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateTitle: { fontSize: 16, fontWeight: "bold", color: "#1E293B" },
  empty: { textAlign: "center", marginTop: 20, color: "#64748B" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#2563EB",
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
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 10,
    height: 80,
    textAlignVertical: "top",
    marginBottom: 15,
  },
  modalBtns: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  btnCancel: { padding: 10 },
  btnSave: {
    backgroundColor: "#2563EB",
    padding: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  btnTextCancel: { color: "#475569" },
  btnTextSave: { color: "#fff", fontWeight: "bold" },
});

export default ItemsCalendarTab;

