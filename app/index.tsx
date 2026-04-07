import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, router } from "expo-router"; 
import React from "react"; 
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function EntryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  const { continueAsGuest, user, isGuest, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // --- REDIRECCIÓN SIMPLE Y SEGURA ---
  if (user || isGuest) {
    return <Redirect href="/(tabs)" />;
  }

  const handleGuest = () => {
    continueAsGuest();
    // Usamos push en vez de replace temporalmente para evitar choques con el router
    router.push("/(tabs)");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary, "#8B0000"]}
        style={[styles.hero, { paddingTop: insets.top + (Platform.OS === "web" ? 40 : 20) }]}
      >
        <View style={styles.logoRow}>
          <View style={[styles.logoIcon, { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: colors.radius }]}>
            <Feather name="map" size={32} color="#fff" />
          </View>
        </View>
        <Text style={styles.heroTitle}>Bonilla Tour's</Text>
        <Text style={styles.heroSubtitle}>Durango · Guadalajara</Text>
        <Text style={styles.heroTagline}>Viaja con comodidad y seguridad</Text>
      </LinearGradient>

      <View
        style={[
          styles.actions,
          {
            backgroundColor: colors.card,
            borderRadius: colors.radius * 2,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20),
          },
        ]}
      >
        <View style={styles.actionContent}>
          <Text style={[styles.welcomeText, { color: colors.foreground }]}>Bienvenido</Text>
          <Text style={[styles.welcomeSub, { color: colors.mutedForeground }]}>¿Cómo deseas continuar?</Text>

          <View style={styles.buttons}>
            <AppButton title="Iniciar Sesión" onPress={() => router.push("/(auth)/login")} variant="primary" />
            <AppButton title="Crear Cuenta" onPress={() => router.push("/(auth)/register")} variant="outline" />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.guestBtn} onPress={handleGuest} activeOpacity={0.7}>
              <Text style={[styles.guestText, { color: colors.mutedForeground }]}>Continuar como invitado</Text>
              <Feather name="arrow-right" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={styles.features}>
            {[
              { icon: "shield", text: "Pago seguro" },
              { icon: "clock", text: "Reserva rápida" },
              { icon: "star", text: "Sin cuentas" },
            ].map(({ icon, text }) => (
              <View key={text} style={styles.feature}>
                <Feather name={icon as any} size={16} color={colors.primary} />
                <Text style={[styles.featureText, { color: colors.mutedForeground }]}>{text}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  hero: { paddingHorizontal: 24, paddingBottom: 48, alignItems: "center" },
  logoRow: { marginBottom: 16 },
  logoIcon: { width: 72, height: 72, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 32, fontWeight: "800", color: "#fff", letterSpacing: -0.5, textAlign: "center" },
  heroSubtitle: { fontSize: 16, color: "rgba(255,255,255,0.9)", fontWeight: "600", marginTop: 4, letterSpacing: 2, textTransform: "uppercase" },
  heroTagline: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 6 },
  actions: { flex: 1, marginTop: -24, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 8 },
  actionContent: { flex: 1, padding: 28 },
  welcomeText: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  welcomeSub: { fontSize: 15, marginBottom: 28 },
  buttons: { gap: 12 },
  separator: { height: 1, marginVertical: 4 },
  guestBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  guestText: { fontSize: 15, fontWeight: "500" },
  features: { flexDirection: "row", justifyContent: "space-around", marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  feature: { alignItems: "center", gap: 6 },
  featureText: { fontSize: 11, fontWeight: "500" },
});