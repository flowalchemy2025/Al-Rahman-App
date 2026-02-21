import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { supabase, getLedgerData } from "../../services/supabase";

const PaymentsTab = ({ user, navigation }) => {
  const [loading, setLoading] = useState(true);

  // Branch State
  const [vendorsData, setVendorsData] = useState([]);

  // Vendor State
  const [myBalance, setMyBalance] = useState(0);
  const [myLedger, setMyLedger] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user]),
  );

  const loadData = async () => {
    setLoading(true);
    if (user.role === "Branch" || user.role === "Super Admin") {
      const branchName = user.role === "Branch" ? user.branches[0] : null; // Handle admin logic if needed later

      // 1. Get Vendors for this branch
      const { data: vendors } = await supabase
        .from("users")
        .select("*")
        .eq("role", "Vendor")
        .contains("branches", [branchName]);

      if (vendors) {
        // 2. Calculate balance for each vendor
        const vendorsWithBalances = await Promise.all(
          vendors.map(async (v) => {
            const ledgerRes = await getLedgerData(v.id, branchName);
            return { ...v, balance: ledgerRes.success ? ledgerRes.balance : 0 };
          }),
        );
        setVendorsData(vendorsWithBalances);
      }
    } else if (user.role === "Vendor") {
      // Load specific vendor's ledger
      const branchName = user.branches[0]; // Assuming vendor checks balance for their primary branch
      const ledgerRes = await getLedgerData(user.id, branchName);
      if (ledgerRes.success) {
        setMyBalance(ledgerRes.balance);
        setMyLedger(ledgerRes.ledger);
      }
    }
    setLoading(false);
  };

  // --- RENDER FOR BRANCH ---
  const renderVendorCard = ({ item }) => (
    <TouchableOpacity
      style={styles.vendorCard}
      onPress={() =>
        navigation.navigate("VendorLedger", {
          vendor: item,
          branchName: user.branches[0],
          user,
        })
      }
    >
      <View style={styles.vendorIcon}>
        <Icon name="storefront" size={28} color="#2563EB" />
      </View>
      <View style={styles.vendorInfo}>
        <Text style={styles.vendorName}>{item.full_name || item.username}</Text>
        <Text style={styles.vendorDetail}>Tap to view ledger & pay</Text>
      </View>
      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>Outstanding</Text>
        <Text
          style={[
            styles.balanceAmount,
            { color: item.balance > 0 ? "#f44336" : "#4CAF50" },
          ]}
        >
          ₹{item.balance.toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // --- RENDER FOR VENDOR ---
  const renderLedgerItem = ({ item }) => (
    <View style={styles.ledgerCard}>
      <View style={styles.ledgerIconContainer}>
        <Icon
          name={
            item.ledgerType === "Purchase"
              ? "receipt"
              : "account-balance-wallet"
          }
          size={24}
          color={item.ledgerType === "Purchase" ? "#f44336" : "#4CAF50"}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.ledgerTitle}>
          {item.ledgerType === "Purchase"
            ? `Bill: ${item.item_name}`
            : "Payment Received"}
        </Text>
        <Text style={styles.ledgerDate}>
          {new Date(item.date).toLocaleDateString()}{" "}
          {new Date(item.date).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
        {item.remarks && (
          <Text style={styles.ledgerRemarks}>{item.remarks}</Text>
        )}
      </View>
      <Text
        style={[
          styles.ledgerAmount,
          { color: item.ledgerType === "Purchase" ? "#f44336" : "#4CAF50" },
        ]}
      >
        {item.ledgerType === "Purchase" ? "+" : "-"} ₹
        {parseFloat(item.value).toFixed(2)}
      </Text>
    </View>
  );

  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );

  return (
    <View style={styles.container}>
      {user.role === "Branch" || user.role === "Super Admin" ? (
        <FlatList
          data={vendorsData}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadData} />
          }
          contentContainerStyle={{ padding: 16 }}
          renderItem={renderVendorCard}
          ListHeaderComponent={
            <Text style={styles.pageTitle}>Vendor Balances</Text>
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No vendors assigned.</Text>
          }
        />
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.vendorHeaderCard}>
            <Text style={styles.vendorHeaderLabel}>
              Total Outstanding Balance
            </Text>
            <Text
              style={[
                styles.vendorHeaderAmount,
                { color: myBalance > 0 ? "#f44336" : "#4CAF50" },
              ]}
            >
              ₹{myBalance.toFixed(2)}
            </Text>
          </View>
          <FlatList
            data={myLedger}
            keyExtractor={(item, index) => index.toString()}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={loadData} />
            }
            contentContainerStyle={{ padding: 16 }}
            renderItem={renderLedgerItem}
            ListHeaderComponent={
              <Text style={[styles.pageTitle, { marginTop: 10 }]}>
                Transaction History
              </Text>
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>No transactions yet.</Text>
            }
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  pageTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 16,
  },
  emptyText: { textAlign: "center", color: "#64748B", marginTop: 20 },

  // Branch View Styles
  vendorCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },
  vendorIcon: {
    backgroundColor: "#E0F2FE",
    padding: 12,
    borderRadius: 25,
    marginRight: 12,
  },
  vendorInfo: { flex: 1 },
  vendorName: { fontSize: 16, fontWeight: "bold", color: "#1E293B" },
  vendorDetail: { fontSize: 12, color: "#64748B", marginTop: 2 },
  balanceContainer: { alignItems: "flex-end" },
  balanceLabel: {
    fontSize: 10,
    color: "#475569",
    textTransform: "uppercase",
    fontWeight: "bold",
  },
  balanceAmount: { fontSize: 18, fontWeight: "bold", marginTop: 2 },

  // Vendor View Styles
  vendorHeaderCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
  },
  vendorHeaderLabel: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  vendorHeaderAmount: { fontSize: 36, fontWeight: "bold", marginTop: 8 },
  ledgerCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
  },
  ledgerIconContainer: { marginRight: 12, width: 40, alignItems: "center" },
  ledgerTitle: { fontSize: 15, fontWeight: "bold", color: "#1E293B" },
  ledgerDate: { fontSize: 12, color: "#64748B", marginTop: 2 },
  ledgerRemarks: {
    fontSize: 12,
    color: "#475569",
    fontStyle: "italic",
    marginTop: 4,
  },
  ledgerAmount: { fontSize: 16, fontWeight: "bold" },
});

export default PaymentsTab;

