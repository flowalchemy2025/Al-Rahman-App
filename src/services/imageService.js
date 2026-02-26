import axios from "axios";
import * as FileSystem from "expo-file-system";

const IMAGE_API_BASE_URL = "https://kareemsnagpur.com/images";

export const uploadImage = async (imageUri) => {
  try {
    // Create form data
    const formData = new FormData();

    // Extract filename from URI
    const filename = imageUri.split("/").pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    // For Expo, we need to use the file URI directly
    formData.append("image", {
      uri: imageUri,
      name: filename || "photo.jpg",
      type: type,
    });

    const response = await axios.post(
      `${IMAGE_API_BASE_URL}/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Accept: "application/json",
        },
        transformRequest: (data, headers) => {
          return formData;
        },
      },
    );

    if (response.data && response.data.filename) {
      return {
        success: true,
        filename: response.data.filename,
        url: `${IMAGE_API_BASE_URL}/${response.data.filename}`,
      };
    }

    throw new Error("Upload failed");
  } catch (error) {
    console.error("Image upload error:", error);
    return {
      success: false,
      error: error.message || "Failed to upload image",
    };
  }
};

export const uploadImages = async (imageUris = []) => {
  try {
    const validUris = imageUris.filter(Boolean);
    if (!validUris.length) {
      return { success: false, error: "No images provided" };
    }

    const uploads = await Promise.all(validUris.map((uri) => uploadImage(uri)));
    const failed = uploads.find((u) => !u.success);
    if (failed) {
      return { success: false, error: failed.error || "Image upload failed" };
    }

    const urls = uploads.map((u) => u.url);
    const filenames = uploads.map((u) => u.filename);
    return { success: true, urls, filenames };
  } catch (error) {
    return { success: false, error: error.message || "Failed to upload images" };
  }
};

export const deleteImage = async (filename) => {
  try {
    await axios.delete(`${IMAGE_API_BASE_URL}/${filename}`);
    return { success: true };
  } catch (error) {
    console.error("Image delete error:", error);
    return {
      success: false,
      error: error.message || "Failed to delete image",
    };
  }
};

export const deleteImages = async (filenames = []) => {
  try {
    const valid = filenames.filter(Boolean);
    if (!valid.length) return { success: true };
    await Promise.all(valid.map((name) => deleteImage(name)));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message || "Failed to delete images" };
  }
};

export const getImageUrl = (filename) => {
  return `${IMAGE_API_BASE_URL}/${filename}`;
};
