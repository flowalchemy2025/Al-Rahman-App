import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
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
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import * as FileSystem from "expo-file-system/legacy";
import { getPurchaseEntries } from "../../services/supabase";
import { analyticsTabStyles as styles } from "../../styles";
import { COLORS } from "../../styles/theme";

const screenWidth = Dimensions.get("window").width;
const ITEM_COLORS = [
  "#1E88E5",
  "#FB8C00",
  "#43A047",
  "#E53935",
  "#8E24AA",
  "#00897B",
];

const getLocalDateString = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseYmdToDate = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const setEndOfDay = (date) => {
  const cloned = new Date(date);
  cloned.setHours(23, 59, 59, 999);
  return cloned;
};

const setStartOfDay = (date) => {
  const cloned = new Date(date);
  cloned.setHours(0, 0, 0, 0);
  return cloned;
};

const formatLabel = (date) =>
  `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;

const formatMonthLabel = (date) =>
  date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });

const getOrderedRange = (start, end) => (start <= end ? [start, end] : [end, start]);

const escapeCsvCell = (value) => {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const buildBuckets = (startDate, endDate) => {
  const buckets = [];
  const start = setStartOfDay(startDate);
  const end = setEndOfDay(endDate);
  const dayDiff = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );

  if (dayDiff <= 31) {
    let cursor = new Date(start);
    while (cursor <= end) {
      const bucketStart = setStartOfDay(cursor);
      const bucketEnd = setEndOfDay(cursor);
      buckets.push({ start: bucketStart, end: bucketEnd, label: formatLabel(cursor) });
      cursor.setDate(cursor.getDate() + 1);
    }
    return buckets;
  }

  if (dayDiff <= 120) {
    let cursor = new Date(start);
    while (cursor <= end) {
      const bucketStart = setStartOfDay(cursor);
      const weekEnd = new Date(cursor);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const bucketEnd = setEndOfDay(weekEnd > end ? end : weekEnd);
      buckets.push({ start: bucketStart, end: bucketEnd, label: formatLabel(bucketStart) });
      cursor.setDate(cursor.getDate() + 7);
    }
    return buckets;
  }

  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= endMonth) {
    const bucketStart = setStartOfDay(
      new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        cursor.getFullYear() === start.getFullYear() &&
          cursor.getMonth() === start.getMonth()
          ? start.getDate()
          : 1,
      ),
    );
    const lastDayOfMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const bucketEnd = setEndOfDay(
      cursor.getFullYear() === end.getFullYear() &&
        cursor.getMonth() === end.getMonth()
        ? end
        : lastDayOfMonth,
    );
    buckets.push({
      start: bucketStart,
      end: bucketEnd,
      label: formatMonthLabel(cursor),
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return buckets;
};

const AnalyticsTab = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [branchItems, setBranchItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);

  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 6);
    return getLocalDateString(past);
  });
  const [endDate, setEndDate] = useState(() => getLocalDateString(new Date()));
  const [activePreset, setActivePreset] = useState("1 Week");
  const [calendarMode, setCalendarMode] = useState(null); // 'start' | 'end' | null
  const [chartType, setChartType] = useState("Line");
  const [selectedPoint, setSelectedPoint] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user]),
  );

  const applyPreset = (type) => {
    const today = new Date();
    const past = new Date();

    if (type === "1 Week") {
      past.setDate(today.getDate() - 6);
    } else if (type === "1 Month") {
      past.setMonth(today.getMonth() - 1);
    } else if (type === "6 Months") {
      past.setMonth(today.getMonth() - 6);
    }

    setStartDate(getLocalDateString(past));
    setEndDate(getLocalDateString(today));
    setActivePreset(type);
  };

  const loadData = async () => {
    setLoading(true);
    const result = await getPurchaseEntries({});

    if (result.success) {
      let branchData = result.data;
      if (user.role === "Branch") {
        branchData = branchData.filter((e) => e.branch_name === user.branches[0]);
      }
      setEntries(branchData);

      const uniqueItems = [...new Set(branchData.map((e) => e.item_name))];
      setBranchItems(uniqueItems);
      setSelectedItems((prev) => {
        const stillValid = prev.filter((item) => uniqueItems.includes(item));
        if (stillValid.length > 0) return stillValid;
        return uniqueItems.length > 0 ? [uniqueItems[0]] : [];
      });
    }
    setLoading(false);
  };

  const toggleItem = (itemName) => {
    setSelectedItems((prev) => {
      if (prev.includes(itemName)) {
        const next = prev.filter((i) => i !== itemName);
        return next.length ? next : prev;
      }
      return [...prev, itemName];
    });
  };

  const startDateObj = parseYmdToDate(startDate);
  const endDateObj = parseYmdToDate(endDate);

  const rangedEntries = useMemo(() => {
    const [rangeStart, rangeEnd] = getOrderedRange(startDateObj, endDateObj);
    const start = setStartOfDay(rangeStart);
    const end = setEndOfDay(rangeEnd);
    return entries.filter((e) => {
      const dt = new Date(e.created_at);
      return dt >= start && dt <= end;
    });
  }, [entries, startDate, endDate]);

  const selectedEntries = useMemo(
    () => rangedEntries.filter((e) => selectedItems.includes(e.item_name)),
    [rangedEntries, selectedItems],
  );

  const buckets = useMemo(() => {
    const [rangeStart, rangeEnd] = getOrderedRange(startDateObj, endDateObj);
    return buildBuckets(rangeStart, rangeEnd);
  }, [startDate, endDate]);

  const chartData = useMemo(() => {
    const datasets = selectedItems.map((itemName, idx) => ({
      data: buckets.map((bucket) => {
        const bucketEntries = selectedEntries.filter((e) => {
          if (e.item_name !== itemName) return false;
          const dt = new Date(e.created_at);
          return dt >= bucket.start && dt <= bucket.end;
        });
        return bucketEntries.reduce((sum, row) => sum + parseFloat(row.price || 0), 0);
      }),
      color: () => ITEM_COLORS[idx % ITEM_COLORS.length],
      strokeWidth: 2,
    }));

    return {
      labels: buckets.map((b) => b.label),
      datasets,
      legend: selectedItems,
    };
  }, [buckets, selectedEntries, selectedItems]);

  const barChartData = useMemo(
    () => ({
      labels: buckets.map((b) => b.label),
      datasets: [
        {
          data: buckets.map((bucket) =>
            selectedEntries
              .filter((e) => {
                const dt = new Date(e.created_at);
                return dt >= bucket.start && dt <= bucket.end;
              })
              .reduce((sum, row) => sum + parseFloat(row.price || 0), 0),
          ),
        },
      ],
    }),
    [buckets, selectedEntries],
  );

  const pieChartData = useMemo(
    () =>
      selectedItems.map((itemName, idx) => {
        const itemTotal = selectedEntries
          .filter((e) => e.item_name === itemName)
          .reduce((sum, row) => sum + parseFloat(row.price || 0), 0);
        return {
          name: itemName,
          population: itemTotal,
          color: ITEM_COLORS[idx % ITEM_COLORS.length],
          legendFontColor: COLORS.textSecondary,
          legendFontSize: 12,
        };
      }),
    [selectedEntries, selectedItems],
  );

  const totalSpent = selectedEntries.reduce(
    (sum, row) => sum + parseFloat(row.price || 0),
    0,
  );
  const totalQuantity = selectedEntries.reduce(
    (sum, row) => sum + parseFloat(row.quantity || 0),
    0,
  );
  const totalEntries = selectedEntries.length;
  const avgSpend = totalEntries > 0 ? totalSpent / totalEntries : 0;

  const handleExport = async () => {
    try {
      if (startDateObj > endDateObj) {
        return Alert.alert("Invalid Range", "Start Date cannot be after End Date.");
      }

      setExporting(true);
      if (rangedEntries.length === 0) {
        Alert.alert("No Data", "No purchase entries found within this date range.");
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

      const rows = rangedEntries.map((e) => [
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
        ...rows.map((row) => row.map(escapeCsvCell).join(",")),
      ].join("\n");

      const fileName = `Report_${startDate}_to_${endDate}.csv`;
      const csvWithBom = `\uFEFF${csvString}`;

      if (Platform.OS === "android") {
        const initialUri =
          FileSystem.StorageAccessFramework.getUriForDirectoryInRoot("Download");
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
        await FileSystem.StorageAccessFramework.writeAsStringAsync(safUri, csvWithBom, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        Alert.alert("Saved", "CSV report saved to your selected device folder.");
      } else {
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, csvWithBom, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        Alert.alert("Saved", `CSV report saved locally:\n${fileUri}`);
      }

      setExportModalVisible(false);
    } catch (error) {
      Alert.alert("Export Failed", error.message);
    } finally {
      setExporting(false);
    }
  };

  const chartConfig = {
    backgroundGradientFrom: COLORS.white,
    backgroundGradientTo: COLORS.bgApp,
    color: () => COLORS.primary,
    labelColor: () => COLORS.textPrimary,
    strokeWidth: 2,
    decimalPlaces: 0,
    useShadowColorFromDataset: false,
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: COLORS.borderSoft,
      strokeWidth: 1,
    },
    propsForLabels: { fontSize: 10 },
  };

  if (loading && entries.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primaryDark} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.pageTitle}>Analytics</Text>
          <Text style={styles.pageSubtitle}>Multi-item trends by date range</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.badgePill,
            { backgroundColor: COLORS.cardTint, borderColor: COLORS.border },
          ]}
          onPress={() => setExportModalVisible(true)}
        >
          <Icon name="download" size={16} color={COLORS.accent} />
          <Text style={[styles.badgeText, { color: COLORS.accent }]}>Export</Text>
        </TouchableOpacity>
      </View>

      {branchItems.length === 0 ? (
        <Text style={styles.emptyText}>No data available for analytics yet.</Text>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
          contentContainerStyle={{ paddingBottom: 80 }}
        >
          <View style={styles.selectorContainer}>
            <Text style={styles.sectionLabel}>Timeframe</Text>
            <View style={styles.analyticsPresetRow}>
              {["1 Week", "1 Month", "6 Months"].map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.analyticsPresetChip,
                    activePreset === preset && styles.analyticsPresetChipActive,
                  ]}
                  onPress={() => applyPreset(preset)}
                >
                  <Text
                    style={[
                      styles.analyticsPresetText,
                      activePreset === preset && styles.analyticsPresetTextActive,
                    ]}
                  >
                    {preset}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.analyticsDateRow}>
              <TouchableOpacity
                style={styles.dateSelector}
                onPress={() => {
                  setActivePreset("Custom");
                  setCalendarMode("start");
                }}
              >
                <Icon name="calendar-today" size={16} color={COLORS.accent} />
                <Text style={styles.dateText}>{startDate}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateSelector}
                onPress={() => {
                  setActivePreset("Custom");
                  setCalendarMode("end");
                }}
              >
                <Icon name="event" size={16} color={COLORS.accent} />
                <Text style={styles.dateText}>{endDate}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.selectorContainer}>
            <Text style={styles.sectionLabel}>Choose Item(s)</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
            >
              {branchItems.map((item) => {
                const active = selectedItems.includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleItem(item)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Spend Trend</Text>
            <Text style={styles.chartSubtitle}>
              {startDate} to {endDate}
            </Text>
            <View style={styles.chartTypeRow}>
              {["Line", "Bar", "Pie"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.chartTypeChip,
                    chartType === type && styles.chartTypeChipActive,
                  ]}
                  onPress={() => {
                    setChartType(type);
                    setSelectedPoint(null);
                  }}
                >
                  <Text
                    style={[
                      styles.chartTypeText,
                      chartType === type && styles.chartTypeTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {chartType === "Line" && (
              <LineChart
                data={chartData}
                width={screenWidth - 68}
                height={250}
                yAxisLabel={"\u20B9"}
                chartConfig={chartConfig}
                style={styles.chartStyle}
                fromZero
                bezier={false}
                onDataPointClick={({ value, index, dataset }) => {
                  const seriesName =
                    chartData.legend?.[chartData.datasets.indexOf(dataset)] || "Series";
                  setSelectedPoint({
                    label: chartData.labels[index],
                    value,
                    seriesName,
                  });
                }}
              />
            )}
            {chartType === "Bar" && (
              <BarChart
                data={barChartData}
                width={screenWidth - 68}
                height={250}
                yAxisLabel={"\u20B9"}
                chartConfig={chartConfig}
                style={styles.chartStyle}
                fromZero
                showValuesOnTopOfBars
                onDataPointClick={({ value, index }) => {
                  setSelectedPoint({
                    label: barChartData.labels[index],
                    value,
                    seriesName: "Combined Spend",
                  });
                }}
              />
            )}
            {chartType === "Pie" && (
              pieChartData.some((d) => d.population > 0) ? (
                <PieChart
                  data={pieChartData}
                  width={screenWidth - 68}
                  height={250}
                  accessor="population"
                  chartConfig={chartConfig}
                  backgroundColor="transparent"
                  paddingLeft="8"
                  absolute
                />
              ) : (
                <Text style={styles.chartHintText}>
                  No spend values in selected range for pie view.
                </Text>
              )
            )}
            {selectedPoint && chartType !== "Pie" && (
              <View style={styles.selectedPointCard}>
                <Text style={styles.selectedPointTitle}>{selectedPoint.seriesName}</Text>
                <Text style={styles.selectedPointBody}>
                  {selectedPoint.label} - {"\u20B9"}
                  {parseFloat(selectedPoint.value || 0).toFixed(2)}
                </Text>
              </View>
            )}
            {chartType === "Pie" && (
              <Text style={styles.chartHintText}>
                Pie shows contribution share by selected items.
              </Text>
            )}
            <View style={styles.analyticsLegendWrap}>
              {selectedItems.map((item, idx) => (
                <View key={item} style={styles.analyticsLegendItem}>
                  <View
                    style={[
                      styles.analyticsLegendDot,
                      { backgroundColor: ITEM_COLORS[idx % ITEM_COLORS.length] },
                    ]}
                  />
                  <Text style={styles.analyticsLegendText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Spent</Text>
              <Text style={styles.statValueSpent}>{"\u20B9"}{totalSpent.toFixed(2)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Bought</Text>
              <Text style={styles.statValueQty}>{totalQuantity.toFixed(1)}</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Entries</Text>
              <Text style={styles.statValueQty}>{totalEntries}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Avg Spend / Entry</Text>
              <Text style={styles.statValueSpent}>{"\u20B9"}{avgSpend.toFixed(2)}</Text>
            </View>
          </View>
        </ScrollView>
      )}

      <Modal visible={calendarMode !== null} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}>
              <Text style={styles.modalTitle}>
                Select {calendarMode === "start" ? "Start Date" : "End Date"}
              </Text>
              <TouchableOpacity onPress={() => setCalendarMode(null)}>
                <Icon name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <Calendar
              current={calendarMode === "start" ? startDate : endDate}
              onDayPress={(day) => {
                if (calendarMode === "start") setStartDate(day.dateString);
                else setEndDate(day.dateString);
                setCalendarMode(null);
              }}
              markedDates={{
                [calendarMode === "start" ? startDate : endDate]: {
                  selected: true,
                  selectedColor: COLORS.accent,
                },
              }}
              theme={{ todayTextColor: COLORS.accent, arrowColor: COLORS.accent }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={exportModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}>
              <Text style={styles.modalTitle}>Export Purchase Report</Text>
              <TouchableOpacity onPress={() => setExportModalVisible(false)}>
                <Icon name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>
              Date Range: {startDate} to {endDate}
            </Text>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Icon
                    name="file-download"
                    size={20}
                    color={COLORS.white}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.submitBtnText}>Generate & Download CSV</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

export default AnalyticsTab;
