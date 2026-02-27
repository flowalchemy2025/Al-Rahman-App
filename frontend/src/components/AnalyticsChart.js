import React from "react";
import { View, Text, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { analyticsChartStyles as styles } from "../styles";
import { COLORS } from "../styles/theme";

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
          backgroundColor: COLORS.white,
          backgroundGradientFrom: COLORS.white,
          backgroundGradientTo: COLORS.bgApp,
          decimalPlaces: 0,
          color: () => COLORS.primary,
          labelColor: () => COLORS.textPrimary,
          propsForDots: { r: "5", strokeWidth: "2", stroke: COLORS.accentSoft },
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

export default AnalyticsChart;
