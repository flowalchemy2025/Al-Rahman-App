import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
} from "react-native";
import { MaterialIcons as Icon } from "@expo/vector-icons";

const ViewEntryScreen = ({ navigation, route }) => {
  const { entry } = route.params;
  const imageUri = entry.image_url ? entry.image_url.split(",")[0] : null;

  const [viewerVisible, setViewerVisible] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>View Purchase</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={styles.imageContainer}
          onPress={() => {
            if (imageUri) setViewerVisible(true);
          }}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="image-not-supported" size={48} color="#64748B" />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.title}>{entry.item_name}</Text>
          <Text style={styles.price}>
            ₹{parseFloat(entry.price).toFixed(2)}
          </Text>

          <View style={styles.row}>
            <Text style={styles.label}>Quantity:</Text>
            <Text style={styles.value}>
              {entry.quantity} {entry.unit}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text
              style={[
                styles.value,
                {
                  color: entry.status === "Pending" ? "#856404" : "#155724",
                  fontWeight: "bold",
                },
              ]}
            >
              {entry.status || "Verified"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Branch:</Text>
            <Text style={styles.value}>{entry.branch_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Vendor:</Text>
            <Text style={styles.value}>
              {entry.vendor?.full_name || "Local Shop"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>
              {new Date(entry.created_at).toLocaleString()}
            </Text>
          </View>

          {entry.remarks ? (
            <View style={{ marginTop: 15 }}>
              <Text style={styles.label}>Remarks:</Text>
              <Text style={styles.remarksText}>{entry.remarks}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Image Viewer */}
      <Modal visible={viewerVisible} transparent={true} animationType="fade">
        <View style={styles.viewerContainer}>
          <TouchableOpacity
            style={styles.viewerClose}
            onPress={() => setViewerVisible(false)}
          >
            <Icon name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 50,
    backgroundColor: "#1E293B",
    borderBottomWidth: 1,
    borderColor: "#CBD5E1",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  content: { padding: 16 },
  imageContainer: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: "#fff",
    elevation: 3,
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    elevation: 2,
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#1E293B", marginBottom: 4 },
  price: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2563EB",
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  label: { fontSize: 16, color: "#475569", fontWeight: "600" },
  value: { fontSize: 16, color: "#1E293B" },
  remarksText: {
    fontSize: 15,
    color: "#444",
    marginTop: 4,
    fontStyle: "italic",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 8,
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerClose: { position: "absolute", top: 50, right: 20, zIndex: 10 },
  viewerImage: { width: "100%", height: "80%" },
});

export default ViewEntryScreen;

