import React, { useState, useEffect } from "react";
import {
  View,
  Text,
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
import { vendorLedgerStyles as styles } from "../styles";
import { COLORS } from "../styles/theme";

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
  const [dueModalVisible, setDueModalVisible] = useState(false);
  const [dueAmount, setDueAmount] = useState("");
  const [dueRemark, setDueRemark] = useState("");
  const [dueSubmitting, setDueSubmitting] = useState(false);

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

  const handleAddDue = async () => {
    if (!dueAmount || isNaN(dueAmount) || Number(dueAmount) <= 0) {
      return Alert.alert("Error", "Enter a valid amount");
    }

    setDueSubmitting(true);
    const res = await addVendorPayment({
      vendor_id: vendor.id,
      branch_name: branchName,
      amount: -Math.abs(parseFloat(dueAmount)),
      remarks: dueRemark,
      image_url: null,
      image_filename: null,
      created_by: user.id,
    });
    setDueSubmitting(false);

    if (res.success) {
      setDueModalVisible(false);
      setDueAmount("");
      setDueRemark("");
      loadData();
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
              : item.ledgerType === "Adjustment"
                ? "add-circle"
                : "account-balance-wallet"
          }
          size={24}
          color={
            item.ledgerType === "Purchase" || item.ledgerType === "Adjustment"
              ? COLORS.danger
              : COLORS.success
          }
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.ledgerTitle}>
          {item.ledgerType === "Purchase"
            ? `Bill: ${item.item_name}`
            : item.ledgerType === "Adjustment"
              ? "Outstanding Added"
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
            <Icon name="image" size={14} color={COLORS.accentSoft} />
            <Text style={styles.proofText}>View Proof</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text
        style={[
          styles.ledgerAmount,
          {
            color:
              item.ledgerType === "Purchase" || item.ledgerType === "Adjustment" ? COLORS.danger : COLORS.success,
          },
        ]}
      >
        {item.ledgerType === "Purchase" || item.ledgerType === "Adjustment" ? "+" : "-"} {"\u20B9"}
        {parseFloat(item.value).toFixed(2)}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={COLORS.white} />
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
            { color: balance > 0 ? COLORS.danger : COLORS.success },
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
          <Text
            style={{ textAlign: "center", color: COLORS.textMuted, marginTop: 20 }}
          >
            No transactions found.
          </Text>
        }
      />

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.fab, styles.recordPaymentFab]}
          onPress={() => setModalVisible(true)}
        >
          <Icon
            name="payment"
            size={22}
            color={COLORS.white}
            style={{ marginRight: 8 }}
          />
          <Text style={{ color: COLORS.white, fontWeight: "bold", fontSize: 16 }}>
            Record Payment
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fab, styles.addDueFab]}
          onPress={() => setDueModalVisible(true)}
        >
          <Icon name="add" size={20} color={COLORS.white} />
          <Text style={styles.addDueFabText}>Add Due</Text>
        </TouchableOpacity>
      </View>

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
                <Icon name="close" size={24} color={COLORS.textPrimary} />
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
                  <Icon name="close" size={20} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
                <Icon name="add-photo-alternate" size={28} color={COLORS.primary} />
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
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitBtnText}>Save Payment</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={dueModalVisible} transparent animationType="slide">
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
              <Text style={styles.modalTitle}>Add Outstanding</Text>
              <TouchableOpacity onPress={() => setDueModalVisible(false)}>
                <Icon name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Amount (â‚¹) *</Text>
            <TextInput
              style={styles.input}
              value={dueAmount}
              onChangeText={setDueAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />

            <Text style={styles.label}>Remarks (Optional)</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={dueRemark}
              onChangeText={setDueRemark}
              multiline
              placeholder="Reason for adding due..."
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleAddDue}
              disabled={dueSubmitting}
            >
              {dueSubmitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitBtnText}>Save Due</Text>
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
            <Icon name="close" size={32} color={COLORS.white} />
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

export default VendorLedgerScreen;

