import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
} from "react-native";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import { viewEntryStyles as styles } from "../styles";
import { COLORS } from "../styles/theme";

const ViewEntryScreen = ({ navigation, route }) => {
  const { entry } = route.params;
  const imageUris = (entry.image_url || "")
    .split(",")
    .map((i) => i.trim())
    .filter(Boolean);
  const [activeImageUri, setActiveImageUri] = useState(imageUris[0] || null);

  const [viewerVisible, setViewerVisible] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>View Purchase</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={styles.imageContainer}
          onPress={() => {
            if (activeImageUri) setViewerVisible(true);
          }}
        >
          {activeImageUri ? (
            <Image source={{ uri: activeImageUri }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon
                name="image-not-supported"
                size={48}
                color={COLORS.textMuted}
              />
            </View>
          )}
        </TouchableOpacity>
        {imageUris.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 20 }}
          >
            {imageUris.map((uri, index) => (
              <TouchableOpacity
                key={`${uri}-${index}`}
                onPress={() => setActiveImageUri(uri)}
                style={{
                  marginRight: 10,
                  borderWidth: activeImageUri === uri ? 2 : 0,
                  borderColor: COLORS.primary,
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <Image source={{ uri }} style={{ width: 68, height: 68 }} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

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
            <Icon name="close" size={32} color={COLORS.white} />
          </TouchableOpacity>
          {activeImageUri && (
            <Image
              source={{ uri: activeImageUri }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

export default ViewEntryScreen;
