import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { ActivityIndicator, View } from "react-native";
import { backendAuth } from "../services/apiClient";
import { appNavigatorStyles } from "../styles";
import { COLORS } from "../styles/theme";
import UserManagementScreen from "../screens/UserManagementScreen";
import ItemManagementScreen from "../screens/ItemManagementScreen";
import LoginScreen from "../screens/LoginScreen";
import DashboardScreen from "../screens/DashboardScreen";
import AddItemScreen from "../screens/AddItemScreen";
import EditEntryScreen from "../screens/EditEntryScreen";
import ViewEntryScreen from "../screens/ViewEntryScreen";
import VendorLedgerScreen from "../screens/VendorLedgerScreen";

const Stack = createStackNavigator();

const AppNavigator = () => {
  const [initialRoute, setInitialRoute] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const user = await backendAuth.restoreSession();
      if (!user) {
        setInitialRoute("Login");
        return;
      }
      setInitialRoute("Dashboard");
    } catch (error) {
      console.error("Error checking user:", error);
      await backendAuth.logout();
      setInitialRoute("Login");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={appNavigatorStyles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="UserManagement" component={UserManagementScreen} />
        <Stack.Screen name="ItemManagement" component={ItemManagementScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="AddItem" component={AddItemScreen} />
        <Stack.Screen name="ViewEntry" component={ViewEntryScreen} />
        <Stack.Screen name="EditEntry" component={EditEntryScreen} />
        <Stack.Screen name="VendorLedger" component={VendorLedgerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

