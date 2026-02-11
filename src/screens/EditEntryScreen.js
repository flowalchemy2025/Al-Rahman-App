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
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { updatePurchaseEntry, deletePurchaseEntry } from "../services/supabase";
import { uploadImage, deleteImage } from "../services/imageService";
import { MaterialIcons } from "@expo/vector-icons";

const EditEntryScreen = ({ navigation, route }) => {
  const { entry, user } = route.params;
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [itemName, setItemName] = useState(entry.item_name);
  const [quantity, setQuantity] = useState(entry.quantity);
  const [price, setPrice] = useState(entry.price.toString());

  // Image Viewer State
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentViewImage, setCurrentViewImage] = useState(null);

  useEffect(() => {
    if (entry.image_url) {
      const urls = entry.image_url.split(",");
      const filenames = entry.image_filename
        ? entry.image_filename.split(",")
        : [];
      const initialImages = urls.map((url, index) => ({
        uri: url,
        filename: filenames[index] || null,
        isNew: false,
      }));
      setImages(initialImages);
    }
  }, []);

  const handleImagePicker = () => {
    Alert.alert("Add Images", "Choose an option", [
      { text: "Take Photo", onPress: () => openCamera() },
      { text: "Choose from Library", onPress: () => openLibrary() },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const openCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets) {
        setImages([...images, { uri: result.assets[0].uri, isNew: true }]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open camera");
    }
  };

  const openLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets) {
        const newImages = result.assets.map((asset) => ({
          uri: asset.uri,
          isNew: true,
        }));
        setImages([...images, ...newImages]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open image library");
    }
  };

  const removeImage = (indexToRemove) =>
    setImages(images.filter((_, index) => index !== indexToRemove));

  const openImageViewer = (uri) => {
    setCurrentViewImage(uri);
    setViewerVisible(true);
  };

  const handleUpdate = async () => {
    if (images.length === 0)
      return Alert.alert("Error", "Please add at least one image");
    if (
      !itemName.trim() ||
      !quantity.trim() ||
      !price.trim() ||
      isNaN(parseFloat(price))
    ) {
      return Alert.alert("Error", "Please check your inputs");
    }

    setLoading(true);

    try {
      const finalUrls = [];
      const finalFilenames = [];

      for (const img of images) {
        if (img.isNew) {
          const imageResult = await uploadImage(img.uri);
          if (!imageResult.success)
            throw new Error("Failed to upload new image");
          finalUrls.push(imageResult.url);
          finalFilenames.push(imageResult.filename);
        } else {
          finalUrls.push(img.uri);
          if (img.filename) finalFilenames.push(img.filename);
        }
      }

      const updateData = {
        item_name: itemName.trim(),
        quantity: quantity.trim(),
        price: parseFloat(price),
        image_url: finalUrls.join(","),
        image_filename: finalFilenames.join(","),
        updated_at: new Date().toISOString(),
      };

      const result = await updatePurchaseEntry(entry.id, updateData);
      setLoading(false);

      if (result.success)
        Alert.alert("Success", "Item updated successfully!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      else throw new Error(result.error);
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", error.message || "Failed to update item");
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Item", "Are you sure you want to delete this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            const result = await deletePurchaseEntry(entry.id);
            setLoading(false);
            if (result.success)
              Alert.alert("Success", "Item deleted!", [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            else throw new Error(result.error);
          } catch (error) {
            setLoading(false);
            Alert.alert("Error", error.message || "Failed to delete item");
          }
        },
      },
    ]);
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
        <Text style={styles.headerTitle}>Edit Item</Text>
        <TouchableOpacity onPress={handleDelete}>
          <MaterialIcons name="delete" size={24} color="#f44336" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.imageSection}>
          <Text style={styles.label}>Images ({images.length})</Text>
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

            {images.map((img, index) => (
              <View key={index} style={styles.thumbnailContainer}>
                <TouchableOpacity onPress={() => openImageViewer(img.uri)}>
                  <Image source={{ uri: img.uri }} style={styles.thumbnail} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeImage(index)}
                >
                  <MaterialIcons name="close" size={14} color="#fff" />
                </TouchableOpacity>
                {img.isNew && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>New</Text>
                  </View>
                )}
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

        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Entry Information</Text>
          <Text style={styles.infoText}>
            Status: {entry.status || "Verified"}
          </Text>
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
  content: { padding: 16, paddingBottom: 50 },
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
    zIndex: 2,
  },
  newBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(118, 183, 239, 0.9)",
    paddingVertical: 2,
    alignItems: "center",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  newBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
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
  infoText: { fontSize: 14, color: "#666", marginBottom: 4 },
  updateButton: {
    backgroundColor: "#76B7EF",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
    elevation: 4,
  },
  updateButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  viewerContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerClose: { position: "absolute", top: 50, right: 20, zIndex: 10 },
  viewerImage: { width: "100%", height: "80%" },
});

export default EditEntryScreen;
