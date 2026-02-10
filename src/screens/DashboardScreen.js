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
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
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

const screenWidth = Dimensions.get("window").width;

const DashboardScreen = ({ navigation, route }) => {
  const [user, setUser] = useState(route.params?.user || null);
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState("date");

  // Analytics
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsDays, setAnalyticsDays] = useState(10);

  // Filter Data
  const [workers, setWorkers] = useState([]);
  const [vendors, setVendors] = useState([]);

  // Selected Filter IDs
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);

  // Searchable Dropdown States for Filters
  const [workerQuery, setWorkerQuery] = useState("");
  const [vendorQuery, setVendorQuery] = useState("");
  const [filteredWorkers, setFilteredWorkers] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

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
      setFilteredWorkers(workersResult.data);
    }

    if (vendorsResult.success) {
      setVendors(vendorsResult.data);
      setFilteredVendors(vendorsResult.data);
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

  // Filter Search Logic
  const handleWorkerSearch = (text) => {
    setWorkerQuery(text);
    setSelectedWorker(null); // Reset selection on type
    if (text) {
      setFilteredWorkers(
        workers.filter((w) =>
          w.full_name.toLowerCase().includes(text.toLowerCase()),
        ),
      );
    } else {
      setFilteredWorkers(workers);
    }
    setShowWorkerDropdown(true);
  };

  const handleVendorSearch = (text) => {
    setVendorQuery(text);
    setSelectedVendor(null); // Reset selection on type
    if (text) {
      setFilteredVendors(
        vendors.filter((v) =>
          v.full_name.toLowerCase().includes(text.toLowerCase()),
        ),
      );
    } else {
      setFilteredVendors(vendors);
    }
    setShowVendorDropdown(true);
  };

  const selectWorker = (worker) => {
    setSelectedWorker(worker.id);
    setWorkerQuery(worker.full_name);
    setShowWorkerDropdown(false);
    Keyboard.dismiss();
  };

  const selectVendor = (vendor) => {
    setSelectedVendor(vendor.id);
    setVendorQuery(vendor.full_name);
    setShowVendorDropdown(false);
    Keyboard.dismiss();
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

  const renderEntry = ({ item }) => {
    // Handle comma-separated images, take the first one
    const firstImage = item.image_url ? item.image_url.split(",")[0] : null;

    return (
      <TouchableOpacity
        style={styles.entryCardCompact}
        onPress={() => navigation.navigate("EditEntry", { entry: item, user })}
      >
        <Image
          source={
            firstImage
              ? { uri: firstImage }
              : { uri: "https://via.placeholder.com/80" }
          }
          style={styles.entryImageCompact}
        />

        <View style={styles.entryContentCompact}>
          <View style={styles.entryHeaderCompact}>
            <Text style={styles.entryTitleCompact} numberOfLines={1}>
              {item.item_name}
            </Text>
            <Text style={styles.entryPriceCompact}>
              ₹{parseFloat(item.price).toFixed(2)}
            </Text>
          </View>

          <Text style={styles.entryDetailCompact}>Qty: {item.quantity}</Text>

          <View style={styles.entryMetaCompact}>
            <Text style={styles.entryDateCompact}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>

            {user?.role === "Super Admin" && (
              <Text style={styles.entryRoleCompact} numberOfLines={1}>
                {item.worker?.full_name?.split(" ")[0]} →{" "}
                {item.vendor?.full_name?.split(" ")[0]}
              </Text>
            )}

            {user?.role === "Worker" && (
              <Text style={styles.entryRoleCompact} numberOfLines={1}>
                To: {item.vendor?.full_name}
              </Text>
            )}
            {user?.role === "Vendor" && (
              <Text style={styles.entryRoleCompact} numberOfLines={1}>
                From: {item.worker?.full_name}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
              height={180}
              chartConfig={{
                backgroundColor: "#76B7EF",
                backgroundGradientFrom: "#76B7EF",
                backgroundGradientTo: "#76B7EF",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: { r: "4" },
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
        contentContainerStyle={{ paddingBottom: 100 }}
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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
                  <View style={styles.dropdownContainer}>
                    <TextInput
                      style={styles.dropdownInput}
                      placeholder="Search Worker..."
                      value={workerQuery}
                      onChangeText={handleWorkerSearch}
                      onFocus={() => setShowWorkerDropdown(true)}
                    />
                    {showWorkerDropdown && (
                      <View style={styles.dropdownList}>
                        <TouchableOpacity
                          style={styles.dropdownItem}
                          onPress={() => {
                            setSelectedWorker(null);
                            setWorkerQuery("");
                            setShowWorkerDropdown(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownText,
                              { fontStyle: "italic" },
                            ]}
                          >
                            All Workers
                          </Text>
                        </TouchableOpacity>
                        {filteredWorkers.slice(0, 5).map((item) => (
                          <TouchableOpacity
                            key={item.id}
                            style={styles.dropdownItem}
                            onPress={() => selectWorker(item)}
                          >
                            <Text style={styles.dropdownText}>
                              {item.full_name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  <Text style={styles.filterLabel}>Filter by Vendor:</Text>
                  <View style={[styles.dropdownContainer, { zIndex: -1 }]}>
                    <TextInput
                      style={styles.dropdownInput}
                      placeholder="Search Vendor..."
                      value={vendorQuery}
                      onChangeText={handleVendorSearch}
                      onFocus={() => setShowVendorDropdown(true)}
                    />
                    {showVendorDropdown && (
                      <View style={styles.dropdownList}>
                        <TouchableOpacity
                          style={styles.dropdownItem}
                          onPress={() => {
                            setSelectedVendor(null);
                            setVendorQuery("");
                            setShowVendorDropdown(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownText,
                              { fontStyle: "italic" },
                            ]}
                          >
                            All Vendors
                          </Text>
                        </TouchableOpacity>
                        {filteredVendors.slice(0, 5).map((item) => (
                          <TouchableOpacity
                            key={item.id}
                            style={styles.dropdownItem}
                            onPress={() => selectVendor(item)}
                          >
                            <Text style={styles.dropdownText}>
                              {item.full_name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
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
        </TouchableWithoutFeedback>
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
    backgroundColor: "#76B7EF",
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
    borderColor: "#76B7EF",
  },
  daysButtonActive: {
    backgroundColor: "#76B7EF",
  },
  daysButtonText: {
    color: "#76B7EF",
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
    color: "#76B7EF",
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
    backgroundColor: "#76B7EF",
    borderRadius: 8,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  // Compact Card Styles
  entryCardCompact: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    flexDirection: "row", // Horizontal layout
    height: 100, // Fixed reduced height
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  entryImageCompact: {
    width: 100,
    height: "100%",
    backgroundColor: "#eee",
  },
  entryContentCompact: {
    flex: 1,
    padding: 10,
    justifyContent: "space-between",
  },
  entryHeaderCompact: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  entryTitleCompact: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  entryPriceCompact: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#76B7EF",
  },
  entryDetailCompact: {
    fontSize: 13,
    color: "#666",
  },
  entryMetaCompact: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  entryDateCompact: {
    fontSize: 11,
    color: "#999",
  },
  entryRoleCompact: {
    fontSize: 11,
    color: "#76B7EF",
    fontWeight: "500",
    maxWidth: 120,
  },

  // Empty State
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
    backgroundColor: "#76B7EF",
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
    maxHeight: "90%",
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
    borderColor: "#76B7EF",
    backgroundColor: "#fff",
  },
  sortOptionActive: {
    backgroundColor: "#76B7EF",
  },
  sortOptionText: {
    color: "#76B7EF",
    fontWeight: "600",
  },
  sortOptionTextActive: {
    color: "#fff",
  },

  // New Dropdown Styles for Modal
  dropdownContainer: {
    position: "relative",
    zIndex: 10, // Ensure it floats above
  },
  dropdownInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  dropdownList: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    maxHeight: 150,
    elevation: 5,
    zIndex: 100,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  dropdownText: {
    fontSize: 16,
    color: "#333",
  },

  modalButtons: {
    flexDirection: "row",
    marginTop: 24,
    gap: 12,
    zIndex: -1,
  },
  modalButton: {
    flex: 1,
    backgroundColor: "#76B7EF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonSecondary: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#76B7EF",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalButtonTextSecondary: {
    color: "#76B7EF",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default DashboardScreen;
