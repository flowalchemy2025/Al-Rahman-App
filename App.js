import React from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import { appStyles as styles } from "./src/styles";
import { COLORS } from "./src/styles/theme";

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <AppNavigator />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
