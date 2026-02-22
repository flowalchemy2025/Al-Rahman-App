import React from "react";
import { SafeAreaView, StatusBar } from "react-native";
import AppNavigator from "./src/navigation/AppNavigator";
import { appStyles as styles } from "./src/styles";
import { COLORS } from "./src/styles/theme";

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <AppNavigator />
    </SafeAreaView>
  );
}
