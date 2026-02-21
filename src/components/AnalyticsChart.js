import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

const AnalyticsChart = ({ data }) => {
  if (!data) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sales Overview (Last 7 Days)</Text>
      <LineChart
        data={{
          labels: data.labels,
          datasets: [{ data: data.data }],
        }}
        width={screenWidth - 48}
        height={220}
        chartConfig={{
          backgroundColor: "#fff",
          backgroundGradientFrom: "#fff",
          backgroundGradientTo: "#F8FAFC",
          decimalPlaces: 0,
          color: (o = 1) => `rgba(37, 99, 235, ${o})`,
          labelColor: (o = 1) => `rgba(30, 41, 59, ${o})`,
          propsForDots: { r: "5", strokeWidth: "2", stroke: "#0EA5E9" },
        }}
        bezier
        style={styles.chart}
      />
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Value</Text>
          <Text style={styles.statValue}>
            Rs {data.data.reduce((a, b) => a + b, 0).toFixed(0)}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Entries</Text>
          <Text style={styles.statValue}>{data.raw.length}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    margin: 16,
  },
  title: { fontSize: 18, fontWeight: "bold", color: "#1E293B", marginBottom: 16 },
  chart: { marginVertical: 8, borderRadius: 16 },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  statCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  statLabel: { fontSize: 12, color: "#475569", marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: "bold", color: "#2563EB" },
});

export default AnalyticsChart;
