import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOut } from "../services/supabase";

// Import your new Tab Screens
import ItemsCalendarTab from "./tabs/ItemsCalendarTab";
import AnalyticsTab from "./tabs/AnalyticsTab";
import PaymentsTab from "./tabs/PaymentsTab";

const Tab = createBottomTabNavigator();

const DashboardScreen = ({ navigation, route }) => {
  const [user, setUser] = useState(route.params?.user || null);

  useEffect(() => {
    if (!user) {
      AsyncStorage.getItem("user").then((u) => {
        if (u) setUser(JSON.parse(u));
        else navigation.replace("Login");
      });
    }
  }, []);

  const handleLogout = async () => {
    await signOut();
    await AsyncStorage.removeItem("user");
    navigation.replace("Login");
  };

  if (!user)
    return (
      <ActivityIndicator size="large" color="#76B7EF" style={{ flex: 1 }} />
    );

  return (
    <View style={{ flex: 1 }}>
      {/* Custom Top Header Shared Across Tabs */}
      <View
        style={{
          backgroundColor: "#76B7EF",
          paddingTop: 50,
          paddingBottom: 15,
          paddingHorizontal: 20,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View>
          <Text style={{ fontSize: 22, fontWeight: "bold", color: "#fff" }}>
            {user.role} Dashboard
          </Text>
          <Text style={{ fontSize: 13, color: "#e3f2fd" }}>
            Welcome, {user.full_name}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            padding: 8,
            backgroundColor: "rgba(255,255,255,0.2)",
            borderRadius: 20,
          }}
        >
          <Icon name="logout" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Bottom Tabs Navigating the Sub-Pages */}
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#76B7EF",
          tabBarInactiveTintColor: "gray",
          tabBarIcon: ({ color, size }) => {
            let iconName;
            if (route.name === "Calendar") iconName = "calendar-today";
            else if (route.name === "Analytics") iconName = "insert-chart";
            else if (route.name === "Payments")
              iconName = "account-balance-wallet";
            return <Icon name={iconName} size={size} color={color} />;
          },
        })}
      >
        {/* Everyone gets the Calendar & Payments tab */}
        <Tab.Screen name="Calendar">
          {() => <ItemsCalendarTab user={user} navigation={navigation} />}
        </Tab.Screen>

        <Tab.Screen name="Payments">
          {() => <PaymentsTab user={user} navigation={navigation} />}
        </Tab.Screen>

        {/* Vendors do NOT get the Analytics tab */}
        {user.role !== "Vendor" && (
          <Tab.Screen name="Analytics">
            {() => <AnalyticsTab user={user} />}
          </Tab.Screen>
        )}
      </Tab.Navigator>
    </View>
  );
};

export default DashboardScreen;
