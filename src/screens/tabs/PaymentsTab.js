import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { supabase, getLedgerData } from "../../services/supabase";
import { paymentsTabStyles as styles } from "../../styles";
import { COLORS } from "../../styles/theme";

// Enable LayoutAnimation for Android accordion effect
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PaymentsTab = ({ user, navigation }) => {
  const [loading, setLoading] = useState(true);

  // Super Admin State
  const [superAdminData, setSuperAdminData] = useState([]);
  const [expandedBranch, setExpandedBranch] = useState(null);

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

    if (user.role === "Super Admin") {
      // 1. Get all vendors
      const { data: allVendors } = await supabase
        .from("users")
        .select("*")
        .eq("role", "Vendor");

      if (allVendors) {
        // 2. Extract unique branches
        const branchSet = new Set();
        allVendors.forEach((v) => {
          if (v.branches) v.branches.forEach((b) => branchSet.add(b));
        });
        const uniqueBranches = Array.from(branchSet);

        // 3. Group vendors by branch and calculate balances
        const groupedData = await Promise.all(
          uniqueBranches.map(async (branchName) => {
            const branchVendors = allVendors.filter(
              (v) => v.branches && v.branches.includes(branchName),
            );

            const vendorsWithBalances = await Promise.all(
              branchVendors.map(async (v) => {
                const ledgerRes = await getLedgerData(v.id, branchName);
                return {
                  ...v,
                  balance: ledgerRes.success ? ledgerRes.balance : 0,
                };
              }),
            );

            const branchTotal = vendorsWithBalances.reduce(
              (sum, v) => sum + v.balance,
              0,
            );

            return {
              branchName,
              totalOutstanding: branchTotal,
              vendors: vendorsWithBalances,
            };
          }),
        );
        setSuperAdminData(groupedData);
      }
    } else if (user.role === "Branch") {
      const branchName = user.branches[0];
      const { data: vendors } = await supabase
        .from("users")
        .select("*")
        .eq("role", "Vendor")
        .contains("branches", [branchName]);

      if (vendors) {
        const vendorsWithBalances = await Promise.all(
          vendors.map(async (v) => {
            const ledgerRes = await getLedgerData(v.id, branchName);
            return { ...v, balance: ledgerRes.success ? ledgerRes.balance : 0 };
          }),
        );
        setVendorsData(vendorsWithBalances);
      }
    } else if (user.role === "Vendor") {
      const branchName = user.branches[0];
      const ledgerRes = await getLedgerData(user.id, branchName);
      if (ledgerRes.success) {
        setMyBalance(ledgerRes.balance);
        setMyLedger(ledgerRes.ledger);
      }
    }
    setLoading(false);
  };

  const toggleBranchExpand = (branchName) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedBranch(expandedBranch === branchName ? null : branchName);
  };

  // --- REUSABLE VENDOR ROW ---
  const renderVendorRow = (vendor, branchName) => (
    <TouchableOpacity
      key={vendor.id}
      style={styles.vendorCard}
      onPress={() =>
        navigation.navigate("VendorLedger", { vendor, branchName, user })
      }
    >
      <View style={styles.vendorIcon}>
        <Icon name="storefront" size={28} color={COLORS.accentSoft} />
      </View>
      <View style={styles.vendorInfo}>
        <Text style={styles.vendorName}>
          {vendor.full_name || vendor.username}
        </Text>
        <Text style={styles.vendorDetail}>Tap to view ledger & pay</Text>
      </View>
      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>Outstanding</Text>
        <Text
          style={[
            styles.balanceAmount,
            { color: vendor.balance > 0 ? COLORS.danger : COLORS.success },
          ]}
        >
          ₹{vendor.balance.toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // --- RENDER FOR SUPER ADMIN ---
  const renderAdminBranchGroup = ({ item }) => {
    const isExpanded = expandedBranch === item.branchName;
    return (
      <View style={styles.adminBranchContainer}>
        <TouchableOpacity
          style={styles.adminBranchHeader}
          onPress={() => toggleBranchExpand(item.branchName)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.adminBranchName}>{item.branchName}</Text>
            <Text style={styles.adminBranchSub}>
              Total Outstanding:{" "}
              <Text
                style={{
                  color:
                    item.totalOutstanding > 0 ? COLORS.danger : COLORS.success,
                  fontWeight: "bold",
                }}
              >
                ₹{item.totalOutstanding.toFixed(2)}
              </Text>
            </Text>
          </View>
          <Icon
            name={isExpanded ? "expand-less" : "expand-more"}
            size={28}
            color={COLORS.legacy5}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.adminExpandedContent}>
            {item.vendors.length > 0 ? (
              item.vendors.map((v) => renderVendorRow(v, item.branchName))
            ) : (
              <Text style={styles.emptyText}>No vendors in this branch.</Text>
            )}
          </View>
        )}
      </View>
    );
  };

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
          color={item.ledgerType === "Purchase" ? COLORS.danger : COLORS.success}
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
          {
            color:
              item.ledgerType === "Purchase" ? COLORS.danger : COLORS.success,
          },
        ]}
      >
        {item.ledgerType === "Purchase" ? "+" : "-"} ₹
        {parseFloat(item.value).toFixed(2)}
      </Text>
    </View>
  );

  if (
    loading &&
    !superAdminData.length &&
    !vendorsData.length &&
    !myLedger.length
  ) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accentSoft} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {user.role === "Super Admin" ? (
        <FlatList
          data={superAdminData}
          keyExtractor={(item) => item.branchName}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadData} />
          }
          contentContainerStyle={{ padding: 16 }}
          renderItem={renderAdminBranchGroup}
          ListHeaderComponent={
            <Text style={styles.pageTitle}>All Branches Overview</Text>
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No branches or vendors found.</Text>
          }
        />
      ) : user.role === "Branch" ? (
        <FlatList
          data={vendorsData}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadData} />
          }
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => renderVendorRow(item, user.branches[0])}
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
                { color: myBalance > 0 ? COLORS.danger : COLORS.success },
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

export default PaymentsTab;
