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
import { Calendar } from "react-native-calendars";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { backendLedger, backendPayments, backendPurchases } from "../services/apiClient";
import { uploadImage } from "../services/imageService";
import { vendorLedgerStyles as styles } from "../styles";
import { COLORS } from "../styles/theme";

const getDateKey = (dateInput) => {
  if (typeof dateInput === "string") {
    const normalized = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
      return normalized.slice(0, 10);
    }
  }

  const date = dateInput ? new Date(dateInput) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatFilterDate = (dateString) => {
  if (!dateString) return "Select";
  const [year, month, day] = String(dateString).split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

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
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [activeLedgerItem, setActiveLedgerItem] = useState(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [activeDateField, setActiveDateField] = useState("from");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const nextBalance = ledger.reduce((sum, entry) => {
      const entryDate = getDateKey(entry.date);
      if (fromDate && entryDate < fromDate) return sum;
      if (toDate && entryDate > toDate) return sum;

      const value = parseFloat(entry.value || 0);
      if (entry.ledgerType === "Purchase" || entry.ledgerType === "Adjustment") {
        return sum + value;
      }
      return sum - value;
    }, 0);

    setBalance(nextBalance);
  }, [ledger, fromDate, toDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await backendLedger.getVendorLedger(vendor.id, branchName);
      setLedger(res?.ledger || []);
      setBalance(res?.balance || 0);
    } catch (error) {
      Alert.alert("Error", error?.response?.data?.error || "Could not load ledger");
    } finally {
      setLoading(false);
    }
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
      quality: 0.5,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets) {
      const originalUri = result.assets[0].uri;

      // Auto compress via ImageManipulator
      const manipResult = await ImageManipulator.manipulateAsync(
        originalUri,
        [{ resize: { width: 1024 } }], // Resize width to max 1024px while retaining aspect ratio
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );

      setImageUri(manipResult.uri);
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

    try {
      await backendPayments.createVendorTransaction({
        vendor_id: vendor.id,
        branch_name: branchName,
        amount: parseFloat(payAmount),
        remarks: payRemarks,
        image_url: uploadedUrl,
        image_filename: uploadedFilename,
        created_by: user.id,
      });
      setSubmitting(false);
      setModalVisible(false);
      setPayAmount("");
      setPayRemarks("");
      setImageUri(null); // Reset image
      loadData(); // Refresh the ledger
    } catch (error) {
      setSubmitting(false);
      Alert.alert("Error", error?.response?.data?.error || "Could not save payment");
    }
  };

  const handleAddDue = async () => {
    if (!dueAmount || isNaN(dueAmount) || Number(dueAmount) <= 0) {
      return Alert.alert("Error", "Enter a valid amount");
    }

    setDueSubmitting(true);
    try {
      await backendPayments.createVendorTransaction({
        vendor_id: vendor.id,
        branch_name: branchName,
        amount: -Math.abs(parseFloat(dueAmount)),
        remarks: dueRemark,
        image_url: null,
        image_filename: null,
        created_by: user.id,
      });
      setDueSubmitting(false);
      setDueModalVisible(false);
      setDueAmount("");
      setDueRemark("");
      loadData();
    } catch (error) {
      setDueSubmitting(false);
      Alert.alert("Error", error?.response?.data?.error || "Could not save due");
    }
  };

  const openViewer = (url) => {
    setViewerUri(url.split(",")[0]);
    setViewerVisible(true);
  };

  const openCommentModal = (item) => {
    setActiveLedgerItem(item);
    setCommentText(item.vendor_comment || "");
    setCommentModalVisible(true);
  };

  const closeCommentModal = () => {
    if (commentSubmitting) return;
    setCommentModalVisible(false);
    setActiveLedgerItem(null);
    setCommentText("");
  };

  const saveComment = async () => {
    if (!activeLedgerItem?.id) return;

    setCommentSubmitting(true);
    const payload = commentText.trim();

    try {
      if (activeLedgerItem.ledgerType === "Purchase") {
        await backendPurchases.updateVendorComment(activeLedgerItem.id, payload);
      } else {
        await backendPayments.updateVendorTransactionComment(activeLedgerItem.id, payload);
      }

      setLedger((prev) =>
        prev.map((entry) =>
          entry.id === activeLedgerItem.id &&
          entry.ledgerType === activeLedgerItem.ledgerType
            ? { ...entry, vendor_comment: payload }
            : entry,
        ),
      );
      closeCommentModal();
    } catch (error) {
      Alert.alert("Error", error?.response?.data?.error || "Could not save comment");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const openDatePicker = (field) => {
    setActiveDateField(field);
    setDatePickerVisible(true);
  };

  const clearDateFilters = () => {
    setFromDate("");
    setToDate("");
  };

  const filteredLedger = ledger.filter((entry) => {
    const entryDate = getDateKey(entry.date);
    if (fromDate && entryDate < fromDate) return false;
    if (toDate && entryDate > toDate) return false;
    return true;
  });

  const filteredBalance = filteredLedger.reduce((sum, entry) => {
    const value = parseFloat(entry.value || 0);
    if (entry.ledgerType === "Purchase" || entry.ledgerType === "Adjustment") {
      return sum + value;
    }
    return sum - value;
  }, 0);

  const markedDates = {};
  if (fromDate) {
    markedDates[fromDate] = {
      ...(markedDates[fromDate] || {}),
      selected: true,
      selectedColor: COLORS.primary,
    };
  }
  if (toDate) {
    markedDates[toDate] = {
      ...(markedDates[toDate] || {}),
      selected: true,
      selectedColor: COLORS.primaryDark,
    };
  }

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
        {item.vendor_comment ? (
          <Text style={styles.ledgerVendorComment}>Comment: {item.vendor_comment}</Text>
        ) : null}

        {/* View Proof Button */}
        {item.image_url || item.bill_image_url || item.item_image_url ? (
          <TouchableOpacity
            style={styles.proofBtn}
            onPress={() => openViewer(item.image_url || item.bill_image_url || item.item_image_url)}
          >
            <Icon name="image" size={14} color={COLORS.accentSoft} />
            <Text style={styles.proofText}>View Proof</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.ledgerRightColumn}>
        <TouchableOpacity
          style={styles.commentBtn}
          onPress={() => openCommentModal(item)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Icon
            name={item.vendor_comment ? "comment" : "add-comment"}
            size={16}
            color={COLORS.accentSoft}
          />
        </TouchableOpacity>
        <Text
          style={[
            styles.ledgerAmount,
            {
              color:
                item.ledgerType === "Purchase" || item.ledgerType === "Adjustment"
                  ? COLORS.danger
                  : COLORS.success,
            },
          ]}
        >
          {item.ledgerType === "Purchase" || item.ledgerType === "Adjustment" ? "+" : "-"}{" "}
          {"\u20B9"}
          {parseFloat(item.value).toFixed(2)}
        </Text>
      </View>
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
        <Text style={styles.balanceHeaderLabel}>
          {fromDate || toDate ? "Date-wise Outstanding Balance" : "Outstanding Balance"}
        </Text>
        <Text
          style={[
            styles.balanceHeaderAmount,
            { color: filteredBalance > 0 ? COLORS.danger : COLORS.success },
          ]}
        >
          ₹{balance.toFixed(2)}
        </Text>
      </View>

      <View style={styles.filterCard}>
        <Text style={styles.filterTitle}>Filter by Date</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={styles.filterChip}
            onPress={() => openDatePicker("from")}
          >
            <Text style={styles.filterChipLabel}>From</Text>
            <Text style={styles.filterChipValue}>{formatFilterDate(fromDate)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterChip}
            onPress={() => openDatePicker("to")}
          >
            <Text style={styles.filterChipLabel}>To</Text>
            <Text style={styles.filterChipValue}>{formatFilterDate(toDate)}</Text>
          </TouchableOpacity>
        </View>
        {(fromDate || toDate) && (
          <TouchableOpacity style={styles.clearFilterBtn} onPress={clearDateFilters}>
            <Text style={styles.clearFilterText}>Clear Date Filter</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredLedger}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshing={loading}
        onRefresh={loadData}
        ListEmptyComponent={
          <Text
            style={{ textAlign: "center", color: COLORS.textMuted, marginTop: 20 }}
          >
            No transactions found for the selected date range.
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
      <Modal visible={commentModalVisible} transparent animationType="fade">
        <View style={styles.commentModalBackdrop}>
          <View style={styles.commentModalCard}>
            <Text style={styles.commentModalTitle}>Transaction Comment</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Add comment..."
              value={commentText}
              onChangeText={setCommentText}
              multiline
              numberOfLines={3}
              editable={!commentSubmitting}
            />
            <View style={styles.commentActions}>
              <TouchableOpacity
                style={styles.commentCancelBtn}
                onPress={closeCommentModal}
                disabled={commentSubmitting}
              >
                <Text style={styles.commentCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.commentSaveBtn}
                onPress={saveComment}
                disabled={commentSubmitting}
              >
                <Text style={styles.commentSaveText}>
                  {commentSubmitting ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={datePickerVisible} transparent animationType="fade">
        <View style={styles.commentModalBackdrop}>
          <View style={styles.commentModalCard}>
            <Text style={styles.commentModalTitle}>
              Select {activeDateField === "from" ? "From" : "To"} Date
            </Text>
            <Calendar
              current={
                activeDateField === "from"
                  ? fromDate || getDateKey(new Date())
                  : toDate || fromDate || getDateKey(new Date())
              }
              markedDates={markedDates}
              onDayPress={(day) => {
                if (activeDateField === "from") {
                  setFromDate(day.dateString);
                  if (toDate && day.dateString > toDate) {
                    setToDate(day.dateString);
                  }
                } else {
                  setToDate(day.dateString);
                  if (fromDate && day.dateString < fromDate) {
                    setFromDate(day.dateString);
                  }
                }
                setDatePickerVisible(false);
              }}
              theme={{
                selectedDayBackgroundColor: COLORS.primaryDark,
                todayTextColor: COLORS.primaryDark,
                arrowColor: COLORS.primaryDark,
              }}
            />
            <View style={styles.commentActions}>
              <TouchableOpacity
                style={styles.commentCancelBtn}
                onPress={() => setDatePickerVisible(false)}
              >
                <Text style={styles.commentCancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default VendorLedgerScreen;
