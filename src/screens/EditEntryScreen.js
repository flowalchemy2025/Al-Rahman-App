import React, { useState } from "react";
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
import { updatePurchaseEntry, deletePurchaseEntry } from "../services/supabase";
import { uploadImage, deleteImage } from "../services/imageService";
import { MaterialIcons } from "@expo/vector-icons";

const EditEntryScreen = ({ navigation, route }) => {
  const { entry, user } = route.params;
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState(entry.image_url);
  const [imageChanged, setImageChanged] = useState(false);
  const [itemName, setItemName] = useState(entry.item_name);
  const [quantity, setQuantity] = useState(entry.quantity);
  const [price, setPrice] = useState(entry.price.toString());

  const handleImagePicker = () => {
    Alert.alert(
      "Change Image",
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
        setImageChanged(true);
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
        setImageChanged(true);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open image library");
      console.error(error);
    }
  };

  const handleUpdate = async () => {
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

    setLoading(true);

    try {
      let updatedImageUrl = entry.image_url;
      let updatedImageFilename = entry.image_filename;

      // If image was changed, upload new image
      if (imageChanged) {
        // Delete old image
        if (entry.image_filename) {
          await deleteImage(entry.image_filename);
        }

        // Upload new image
        const imageResult = await uploadImage(imageUri);

        if (!imageResult.success) {
          throw new Error(imageResult.error);
        }

        updatedImageUrl = imageResult.url;
        updatedImageFilename = imageResult.filename;
      }

      // Prepare update data
      const updateData = {
        item_name: itemName.trim(),
        quantity: quantity.trim(),
        price: parseFloat(price),
        image_url: updatedImageUrl,
        image_filename: updatedImageFilename,
        updated_at: new Date().toISOString(),
      };

      // Update entry in Supabase
      const result = await updatePurchaseEntry(entry.id, updateData);

      setLoading(false);

      if (result.success) {
        Alert.alert("Success", "Item updated successfully!", [
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
      Alert.alert("Error", error.message || "Failed to update item");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Item",
      "Are you sure you want to delete this item? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);

            try {
              // Delete image from server
              if (entry.image_filename) {
                await deleteImage(entry.image_filename);
              }

              // Delete entry from Supabase
              const result = await deletePurchaseEntry(entry.id);

              setLoading(false);

              if (result.success) {
                Alert.alert("Success", "Item deleted successfully!", [
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
              Alert.alert("Error", error.message || "Failed to delete item");
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Item</Text>
        <TouchableOpacity onPress={handleDelete}>
          <MaterialIcons name="delete" size={24} color="#f44336" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Image Section */}
        <TouchableOpacity
          style={styles.imageContainer}
          onPress={handleImagePicker}
        >
          {imageUri ? (
            <>
              <Image source={{ uri: imageUri }} style={styles.image} />
              <View style={styles.imageOverlay}>
                <MaterialIcons name="edit" size={32} color="#fff" />
                <Text style={styles.imageOverlayText}>Change Image</Text>
              </View>
            </>
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

        {/* Entry Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Entry Information</Text>
          {user.role !== "Worker" && entry.worker && (
            <Text style={styles.infoText}>
              Worker: {entry.worker.full_name}
            </Text>
          )}
          {user.role !== "Vendor" && entry.vendor && (
            <Text style={styles.infoText}>
              Vendor: {entry.vendor.full_name}
            </Text>
          )}
          <Text style={styles.infoText}>
            Created: {new Date(entry.created_at).toLocaleString()}
          </Text>
        </View>

        {/* Update Button */}
        <TouchableOpacity
          style={styles.updateButton}
          onPress={handleUpdate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.updateButtonText}>Update Item</Text>
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
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 12,
    alignItems: "center",
  },
  imageOverlayText: {
    color: "#fff",
    fontSize: 14,
    marginTop: 4,
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
  infoContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  updateButton: {
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
  updateButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default EditEntryScreen;
