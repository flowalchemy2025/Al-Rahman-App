import React, { useState, useEffect } from "react";
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
  ActivityIndicator,
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

  // Tabs State
  const [activeTab, setActiveTab] = useState(0);

  // Data States
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState("date");

  // Filter Logic Data
  const [workers, setWorkers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [workerQuery, setWorkerQuery] = useState("");
  const [vendorQuery, setVendorQuery] = useState("");
  const [filteredWorkers, setFilteredWorkers] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  // 1. Initialize user if missing (fixes the null crash)
  useEffect(() => {
    const initializeUser = async () => {
      if (!user) {
        try {
          const userStr = await AsyncStorage.getItem("user");
          if (userStr) {
            setUser(JSON.parse(userStr));
          } else {
            navigation.replace("Login");
          }
        } catch (error) {
          navigation.replace("Login");
        }
      }
    };
    initializeUser();
  }, []);

  // 2. Load data ONLY when user is available
  useEffect(() => {
    if (!user) return; // Guard clause

    loadData();
    loadUsers();
    if (user.role === "Super Admin") {
      loadAnalytics();
    }
  }, [user]);

  // 3. Filter data ONLY when user is available
  useEffect(() => {
    if (!user) return; // Guard clause

    filterByTab();
  }, [activeTab, entries, user]);

  const loadData = async () => {
    setLoading(true);
    const filters = {};

    if (user?.role === "Worker") filters.workerId = user.id;
    if (user?.role === "Vendor") filters.vendorId = user.id;
    if (selectedWorker) filters.workerId = selectedWorker;
    if (selectedVendor) filters.vendorId = selectedVendor;

    const result = await getPurchaseEntries(filters);
    setLoading(false);

    if (result.success) {
      setEntries(result.data);
    } else {
      Alert.alert("Error", result.error);
    }
  };

  const loadUsers = async () => {
    const wRes = await getAllUsers("Worker");
    const vRes = await getAllUsers("Vendor");
    if (wRes.success) {
      setWorkers(wRes.data);
      setFilteredWorkers(wRes.data);
    }
    if (vRes.success) {
      setVendors(vRes.data);
      setFilteredVendors(vRes.data);
    }
  };

  const loadAnalytics = async () => {
    const result = await getAnalyticsData(10);
    if (result.success) processAnalyticsData(result.data);
  };

  const processAnalyticsData = (data) => {
    const dayLabels = [];
    const amounts = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      dayLabels.push(date.getDate().toString());
      const dayTotal = data
        .filter((entry) => entry.created_at.split("T")[0] === dateStr)
        .reduce((sum, entry) => sum + parseFloat(entry.price || 0), 0);
      amounts.push(dayTotal);
    }
    setAnalyticsData({ labels: dayLabels, data: amounts, raw: data });
  };

  const filterByTab = () => {
    if (!user) return; // Final guard to prevent crash

    let result = [...entries];

    if (user.role !== "Super Admin") {
      if (activeTab === 0) {
        result = result.filter((e) => e.created_by === user.id);
      } else {
        result = result.filter((e) => e.created_by !== user.id);
      }
    }

    if (searchQuery) {
      result = result.filter((e) =>
        e.item_name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (sortBy === "price_high") result.sort((a, b) => b.price - a.price);
    else if (sortBy === "price_low") result.sort((a, b) => a.price - b.price);
    else if (sortBy === "name")
      result.sort((a, b) => a.item_name.localeCompare(b.item_name));
    else result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setFilteredEntries(result);
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel" },
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

  const handleWorkerSearch = (text) => {
    setWorkerQuery(text);
    setSelectedWorker(null);
    text
      ? setFilteredWorkers(
          workers.filter((w) =>
            w.full_name.toLowerCase().includes(text.toLowerCase()),
          ),
        )
      : setFilteredWorkers(workers);
    setShowWorkerDropdown(true);
  };

  const handleVendorSearch = (text) => {
    setVendorQuery(text);
    setSelectedVendor(null);
    text
      ? setFilteredVendors(
          vendors.filter((v) =>
            v.full_name.toLowerCase().includes(text.toLowerCase()),
          ),
        )
      : setFilteredVendors(vendors);
    setShowVendorDropdown(true);
  };

  const renderEntry = ({ item }) => {
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
            <Text style={styles.entryRoleCompact} numberOfLines={1}>
              {user.role === "Super Admin"
                ? `${item.worker?.full_name?.split(" ")[0]} → ${item.vendor?.full_name?.split(" ")[0]}`
                : user.role === "Worker"
                  ? `To: ${item.vendor?.full_name}`
                  : `From: ${item.worker?.full_name}`}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderAnalytics = () => (
    <ScrollView style={styles.analyticsScroll}>
      {analyticsData && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Sales Overview (Last 7 Days)</Text>
          <LineChart
            data={{
              labels: analyticsData.labels,
              datasets: [{ data: analyticsData.data }],
            }}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              backgroundColor: "#fff",
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(118, 183, 239, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              propsForDots: { r: "5", strokeWidth: "2", stroke: "#76B7EF" },
            }}
            bezier
            style={styles.chart}
          />
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Sales</Text>
              <Text style={styles.statValue}>
                ₹{analyticsData.data.reduce((a, b) => a + b, 0).toFixed(0)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Txns</Text>
              <Text style={styles.statValue}>{analyticsData.raw.length}</Text>
            </View>
          </View>
        </View>
      )}
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  // Show a loading spinner while pulling user from storage to avoid flashing UI
  if (!user) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#76B7EF" />
      </View>
    );
  }

  const tabs =
    user.role === "Super Admin"
      ? ["Analytics", "Items Purchase"]
      : user.role === "Vendor"
        ? ["My Items", "Workers Items"]
        : ["My Items", "Vendors Items"];

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.headerTitle}>{user.role} Dashboard</Text>
            <Text style={styles.headerSubtitle}>Welcome, {user.full_name}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Icon name="logout" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabBar}>
          {tabs.map((tab, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.tabItem,
                activeTab === index && styles.tabItemActive,
              ]}
              onPress={() => setActiveTab(index)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === index && styles.tabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.contentContainer}>
        {user.role === "Super Admin" && activeTab === 0 ? (
          renderAnalytics()
        ) : (
          <>
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Icon name="search" size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search items..."
                  value={searchQuery}
                  onChangeText={(t) => {
                    setSearchQuery(t);
                    filterByTab();
                  }}
                />
              </View>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setFilterModalVisible(true)}
              >
                <Icon name="filter-list" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

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
                  <Text style={styles.emptyText}>
                    No items found in this category.
                  </Text>
                </View>
              }
            />

            <TouchableOpacity
              style={styles.fab}
              onPress={() => navigation.navigate("AddItem", { user })}
            >
              <Icon name="add" size={28} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </View>

      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Filter & Sort</Text>

              <Text style={styles.filterLabel}>Sort By:</Text>
              <View style={styles.sortOptions}>
                {[
                  { value: "date", label: "Date" },
                  { value: "price_high", label: "Price (High-Low)" },
                  { value: "price_low", label: "Price (Low-High)" },
                  { value: "name", label: "Name" },
                ].map((o) => (
                  <TouchableOpacity
                    key={o.value}
                    style={[
                      styles.sortOption,
                      sortBy === o.value && styles.sortOptionActive,
                    ]}
                    onPress={() => setSortBy(o.value)}
                  >
                    <Text
                      style={[
                        styles.sortText,
                        sortBy === o.value && styles.sortTextActive,
                      ]}
                    >
                      {o.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterLabel}>Filter by Worker:</Text>
              <View style={styles.dropdownWrap}>
                <TextInput
                  style={styles.ddInput}
                  placeholder="Search Worker..."
                  value={workerQuery}
                  onChangeText={handleWorkerSearch}
                  onFocus={() => setShowWorkerDropdown(true)}
                />
                {showWorkerDropdown && (
                  <View style={styles.ddList}>
                    <TouchableOpacity
                      style={styles.ddItem}
                      onPress={() => {
                        setSelectedWorker(null);
                        setWorkerQuery("");
                        setShowWorkerDropdown(false);
                      }}
                    >
                      <Text style={[styles.ddText, { fontStyle: "italic" }]}>
                        All Workers
                      </Text>
                    </TouchableOpacity>
                    {filteredWorkers.slice(0, 5).map((i) => (
                      <TouchableOpacity
                        key={i.id}
                        style={styles.ddItem}
                        onPress={() => {
                          setSelectedWorker(i.id);
                          setWorkerQuery(i.full_name);
                          setShowWorkerDropdown(false);
                        }}
                      >
                        <Text style={styles.ddText}>{i.full_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <Text style={styles.filterLabel}>Filter by Vendor:</Text>
              <View style={[styles.dropdownWrap, { zIndex: -1 }]}>
                <TextInput
                  style={styles.ddInput}
                  placeholder="Search Vendor..."
                  value={vendorQuery}
                  onChangeText={handleVendorSearch}
                  onFocus={() => setShowVendorDropdown(true)}
                />
                {showVendorDropdown && (
                  <View style={styles.ddList}>
                    <TouchableOpacity
                      style={styles.ddItem}
                      onPress={() => {
                        setSelectedVendor(null);
                        setVendorQuery("");
                        setShowVendorDropdown(false);
                      }}
                    >
                      <Text style={[styles.ddText, { fontStyle: "italic" }]}>
                        All Vendors
                      </Text>
                    </TouchableOpacity>
                    {filteredVendors.slice(0, 5).map((i) => (
                      <TouchableOpacity
                        key={i.id}
                        style={styles.ddItem}
                        onPress={() => {
                          setSelectedVendor(i.id);
                          setVendorQuery(i.full_name);
                          setShowVendorDropdown(false);
                        }}
                      >
                        <Text style={styles.ddText}>{i.full_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={() => {
                    loadData();
                    setFilterModalVisible(false);
                  }}
                >
                  <Text style={styles.btnText}>Apply Filters</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setFilterModalVisible(false)}
                >
                  <Text style={styles.cancelText}>Close</Text>
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
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  headerContainer: {
    backgroundColor: "#76B7EF",
    paddingTop: 40,
    paddingBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    elevation: 4,
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 13, color: "#e3f2fd", marginTop: 2 },
  logoutBtn: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
  },

  tabBar: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 25,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 20,
  },
  tabItemActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    elevation: 2,
  },
  tabText: { color: "rgba(255,255,255,0.8)", fontWeight: "600", fontSize: 14 },
  tabTextActive: { color: "#76B7EF", fontWeight: "bold" },

  contentContainer: { flex: 1 },

  analyticsScroll: { padding: 16 },
  chartContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  statCard: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  statLabel: { fontSize: 12, color: "#666", marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: "bold", color: "#76B7EF" },
  chart: { marginVertical: 8, borderRadius: 16 },

  searchContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    alignItems: "center",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 45,
    elevation: 2,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  filterButton: {
    backgroundColor: "#76B7EF",
    borderRadius: 10,
    width: 45,
    height: 45,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },

  entryCardCompact: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    flexDirection: "row",
    height: 90,
    overflow: "hidden",
    elevation: 2,
  },
  entryImageCompact: { width: 90, height: "100%", backgroundColor: "#eee" },
  entryContentCompact: {
    flex: 1,
    padding: 10,
    justifyContent: "space-between",
  },
  entryHeaderCompact: { flexDirection: "row", justifyContent: "space-between" },
  entryTitleCompact: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  entryPriceCompact: { fontSize: 15, fontWeight: "bold", color: "#76B7EF" },
  entryDetailCompact: { fontSize: 13, color: "#666" },
  entryMetaCompact: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  entryDateCompact: { fontSize: 11, color: "#999" },
  entryRoleCompact: { fontSize: 11, color: "#76B7EF", fontWeight: "600" },

  emptyContainer: { alignItems: "center", marginTop: 80 },
  emptyText: { color: "#999", marginTop: 10 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#76B7EF",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginTop: 12,
    marginBottom: 8,
  },
  sortOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sortOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#76B7EF",
  },
  sortOptionActive: { backgroundColor: "#76B7EF" },
  sortText: { color: "#76B7EF", fontSize: 13, fontWeight: "600" },
  sortTextActive: { color: "#fff" },

  dropdownWrap: { position: "relative", zIndex: 10 },
  ddInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#f9f9f9",
  },
  ddList: {
    position: "absolute",
    top: 45,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    maxHeight: 150,
    zIndex: 100,
    elevation: 5,
  },
  ddItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  ddText: { fontSize: 14, color: "#333" },

  modalButtons: { flexDirection: "row", marginTop: 24, gap: 12 },
  applyBtn: {
    flex: 1,
    backgroundColor: "#76B7EF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#76B7EF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "bold" },
  cancelText: { color: "#76B7EF", fontWeight: "bold" },
});

export default DashboardScreen;
