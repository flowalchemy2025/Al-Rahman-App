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
import { getPurchaseEntries } from "../../services/supabase";

const screenWidth = Dimensions.get("window").width;

// Helper to get the last 6 months in format "MMM" (e.g., "Jan", "Feb")
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
      // 1. Filter entries for this branch only
      let branchData = result.data;
      if (user.role === "Branch") {
        branchData = branchData.filter(
          (e) => e.branch_name === user.branches[0],
        );
      }
      setEntries(branchData);

      // 2. Extract unique items bought by this branch
      const uniqueItems = [...new Set(branchData.map((e) => e.item_name))];
      setBranchItems(uniqueItems);

      // Auto-select the first item if none is selected
      if (uniqueItems.length > 0 && !selectedItem) {
        setSelectedItem(uniqueItems[0]);
      }
    }
    setLoading(false);
  };

  // --- Process Data for Chart ---
  const timeline = getLast6Months();

  // Filter entries to only match the currently selected item
  const selectedItemEntries = entries.filter(
    (e) => e.item_name === selectedItem,
  );

  // Group the costs by month
  const chartDataValues = timeline.map((timeObj) => {
    const monthEntries = selectedItemEntries.filter((e) => {
      const entryDate = new Date(e.created_at);
      return (
        entryDate.getMonth() === timeObj.month &&
        entryDate.getFullYear() === timeObj.year
      );
    });
    // Sum the total price spent on this item in this specific month
    const totalSpent = monthEntries.reduce(
      (sum, item) => sum + parseFloat(item.price || 0),
      0,
    );
    return totalSpent;
  });

  // Calculate some quick stats for the UI
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

  // Chart configuration
  const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    color: (opacity = 1) => `rgba(118, 183, 239, ${opacity})`, // The #76B7EF blue theme
    labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.6,
    decimalPlaces: 0,
    useShadowColorFromDataset: false,
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
      <Text style={styles.pageTitle}>Analytics Dashboard</Text>

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
          {/* Horizontal Item Selector */}
          <View style={styles.selectorContainer}>
            <Text style={styles.sectionLabel}>Select Item:</Text>
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

          {/* Chart Section */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>
              {selectedItem} - 6 Month Trend
            </Text>
            <Text style={styles.chartSubtitle}>Total Amount Spent (₹)</Text>

            <BarChart
              data={{
                labels: timeline.map((t) => t.label),
                datasets: [{ data: chartDataValues }],
              }}
              width={screenWidth - 64} // Padding compensation
              height={220}
              yAxisLabel="₹"
              chartConfig={chartConfig}
              style={styles.chartStyle}
              showValuesOnTopOfBars={true}
            />
          </View>

          {/* Quick Stats Cards */}
          <Text style={styles.sectionLabel}>
            All-Time Summary ({selectedItem})
          </Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  pageTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    marginTop: 40,
    fontSize: 16,
  },

  selectorContainer: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 10,
  },
  chipScroll: { flexDirection: "row" },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#76B7EF",
    marginRight: 8,
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: "#76B7EF" },
  chipText: { color: "#76B7EF", fontWeight: "600" },
  chipTextActive: { color: "#fff" },

  chartCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    elevation: 3,
    marginBottom: 24,
    alignItems: "center",
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  chartSubtitle: { fontSize: 13, color: "#888", marginBottom: 16 },
  chartStyle: { marginVertical: 8, borderRadius: 16 },

  statsRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    fontWeight: "600",
  },
  statValueSpent: { fontSize: 22, fontWeight: "bold", color: "#f44336" },
  statValueQty: { fontSize: 22, fontWeight: "bold", color: "#4CAF50" },
});

export default AnalyticsTab;
