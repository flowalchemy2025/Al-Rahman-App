import React, { useState, useCallback } from "react";
import {
  View,
  FlatList,
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
import { backendPurchases } from "../../services/apiClient";
import { itemsCalendarStyles as styles } from "../../styles";
import { COLORS } from "../../styles/theme";

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

  const [commentModal, setCommentModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [commentText, setCommentText] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user]),
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const filters = user.role === "Vendor" ? { vendorId: user.id } : {};
      let fetchedData = await backendPurchases.list(filters);
      if (!Array.isArray(fetchedData)) fetchedData = [];

      if (user.role === "Branch") {
        fetchedData = fetchedData.filter(
          (e) => e.branch_name === user.branches[0],
        );
      }

      setEntries(fetchedData);

      const marks = {};
      fetchedData.forEach((entry) => {
        const date = getLocalDateString(entry.created_at);
        marks[date] = { marked: true, dotColor: COLORS.primaryDark };
      });

      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
        selectedColor: COLORS.primaryDark,
      };
      setMarkedDates(marks);
    } catch (error) {
      Alert.alert("Error", error?.response?.data?.error || "Could not fetch purchases.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveComment = async () => {
    if (!selectedEntry) return;
    try {
      setLoading(true);
      await backendPurchases.updateVendorComment(selectedEntry.id, commentText);
      setCommentModal(false);
      Alert.alert("Success", "Comment saved");
      loadData();
    } catch (error) {
      Alert.alert("Error", error?.response?.data?.error || "Could not save comment");
    } finally {
      setLoading(false);
    }
  };

  const dayEntries = entries.filter(
    (e) => getLocalDateString(e.created_at) === selectedDate,
  );

  const isToday = selectedDate === today;
  const canModify =
    user.role === "Super Admin" || (user.role === "Branch" && isToday);

  return (
    <View style={styles.container}>
      <FlatList
        data={dayEntries}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadData} />
        }
        renderItem={({ item }) => {
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
              onPress={handleCardPress}
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
        ListHeaderComponent={
          <>
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
                    selectedColor: COLORS.primaryDark,
                    marked: prev[day.dateString]?.marked,
                  },
                }));
              }}
              markedDates={markedDates}
              theme={{
                selectedDayBackgroundColor: COLORS.primaryDark,
                todayTextColor: COLORS.primaryDark,
                arrowColor: COLORS.primaryDark,
              }}
            />

            <View style={styles.headerRow}>
              <Text style={styles.dateTitle}>Items on {selectedDate}</Text>
              <TouchableOpacity
                onPress={loadData}
                style={{ flexDirection: "row", alignItems: "center" }}
              >
                <Icon name="refresh" size={20} color={COLORS.primaryDark} />
                <Text style={{ color: COLORS.primaryDark, marginLeft: 4 }}>
                  Refresh
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }
        contentContainerStyle={{ paddingBottom: 80, paddingTop: 10 }}
      />

      {canModify && user.role !== "Vendor" && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("AddItem", { user })}
        >
          <Icon name="add" size={28} color={COLORS.white} />
        </TouchableOpacity>
      )}

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

export default ItemsCalendarTab;
