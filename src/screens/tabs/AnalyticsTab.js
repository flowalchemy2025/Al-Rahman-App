import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { BarChart } from "react-native-chart-kit";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import * as FileSystem from "expo-file-system/legacy";
import { getPurchaseEntries } from "../../services/supabase";

const screenWidth = Dimensions.get("window").width;

const getLast6Months = () => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const result = [];
  const d = new Date();
  for (let i = 5; i >= 0; i--) {
    const pastDate = new Date(d.getFullYear(), d.getMonth() - i, 1);
    result.push({
      label: months[pastDate.getMonth()],
      month: pastDate.getMonth(),
      year: pastDate.getFullYear(),
    });
  }
  return result;
};

// Helper to format date consistently
const getLocalDateString = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const escapeCsvCell = (value) => {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const AnalyticsTab = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [branchItems, setBranchItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  // Export State
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Date Selection State
  const [startDate, setStartDate] = useState(getLocalDateString(new Date()));
  const [endDate, setEndDate] = useState(getLocalDateString(new Date()));
  const [calendarMode, setCalendarMode] = useState(null); // 'start' | 'end' | null

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user]),
  );

  const loadData = async () => {
    setLoading(true);
    const result = await getPurchaseEntries({});

    if (result.success) {
      let branchData = result.data;
      if (user.role === "Branch") {
        branchData = branchData.filter(
          (e) => e.branch_name === user.branches[0],
        );
      }
      setEntries(branchData);

      const uniqueItems = [...new Set(branchData.map((e) => e.item_name))];
      setBranchItems(uniqueItems);

      if (
        uniqueItems.length > 0 &&
        (!selectedItem || !uniqueItems.includes(selectedItem))
      ) {
        setSelectedItem(uniqueItems[0]);
      }
    }
    setLoading(false);
  };

  // --- CSV Export Logic ---
  const handleExport = async () => {
    try {
      if (new Date(startDate) > new Date(endDate)) {
        return Alert.alert(
          "Invalid Range",
          "Start Date cannot be after End Date.",
        );
      }

      setExporting(true);

      const filteredData = entries.filter((e) => {
        const entryDate = new Date(e.created_at);
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return entryDate >= start && entryDate <= end;
      });

      if (filteredData.length === 0) {
        Alert.alert(
          "No Data",
          "No purchase entries found within this date range.",
        );
        setExporting(false);
        return;
      }

      const headers = [
        "Date",
        "Item Name",
        "Quantity",
        "Unit",
        "Price (Rs)",
        "Branch",
        "Vendor",
        "Status",
        "Remarks",
      ];
      const rows = filteredData.map((e) => [
        new Date(e.created_at).toLocaleDateString(),
        e.item_name,
        e.quantity,
        e.unit || "",
        e.price,
        e.branch_name || "",
        e.vendor?.full_name || "Local Shop",
        e.status || "Verified",
        e.remarks || "",
      ]);

      const csvString = [
        headers.map(escapeCsvCell).join(","),
        ...rows.map((r) => r.map(escapeCsvCell).join(",")),
      ].join("\n");

      const fileName = `Report_${startDate}_to_${endDate}.csv`;
      const csvWithBom = `\uFEFF${csvString}`;

      if (Platform.OS === "android") {
        const initialUri =
          FileSystem.StorageAccessFramework.getUriForDirectoryInRoot(
            "Download",
          );
        const permission =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
            initialUri,
          );

        if (!permission.granted) {
          Alert.alert(
            "Permission needed",
            "Select a folder to save the CSV file locally.",
          );
          return;
        }

        const safUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permission.directoryUri,
          fileName.replace(".csv", ""),
          "text/csv",
        );
        await FileSystem.StorageAccessFramework.writeAsStringAsync(
          safUri,
          csvWithBom,
          { encoding: FileSystem.EncodingType.UTF8 },
        );

        Alert.alert("Saved", "CSV report saved to your selected device folder.");
        setExportModalVisible(false);
        return;
      }

      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, csvWithBom, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      Alert.alert("Saved", `CSV report saved locally:\n${fileUri}`);
      setExportModalVisible(false);
    } catch (error) {
      Alert.alert("Export Failed", error.message);
    } finally {
      setExporting(false);
    }
  };

  // --- Date Preset Logic ---
  const applyPreset = (type) => {
    const today = new Date();
    const past = new Date();

    if (type === "1 Day") {
      // Keep both as today
    } else if (type === "1 Week") {
      past.setDate(today.getDate() - 7);
    } else if (type === "1 Month") {
      past.setMonth(today.getMonth() - 1);
    }

    setStartDate(getLocalDateString(past));
    setEndDate(getLocalDateString(today));
  };

  // --- Chart Processing ---
  const timeline = getLast6Months();
  const selectedItemEntries = entries.filter(
    (e) => e.item_name === selectedItem,
  );

  const chartDataValues = timeline.map((timeObj) => {
    const monthEntries = selectedItemEntries.filter((e) => {
      const entryDate = new Date(e.created_at);
      return (
        entryDate.getMonth() === timeObj.month &&
        entryDate.getFullYear() === timeObj.year
      );
    });
    return monthEntries.reduce(
      (sum, item) => sum + parseFloat(item.price || 0),
      0,
    );
  });

  const allTimeTotal = selectedItemEntries.reduce(
    (sum, item) => sum + parseFloat(item.price || 0),
    0,
  );
  const totalQuantity = selectedItemEntries.reduce(
    (sum, item) => sum + parseFloat(item.quantity || 0),
    0,
  );
  const commonUnit =
    selectedItemEntries.length > 0 ? selectedItemEntries[0].unit : "";
  const totalEntryCount = selectedItemEntries.length;
  const avgSpend = totalEntryCount > 0 ? allTimeTotal / totalEntryCount : 0;

  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#F8FAFC",
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.64,
    decimalPlaces: 0,
    useShadowColorFromDataset: false,
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: "#edf2f7",
      strokeWidth: 1,
    },
    propsForLabels: { fontSize: 11 },
  };

  if (loading && entries.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.pageTitle}>Analytics</Text>
          <Text style={styles.pageSubtitle}>
            Item trends for the last 6 months
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            style={[
              styles.badgePill,
              { backgroundColor: "#e0e7ff", borderColor: "#c7d2fe" },
            ]}
            onPress={() => setExportModalVisible(true)}
          >
            <Icon name="download" size={16} color="#4f46e5" />
            <Text style={[styles.badgeText, { color: "#4f46e5" }]}>Export</Text>
          </TouchableOpacity>
        </View>
      </View>

      {branchItems.length === 0 ? (
        <Text style={styles.emptyText}>
          No data available for analytics yet.
        </Text>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadData} />
          }
          contentContainerStyle={{ paddingBottom: 80 }}
        >
          <View style={styles.selectorContainer}>
            <Text style={styles.sectionLabel}>Choose Item</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
            >
              {branchItems.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.chip,
                    selectedItem === item && styles.chipActive,
                  ]}
                  onPress={() => setSelectedItem(item)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedItem === item && styles.chipTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>{selectedItem}</Text>
            <Text style={styles.chartSubtitle}>
              Monthly spend trend (6 months)
            </Text>
            <BarChart
              data={{
                labels: timeline.map((t) => t.label),
                datasets: [{ data: chartDataValues }],
              }}
              width={screenWidth - 68}
              height={230}
              yAxisLabel="₹"
              chartConfig={chartConfig}
              style={styles.chartStyle}
              showValuesOnTopOfBars={true}
              fromZero={true}
            />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Spent</Text>
              <Text style={styles.statValueSpent}>
                ₹{allTimeTotal.toFixed(2)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Bought</Text>
              <Text style={styles.statValueQty}>
                {totalQuantity.toFixed(1)} {commonUnit}
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* --- ENHANCED EXPORT MODAL --- */}
      <Modal visible={exportModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 15,
              }}
            >
              <Text style={styles.modalTitle}>Export Purchase Report</Text>
              <TouchableOpacity
                onPress={() => {
                  setExportModalVisible(false);
                  setCalendarMode(null);
                }}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Conditionally show Calendar OR Export Form */}
            {calendarMode ? (
              <View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <TouchableOpacity onPress={() => setCalendarMode(null)}>
                    <Icon name="arrow-back" size={24} color="#333" />
                  </TouchableOpacity>
                  <Text
                    style={{ fontSize: 16, fontWeight: "bold", marginLeft: 10 }}
                  >
                    Select{" "}
                    {calendarMode === "start" ? "Start Date" : "End Date"}
                  </Text>
                </View>
                <Calendar
                  current={calendarMode === "start" ? startDate : endDate}
                  onDayPress={(day) => {
                    if (calendarMode === "start") setStartDate(day.dateString);
                    else setEndDate(day.dateString);
                    setCalendarMode(null); // Close calendar and go back to form
                  }}
                  markedDates={{
                    [calendarMode === "start" ? startDate : endDate]: {
                      selected: true,
                      selectedColor: "#4f46e5",
                    },
                  }}
                  theme={{ todayTextColor: "#4f46e5", arrowColor: "#4f46e5" }}
                />
              </View>
            ) : (
              <View>
                {/* Presets */}
                <Text style={styles.label}>Quick Presets:</Text>
                <View
                  style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}
                >
                  {["Today", "1 Week", "1 Month"].map((preset) => (
                    <TouchableOpacity
                      key={preset}
                      style={styles.presetChip}
                      onPress={() => applyPreset(preset)}
                    >
                      <Text style={styles.presetText}>{preset}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Date Selectors */}
                <View
                  style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Start Date</Text>
                    <TouchableOpacity
                      style={styles.dateSelector}
                      onPress={() => setCalendarMode("start")}
                    >
                      <Icon name="calendar-today" size={18} color="#4f46e5" />
                      <Text style={styles.dateText}>{startDate}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>End Date</Text>
                    <TouchableOpacity
                      style={styles.dateSelector}
                      onPress={() => setCalendarMode("end")}
                    >
                      <Icon name="event" size={18} color="#4f46e5" />
                      <Text style={styles.dateText}>{endDate}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleExport}
                  disabled={exporting}
                >
                  {exporting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Icon
                        name="file-download"
                        size={20}
                        color="#fff"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.submitBtnText}>
                        Generate & Download CSV
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: 0.2,
  },
  pageSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: "#607086",
    fontWeight: "500",
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 4,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  emptyText: {
    textAlign: "center",
    color: "#7b8794",
    marginTop: 40,
    fontSize: 16,
  },
  selectorContainer: {
    marginBottom: 16,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e6edf5",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334e68",
    marginBottom: 12,
  },
  chipScroll: { flexDirection: "row" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2563EB",
    marginRight: 8,
    backgroundColor: "#EFF6FF",
  },
  chipActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  chipText: { color: "#0EA5E9", fontWeight: "700", fontSize: 13 },
  chipTextActive: { color: "#fff" },
  chartCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e6edf5",
    elevation: 2,
    marginBottom: 18,
    alignItems: "center",
  },
  chartTitle: { fontSize: 20, fontWeight: "800", color: "#25364a" },
  chartSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: "#728197",
    fontWeight: "500",
    marginBottom: 10,
  },
  chartStyle: { borderRadius: 16 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e6edf5",
    elevation: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 13,
    color: "#607086",
    marginBottom: 8,
    fontWeight: "700",
  },
  statValueSpent: { fontSize: 21, fontWeight: "800", color: "#d64545" },
  statValueQty: { fontSize: 21, fontWeight: "800", color: "#1f9d55" },

  // Updated Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  label: { fontSize: 12, fontWeight: "600", color: "#666", marginBottom: 8 },

  presetChip: {
    flex: 1,
    backgroundColor: "#e0e7ff",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  presetText: { color: "#4f46e5", fontWeight: "bold", fontSize: 13 },

  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  dateText: { fontSize: 15, color: "#333", fontWeight: "500" },

  submitBtn: {
    backgroundColor: "#4f46e5",
    padding: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

export default AnalyticsTab;
