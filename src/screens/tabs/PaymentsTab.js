import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import {
  getPurchaseEntries,
  getPayments,
  addPayment,
  getAllUsers,
} from "../../services/supabase";
import { uploadImage } from "../../services/imageService";

const PaymentsTab = ({ user }) => {
  const [payments, setPayments] = useState([]);
  const [balance, setBalance] = useState(0);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [paymentModal, setPaymentModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadFinancials();
      if (user.role !== "Vendor") fetchVendors();
    }, [user]),
  );

  const fetchVendors = async () => {
    const res = await getAllUsers("Vendor");
    if (res.success) setVendors(res.data);
  };

  const loadFinancials = async () => {
    setLoading(true);
    const filters = user.role === "Vendor" ? { vendorId: user.id } : {};
    const [purchasesRes, paymentsRes] = await Promise.all([
      getPurchaseEntries(filters),
      getPayments(filters),
    ]);

    if (purchasesRes.success && paymentsRes.success) {
      setPayments(paymentsRes.data);
      const totalPurchases = purchasesRes.data.reduce(
        (sum, item) => sum + parseFloat(item.price || 0),
        0,
      );
      const totalPaid = paymentsRes.data.reduce(
        (sum, item) => sum + parseFloat(item.amount || 0),
        0,
      );
      setBalance(totalPurchases - totalPaid);
    }
    setLoading(false);
  };

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleSubmitPayment = async () => {
    if (!amount || isNaN(amount))
      return Alert.alert("Error", "Enter a valid amount.");
    if (user.role !== "Vendor" && !selectedVendor)
      return Alert.alert("Error", "Select a vendor.");

    setLoading(true);
    let uploadedImageUrl = null;

    try {
      if (imageUri) {
        const imageRes = await uploadImage(imageUri);
        if (!imageRes.success) throw new Error("Image upload failed");
        uploadedImageUrl = imageRes.url;
      }

      const paymentData = {
        vendor_id: selectedVendor?.id,
        worker_id: user.id,
        amount: parseFloat(amount),
        note: note.trim(),
        image_url: uploadedImageUrl,
        created_by: user.id,
      };

      const res = await addPayment(paymentData);
      if (res.success) {
        Alert.alert("Success", "Payment recorded successfully!");
        setPaymentModal(false);
        setAmount("");
        setNote("");
        setImageUri(null);
        setSelectedVendor(null);
        loadFinancials();
      } else throw new Error(res.error);
    } catch (error) {
      Alert.alert("Error", error.message);
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Outstanding Balance</Text>
        <Text
          style={[
            styles.balanceAmount,
            { color: balance > 0 ? "#f44336" : "#4CAF50" },
          ]}
        >
          ₹{balance.toFixed(2)}
        </Text>
        <Text style={{ fontSize: 12, color: "#999" }}>
          (Total Purchases - Total Paid)
        </Text>
      </View>

      <FlatList
        data={payments}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadFinancials} />
        }
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.paymentCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.payAmount}>₹{item.amount}</Text>
              {user.role !== "Vendor" && item.vendor && (
                <Text style={styles.payVendor}>
                  To: {item.vendor.full_name}
                </Text>
              )}
              <Text style={styles.payDate}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
              {item.note ? (
                <Text style={styles.note}>Note: {item.note}</Text>
              ) : null}
            </View>
            {item.image_url && (
              <Image
                source={{ uri: item.image_url }}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 8,
                  backgroundColor: "#eee",
                }}
              />
            )}
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 20, color: "#999" }}>
            No payments recorded.
          </Text>
        }
      />

      {user.role !== "Vendor" && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setPaymentModal(true)}
        >
          <Icon name="payment" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Add Payment Modal */}
      <Modal visible={paymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <TouchableOpacity onPress={() => setPaymentModal(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Select Vendor *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowDropdown(!showDropdown)}
              >
                <Text>
                  {selectedVendor
                    ? selectedVendor.full_name
                    : "Tap to select vendor..."}
                </Text>
              </TouchableOpacity>
              {showDropdown && (
                <View style={styles.dropdown}>
                  {vendors.map((v) => (
                    <TouchableOpacity
                      key={v.id}
                      style={styles.ddItem}
                      onPress={() => {
                        setSelectedVendor(v);
                        setShowDropdown(false);
                      }}
                    >
                      <Text>{v.full_name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.label}>Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="e.g. 5000"
              />

              <Text style={styles.label}>Note (Optional)</Text>
              <TextInput
                style={[styles.input, { height: 60, textAlignVertical: "top" }]}
                value={note}
                onChangeText={setNote}
                multiline
                placeholder="Payment details..."
              />

              <Text style={styles.label}>Receipt/Proof (Optional)</Text>
              <TouchableOpacity
                style={styles.imagePicker}
                onPress={handleImagePick}
              >
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={{ width: "100%", height: 100, borderRadius: 8 }}
                  />
                ) : (
                  <Icon name="add-a-photo" size={32} color="#999" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmitPayment}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Payment</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  balanceCard: {
    backgroundColor: "#fff",
    padding: 20,
    margin: 16,
    borderRadius: 12,
    elevation: 3,
    alignItems: "center",
  },
  balanceLabel: { fontSize: 16, color: "#666" },
  balanceAmount: { fontSize: 32, fontWeight: "bold", marginTop: 8 },
  paymentCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    elevation: 1,
  },
  payAmount: { fontSize: 18, fontWeight: "bold", color: "#4CAF50" },
  payVendor: { fontSize: 13, color: "#333", fontWeight: "bold", marginTop: 4 },
  payDate: { color: "#999", fontSize: 12, marginTop: 4 },
  note: { color: "#555", fontStyle: "italic", marginTop: 4 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#4CAF50",
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold" },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#f9f9f9",
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
    maxHeight: 150,
    marginTop: 5,
  },
  ddItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  imagePicker: {
    height: 100,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
    backgroundColor: "#f9f9f9",
  },
  submitBtn: {
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 25,
    marginBottom: 20,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});

export default PaymentsTab;
