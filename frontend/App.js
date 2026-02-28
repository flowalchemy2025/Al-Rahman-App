import React, { useCallback, useEffect } from "react";
import { AppState, StatusBar } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as Updates from "expo-updates";
import AppNavigator from "./src/navigation/AppNavigator";
import { appStyles as styles } from "./src/styles";
import { COLORS } from "./src/styles/theme";

export default function App() {
  const checkAndApplyUpdate = useCallback(async () => {
    if (__DEV__ || !Updates.isEnabled) return;
    try {
      const update = await Updates.checkForUpdateAsync();
      if (!update.isAvailable) return;
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (error) {
      console.log("OTA update check failed:", error);
    }
  }, []);

  useEffect(() => {
    checkAndApplyUpdate();
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        checkAndApplyUpdate();
      }
    });
    return () => subscription.remove();
  }, [checkAndApplyUpdate]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <AppNavigator />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
