import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { entryCardStyles as styles } from "../styles";
import { COLORS } from "../styles/theme";

const EntryCard = ({
  item,
  user,
  onPress, // <-- Added this to handle the dynamic navigation from parent
  onAddComment,
  onViewImage,
}) => {
  const allImageUrls = [
    ...(item.bill_image_url ? item.bill_image_url.split(",") : []),
    ...(item.item_image_url ? item.item_image_url.split(",") : []),
  ];
  const firstImage = allImageUrls.length > 0 ? allImageUrls[0] : null;
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
            <Icon name="comment" size={20} color={COLORS.info} />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default EntryCard;
