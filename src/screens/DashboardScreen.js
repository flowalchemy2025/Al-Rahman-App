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
  verifyPurchaseEntry,
} from "../services/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

const DashboardScreen = ({ navigation, route }) => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState("date");
  const [statusFilter, setStatusFilter] = useState("All");

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

  // Image Viewer State
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentViewImage, setCurrentViewImage] = useState(null);

  useEffect(() => {
    const initUser = async () => {
      if (!route.params?.user) {
        const userStr = await AsyncStorage.getItem("user");
        if (userStr) setUser(JSON.parse(userStr));
        else navigation.replace("Login");
      } else {
        setUser(route.params.user);
      }
    };
    initUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    loadData();
    loadUsers();
    if (user.role === "Super Admin") loadAnalytics();
  }, [user]);

  useEffect(() => {
    if (user) filterByTab();
  }, [
    activeTab,
    entries,
    user,
    searchQuery,
    sortBy,
    statusFilter,
    selectedWorker,
    selectedVendor,
  ]);

  const loadData = async () => {
    setLoading(true);
    const result = await getPurchaseEntries({});
    setLoading(false);
    if (result.success) setEntries(result.data);
    else Alert.alert("Error", result.error);
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
      amounts.push(
        data
          .filter((e) => e.created_at.split("T")[0] === dateStr)
          .reduce((s, e) => s + parseFloat(e.price || 0), 0),
      );
    }
    setAnalyticsData({ labels: dayLabels, data: amounts, raw: data });
  };

  const handleVerifyItem = async (id) => {
    setLoading(true);
    const res = await verifyPurchaseEntry(id);
    if (res.success) loadData();
    else Alert.alert("Error", "Could not verify item.");
    setLoading(false);
  };

  // MISSING FUNCTIONS ADDED HERE
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

  const filterByTab = () => {
    let result = [...entries];

    if (user.role === "Super Admin") {
      if (statusFilter !== "All")
        result = result.filter((e) => e.status === statusFilter);
      if (selectedWorker)
        result = result.filter((e) => e.worker_id === selectedWorker);
      if (selectedVendor)
        result = result.filter((e) => e.vendor_id === selectedVendor);
    } else {
      if (activeTab === 0) {
        result = result.filter((e) => e.created_by === user.id);
      } else {
        if (user.role === "Worker")
          result = result.filter(
            (e) => e.worker_id === user.id && e.created_by !== user.id,
          );
        if (user.role === "Vendor")
          result = result.filter(
            (e) => e.vendor_id === user.id && e.created_by !== user.id,
          );
      }
    }

    if (searchQuery)
      result = result.filter((e) =>
        e.item_name.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    if (sortBy === "price_high") result.sort((a, b) => b.price - a.price);
    else if (sortBy === "price_low") result.sort((a, b) => a.price - b.price);
    else if (sortBy === "name")
      result.sort((a, b) => a.item_name.localeCompare(b.item_name));
    else result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setFilteredEntries(result);
  };

  const renderEntry = ({ item }) => {
    const firstImage = item.image_url ? item.image_url.split(",")[0] : null;
    const isPending = item.status === "Pending";

    const canVerify =
      isPending &&
      user.role !== "Super Admin" &&
      item.created_by !== user.id &&
      ((user.role === "Worker" && item.worker_id === user.id) ||
        (user.role === "Vendor" && item.vendor_id === user.id));

    return (
      <TouchableOpacity
        style={styles.entryCardCompact}
        onPress={() => navigation.navigate("EditEntry", { entry: item, user })}
      >
        <TouchableOpacity
          onPress={() => {
            setCurrentViewImage(firstImage);
            setViewerVisible(true);
          }}
        >
          <Image
            source={
              firstImage
                ? { uri: firstImage }
                : { uri: "https://via.placeholder.com/90" }
            }
            style={styles.entryImageCompact}
          />
        </TouchableOpacity>

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

            {canVerify ? (
              <TouchableOpacity
                style={styles.verifyBtnSmall}
                onPress={() => handleVerifyItem(item.id)}
              >
                <Text style={styles.verifyBtnText}>Verify</Text>
              </TouchableOpacity>
            ) : (
              <View
                style={[
                  styles.statusBadge,
                  isPending ? styles.badgePending : styles.badgeVerified,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    isPending ? styles.textPending : styles.textVerified,
                  ]}
                >
                  {item.status || "Verified"}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.entryRoleCompact} numberOfLines={1}>
            {user.role === "Super Admin"
              ? `${item.worker?.full_name?.split(" ")[0] || "Local"} ↔ ${item.vendor?.full_name?.split(" ")[0] || "None"}`
              : user.role === "Worker"
                ? `Vendor: ${item.vendor?.full_name || "Local Shop"}`
                : `Worker: ${item.worker?.full_name || "None"}`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!user)
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
          <TouchableOpacity
            onPress={() => {
              signOut();
              AsyncStorage.removeItem("user");
              navigation.replace("Login");
            }}
            style={styles.logoutBtn}
          >
            <Icon name="logout" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabBar}>
          {tabs.map((tab, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.tabItem, activeTab === i && styles.tabItemActive]}
              onPress={() => setActiveTab(i)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === i && styles.tabTextActive,
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
          <ScrollView style={styles.analyticsScroll}>
            {analyticsData && (
              <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>
                  Sales Overview (Last 7 Days)
                </Text>
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
                    color: (o = 1) => `rgba(118, 183, 239, ${o})`,
                    labelColor: (o = 1) => `rgba(0, 0, 0, ${o})`,
                    propsForDots: {
                      r: "5",
                      strokeWidth: "2",
                      stroke: "#76B7EF",
                    },
                  }}
                  bezier
                  style={styles.chart}
                />
                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Total Value</Text>
                    <Text style={styles.statValue}>
                      ₹
                      {analyticsData.data.reduce((a, b) => a + b, 0).toFixed(0)}
                    </Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Total Entries</Text>
                    <Text style={styles.statValue}>
                      {analyticsData.raw.length}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        ) : (
          <>
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Icon name="search" size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search items..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
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
                  <Text style={styles.emptyText}>No items found.</Text>
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

      <Modal visible={filterModalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Filter & Sort</Text>

              {user.role === "Super Admin" && (
                <>
                  <Text style={styles.filterLabel}>Status:</Text>
                  <View style={styles.sortOptions}>
                    {["All", "Pending", "Verified"].map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[
                          styles.sortOption,
                          statusFilter === s && styles.sortOptionActive,
                        ]}
                        onPress={() => setStatusFilter(s)}
                      >
                        <Text
                          style={[
                            styles.sortText,
                            statusFilter === s && styles.sortTextActive,
                          ]}
                        >
                          {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

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

              {user.role === "Super Admin" && (
                <>
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
                      <ScrollView
                        nestedScrollEnabled={true}
                        style={styles.ddList}
                      >
                        <TouchableOpacity
                          style={styles.ddItem}
                          onPress={() => {
                            setSelectedWorker(null);
                            setWorkerQuery("");
                            setShowWorkerDropdown(false);
                          }}
                        >
                          <Text
                            style={[styles.ddText, { fontStyle: "italic" }]}
                          >
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
                      </ScrollView>
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
                      <ScrollView
                        nestedScrollEnabled={true}
                        style={styles.ddList}
                      >
                        <TouchableOpacity
                          style={styles.ddItem}
                          onPress={() => {
                            setSelectedVendor(null);
                            setVendorQuery("");
                            setShowVendorDropdown(false);
                          }}
                        >
                          <Text
                            style={[styles.ddText, { fontStyle: "italic" }]}
                          >
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
                      </ScrollView>
                    )}
                  </View>
                </>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={() => setFilterModalVisible(false)}
                >
                  <Text style={styles.btnText}>Apply / Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={viewerVisible} transparent={true} animationType="fade">
        <View style={styles.viewerContainer}>
          <TouchableOpacity
            style={styles.viewerClose}
            onPress={() => setViewerVisible(false)}
          >
            <Icon name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {currentViewImage && (
            <Image
              source={{ uri: currentViewImage }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          )}
        </View>
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
    height: 105,
    overflow: "hidden",
    elevation: 2,
  },
  entryImageCompact: { width: 95, height: "100%", backgroundColor: "#eee" },
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
    marginTop: 4,
  },
  entryDateCompact: { fontSize: 11, color: "#999" },
  entryRoleCompact: { fontSize: 11, color: "#555", marginTop: 4 },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgePending: { backgroundColor: "#fff3cd" },
  badgeVerified: { backgroundColor: "#d4edda" },
  statusText: { fontSize: 10, fontWeight: "bold" },
  textPending: { color: "#856404" },
  textVerified: { color: "#155724" },

  verifyBtnSmall: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  verifyBtnText: { color: "#fff", fontSize: 10, fontWeight: "bold" },

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
  btnText: { color: "#fff", fontWeight: "bold" },
  viewerContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerClose: { position: "absolute", top: 50, right: 20, zIndex: 10 },
  viewerImage: { width: "100%", height: "80%" },
});

export default DashboardScreen;
