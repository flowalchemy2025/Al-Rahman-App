import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LineChart, BarChart } from "react-native-chart-kit";
import { useFocusEffect } from "@react-navigation/native";
import { getAnalyticsData } from "../../services/supabase";

const screenWidth = Dimensions.get("window").width;

const AnalyticsTab = () => {
  const [timeframe, setTimeframe] = useState("week");
  const [lineData, setLineData] = useState(null);
  const [barData, setBarData] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [timeframe]),
  );

  const loadData = async () => {
    setLoading(true);
    const days = timeframe === "week" ? 7 : timeframe === "month" ? 30 : 60;
    const result = await getAnalyticsData(days);

    if (result.success) {
      const data = result.data;

      // 1. Process Line Chart (Spending over time)
      const labels = [];
      const points = [];
      for (let i = Math.min(days - 1, 6); i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(d.getDate().toString());
        points.push(
          data
            .filter((e) => e.created_at.includes(d.toISOString().split("T")[0]))
            .reduce((sum, e) => sum + parseFloat(e.price || 0), 0),
        );
      }
      setLineData({ labels, data: points });

      // 2. Process Bar Chart (Spending per Vendor)
      const vendorTotals = {};
      data.forEach((item) => {
        // If bypass/local shop, group as "Local"
        const vendorName = item.vendor
          ? item.vendor.full_name.split(" ")[0]
          : "Local";
        vendorTotals[vendorName] =
          (vendorTotals[vendorName] || 0) + parseFloat(item.price || 0);
      });

      const vendorLabels = Object.keys(vendorTotals);
      const vendorAmounts = Object.values(vendorTotals);

      if (vendorLabels.length > 0) {
        setBarData({
          labels: vendorLabels.slice(0, 5), // Show top 5 to fit on screen
          datasets: [{ data: vendorAmounts.slice(0, 5) }],
        });
      } else {
        setBarData(null);
      }
    }
    setLoading(false);
  };

  if (loading)
    return (
      <ActivityIndicator
        size="large"
        color="#76B7EF"
        style={{ marginTop: 40 }}
      />
    );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={styles.filterRow}>
        {["week", "month", "2month"].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.filterBtn, timeframe === t && styles.activeBtn]}
            onPress={() => setTimeframe(t)}
          >
            <Text
              style={[styles.filterText, timeframe === t && styles.activeText]}
            >
              {t === "week" ? "1 Week" : t === "month" ? "1 Mth" : "2 Mths"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {lineData && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Amount Spent Over Time</Text>
          <LineChart
            data={{
              labels: lineData.labels,
              datasets: [{ data: lineData.data }],
            }}
            width={screenWidth - 64}
            height={220}
            chartConfig={chartConfigLine}
            bezier
            style={{ borderRadius: 16 }}
          />
        </View>
      )}

      {barData ? (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Amount By Vendor (Top 5)</Text>
          <BarChart
            data={barData}
            width={screenWidth - 64}
            height={220}
            chartConfig={chartConfigBar}
            style={{ borderRadius: 16 }}
            showValuesOnTopOfBars={true}
          />
        </View>
      ) : (
        <Text style={{ textAlign: "center", color: "#999", marginTop: 20 }}>
          No vendor data for this period.
        </Text>
      )}
    </ScrollView>
  );
};

const chartConfigLine = {
  backgroundColor: "#fff",
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(118, 183, 239, ${opacity})`,
  labelColor: () => "#333",
  propsForDots: { r: "5", strokeWidth: "2", stroke: "#76B7EF" },
};

const chartConfigBar = {
  backgroundColor: "#fff",
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
  labelColor: () => "#333",
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 16 },
  filterRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  filterBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#e0e0e0",
    alignItems: "center",
  },
  activeBtn: { backgroundColor: "#76B7EF" },
  filterText: { color: "#666", fontWeight: "bold" },
  activeText: { color: "#fff" },
  chartCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
});

export default AnalyticsTab;
