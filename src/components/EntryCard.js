import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons as Icon } from "@expo/vector-icons";

// Helper to get local date safely
const getLocalYYYYMMDD = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const EntryCard = ({
  item,
  user,
  navigation,
  onVerify,
  onAddComment,
  onViewImage,
}) => {
  const firstImage = item.image_url ? item.image_url.split(",")[0] : null;
  const isPending = item.status === "Pending";
  const todayStr = getLocalYYYYMMDD();
  const itemDateStr = item.created_at.split("T")[0];

  // Logic: Can this user edit the item?
  // Super Admin can edit everything. Workers can only edit THEIR items made TODAY.
  const canEdit =
    user.role === "Super Admin" ||
    (user.role === "Worker" &&
      item.created_by === user.id &&
      itemDateStr === todayStr);

  const canVerify =
    isPending &&
    user.role !== "Super Admin" &&
    item.created_by !== user.id &&
    ((user.role === "Worker" && item.worker_id === user.id) ||
      (user.role === "Vendor" && item.vendor_id === user.id));

  return (
    <View style={styles.card}>
      {/* ... KEEP YOUR EXISTING IMAGE, CONTENT, AND HEADER CODE HERE ... */}
      <TouchableOpacity onPress={() => onViewImage(firstImage)}>
        <Image
          source={
            firstImage
              ? { uri: firstImage }
              : { uri: "https://via.placeholder.com/90" }
          }
          style={styles.image}
        />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {item.item_name}
          </Text>
          <Text style={styles.price}>₹{parseFloat(item.price).toFixed(2)}</Text>
        </View>

        <Text style={styles.detail}>Qty: {item.quantity}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.date}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>

        <Text style={styles.subText} numberOfLines={1}>
          {user.role === "Super Admin"
            ? `${item.worker?.full_name?.split(" ")[0] || "Local"} ↔ ${item.vendor?.full_name?.split(" ")[0] || "None"}`
            : user.role === "Worker"
              ? `Vendor: ${item.vendor?.full_name || "Local Shop"}`
              : `Worker: ${item.worker?.full_name || "None"}`}
        </Text>

        {item.vendor_comment && (
          <Text style={styles.commentText} numberOfLines={1}>
            Note: {item.vendor_comment}
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        {canEdit && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              navigation.navigate("EditEntry", { entry: item, user })
            }
          >
            <Icon name="edit" size={20} color="#76B7EF" />
          </TouchableOpacity>
        )}

        {user.role === "Vendor" && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onAddComment(item)}
          >
            <Icon name="comment" size={20} color="#FFA726" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ... KEEP EXISTING STYLES ...
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    flexDirection: "row",
    height: 115,
    overflow: "hidden",
    elevation: 2,
  },
  image: { width: 95, height: "100%", backgroundColor: "#eee" },
  content: { flex: 1, padding: 10, justifyContent: "space-between" },
  header: { flexDirection: "row", justifyContent: "space-between" },
  title: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  price: { fontSize: 15, fontWeight: "bold", color: "#76B7EF" },
  detail: { fontSize: 13, color: "#666" },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  date: { fontSize: 11, color: "#999" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgePending: { backgroundColor: "#fff3cd" },
  badgeVerified: { backgroundColor: "#d4edda" },
  badgeText: { fontSize: 10, fontWeight: "bold" },
  textPending: { color: "#856404" },
  textVerified: { color: "#155724" },
  verifyBtn: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  verifyText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  subText: { fontSize: 11, color: "#555", marginTop: 4 },
  commentText: {
    fontSize: 10,
    color: "#FFA726",
    marginTop: 2,
    fontStyle: "italic",
  },
  actions: {
    width: 40,
    justifyContent: "center",
    alignItems: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#f0f0f0",
  },
  actionBtn: { padding: 8 },
});

export default EntryCard;
