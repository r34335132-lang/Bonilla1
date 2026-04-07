import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isGuest, role, logout } = useAuth();

  const userName = user?.user_metadata?.name || "Viajero";
  const userEmail = user?.email || "Sin correo registrado";
  const initial = userName.charAt(0).toUpperCase();
  const isAdmin = role === "admin"; // Determinamos si es Admin usando el contexto

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Estás seguro de que deseas salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sí, salir",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            router.replace("/"); 
          } catch (error) {
            console.error("Error cerrando sesión:", error);
          }
        },
      },
    ]);
  };

  // Funciones placeholder para los botones del menú
  const handleEditProfile = () => {
    Alert.alert("Datos Personales", "Esta sección estará disponible en la próxima actualización para editar tu información.");
  };

  const handleNotifications = () => {
    Alert.alert("Notificaciones", "Aquí podrás gestionar tus alertas de viaje y promociones.");
  };

  const handleHelpCenter = () => {
    Alert.alert("Centro de Ayuda", "¿Necesitas asistencia? Contáctanos a soporte@bonillatours.com o llama al 123-456-7890.");
  };

  const handleTerms = () => {
    Alert.alert("Términos y Condiciones", "Al usar nuestra app, aceptas nuestras políticas de viaje y privacidad.");
  };

  // --- VISTA PARA INVITADOS ---
  if (isGuest || !user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20), backgroundColor: colors.card }]}>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>Mi Perfil</Text>
        </View>
        <View style={styles.centerBox}>
          <View style={[styles.guestIconBox, { backgroundColor: colors.secondary }]}>
            <Feather name="user" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Estás como Invitado</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Crea una cuenta para guardar tu historial de viajes, gestionar pagos y obtener ofertas exclusivas.
          </Text>
          <View style={{ width: "100%", gap: 12, marginTop: 12 }}>
            <AppButton title="Crear cuenta gratis" onPress={() => router.push("/(auth)/register")} />
            <AppButton title="Iniciar sesión" onPress={() => router.push("/(auth)/login")} variant="outline" />
          </View>
        </View>
      </View>
    );
  }

  // --- VISTA PREMIUM PARA USUARIOS AUTENTICADOS ---
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER DINÁMICO (ROJO NORMAL O DORADO SI ES ADMIN) */}
      <LinearGradient
        colors={isAdmin ? ["#B8860B", "#8B4513"] : [colors.primary, "#8B0000"]}
        style={[
          styles.profileHeader,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 32) },
        ]}
      >
        <View style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: isAdmin ? "#FFD700" : colors.secondary }]}>
            <Text style={[styles.avatarText, { color: isAdmin ? "#8B4513" : colors.primary }]}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
              {isAdmin && (
                <View style={styles.adminBadge}>
                  <Feather name="shield" size={10} color="#8B4513" />
                  <Text style={styles.adminBadgeText}>ADMIN</Text>
                </View>
              )}
            </View>
            <Text style={styles.userEmail} numberOfLines={1}>{userEmail}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* SECCIÓN ADMINISTRADOR (DESTACADA) */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Centro de Mando</Text>
            <TouchableOpacity 
              style={[styles.adminCard, { backgroundColor: colors.card, borderColor: "#B8860B" }]}
              onPress={() => router.push("/(tabs)/admin")}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["rgba(184, 134, 11, 0.1)", "transparent"]}
                style={StyleSheet.absoluteFill}
              />
              <View style={[styles.menuIconBox, { backgroundColor: "#B8860B" }]}>
                <Feather name="settings" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuTitle, { color: colors.foreground }]}>Gestionar Bonilla Tour's</Text>
                <Text style={[styles.menuSubtitle, { color: colors.mutedForeground }]}>Viajes, Pasajes y Clientes Fan</Text>
              </View>
              <Feather name="arrow-right" size={20} color="#B8860B" />
            </TouchableOpacity>
          </View>
        )}

        {/* SECCIÓN CUENTA */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mi Cuenta</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuOption icon="user" title="Datos personales" colors={colors} onPress={handleEditProfile} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuOption icon="bell" title="Notificaciones" colors={colors} onPress={handleNotifications} />
          </View>
        </View>

        {/* SECCIÓN SOPORTE */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Soporte</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuOption icon="help-circle" title="Centro de ayuda" colors={colors} onPress={handleHelpCenter} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuOption icon="file-text" title="Términos y condiciones" colors={colors} onPress={handleTerms} />
          </View>
        </View>

        {/* BOTÓN DE CERRAR SESIÓN */}
        <TouchableOpacity 
          style={[styles.logoutBtn, { backgroundColor: colors.secondary }]} 
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Feather name="log-out" size={20} color={colors.primary} />
          <Text style={[styles.logoutText, { color: colors.primary }]}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function MenuOption({ icon, title, subtitle, colors, onPress }: any) {
  return (
    <TouchableOpacity style={styles.menuOption} activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.menuIconBox, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={18} color={colors.foreground} />
      </View>
      <View style={styles.menuTextContent}>
        <Text style={[styles.menuTitle, { color: colors.foreground }]}>{title}</Text>
        {subtitle && <Text style={[styles.menuSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>}
      </View>
      <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, zIndex: 10 },
  screenTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  guestIconBox: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  emptyText: { fontSize: 15, textAlign: "center", marginBottom: 24, lineHeight: 22 },
  profileHeader: { paddingHorizontal: 24, paddingBottom: 40, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  userInfo: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 24, fontWeight: "800" },
  userName: { fontSize: 24, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  userEmail: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 2, fontWeight: "500" },
  adminBadge: { backgroundColor: "#FFD700", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  adminBadgeText: { fontSize: 10, fontWeight: '900', color: "#8B4513" },
  content: { paddingHorizontal: 20, paddingTop: 24, gap: 24 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, marginLeft: 8, opacity: 0.6 },
  card: { borderRadius: 24, borderWidth: 1, overflow: "hidden" },
  adminCard: { borderRadius: 24, borderWidth: 2, overflow: "hidden", flexDirection: "row", alignItems: "center", padding: 20, gap: 14 },
  menuOption: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  menuIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  menuTextContent: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: "700" },
  menuSubtitle: { fontSize: 13, marginTop: 2, fontWeight: "500" },
  divider: { height: 1, marginHorizontal: 16 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 16, marginTop: 10 },
  logoutText: { fontSize: 16, fontWeight: "700" },
});