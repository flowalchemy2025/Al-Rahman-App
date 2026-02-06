import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
  Image,
} from "react-native";
import {
  getPurchaseEntries,
  signOut,
  getAllUsers,
  getAnalyticsData,
} from "../services/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";

const screenWidth = Dimensions.get("window").width;

const DashboardScreen = ({ navigation, route }) => {
  const [user, setUser] = useState(route.params?.user || null);
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState("date");
  const [workers, setWorkers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsDays, setAnalyticsDays] = useState(10);

  useEffect(() => {
    loadData();
    if (user?.role === "Super Admin") {
      loadUsers();
      loadAnalytics(analyticsDays);
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const filters = {};

    if (user?.role === "Worker") {
      filters.workerId = user.id;
    } else if (user?.role === "Vendor") {
      filters.vendorId = user.id;
    }

    if (selectedWorker) {
      filters.workerId = selectedWorker;
    }

    if (selectedVendor) {
      filters.vendorId = selectedVendor;
    }

    const result = await getPurchaseEntries(filters);
    setLoading(false);

    if (result.success) {
      setEntries(result.data);
      setFilteredEntries(result.data);
    } else {
      Alert.alert("Error", result.error);
    }
  };

  const loadUsers = async () => {
    const workersResult = await getAllUsers("Worker");
    const vendorsResult = await getAllUsers("Vendor");

    if (workersResult.success) {
      setWorkers(workersResult.data);
    }

    if (vendorsResult.success) {
      setVendors(vendorsResult.data);
    }
  };

  const loadAnalytics = async (days) => {
    const result = await getAnalyticsData(days);
    if (result.success) {
      processAnalyticsData(result.data, days);
    }
  };

  const processAnalyticsData = (data, days) => {
    const dayLabels = [];
    const amounts = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      dayLabels.push(date.getDate().toString());

      const dayTotal = data
        .filter((entry) => entry.created_at.split("T")[0] === dateStr)
        .reduce((sum, entry) => sum + parseFloat(entry.price || 0), 0);

      amounts.push(dayTotal);
    }

    setAnalyticsData({ labels: dayLabels, data: amounts });
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text === "") {
      setFilteredEntries(entries);
    } else {
      const filtered = entries.filter((entry) =>
        entry.item_name.toLowerCase().includes(text.toLowerCase()),
      );
      setFilteredEntries(filtered);
    }
  };

  const applySorting = () => {
    let sorted = [...filteredEntries];

    switch (sortBy) {
      case "date":
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case "price_high":
        sorted.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        break;
      case "price_low":
        sorted.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        break;
      case "name":
        sorted.sort((a, b) => a.item_name.localeCompare(b.item_name));
        break;
    }

    setFilteredEntries(sorted);
    setFilterModalVisible(false);
  };

  const applyFilters = () => {
    loadData();
    setFilterModalVisible(false);
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          await signOut();
          await AsyncStorage.removeItem("user");
          navigation.replace("Login");
        },
      },
    ]);
  };

  const renderEntry = ({ item }) => (
    <TouchableOpacity
      style={styles.entryCard}
      onPress={() => navigation.navigate("EditEntry", { entry: item, user })}
    >
      {item.image_url && (
        <Image source={{ uri: item.image_url }} style={styles.entryImage} />
      )}
      <View style={styles.entryContent}>
        <Text style={styles.entryTitle}>{item.item_name}</Text>
        <Text style={styles.entryDetail}>Quantity: {item.quantity}</Text>
        <Text style={styles.entryPrice}>
          ₹{parseFloat(item.price).toFixed(2)}
        </Text>

        {user?.role === "Super Admin" && (
          <>
            <Text style={styles.entryDetail}>
              Worker: {item.worker?.full_name || "N/A"}
            </Text>
            <Text style={styles.entryDetail}>
              Vendor: {item.vendor?.full_name || "N/A"}
            </Text>
          </>
        )}

        {user?.role === "Worker" && (
          <Text style={styles.entryDetail}>
            Vendor: {item.vendor?.full_name || "N/A"}
          </Text>
        )}

        {user?.role === "Vendor" && (
          <Text style={styles.entryDetail}>
            Worker: {item.worker?.full_name || "N/A"}
          </Text>
        )}

        <Text style={styles.entryDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            {user?.full_name} ({user?.role})
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Icon name="logout" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Analytics Chart for Super Admin */}
      {user?.role === "Super Admin" && analyticsData && (
        <View style={styles.analyticsContainer}>
          <View style={styles.analyticsHeader}>
            <Text style={styles.analyticsTitle}>Purchase Analytics</Text>
            <View style={styles.daysSelector}>
              {[7, 10, 14].map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.daysButton,
                    analyticsDays === days && styles.daysButtonActive,
                  ]}
                  onPress={() => {
                    setAnalyticsDays(days);
                    loadAnalytics(days);
                  }}
                >
                  <Text
                    style={[
                      styles.daysButtonText,
                      analyticsDays === days && styles.daysButtonTextActive,
                    ]}
                  >
                    {days}d
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <LineChart
              data={{
                labels: analyticsData.labels,
                datasets: [{ data: analyticsData.data }],
              }}
              width={Math.max(
                screenWidth - 40,
                analyticsData.labels.length * 50,
              )}
              height={200}
              chartConfig={{
                backgroundColor: "#4CAF50",
                backgroundGradientFrom: "#4CAF50",
                backgroundGradientTo: "#45a049",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: { borderRadius: 16 },
              }}
              bezier
              style={styles.chart}
            />
          </ScrollView>
          <Text style={styles.totalAmount}>
            Total: ₹{analyticsData.data.reduce((a, b) => a + b, 0).toFixed(2)}
          </Text>
        </View>
      )}

      {/* Search and Filter Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items..."
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Icon name="filter-list" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Entries List */}
      <FlatList
        data={filteredEntries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadData} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="inbox" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No entries found</Text>
          </View>
        }
      />

      {/* Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddItem", { user })}
      >
        <Icon name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter & Sort</Text>

            <Text style={styles.filterLabel}>Sort By:</Text>
            <View style={styles.sortOptions}>
              {[
                { value: "date", label: "Date" },
                { value: "price_high", label: "Price (High-Low)" },
                { value: "price_low", label: "Price (Low-High)" },
                { value: "name", label: "Name" },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.sortOption,
                    sortBy === option.value && styles.sortOptionActive,
                  ]}
                  onPress={() => setSortBy(option.value)}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      sortBy === option.value && styles.sortOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {user?.role === "Super Admin" && (
              <>
                <Text style={styles.filterLabel}>Filter by Worker:</Text>
                <ScrollView horizontal style={styles.userScroll}>
                  <TouchableOpacity
                    style={[
                      styles.userChip,
                      !selectedWorker && styles.userChipActive,
                    ]}
                    onPress={() => setSelectedWorker(null)}
                  >
                    <Text style={styles.userChipText}>All</Text>
                  </TouchableOpacity>
                  {workers.map((worker) => (
                    <TouchableOpacity
                      key={worker.id}
                      style={[
                        styles.userChip,
                        selectedWorker === worker.id && styles.userChipActive,
                      ]}
                      onPress={() => setSelectedWorker(worker.id)}
                    >
                      <Text style={styles.userChipText}>
                        {worker.full_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.filterLabel}>Filter by Vendor:</Text>
                <ScrollView horizontal style={styles.userScroll}>
                  <TouchableOpacity
                    style={[
                      styles.userChip,
                      !selectedVendor && styles.userChipActive,
                    ]}
                    onPress={() => setSelectedVendor(null)}
                  >
                    <Text style={styles.userChipText}>All</Text>
                  </TouchableOpacity>
                  {vendors.map((vendor) => (
                    <TouchableOpacity
                      key={vendor.id}
                      style={[
                        styles.userChip,
                        selectedVendor === vendor.id && styles.userChipActive,
                      ]}
                      onPress={() => setSelectedVendor(vendor.id)}
                    >
                      <Text style={styles.userChipText}>
                        {vendor.full_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  applySorting();
                  applyFilters();
                }}
              >
                <Text style={styles.modalButtonText}>Apply</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#4CAF50",
    padding: 20,
    paddingTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
    marginTop: 4,
  },
  analyticsContainer: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  analyticsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  daysSelector: {
    flexDirection: "row",
    gap: 8,
  },
  daysButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  daysButtonActive: {
    backgroundColor: "#4CAF50",
  },
  daysButtonText: {
    color: "#4CAF50",
    fontWeight: "600",
  },
  daysButtonTextActive: {
    color: "#fff",
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4CAF50",
    textAlign: "center",
    marginTop: 8,
  },
  searchContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filterButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  entryCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  entryImage: {
    width: "100%",
    height: 150,
    backgroundColor: "#f0f0f0",
  },
  entryContent: {
    padding: 12,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  entryDetail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  entryPrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4CAF50",
    marginVertical: 4,
  },
  entryDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 16,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#4CAF50",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  sortOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sortOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4CAF50",
    backgroundColor: "#fff",
  },
  sortOptionActive: {
    backgroundColor: "#4CAF50",
  },
  sortOptionText: {
    color: "#4CAF50",
    fontWeight: "600",
  },
  sortOptionTextActive: {
    color: "#fff",
  },
  userScroll: {
    marginBottom: 8,
  },
  userChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#4CAF50",
    marginRight: 8,
    backgroundColor: "#fff",
  },
  userChipActive: {
    backgroundColor: "#4CAF50",
  },
  userChipText: {
    color: "#4CAF50",
    fontWeight: "600",
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonSecondary: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalButtonTextSecondary: {
    color: "#4CAF50",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default DashboardScreen;
