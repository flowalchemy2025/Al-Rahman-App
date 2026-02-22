import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, View } from "react-native";
import { supabase } from "../services/supabase"; // <-- Add this import
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
      // 1. Check if we have local user data
      const userJson = await AsyncStorage.getItem("user");

      if (userJson) {
        // 2. Verify with Supabase if the actual auth session is still valid
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session) {
          // Token is invalid, expired, or user was deleted from database
          console.log("Session invalid, clearing storage...");
          await AsyncStorage.removeItem("user");
          await supabase.auth.signOut(); // Ensure Supabase clears its own cache
          setInitialRoute("Login");
        } else {
          // Session is valid, proceed to Dashboard
          setInitialRoute("Dashboard");
        }
      } else {
        setInitialRoute("Login");
      }
    } catch (error) {
      console.error("Error checking user:", error);
      // Fallback: clear data and go to login to prevent crash loop
      await AsyncStorage.removeItem("user");
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

