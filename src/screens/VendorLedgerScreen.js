import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { getLedgerData, addVendorPayment } from "../services/supabase";
import { uploadImage } from "../services/imageService";

const VendorLedgerScreen = ({ navigation, route }) => {
  const { vendor, branchName, user } = route.params;
  const [ledger, setLedger] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Payment Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payRemarks, setPayRemarks] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Image Viewer State
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUri, setViewerUri] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const res = await getLedgerData(vendor.id, branchName);
    if (res.success) {
      setLedger(res.ledger);
      setBalance(res.balance);
    }
    setLoading(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      return Alert.alert(
        "Required",
        "Gallery access is needed to upload payment screenshots.",
      );
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Correct for expo-image-picker ~17.0.10
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleRecordPayment = async () => {
    if (!payAmount || isNaN(payAmount) || Number(payAmount) <= 0) {
      return Alert.alert("Error", "Enter a valid amount");
    }

    setSubmitting(true);
    let uploadedUrl = null;
    let uploadedFilename = null;

    // Upload the screenshot if selected
    if (imageUri) {
      const imageResult = await uploadImage(imageUri);
      if (!imageResult.success) {
        setSubmitting(false);
        return Alert.alert("Error", "Failed to upload the proof image.");
      }
      uploadedUrl = imageResult.url;
      uploadedFilename = imageResult.filename;
    }

    const res = await addVendorPayment({
      vendor_id: vendor.id,
      branch_name: branchName,
      amount: parseFloat(payAmount),
      remarks: payRemarks,
      image_url: uploadedUrl,
      image_filename: uploadedFilename,
      created_by: user.id,
    });

    setSubmitting(false);

    if (res.success) {
      setModalVisible(false);
      setPayAmount("");
      setPayRemarks("");
      setImageUri(null); // Reset image
      loadData(); // Refresh the ledger
    } else {
      Alert.alert("Error", res.error);
    }
  };

  const openViewer = (url) => {
    setViewerUri(url.split(",")[0]);
    setViewerVisible(true);
  };

  const renderItem = ({ item }) => (
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
            : "Payment Recorded"}
        </Text>
        <Text style={styles.ledgerDate}>
          {new Date(item.date).toLocaleDateString()}{" "}
          {new Date(item.date).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>

        {item.remarks ? (
          <Text style={styles.ledgerRemarks}>{item.remarks}</Text>
        ) : null}

        {/* View Proof Button */}
        {item.image_url ? (
          <TouchableOpacity
            style={styles.proofBtn}
            onPress={() => openViewer(item.image_url)}
          >
            <Icon name="image" size={14} color="#76B7EF" />
            <Text style={styles.proofText}>View Proof</Text>
          </TouchableOpacity>
        ) : null}
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {vendor.full_name || vendor.username}'s Account
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.balanceHeaderCard}>
        <Text style={styles.balanceHeaderLabel}>Outstanding Balance</Text>
        <Text
          style={[
            styles.balanceHeaderAmount,
            { color: balance > 0 ? "#f44336" : "#4CAF50" },
          ]}
        >
          ₹{balance.toFixed(2)}
        </Text>
      </View>

      <FlatList
        data={ledger}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshing={loading}
        onRefresh={loadData}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", color: "#999", marginTop: 20 }}>
            No transactions found.
          </Text>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Icon
          name="payment"
          size={24}
          color="#fff"
          style={{ marginRight: 8 }}
        />
        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
          Record Payment
        </Text>
      </TouchableOpacity>

      {/* Record Payment Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <Text style={styles.modalTitle}>Record Payment to Vendor</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setImageUri(null);
                }}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Amount Paid (₹) *</Text>
            <TextInput
              style={styles.input}
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />

            <Text style={styles.label}>Payment Proof (Optional)</Text>
            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setImageUri(null)}
                >
                  <Icon name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
                <Icon name="add-photo-alternate" size={28} color="#76B7EF" />
                <Text style={styles.uploadBtnText}>Upload UPI Screenshot</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.label}>Remarks (Optional)</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={payRemarks}
              onChangeText={setPayRemarks}
              multiline
              placeholder="Cash, Bank Transfer, Check No..."
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleRecordPayment}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Save Payment</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal visible={viewerVisible} transparent animationType="fade">
        <View style={styles.viewerContainer}>
          <TouchableOpacity
            style={styles.viewerClose}
            onPress={() => setViewerVisible(false)}
          >
            <Icon name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {viewerUri && (
            <Image
              source={{ uri: viewerUri }}
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
  header: {
    backgroundColor: "#76B7EF",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  balanceHeaderCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
  },
  balanceHeaderLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  balanceHeaderAmount: { fontSize: 32, fontWeight: "bold", marginTop: 4 },
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
  ledgerTitle: { fontSize: 15, fontWeight: "bold", color: "#333" },
  ledgerDate: { fontSize: 12, color: "#999", marginTop: 2 },
  ledgerRemarks: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 4,
  },
  ledgerAmount: { fontSize: 16, fontWeight: "bold" },
  fab: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
  proofBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    backgroundColor: "#e3f2fd",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  proofText: {
    fontSize: 11,
    color: "#76B7EF",
    fontWeight: "bold",
    marginLeft: 4,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  submitBtn: {
    backgroundColor: "#76B7EF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  submitBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  // Image Upload Styles
  uploadBtn: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    borderRadius: 8,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  uploadBtnText: { color: "#76B7EF", fontWeight: "600", marginLeft: 8 },
  imagePreviewContainer: {
    height: 120,
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  imagePreview: { width: "100%", height: "100%", backgroundColor: "#eee" },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 6,
    borderRadius: 20,
  },

  // Viewer Styles
  viewerContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerClose: { position: "absolute", top: 50, right: 20, zIndex: 10 },
  viewerImage: { width: "100%", height: "80%" },
});

export default VendorLedgerScreen;
