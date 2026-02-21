import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  updatePurchaseEntry,
  deletePurchaseEntry,
  supabase,
} from "../services/supabase";
import { uploadImage, deleteImage } from "../services/imageService";
import { MaterialIcons as Icon } from "@expo/vector-icons";

const UNIT_PRESETS = ["Kg", "Count", "Litre", "Box", "Gram", "Packet", "Dozen"];
const UNITS = [...UNIT_PRESETS, "Others"];

const EditEntryScreen = ({ navigation, route }) => {
  const { entry } = route.params;
  const initialUnit = entry.unit || "Kg";
  const isPresetUnit = UNIT_PRESETS.includes(initialUnit);

  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState(
    entry.image_url ? entry.image_url.split(",")[0] : null,
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

  const loadData = async () => {
    // Determine Vendor List based on Branch
    const { data: vendorData } = await supabase
      .from("users")
      .select("*")
      .eq("role", "Vendor")
      .contains("branches", [entry.branch_name]);
    if (vendorData)
      setVendors([{ id: "BYPASS", full_name: "Local Shop" }, ...vendorData]);

    // Fetch Items List
    const { data: itemData } = await supabase
      .from("branch_items")
      .select("item_name")
      .eq("branch_name", entry.branch_name);
    if (itemData) {
      const itemsList = itemData.map((i) => i.item_name);
      setBranchItems(itemsList);

      if (itemsList.includes(entry.item_name)) {
        setSelectedItemName(entry.item_name);
      } else {
        setSelectedItemName("Others");
        setCustomItemName(entry.item_name);
      }
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
    if (!result.canceled && result.assets) {
      setImageUri(result.assets[0].uri);
      setImageChanged(true);
    }
  };

  const handleUpdate = async () => {
    const finalItemName =
      selectedItemName === "Others" ? customItemName : selectedItemName;
    const finalUnit = unit === "Others" ? customUnit : unit;
    if (!imageUri) return Alert.alert("Error", "Please add an image");
    if (!finalItemName.trim() || !quantity.trim() || !price.trim() || !finalUnit.trim())
      return Alert.alert("Error", "Please check your inputs");

    setLoading(true);
    try {
      let updatedImageUrl = entry.image_url;
      let updatedImageFilename = entry.image_filename;

      if (imageChanged) {
        if (entry.image_filename) await deleteImage(entry.image_filename);
        const imageResult = await uploadImage(imageUri);
        if (!imageResult.success) throw new Error("Image upload failed");
        updatedImageUrl = imageResult.url;
        updatedImageFilename = imageResult.filename;
      }

      const isBypass = selectedVendor === "BYPASS";

      const updateData = {
        item_name: finalItemName.trim(),
        quantity: quantity.trim(),
        unit: finalUnit.trim(),
        price: parseFloat(price),
        remarks: remarks.trim(),
        image_url: updatedImageUrl,
        image_filename: updatedImageFilename,
        updated_at: new Date().toISOString(),
        vendor_id: isBypass ? null : selectedVendor,
      };

      const result = await updatePurchaseEntry(entry.id, updateData);
      setLoading(false);
      if (result.success)
        Alert.alert("Success", "Updated!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      else throw new Error(result.error);
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", error.message);
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
            if (entry.image_filename) await deleteImage(entry.image_filename);
            await deletePurchaseEntry(entry.id);
            setLoading(false);
            navigation.goBack();
          } catch (error) {
            setLoading(false);
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
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Purchase</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Icon name="delete" size={24} color="#f44336" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.imageContainer} onPress={openCamera}>
          {imageUri ? (
            <>
              <Image source={{ uri: imageUri }} style={styles.image} />
              <View style={styles.imageOverlay}>
                <Icon name="edit" size={32} color="#fff" />
                <Text style={{ color: "#fff" }}>Change Image</Text>
              </View>
            </>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="camera-alt" size={48} color="#999" />
              <Text style={styles.imagePlaceholderText}>Take Photo</Text>
            </View>
          )}
        </TouchableOpacity>

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
              color="#666"
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
              color="#666"
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
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Update Entry</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#e0e0e0",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  content: { padding: 16, paddingBottom: 50 },
  imageContainer: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: "#fff",
    elevation: 3,
  },
  image: { width: "100%", height: "100%" },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 12,
    alignItems: "center",
  },
  imagePlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  imagePlaceholderText: { marginTop: 12, fontSize: 16, color: "#999" },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 8 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#76B7EF",
    marginRight: 8,
    backgroundColor: "#fff",
    marginBottom: 5,
  },
  chipActive: { backgroundColor: "#76B7EF" },
  chipText: { color: "#76B7EF", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  dropdownTrigger: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 16,
    color: "#333",
  },
  dropdownPlaceholder: {
    color: "#999",
  },
  dropdownMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  dropdownScroll: {
    maxHeight: 180,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  dropdownItemText: {
    fontSize: 15,
    color: "#333",
  },
  dropdownItemTextActive: {
    color: "#76B7EF",
    fontWeight: "700",
  },
  submitButton: {
    backgroundColor: "#76B7EF",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
    elevation: 4,
  },
  submitButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});

export default EditEntryScreen;
