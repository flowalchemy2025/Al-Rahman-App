import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons as Icon } from "@expo/vector-icons";

const EntryCard = ({
  item,
  user,
  onPress, // <-- Added this to handle the dynamic navigation from parent
  onAddComment,
  onViewImage,
}) => {
  const firstImage = item.image_url ? item.image_url.split(",")[0] : null;
  const isPending = item.status === "Pending";

  return (
    // Wrap the entire card in a TouchableOpacity using the parent's onPress
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
      {/* Tapping the image specifically opens the full-screen image viewer */}
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

        <Text style={styles.detail}>
          Qty: {item.quantity} {item.unit || ""}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.date}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
          <View
            style={[
              styles.badge,
              isPending ? styles.badgePending : styles.badgeVerified,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                isPending ? styles.textPending : styles.textVerified,
              ]}
            >
              {item.status || "Verified"}
            </Text>
          </View>
        </View>

        {/* Updated Roles to reflect Branch instead of Worker */}
        <Text style={styles.subText} numberOfLines={1}>
          {user.role === "Super Admin"
            ? `${item.branch_name || "No Branch"} ↔ ${item.vendor?.full_name?.split(" ")[0] || "None"}`
            : user.role === "Branch"
              ? `Vendor: ${item.vendor?.full_name || "Local Shop"}`
              : `Branch: ${item.branch_name || "None"}`}
        </Text>

        {item.vendor_comment ? (
          <Text style={styles.commentText} numberOfLines={1}>
            Note: {item.vendor_comment}
          </Text>
        ) : null}
      </View>

      {/* Keep the comment button exclusively for Vendors */}
      {user.role === "Vendor" && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onAddComment(item)}
          >
            <Icon name="comment" size={20} color="#FFA726" />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  image: { width: 95, height: "100%", backgroundColor: "#E2E8F0" },
  content: { flex: 1, padding: 10, justifyContent: "space-between" },
  header: { flexDirection: "row", justifyContent: "space-between" },
  title: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1E293B",
    flex: 1,
    marginRight: 8,
  },
  price: { fontSize: 15, fontWeight: "bold", color: "#2563EB" },
  detail: { fontSize: 13, color: "#475569" },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  date: { fontSize: 11, color: "#64748B" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgePending: { backgroundColor: "#fff3cd" },
  badgeVerified: { backgroundColor: "#d4edda" },
  badgeText: { fontSize: 10, fontWeight: "bold" },
  textPending: { color: "#856404" },
  textVerified: { color: "#155724" },
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

