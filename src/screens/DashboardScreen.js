import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialIcons as Icon } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOut } from "../services/supabase";

import ItemsCalendarTab from "./tabs/ItemsCalendarTab";
import AnalyticsTab from "./tabs/AnalyticsTab";
import PaymentsTab from "./tabs/PaymentsTab";
import SetupProfileModal from "../components/SetupProfileModal";
import { dashboardStyles as styles } from "../styles";
import { COLORS } from "../styles/theme";

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
  }, [navigation, user]);

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
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SetupProfileModal
        visible={needsProfileSetup || showProfileModal}
        isForced={needsProfileSetup}
        user={user}
        onClose={() => setShowProfileModal(false)}
        onComplete={async (updatedUser) => {
          setUser(updatedUser);
          await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
          setShowProfileModal(false);
        }}
      />

      <View style={styles.header}>
        <View style={styles.headerUserInfo}>
          <TouchableOpacity
            style={styles.profileIconContainer}
            onPress={() => setShowProfileModal(true)}
          >
            <Icon name="person" size={28} color={COLORS.accentSoft} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>{user.role} Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              {user.full_name}{" "}
              {user.role === "Branch" && user.branches
                ? `â€¢ ${user.branches[0]}`
                : ""}
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Icon name="logout" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {user.role !== "Vendor" && (
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => navigation.navigate("UserManagement", { user })}
          >
            <Icon name="people" size={24} color={COLORS.accentSoft} />
            <Text style={styles.quickActionText}>Manage Users</Text>
          </TouchableOpacity>

          {user.role === "Branch" && (
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate("ItemManagement", { user })}
            >
              <Icon name="inventory" size={24} color={COLORS.accentSoft} />
              <Text style={styles.quickActionText}>Manage Items</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarStyle: {
            paddingBottom: 5,
            height: 60,
            backgroundColor: COLORS.white,
            borderTopColor: COLORS.border,
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

export default DashboardScreen;
