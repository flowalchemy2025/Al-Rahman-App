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
  const [imageUris, setImageUris] = useState(
    entry.image_url
      ? entry.image_url
          .split(",")
          .map((u) => u.trim())
          .filter(Boolean)
      : [],
  );
  const [imageChanged, setImageChanged] = useState(false);

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

  const splitCsv = (value) =>
    value
      ? value
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : [];

  const deleteImagesByCsv = async (filenamesCsv) => {
    const filenames = splitCsv(filenamesCsv);
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

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted")
      return Alert.alert("Required", "Camera access is needed.");
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      setImageUris((prev) => [...prev, result.assets[0].uri]);
      setImageChanged(true);
    }
  };

  const removeImage = (uriToRemove) => {
    setImageUris((prev) => prev.filter((uri) => uri !== uriToRemove));
    setImageChanged(true);
  };

  const handleUpdate = async () => {
    const finalItemName =
      selectedItemName === "Others" ? customItemName : selectedItemName;
    const finalUnit = unit === "Others" ? customUnit : unit;
    if (!imageUris.length) return Alert.alert("Error", "Please add an image");
    if (!finalItemName.trim() || !quantity.trim() || !price.trim() || !finalUnit.trim())
      return Alert.alert("Error", "Please check your inputs");

    setLoading(true);
    try {
      let updatedImageUrls = parseCsv(entry.image_url);
      let updatedImageFilenames = parseCsv(entry.image_filename);

      if (imageChanged) {
        await deleteImagesByCsv(entry.image_filename);
        const uploadResults = await Promise.all(
          imageUris.map((uri) => uploadImage(uri)),
        );
        const failedUpload = uploadResults.find((img) => !img.success);
        if (failedUpload) throw new Error(failedUpload.error || "Image upload failed");
        updatedImageUrls = uploadResults.map((img) => img.url);
        updatedImageFilenames = uploadResults.map((img) => img.filename);
      }

      const isBypass = selectedVendor === "BYPASS";

      const updateData = {
        item_name: finalItemName.trim(),
        quantity: quantity.trim(),
        unit: finalUnit.trim(),
        price: parseFloat(price),
        remarks: remarks.trim(),
        image_url: updatedImageUrls.join(","),
        image_filename: updatedImageFilenames.join(","),
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
            await deleteImagesByCsv(entry.image_filename);
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
        <TouchableOpacity style={styles.imageContainer} onPress={openCamera}>
          {imageUris.length ? (
            <>
              <Image
                source={{ uri: imageUris[imageUris.length - 1] }}
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
        {imageUris.length > 0 && (
          <View style={styles.imageActionsRow}>
            <Text style={styles.imageCountText}>
              {imageUris.length} photo{imageUris.length > 1 ? "s" : ""} added
            </Text>
            <TouchableOpacity style={styles.addMoreImageBtn} onPress={openCamera}>
              <Icon name="add-a-photo" size={18} color={COLORS.white} />
              <Text style={styles.addMoreImageBtnText}>Add Photo</Text>
            </TouchableOpacity>
          </View>
        )}
        {imageUris.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imageThumbScroll}
          >
            {imageUris.map((uri, index) => (
              <View key={`${uri}-${index}`} style={styles.imageThumbWrap}>
                <Image source={{ uri }} style={styles.imageThumb} />
                <TouchableOpacity
                  style={styles.removeThumbBtn}
                  onPress={() => removeImage(uri)}
                >
                  <Icon name="close" size={14} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

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

