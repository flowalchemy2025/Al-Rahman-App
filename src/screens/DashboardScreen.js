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
import SetupProfileModal from "../components/SetupProfileModal";

const Tab = createBottomTabNavigator();

const DashboardScreen = ({ navigation, route }) => {
  const [user, setUser] = useState(route.params?.user || null);
  const [showProfileModal, setShowProfileModal] = useState(false);
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
  const needsProfileSetup =
    user &&
    (!user.full_name || !user.mobile_number) &&
    user.role !== "Super Admin";
  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Profile Setup / Edit Modal */}
      <SetupProfileModal
        visible={needsProfileSetup || showProfileModal}
        isForced={needsProfileSetup}
        user={user}
        onClose={() => setShowProfileModal(false)}
        onComplete={async (updatedUser) => {
          setUser(updatedUser);
          await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
          setShowProfileModal(false); // Close it if opened manually
        }}
      />
      {/* 1. Header goes FIRST */}
      {/* Custom Top Header Shared Across Tabs */}
      {/* Custom Top Header Shared Across Tabs */}
      <View style={styles.header}>
        <View style={styles.headerUserInfo}>
          {/* MAKE THIS TOUCHABLE */}
          <TouchableOpacity
            style={styles.profileIconContainer}
            onPress={() => setShowProfileModal(true)}
          >
            <Icon name="person" size={28} color="#0EA5E9" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>{user.role} Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              {user.full_name}{" "}
              {user.role === "Branch" && user.branches
                ? `• ${user.branches[0]}`
                : ""}
            </Text>
          </View>
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
            <Icon name="people" size={24} color="#0EA5E9" />
            <Text style={styles.quickActionText}>Manage Users</Text>
          </TouchableOpacity>

          {user.role === "Branch" && (
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate("ItemManagement", { user })}
            >
              <Icon name="inventory" size={24} color="#0EA5E9" />
              <Text style={styles.quickActionText}>Manage Items</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 3. Bottom Tabs go LAST */}
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#2563EB",
          tabBarInactiveTintColor: "#64748B",
          tabBarStyle: {
            paddingBottom: 5,
            height: 60,
            backgroundColor: "#fff",
            borderTopColor: "#CBD5E1",
          },
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
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: "#1E293B",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerUserInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileIconContainer: {
    backgroundColor: "#fff",
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    elevation: 3, // Adds a tiny shadow to the icon
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#BFDBFE",
    marginTop: 2,
  },
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
    backgroundColor: "#E0F2FE",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  quickActionText: {
    color: "#0EA5E9",
    fontWeight: "bold",
    fontSize: 12,
    marginTop: 4,
  },
});

export default DashboardScreen;


