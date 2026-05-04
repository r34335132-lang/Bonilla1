import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router"; 
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

function NativeTabLayout() {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Inicio</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="my-trips">
        <Icon sf={{ default: "ticket", selected: "ticket.fill" }} />
        <Label>Mis Viajes</Label>
      </NativeTabs.Trigger>
      
      {/* MAGIA: Pestaña de Paquetería Nativa */}
      <NativeTabs.Trigger name="paqueteria">
        <Icon sf={{ default: "shippingbox", selected: "shippingbox.fill" }} />
        <Label>Paquetes</Label>
      </NativeTabs.Trigger>
      
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Perfil</Label>
      </NativeTabs.Trigger>
      
      {isAdmin && (
        <NativeTabs.Trigger name="admin">
          <Icon sf={{ default: "shield", selected: "shield.fill" }} />
          <Label>Admin</Label>
        </NativeTabs.Trigger>
      )}
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const { role } = useAuth();
  const isAdmin = role === "admin";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginBottom: isWeb ? 8 : 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={22} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="my-trips"
        options={{
          title: "Mis Viajes",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="ticket" tintColor={color} size={22} />
            ) : (
              <Feather name="briefcase" size={22} color={color} />
            ),
        }}
      />
      
      {/* MAGIA: Pestaña de Paquetería Clásica (Android/Web) */}
      <Tabs.Screen
        name="paqueteria"
        options={{
          title: "Paquetes",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="shippingbox" tintColor={color} size={22} />
            ) : (
              <Feather name="package" size={22} color={color} />
            ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person" tintColor={color} size={22} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />

      {/* Ocultamos las notificaciones por ahora para dar espacio a Paquetería */}
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          href: isAdmin ? '/(tabs)/admin' : null, 
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="shield" tintColor={color} size={22} />
            ) : (
              <Feather name="shield" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}