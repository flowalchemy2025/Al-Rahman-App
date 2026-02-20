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
import { addPurchaseEntry, supabase } from "../services/supabase";
import { uploadImage } from "../services/imageService";
import { MaterialIcons as Icon } from "@expo/vector-icons";

const UNITS = ["Kg", "Count", "Litre", "Box", "Gram", "Packet", "Dozen"];

const AddItemScreen = ({ navigation, route }) => {
  const { user } = route.params;
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState(null);

  // Form State
  const [branchItems, setBranchItems] = useState([]);
  const [selectedItemName, setSelectedItemName] = useState("");
  const [customItemName, setCustomItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("Kg");
  const [price, setPrice] = useState("");
  const [remarks, setRemarks] = useState("");

  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // 1. Fetch Vendors assigned to this branch
    const { data: vendorData } = await supabase
      .from("users")
      .select("*")
      .eq("role", "Vendor")
      .contains("branches", [user.branches[0]]); // assuming branch user has 1 branch active

    if (vendorData)
      setVendors([{ id: "BYPASS", full_name: "Local Shop" }, ...vendorData]);

    // 2. Fetch Preset Items for this branch
    const { data: itemData } = await supabase
      .from("branch_items")
      .select("item_name")
      .eq("branch_name", user.branches[0]);

    if (itemData) setBranchItems(itemData.map((i) => i.item_name));
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted")
      return Alert.alert("Required", "Camera access is needed.");

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) setImageUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    const finalItemName =
      selectedItemName === "Others" ? customItemName : selectedItemName;

    if (!imageUri)
      return Alert.alert("Error", "Please take a photo of the bill/item");
    if (!finalItemName.trim() || !quantity.trim() || !price.trim())
      return Alert.alert("Error", "Please fill required fields");
    if (!selectedVendor) return Alert.alert("Error", "Please select a vendor");

    setLoading(true);
    try {
      const imageResult = await uploadImage(imageUri);
      if (!imageResult.success) throw new Error("Image upload failed");

      const isBypass = selectedVendor === "BYPASS";

      const entryData = {
        item_name: finalItemName.trim(),
        quantity: quantity.trim(),
        unit: unit,
        price: parseFloat(price),
        remarks: remarks.trim(),
        image_url: imageResult.url,
        image_filename: imageResult.filename,
        created_by: user.id,
        branch_name: user.branches[0],
        vendor_id: isBypass ? null : selectedVendor,
        status: isBypass ? "Verified" : "Pending",
      };

      const result = await addPurchaseEntry(entryData);
      setLoading(false);
      if (result.success)
        Alert.alert("Success", "Saved!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      else throw new Error(result.error);
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Purchase</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Strictly Camera Only */}
        <TouchableOpacity style={styles.imageContainer} onPress={openCamera}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="camera-alt" size={48} color="#999" />
              <Text style={styles.imagePlaceholderText}>Take Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Item Dropdown */}
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
              placeholder="Enter Custom Item Name"
              value={customItemName}
              onChangeText={setCustomItemName}
            />
          )}
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={[styles.inputContainer, { flex: 1 }]}>
            <Text style={styles.label}>Quantity *</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.inputContainer, { flex: 1 }]}>
            <Text style={styles.label}>Unit</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.chip, unit === u && styles.chipActive]}
                  onPress={() => setUnit(u)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      unit === u && styles.chipTextActive,
                    ]}
                  >
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Price (₹) *</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Vendors */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Select Vendor *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {vendors.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={[
                  styles.chip,
                  selectedVendor === v.id && styles.chipActive,
                ]}
                onPress={() => setSelectedVendor(v.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedVendor === v.id && styles.chipTextActive,
                  ]}
                >
                  {v.full_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Entry</Text>
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

export default AddItemScreen;
