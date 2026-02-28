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
import {
  uploadImage,
  deleteImage,
} from "../services/imageService";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { editEntryStyles as styles } from "../styles";
import { COLORS } from "../styles/theme";

const UNIT_PRESETS = ["Kg", "Count", "Litre", "Box", "Gram", "Packet", "Dozen"];
const UNITS = [...UNIT_PRESETS, "Others"];
const parseCsv = (value) =>
  (value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

const EditEntryScreen = ({ navigation, route }) => {
  const { entry } = route.params;
  const initialUnit = entry.unit || "Kg";
  const isPresetUnit = UNIT_PRESETS.includes(initialUnit);

  const [loading, setLoading] = useState(false);

  // Separated Image States
  const [billImageUris, setBillImageUris] = useState(parseCsv(entry.bill_image_url));
  const [itemImageUris, setItemImageUris] = useState(parseCsv(entry.item_image_url));

  const [billImageChanged, setBillImageChanged] = useState(false);
  const [itemImageChanged, setItemImageChanged] = useState(false);

  const [branchItems, setBranchItems] = useState([]);
  const [selectedItemName, setSelectedItemName] = useState("");
  const [customItemName, setCustomItemName] = useState("");

  const [quantity, setQuantity] = useState(String(entry.quantity ?? ""));
  const [unit, setUnit] = useState(isPresetUnit ? initialUnit : "Others");
  const [customUnit, setCustomUnit] = useState(isPresetUnit ? "" : initialUnit);
  const [price, setPrice] = useState(entry.price.toString());
  const [remarks, setRemarks] = useState(entry.remarks || "");

  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(
    entry.vendor_id || "BYPASS",
  );
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const deleteImagesByCsv = async (filenamesCsv) => {
    const filenames = parseCsv(filenamesCsv);
    if (!filenames.length) return;
    await Promise.all(filenames.map((filename) => deleteImage(filename)));
  };

  const loadData = async () => {
    try {
      // Determine Vendor List based on Branch
      const vendorData = await backendUsers.list({
        role: "Vendor",
        branchName: entry.branch_name,
      });
      setVendors([{ id: "BYPASS", full_name: "Local Shop" }, ...(vendorData || [])]);

      // Fetch Items List
      const itemData = await backendItems.list({ branchName: entry.branch_name });
      const itemsList = (itemData || []).map((i) => i.item_name);
      setBranchItems(itemsList);

      if (itemsList.includes(entry.item_name)) {
        setSelectedItemName(entry.item_name);
      } else {
        setSelectedItemName("Others");
        setCustomItemName(entry.item_name);
      }
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
      quality: 0.5,
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
        setBillImageChanged(true);
      } else {
        setItemImageUris((prev) => [...prev, newUri]);
        setItemImageChanged(true);
      }
    }
  };

  const removeImage = (uriToRemove, type) => {
    if (type === "bill") {
      setBillImageUris((prev) => prev.filter((uri) => uri !== uriToRemove));
      setBillImageChanged(true);
    } else {
      setItemImageUris((prev) => prev.filter((uri) => uri !== uriToRemove));
      setItemImageChanged(true);
    }
  };

  const handleUpdate = async () => {
    const finalItemName =
      selectedItemName === "Others" ? customItemName : selectedItemName;
    const finalUnit = unit === "Others" ? customUnit : unit;
    if (!billImageUris.length && !itemImageUris.length) return Alert.alert("Error", "Please add at least one image");
    if (!finalItemName.trim() || !quantity.trim() || !price.trim() || !finalUnit.trim())
      return Alert.alert("Error", "Please check your inputs");

    setLoading(true);
    try {
      let updatedBillUrls = parseCsv(entry.bill_image_url);
      let updatedBillFilenames = parseCsv(entry.bill_image_filename);

      let updatedItemUrls = parseCsv(entry.item_image_url);
      let updatedItemFilenames = parseCsv(entry.item_image_filename);

      // Handle Bill Images Update
      if (billImageChanged) {
        if (entry.bill_image_filename) await deleteImagesByCsv(entry.bill_image_filename);
        const billUploads = await Promise.all(
          billImageUris.map((uri) => uploadImage(uri)),
        );
        const failedUpload = billUploads.find((img) => !img.success);
        if (failedUpload) throw new Error(failedUpload.error || "Bill image upload failed");
        updatedBillUrls = billUploads.map((img) => img.url);
        updatedBillFilenames = billUploads.map((img) => img.filename);
      }

      // Handle Item Images Update
      if (itemImageChanged) {
        if (entry.item_image_filename) await deleteImagesByCsv(entry.item_image_filename);
        const itemUploads = await Promise.all(
          itemImageUris.map((uri) => uploadImage(uri)),
        );
        const failedUpload = itemUploads.find((img) => !img.success);
        if (failedUpload) throw new Error(failedUpload.error || "Item image upload failed");
        updatedItemUrls = itemUploads.map((img) => img.url);
        updatedItemFilenames = itemUploads.map((img) => img.filename);
      }

      const isBypass = selectedVendor === "BYPASS";

      const updateData = {
        item_name: finalItemName.trim(),
        quantity: quantity.trim(),
        unit: finalUnit.trim(),
        price: parseFloat(price),
        remarks: remarks.trim(),
        bill_image_url: updatedBillUrls.join(","),
        bill_image_filename: updatedBillFilenames.join(","),
        item_image_url: updatedItemUrls.join(","),
        item_image_filename: updatedItemFilenames.join(","),
        updated_at: new Date().toISOString(),
        vendor_id: isBypass ? null : selectedVendor,
      };

      await backendPurchases.update(entry.id, updateData);
      setLoading(false);
      Alert.alert("Success", "Updated!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", error?.response?.data?.error || error.message);
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Item", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            if (entry.bill_image_filename) await deleteImagesByCsv(entry.bill_image_filename);
            if (entry.item_image_filename) await deleteImagesByCsv(entry.item_image_filename);
            await backendPurchases.remove(entry.id);
            setLoading(false);
            navigation.goBack();
          } catch (error) {
            setLoading(false);
            Alert.alert("Error", error?.response?.data?.error || "Delete failed");
          }
        },
      },
    ]);
  };

  const selectedVendorLabel =
    vendors.find((v) => v.id === selectedVendor)?.full_name || "Select vendor";

  const renderImageSection = (title, images, type) => (
    <View style={{ marginBottom: 20 }}>
      <Text style={styles.label}>{title}</Text>
      <TouchableOpacity style={styles.imageContainer} onPress={() => openCamera(type)}>
        {images.length ? (
          <>
            <Image
              source={{ uri: images[images.length - 1] }}
              style={styles.image}
            />
            <View style={styles.imageOverlay}>
              <Icon name="add-a-photo" size={32} color={COLORS.white} />
              <Text style={{ color: COLORS.white }}>Add Photo</Text>
            </View>
          </>
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
          <TouchableOpacity style={styles.addMoreImageBtn} onPress={() => openCamera(type)}>
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
        <Text style={styles.headerTitle}>Edit Purchase</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Icon name="delete" size={24} color={COLORS.danger} />
        </TouchableOpacity>
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
          <Text style={styles.label}>Remarks</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            multiline
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Add any remarks (optional)"
          />
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleUpdate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitButtonText}>Update Entry</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default EditEntryScreen;
