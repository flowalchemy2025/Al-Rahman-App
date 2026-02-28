import React, { useEffect } from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as Updates from "expo-updates"; // Import the updates library
import AppNavigator from "./src/navigation/AppNavigator";
import { appStyles as styles } from "./src/styles";
import { COLORS } from "./src/styles/theme";

export default function App() {
  useEffect(() => {
    // Function to handle silent OTA updates
    const handleSilentUpdate = async () => {
      try {
        // 1. Check if a new OTA update is available on your server
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          // 2. Download the update silently in the background
          await Updates.fetchUpdateAsync();

          // 3. Immediately reload the app to apply the new JS bundle
          // The user will see a quick flash as the app restarts with the new code
          await Updates.reloadAsync();
        }
      } catch (error) {
        // Silently log the error so the user is never bothered
        console.log("Failed to fetch silent update:", error);
      }
    };

    // We wrap this in a check so it only runs in production, not during local development
    if (!__DEV__) {
      handleSilentUpdate();
    }
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <AppNavigator />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
