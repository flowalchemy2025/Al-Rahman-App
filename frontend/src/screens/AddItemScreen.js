import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { backendItems, backendPurchases, backendUsers } from "../services/apiClient";
import { uploadImage } from "../services/imageService";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { addItemStyles as styles } from "../styles";
import { COLORS } from "../styles/theme";

const UNITS = ["Kg", "Count", "Litre", "Box", "Gram", "Packet", "Dozen", "Others"];

const AddItemScreen = ({ navigation, route }) => {
  const { user } = route.params;
  const [loading, setLoading] = useState(false);

  // Separated Image States
  const [billImageUris, setBillImageUris] = useState([]);
  const [itemImageUris, setItemImageUris] = useState([]);

  // Form State
  const [branchItems, setBranchItems] = useState([]);
  const [selectedItemName, setSelectedItemName] = useState("");
  const [customItemName, setCustomItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("Kg");
  const [customUnit, setCustomUnit] = useState("");
  const [price, setPrice] = useState("");
  const [remarks, setRemarks] = useState("");

  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 1. Fetch Vendors assigned to this branch
      const vendorData = await backendUsers.list({
        role: "Vendor",
        branchName: user.branches[0],
      });
      setVendors([{ id: "BYPASS", full_name: "Local Shop" }, ...(vendorData || [])]);

      // 2. Fetch Preset Items for this branch
      const itemData = await backendItems.list({ branchName: user.branches[0] });
      setBranchItems((itemData || []).map((i) => i.item_name));
    } catch (error) {
      Alert.alert("Error", error?.response?.data?.error || "Failed to load form data");
    }
  };

  const openCamera = async (type) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted")
      return Alert.alert("Required", "Camera access is needed.");

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.5, // Reduced quality for compression
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets?.length) {
      const originalUri = result.assets[0].uri;

      // Auto compress via ImageManipulator
      const manipResult = await ImageManipulator.manipulateAsync(
        originalUri,
        [{ resize: { width: 1024 } }], // Resize width to max 1024px while retaining aspect ratio
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );

      const newUri = manipResult.uri;

      if (type === "bill") {
        setBillImageUris((prev) => [...prev, newUri]);
      } else {
        setItemImageUris((prev) => [...prev, newUri]);
      }
    }
  };

  const removeImage = (uriToRemove, type) => {
    if (type === "bill") {
      setBillImageUris((prev) => prev.filter((uri) => uri !== uriToRemove));
    } else {
      setItemImageUris((prev) => prev.filter((uri) => uri !== uriToRemove));
    }
  };

  const handleSubmit = async () => {
    const finalItemName =
      selectedItemName === "Others" ? customItemName : selectedItemName;
    const finalUnit = unit === "Others" ? customUnit : unit;

    // Both images are ideally required or at least bill
    if (!billImageUris.length && !itemImageUris.length)
      return Alert.alert("Error", "Please add at least one bill or item photo");
    if (!finalItemName.trim() || !quantity.trim() || !price.trim() || !finalUnit.trim())
      return Alert.alert("Error", "Please fill required fields");
    if (!selectedVendor) return Alert.alert("Error", "Please select a vendor");

    setLoading(true);
    try {
      // Upload Bill Images
      const uploadedBillImages = await Promise.all(
        billImageUris.map((uri) => uploadImage(uri)),
      );
      const failedBillImage = uploadedBillImages.find((img) => !img.success);
      if (failedBillImage) throw new Error(failedBillImage.error || "Bill image upload failed");

      // Upload Item Images
      const uploadedItemImages = await Promise.all(
        itemImageUris.map((uri) => uploadImage(uri)),
      );
      const failedItemImage = uploadedItemImages.find((img) => !img.success);
      if (failedItemImage) throw new Error(failedItemImage.error || "Item image upload failed");

      const isBypass = selectedVendor === "BYPASS";

      const entryData = {
        item_name: finalItemName.trim(),
        quantity: quantity.trim(),
        unit: finalUnit.trim(),
        price: parseFloat(price),
        remarks: remarks.trim(),
        bill_image_url: uploadedBillImages.map((img) => img.url).join(","),
        bill_image_filename: uploadedBillImages.map((img) => img.filename).join(","),
        item_image_url: uploadedItemImages.map((img) => img.url).join(","),
        item_image_filename: uploadedItemImages.map((img) => img.filename).join(","),
        created_by: user.id,
        branch_name: user.branches[0],
        vendor_id: isBypass ? null : selectedVendor,
        status: isBypass ? "Verified" : "Pending",
      };

      await backendPurchases.create(entryData);
      setLoading(false);
      Alert.alert("Success", "Saved!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", error?.response?.data?.error || error.message);
    }
  };

  const selectedVendorLabel =
    vendors.find((v) => v.id === selectedVendor)?.full_name || "Select vendor";

  const renderImageSection = (title, images, type) => (
    <View style={{ marginBottom: 20 }}>
      <Text style={styles.label}>{title}</Text>
      <TouchableOpacity style={styles.imageContainer} onPress={() => openCamera(type)}>
        {images.length ? (
          <Image
            source={{ uri: images[images.length - 1] }}
            style={styles.image}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Icon name="camera-alt" size={48} color={COLORS.textMuted} />
            <Text style={styles.imagePlaceholderText}>Take Photo</Text>
          </View>
        )}
      </TouchableOpacity>
      {images.length > 0 && (
        <View style={styles.imageActionsRow}>
          <Text style={styles.imageCountText}>
            {images.length} photo{images.length > 1 ? "s" : ""} added
          </Text>
          <TouchableOpacity
            style={styles.addMoreImageBtn}
            onPress={() => openCamera(type)}
          >
            <Icon name="add-a-photo" size={18} color={COLORS.white} />
            <Text style={styles.addMoreImageBtnText}>Add Photo</Text>
          </TouchableOpacity>
        </View>
      )}
      {images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imageThumbScroll}
        >
          {images.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.imageThumbWrap}>
              <Image source={{ uri }} style={styles.imageThumb} />
              <TouchableOpacity
                style={styles.removeThumbBtn}
                onPress={() => removeImage(uri, type)}
              >
                <Icon name="close" size={14} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Purchase</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Separated Image Upload Sections - Side by Side */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            {renderImageSection("Bill Photo *", billImageUris, "bill")}
          </View>
          <View style={{ flex: 1 }}>
            {renderImageSection("Item Photo", itemImageUris, "item")}
          </View>
        </View>

        {/* Item Name Bubbles */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Item Name *</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 8 }}
          >
            {[...branchItems, "Others"].map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.chip,
                  selectedItemName === item && styles.chipActive,
                ]}
                onPress={() => setSelectedItemName(item)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedItemName === item && styles.chipTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {selectedItemName === "Others" && (
            <TextInput
              style={styles.input}
              placeholder="Enter custom item name"
              value={customItemName}
              onChangeText={setCustomItemName}
            />
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Quantity *</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            placeholder="Enter quantity"
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Unit *</Text>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => {
              setShowUnitDropdown((prev) => !prev);
              setShowVendorDropdown(false);
            }}
          >
            <Text style={styles.dropdownText}>{unit}</Text>
            <Icon
              name={showUnitDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"}
              size={22}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
          {showUnitDropdown && (
            <View style={styles.dropdownMenu}>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setUnit(u);
                    if (u !== "Others") setCustomUnit("");
                    setShowUnitDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      unit === u && styles.dropdownItemTextActive,
                    ]}
                  >
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {unit === "Others" && (
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              placeholder="Enter custom unit (e.g. Piece)"
              value={customUnit}
              onChangeText={setCustomUnit}
            />
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Price (Rs) *</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="Enter price amount"
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Select Vendor *</Text>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => {
              setShowVendorDropdown((prev) => !prev);
              setShowUnitDropdown(false);
            }}
          >
            <Text
              style={[
                styles.dropdownText,
                !selectedVendor && styles.dropdownPlaceholder,
              ]}
            >
              {selectedVendorLabel}
            </Text>
            <Icon
              name={
                showVendorDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"
              }
              size={22}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
          {showVendorDropdown && (
            <View style={styles.dropdownMenu}>
              <ScrollView nestedScrollEnabled style={styles.dropdownScroll}>
                {vendors.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedVendor(v.id);
                      setShowVendorDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selectedVendor === v.id && styles.dropdownItemTextActive,
                      ]}
                    >
                      {v.full_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Remarks (Optional)</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            multiline
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Any notes..."
          />
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitButtonText}>Submit Entry</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AddItemScreen;
