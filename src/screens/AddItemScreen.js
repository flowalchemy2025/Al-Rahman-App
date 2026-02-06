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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { addPurchaseEntry, getAllUsers } from "../services/supabase";
import { uploadImage } from "../services/imageService";
import { MaterialIcons } from "@expo/vector-icons";

const AddItemScreen = ({ navigation, route }) => {
  const { user } = route.params;
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);

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
    // Workers select vendors, Vendors select workers
    const roleToLoad = user.role === "Worker" ? "Vendor" : "Worker";
    const result = await getAllUsers(roleToLoad);

    if (result.success) {
      setAvailableUsers(result.data);
    }
  };

  const handleImagePicker = () => {
    Alert.alert(
      "Select Image",
      "Choose an option",
      [
        {
          text: "Take Photo",
          onPress: () => openCamera(),
        },
        {
          text: "Choose from Library",
          onPress: () => openLibrary(),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true },
    );
  };

  const openCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open camera");
      console.error(error);
    }
  };

  const openLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open image library");
      console.error(error);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!imageUri) {
      Alert.alert("Error", "Please add an image");
      return;
    }
    if (!itemName.trim()) {
      Alert.alert("Error", "Please enter item name");
      return;
    }
    if (!quantity.trim()) {
      Alert.alert("Error", "Please enter quantity");
      return;
    }
    if (!price.trim() || isNaN(parseFloat(price))) {
      Alert.alert("Error", "Please enter a valid price");
      return;
    }
    if (!selectedUser) {
      Alert.alert(
        "Error",
        `Please select a ${user.role === "Worker" ? "vendor" : "worker"}`,
      );
      return;
    }

    setLoading(true);

    try {
      // Upload image first
      const imageResult = await uploadImage(imageUri);

      if (!imageResult.success) {
        throw new Error(imageResult.error);
      }

      // Prepare entry data
      const entryData = {
        item_name: itemName.trim(),
        quantity: quantity.trim(),
        price: parseFloat(price),
        image_url: imageResult.url,
        image_filename: imageResult.filename,
        created_at: new Date().toISOString(),
      };

      // Set worker and vendor based on user role
      if (user.role === "Worker") {
        entryData.worker_id = user.id;
        entryData.vendor_id = selectedUser;
      } else if (user.role === "Vendor") {
        entryData.vendor_id = user.id;
        entryData.worker_id = selectedUser;
      }

      // Save to Supabase
      const result = await addPurchaseEntry(entryData);

      setLoading(false);

      if (result.success) {
        Alert.alert("Success", "Item added successfully!", [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", error.message || "Failed to add item");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Item</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* Image Section */}
        <TouchableOpacity
          style={styles.imageContainer}
          onPress={handleImagePicker}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialIcons name="add-a-photo" size={48} color="#999" />
              <Text style={styles.imagePlaceholderText}>
                Take Photo or Upload Image
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Item Name */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Item Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter item name"
            value={itemName}
            onChangeText={setItemName}
          />
        </View>

        {/* Quantity */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Quantity *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 5 kg, 10 pieces"
            value={quantity}
            onChangeText={setQuantity}
          />
        </View>

        {/* Price */}
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

        {/* User Selection */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Select {user.role === "Worker" ? "Vendor" : "Worker"} *
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.userScroll}
          >
            {availableUsers.map((availableUser) => (
              <TouchableOpacity
                key={availableUser.id}
                style={[
                  styles.userChip,
                  selectedUser === availableUser.id && styles.userChipSelected,
                ]}
                onPress={() => setSelectedUser(availableUser.id)}
              >
                <Text
                  style={[
                    styles.userChipText,
                    selectedUser === availableUser.id &&
                      styles.userChipTextSelected,
                  ]}
                >
                  {availableUser.full_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Submit Button */}
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
  },
  imageContainer: {
    width: "100%",
    height: 250,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  imagePlaceholderText: {
    marginTop: 12,
    fontSize: 16,
    color: "#999",
  },
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
  userScroll: {
    marginTop: 8,
  },
  userChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#4CAF50",
    marginRight: 8,
    backgroundColor: "#fff",
  },
  userChipSelected: {
    backgroundColor: "#4CAF50",
  },
  userChipText: {
    color: "#4CAF50",
    fontWeight: "600",
  },
  userChipTextSelected: {
    color: "#fff",
  },
  submitButton: {
    backgroundColor: "#4CAF50",
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
