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
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { addPurchaseEntry, getAllUsers } from "../services/supabase";
import { uploadImage } from "../services/imageService";
import { MaterialIcons } from "@expo/vector-icons";

const AddItemScreen = ({ navigation, route }) => {
  const { user } = route.params;
  const [loading, setLoading] = useState(false);
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

  // Image Viewer State
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentViewImage, setCurrentViewImage] = useState(null);

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
        "Camera and media library permissions are required.",
      );
    }
  };

  const loadUsers = async () => {
    const roleToLoad = user.role === "Worker" ? "Vendor" : "Worker";
    const result = await getAllUsers(roleToLoad);
    if (result.success) {
      // Add the bypass option at the top of the list
      const bypassOption = {
        id: "BYPASS",
        full_name:
          user.role === "Worker"
            ? "Local Shop (Unregistered)"
            : "No Specific Worker",
        role: "System",
      };
      const usersList = [bypassOption, ...result.data];
      setAvailableUsers(usersList);
      setFilteredUsers(usersList);
    }
  };

  const handleSearch = (text) => {
    setQuery(text);
    setSelectedUser(null);
    if (text) {
      setFilteredUsers(
        availableUsers.filter((u) =>
          u.full_name.toLowerCase().includes(text.toLowerCase()),
        ),
      );
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
    Alert.alert("Add Images", "Choose an option", [
      {
        text: "Take Photo",
        onPress: async () => {
          const res = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.8,
          });
          if (!res.canceled && res.assets)
            setSelectedImages([...selectedImages, res.assets[0].uri]);
        },
      },
      {
        text: "Select from Library",
        onPress: async () => {
          const res = await ImagePicker.launchImageLibraryAsync({
            allowsMultipleSelection: true,
            allowsEditing: false,
            quality: 0.8,
          });
          if (!res.canceled && res.assets)
            setSelectedImages([
              ...selectedImages,
              ...res.assets.map((a) => a.uri),
            ]);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const removeImage = (index) =>
    setSelectedImages(selectedImages.filter((_, i) => i !== index));

  const openImageViewer = (uri) => {
    setCurrentViewImage(uri);
    setViewerVisible(true);
  };

  const handleSubmit = async () => {
    if (selectedImages.length === 0)
      return Alert.alert("Error", "Please add an image");
    if (
      !itemName.trim() ||
      !quantity.trim() ||
      !price.trim() ||
      isNaN(parseFloat(price))
    )
      return Alert.alert("Error", "Please fill all fields correctly");
    if (!selectedUser)
      return Alert.alert(
        "Error",
        "Please select a vendor/worker from the list",
      );

    setLoading(true);

    try {
      const uploadPromises = selectedImages.map((uri) => uploadImage(uri));
      const results = await Promise.all(uploadPromises);

      const uploadedUrls = [];
      const uploadedFilenames = [];
      results.forEach((res) => {
        if (!res.success) throw new Error("Image upload failed");
        uploadedUrls.push(res.url);
        uploadedFilenames.push(res.filename);
      });

      // Logic: If BYPASS is selected, it's instantly verified and relational ID is null
      const isBypass = selectedUser === "BYPASS";

      const entryData = {
        item_name: itemName.trim(),
        quantity: quantity.trim(),
        price: parseFloat(price),
        image_url: uploadedUrls.join(","),
        image_filename: uploadedFilenames.join(","),
        created_at: new Date().toISOString(),
        created_by: user.id,
        status: isBypass ? "Verified" : "Pending",
      };

      if (user.role === "Worker") {
        entryData.worker_id = user.id;
        entryData.vendor_id = isBypass ? null : selectedUser;
      } else if (user.role === "Vendor") {
        entryData.vendor_id = user.id;
        entryData.worker_id = isBypass ? null : selectedUser;
      }

      const result = await addPurchaseEntry(entryData);
      setLoading(false);

      if (result.success) {
        Alert.alert("Success", "Item added successfully!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else throw new Error(result.error);
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
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Item</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.imageSection}>
          <Text style={styles.label}>Images ({selectedImages.length})</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imageList}
          >
            <TouchableOpacity
              style={styles.addMoreBtn}
              onPress={handleImagePicker}
            >
              <MaterialIcons name="add-a-photo" size={32} color="#76B7EF" />
              <Text style={styles.addMoreText}>Add</Text>
            </TouchableOpacity>
            {selectedImages.map((uri, index) => (
              <View key={index} style={styles.thumbnailContainer}>
                <TouchableOpacity onPress={() => openImageViewer(uri)}>
                  <Image source={{ uri }} style={styles.thumbnail} />
                </TouchableOpacity>
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

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Item Name *</Text>
          <TextInput
            style={styles.input}
            value={itemName}
            onChangeText={setItemName}
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Quantity *</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
          />
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

        {/* Enhanced Dropdown */}
        <View style={[styles.inputContainer, { zIndex: 10 }]}>
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
              <ScrollView
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 200 }}
              >
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.dropdownItem}
                      onPress={() => handleSelectUser(item)}
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          item.id === "BYPASS" && {
                            fontWeight: "bold",
                            color: "#76B7EF",
                          },
                        ]}
                      >
                        {item.full_name}
                      </Text>
                      {item.role !== "System" && (
                        <Text style={styles.dropdownSubText}>{item.role}</Text>
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.dropdownItem}>
                    <Text style={styles.dropdownText}>No users found</Text>
                  </View>
                )}
              </ScrollView>
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
      </ScrollView>

      {/* Image Viewer Modal */}
      <Modal visible={viewerVisible} transparent={true} animationType="fade">
        <View style={styles.viewerContainer}>
          <TouchableOpacity
            style={styles.viewerClose}
            onPress={() => setViewerVisible(false)}
          >
            <MaterialIcons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {currentViewImage && (
            <Image
              source={{ uri: currentViewImage }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  content: { padding: 16, paddingBottom: 100 },
  imageSection: { marginBottom: 20 },
  imageList: { flexDirection: "row", paddingVertical: 10 },
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
  addMoreText: { color: "#76B7EF", fontWeight: "600", marginTop: 4 },
  thumbnailContainer: { position: "relative", marginRight: 12 },
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
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 8 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  searchContainer: { position: "relative", justifyContent: "center" },
  searchIcon: { position: "absolute", right: 12 },
  dropdownList: {
    position: "absolute",
    top: 55,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  dropdownText: { fontSize: 16, color: "#333" },
  dropdownSubText: { fontSize: 12, color: "#999", marginTop: 2 },
  submitButton: {
    backgroundColor: "#76B7EF",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
    elevation: 4,
  },
  submitButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  viewerContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerClose: { position: "absolute", top: 50, right: 20, zIndex: 10 },
  viewerImage: { width: "100%", height: "80%" },
});

export default AddItemScreen;
