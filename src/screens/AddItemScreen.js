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
  FlatList,
  Keyboard,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { addPurchaseEntry, getAllUsers } from "../services/supabase";
import { uploadImage } from "../services/imageService";
import { MaterialIcons } from "@expo/vector-icons";

const AddItemScreen = ({ navigation, route }) => {
  const { user } = route.params;
  const [loading, setLoading] = useState(false);

  // Changed from single imageUri to array of images
  const [selectedImages, setSelectedImages] = useState([]);

  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");

  // Search Dropdown States
  const [selectedUser, setSelectedUser] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadUsers();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status: cameraStatus } =
      await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== "granted" || mediaStatus !== "granted") {
      Alert.alert(
        "Permissions Required",
        "Camera and media library permissions are required to use this feature.",
      );
    }
  };

  const loadUsers = async () => {
    const roleToLoad = user.role === "Worker" ? "Vendor" : "Worker";
    const result = await getAllUsers(roleToLoad);
    if (result.success) {
      setAvailableUsers(result.data);
      setFilteredUsers(result.data);
    }
  };

  const handleSearch = (text) => {
    setQuery(text);
    setSelectedUser(null);
    if (text) {
      const filtered = availableUsers.filter((u) =>
        u.full_name.toLowerCase().includes(text.toLowerCase()),
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(availableUsers);
    }
    setShowDropdown(true);
  };

  const handleSelectUser = (selected) => {
    setQuery(selected.full_name);
    setSelectedUser(selected.id);
    setShowDropdown(false);
    Keyboard.dismiss();
  };

  const handleImagePicker = () => {
    Alert.alert(
      "Add Images",
      "Choose an option",
      [
        { text: "Take Photo", onPress: openCamera },
        { text: "Select Multiple from Library", onPress: openLibrary },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true },
    );
  };

  const openCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Disabled native cropper for better full-image results
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedImages([...selectedImages, result.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open camera");
    }
  };

  const openLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true, // Enable multiple selection
        selectionLimit: 5, // Optional: Limit max images
        allowsEditing: false, // Disabled native cropper
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newUris = result.assets.map((asset) => asset.uri);
        setSelectedImages([...selectedImages, ...newUris]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open image library");
    }
  };

  const removeImage = (indexToRemove) => {
    setSelectedImages(
      selectedImages.filter((_, index) => index !== indexToRemove),
    );
  };

  const handleSubmit = async () => {
    if (selectedImages.length === 0) {
      Alert.alert("Error", "Please add at least one image");
      return;
    }
    if (!itemName.trim()) return Alert.alert("Error", "Please enter item name");
    if (!quantity.trim()) return Alert.alert("Error", "Please enter quantity");
    if (!price.trim() || isNaN(parseFloat(price)))
      return Alert.alert("Error", "Please enter a valid price");
    if (!selectedUser) {
      Alert.alert(
        "Error",
        `Please select a valid ${user.role === "Worker" ? "vendor" : "worker"}`,
      );
      return;
    }

    setLoading(true);

    try {
      // 1. Upload All Images in Parallel
      const uploadPromises = selectedImages.map((uri) => uploadImage(uri));
      const results = await Promise.all(uploadPromises);

      // 2. Check for failures and collect URLs
      const uploadedUrls = [];
      const uploadedFilenames = [];

      results.forEach((res) => {
        if (!res.success)
          throw new Error(res.error || "Failed to upload one of the images");
        uploadedUrls.push(res.url);
        uploadedFilenames.push(res.filename);
      });

      // 3. Prepare entry data (Join URLs with comma)
      const entryData = {
        item_name: itemName.trim(),
        quantity: quantity.trim(),
        price: parseFloat(price),
        image_url: uploadedUrls.join(","), // Storing multiple URLs as comma-separated string
        image_filename: uploadedFilenames.join(","),
        created_at: new Date().toISOString(),
      };

      if (user.role === "Worker") {
        entryData.worker_id = user.id;
        entryData.vendor_id = selectedUser;
      } else if (user.role === "Vendor") {
        entryData.vendor_id = user.id;
        entryData.worker_id = selectedUser;
      }

      const result = await addPurchaseEntry(entryData);

      setLoading(false);

      if (result.success) {
        Alert.alert("Success", "Item added successfully!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", error.message || "Failed to add item");
    }
  };

  const renderImageItem = ({ item, index }) => (
    <View style={styles.thumbnailContainer}>
      <Image source={{ uri: item }} style={styles.thumbnail} />
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => removeImage(index)}
      >
        <MaterialIcons name="close" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Item</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* New Multi-Image Section */}
        <View style={styles.imageSection}>
          <Text style={styles.label}>Images ({selectedImages.length})</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imageList}
          >
            {/* Add Button */}
            <TouchableOpacity
              style={styles.addMoreBtn}
              onPress={handleImagePicker}
            >
              <MaterialIcons name="add-a-photo" size={32} color="#76B7EF" />
              <Text style={styles.addMoreText}>Add</Text>
            </TouchableOpacity>

            {/* Selected Images List */}
            {selectedImages.map((uri, index) => (
              <View key={index} style={styles.thumbnailContainer}>
                <Image source={{ uri: uri }} style={styles.thumbnail} />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeImage(index)}
                >
                  <MaterialIcons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Inputs */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Item Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter item name"
            value={itemName}
            onChangeText={setItemName}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Quantity *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 5 kg"
            value={quantity}
            onChangeText={setQuantity}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Price (₹) *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter price"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Dropdown User Select */}
        <View style={[styles.inputContainer, { zIndex: 1000 }]}>
          <Text style={styles.label}>
            Select {user.role === "Worker" ? "Vendor" : "Worker"} *
          </Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.input}
              placeholder={`Search ${user.role === "Worker" ? "vendor" : "worker"}...`}
              value={query}
              onChangeText={handleSearch}
              onFocus={() => setShowDropdown(true)}
            />
            <MaterialIcons
              name={showDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"}
              size={24}
              color="#999"
              style={styles.searchIcon}
            />
          </View>

          {showDropdown && (
            <View style={styles.dropdownList}>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.dropdownItem}
                    onPress={() => handleSelectUser(item)}
                  >
                    <Text style={styles.dropdownText}>{item.full_name}</Text>
                    <Text style={styles.dropdownSubText}>{item.role}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.dropdownItem}>
                  <Text style={styles.dropdownText}>No users found</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Add Item</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  // New Styles for Image List
  imageSection: {
    marginBottom: 20,
  },
  imageList: {
    flexDirection: "row",
    paddingVertical: 10,
  },
  addMoreBtn: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#76B7EF",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    backgroundColor: "#fff",
  },
  addMoreText: {
    color: "#76B7EF",
    fontWeight: "600",
    marginTop: 4,
  },
  thumbnailContainer: {
    position: "relative",
    marginRight: 12,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#ddd",
  },
  removeBtn: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#ff4444",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  // Existing Styles
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  searchContainer: {
    position: "relative",
    justifyContent: "center",
  },
  searchIcon: {
    position: "absolute",
    right: 12,
  },
  dropdownList: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 200,
    elevation: 5,
    marginTop: -4,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  dropdownText: {
    fontSize: 16,
    color: "#333",
  },
  dropdownSubText: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: "#76B7EF",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default AddItemScreen;
