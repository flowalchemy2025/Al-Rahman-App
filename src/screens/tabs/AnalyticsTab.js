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
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { BarChart } from "react-native-chart-kit";
import { MaterialIcons as Icon } from "@expo/vector-icons";
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

const AnalyticsTab = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [branchItems, setBranchItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

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
        branchData = branchData.filter((e) => e.branch_name === user.branches[0]);
      }
      setEntries(branchData);

      const uniqueItems = [...new Set(branchData.map((e) => e.item_name))];
      setBranchItems(uniqueItems);

      if (uniqueItems.length > 0 && (!selectedItem || !uniqueItems.includes(selectedItem))) {
        setSelectedItem(uniqueItems[0]);
      }
    }

    setLoading(false);
  };

  const timeline = getLast6Months();
  const selectedItemEntries = entries.filter((e) => e.item_name === selectedItem);

  const chartDataValues = timeline.map((timeObj) => {
    const monthEntries = selectedItemEntries.filter((e) => {
      const entryDate = new Date(e.created_at);
      return (
        entryDate.getMonth() === timeObj.month &&
        entryDate.getFullYear() === timeObj.year
      );
    });

    return monthEntries.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);
  });

  const allTimeTotal = selectedItemEntries.reduce(
    (sum, item) => sum + parseFloat(item.price || 0),
    0,
  );
  const totalQuantity = selectedItemEntries.reduce(
    (sum, item) => sum + parseFloat(item.quantity || 0),
    0,
  );
  const commonUnit = selectedItemEntries.length > 0 ? selectedItemEntries[0].unit : "";
  const totalEntryCount = selectedItemEntries.length;
  const avgSpend = totalEntryCount > 0 ? allTimeTotal / totalEntryCount : 0;

  const latestMonthValue = chartDataValues[chartDataValues.length - 1] || 0;
  const prevMonthValue = chartDataValues[chartDataValues.length - 2] || 0;
  const monthlyChange = latestMonthValue - prevMonthValue;
  const monthlyChangeLabel =
    monthlyChange === 0
      ? "No change from last month"
      : `${monthlyChange > 0 ? "+" : "-"}Rs ${Math.abs(monthlyChange).toFixed(0)} vs last month`;

  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#f7fbff",
    color: (opacity = 1) => `rgba(70, 140, 200, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(82, 97, 113, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.64,
    decimalPlaces: 0,
    fillShadowGradientFrom: "#8cc7ff",
    fillShadowGradientTo: "#4f9de8",
    fillShadowGradientOpacity: 1,
    useShadowColorFromDataset: false,
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: "#edf2f7",
      strokeWidth: 1,
    },
    propsForLabels: {
      fontSize: 11,
    },
  };

  if (loading && entries.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#76B7EF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.pageTitle}>Analytics</Text>
          <Text style={styles.pageSubtitle}>Item trends for the last 6 months</Text>
        </View>
        <View style={styles.badgePill}>
          <Icon name="insights" size={16} color="#2c7ec3" />
          <Text style={styles.badgeText}>Live</Text>
        </View>
      </View>

      {branchItems.length === 0 ? (
        <Text style={styles.emptyText}>No data available for analytics yet.</Text>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
          contentContainerStyle={{ paddingBottom: 80 }}
        >
          <View style={styles.selectorContainer}>
            <Text style={styles.sectionLabel}>Choose Item</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {branchItems.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, selectedItem === item && styles.chipActive]}
                  onPress={() => setSelectedItem(item)}
                >
                  <Text style={[styles.chipText, selectedItem === item && styles.chipTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>{selectedItem}</Text>
                <Text style={styles.chartSubtitle}>Monthly spend trend (6 months)</Text>
              </View>
              <View style={styles.monthlyBadge}>
                <Text
                  style={[
                    styles.monthlyBadgeText,
                    monthlyChange > 0
                      ? styles.negativeText
                      : monthlyChange < 0
                        ? styles.positiveText
                        : styles.neutralText,
                  ]}
                >
                  {monthlyChangeLabel}
                </Text>
              </View>
            </View>

            <BarChart
              data={{
                labels: timeline.map((t) => t.label),
                datasets: [{ data: chartDataValues }],
              }}
              width={screenWidth - 68}
              height={230}
              yAxisLabel="Rs "
              chartConfig={chartConfig}
              style={styles.chartStyle}
              showValuesOnTopOfBars={true}
              fromZero={true}
            />
          </View>

          <Text style={styles.sectionLabel}>Summary ({selectedItem})</Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Spent</Text>
              <Text style={styles.statValueSpent}>Rs {allTimeTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Bought</Text>
              <Text style={styles.statValueQty}>
                {totalQuantity.toFixed(1)} {commonUnit}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Entries</Text>
              <Text style={styles.statValueInfo}>{totalEntryCount}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Average Spend</Text>
              <Text style={styles.statValueInfo}>Rs {avgSpend.toFixed(2)}</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f7fb", padding: 16 },
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
    color: "#1f2d3d",
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
    backgroundColor: "#e7f4ff",
    borderColor: "#c8e7ff",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2c7ec3",
  },
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
    letterSpacing: 0.2,
  },
  chipScroll: { flexDirection: "row" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#76B7EF",
    marginRight: 8,
    backgroundColor: "#f8fbff",
  },
  chipActive: { backgroundColor: "#4f9de8", borderColor: "#4f9de8" },
  chipText: { color: "#357ab8", fontWeight: "700", fontSize: 13 },
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
  chartHeader: {
    width: "100%",
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#25364a",
    letterSpacing: 0.2,
  },
  chartSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: "#728197",
    fontWeight: "500",
  },
  monthlyBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#f7fafc",
    borderColor: "#e8eef4",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  monthlyBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  positiveText: { color: "#1f9d55" },
  negativeText: { color: "#d64545" },
  neutralText: { color: "#64748b" },
  chartStyle: { marginTop: 8, borderRadius: 16 },
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
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 13,
    color: "#607086",
    marginBottom: 8,
    fontWeight: "700",
  },
  statValueSpent: { fontSize: 21, fontWeight: "800", color: "#d64545" },
  statValueQty: { fontSize: 21, fontWeight: "800", color: "#1f9d55" },
  statValueInfo: { fontSize: 20, fontWeight: "800", color: "#2f5f8f" },
});

export default AnalyticsTab;
