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

export const getImageUrl = (filename) => {
  return `${IMAGE_API_BASE_URL}/${filename}`;
};
