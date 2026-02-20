import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOut } from "../services/supabase";

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

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#76B7EF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. Header goes FIRST */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{user.role} Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome, {user.full_name}</Text>
        </View>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Icon name="logout" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* 2. Management Quick Actions go SECOND */}
      {user.role !== "Vendor" && (
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => navigation.navigate("UserManagement", { user })}
          >
            <Icon name="people" size={24} color="#76B7EF" />
            <Text style={styles.quickActionText}>Manage Users</Text>
          </TouchableOpacity>

          {user.role === "Branch" && (
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate("ItemManagement", { user })}
            >
              <Icon name="inventory" size={24} color="#76B7EF" />
              <Text style={styles.quickActionText}>Manage Items</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 3. Bottom Tabs go LAST */}
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#76B7EF",
          tabBarInactiveTintColor: "gray",
          tabBarStyle: { paddingBottom: 5, height: 60 },
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
        <Tab.Screen name="Calendar">
          {() => <ItemsCalendarTab user={user} navigation={navigation} />}
        </Tab.Screen>

        <Tab.Screen name="Payments">
          {() => <PaymentsTab user={user} navigation={navigation} />}
        </Tab.Screen>

        {user.role !== "Vendor" && (
          <Tab.Screen name="Analytics">
            {() => <AnalyticsTab user={user} />}
          </Tab.Screen>
        )}
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: "#76B7EF",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 13, color: "#e3f2fd" },
  logoutButton: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
  },
  quickActionsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 10,
    elevation: 2,
    gap: 10,
    justifyContent: "center",
  },
  quickActionBtn: {
    flex: 1,
    backgroundColor: "#e3f2fd",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  quickActionText: {
    color: "#76B7EF",
    fontWeight: "bold",
    fontSize: 12,
    marginTop: 4,
  },
});

export default DashboardScreen;
