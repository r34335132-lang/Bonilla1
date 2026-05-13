import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  // 1. CAMBIO AQUÍ: Importamos 'logout' en lugar de 'signOut'
  const { user, logout, role } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  // Si no hay usuario logueado, mostramos una pantalla para iniciar sesión
  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Feather name="user-x" size={64} color={colors.mutedForeground} style={{ marginBottom: 20 }} />
        <Text style={[styles.title, { color: colors.foreground, textAlign: 'center' }]}>No has iniciado sesión</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign: 'center', marginBottom: 30 }]}>
          Inicia sesión para ver tu perfil y gestionar tu cuenta.
        </Text>
        <TouchableOpacity 
          style={[styles.primaryBtn, { backgroundColor: colors.primary, width: '100%' }]}
          onPress={() => router.push("/(auth)/login")}
        >
          <Text style={styles.primaryBtnText}>Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const userName = user?.user_metadata?.name || user?.name || "Viajero";
  const userEmail = user?.email || "";
  const userPhone = user?.user_metadata?.phone || user?.phone || "Sin teléfono";

  const handleSignOut = async () => {
    Alert.alert("Cerrar Sesión", "¿Estás seguro de que deseas salir?", [
      { text: "Cancelar", style: "cancel" },
      { 
        text: "Salir", 
        style: "destructive", 
        onPress: async () => {
          // 2. CAMBIO AQUÍ: Usamos 'logout()'
          await logout();
          router.replace("/");
        } 
      }
    ]);
  };

  // --- LÓGICA PARA ELIMINAR CUENTA (REQUISITO DE GOOGLE PLAY) ---
  const handleDeleteAccount = () => {
    Alert.alert(
      "⚠️ Eliminar cuenta",
      "¿Estás completamente seguro? Esta acción es irreversible. Se borrarán todos tus datos personales y perderás el acceso a tu historial.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, eliminar",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              const { error } = await supabase.rpc('delete_user');
              if (error) throw error;
              
              // 3. CAMBIO AQUÍ: Usamos 'logout()'
              await logout();
              Alert.alert("Cuenta eliminada", "Tu cuenta ha sido eliminada exitosamente.");
              router.replace("/");
            } catch (error: any) {
              console.error("Error al eliminar:", error);
              Alert.alert("Error", "No se pudo eliminar la cuenta. Verifica tu conexión o contacta a soporte.");
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20), backgroundColor: colors.card }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Mi Perfil</Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatarBox, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={[styles.userName, { color: colors.foreground }]}>{userName}</Text>
          <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{userEmail}</Text>
          {role === 'admin' && (
            <View style={[styles.adminBadge, { backgroundColor: colors.secondary }]}>
              <Feather name="shield" size={14} color={colors.primary} />
              <Text style={[styles.adminBadgeText, { color: colors.primary }]}>Administrador</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Configuración de Cuenta</Text>
          
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            
            <View style={[styles.menuItem, { borderBottomColor: colors.border }]}>
              <View style={[styles.menuIconBox, { backgroundColor: colors.muted }]}>
                <Feather name="phone" size={18} color={colors.foreground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuItemTitle, { color: colors.foreground }]}>Teléfono</Text>
                <Text style={[styles.menuItemSub, { color: colors.mutedForeground }]}>{userPhone}</Text>
              </View>
            </View>

            {(role === 'admin' || role === 'supervisor') && (
               <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={() => router.push("/(tabs)/admin")}>
                <View style={[styles.menuIconBox, { backgroundColor: colors.secondary }]}>
                  <Feather name="settings" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuItemTitle, { color: colors.foreground }]}>Panel de Administración</Text>
                  <Text style={[styles.menuItemSub, { color: colors.mutedForeground }]}>Gestiona viajes y reservas</Text>
                </View>
                <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}

            {/* --- BOTÓN DE POLÍTICAS DE PRIVACIDAD LIGADO A NOTION --- */}
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: colors.border }]} 
              onPress={() => Linking.openURL("https://bronze-homegrown-706.notion.site/Pol-tica-de-Privacidad-Bonilla-Tours-357621fdb421809e8162c20edcf30e73?source=copy_link")}
            >
              <View style={[styles.menuIconBox, { backgroundColor: colors.muted }]}>
                <Feather name="shield" size={18} color={colors.foreground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuItemTitle, { color: colors.foreground }]}>Privacidad</Text>
                <Text style={[styles.menuItemSub, { color: colors.mutedForeground }]}>Términos y manejo de datos</Text>
              </View>
              <Feather name="external-link" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
              <View style={[styles.menuIconBox, { backgroundColor: "#fee2e2" }]}>
                <Feather name="log-out" size={18} color="#ef4444" />
              </View>
              <Text style={[styles.menuItemTitle, { color: "#ef4444", flex: 1 }]}>Cerrar Sesión</Text>
            </TouchableOpacity>

          </View>
        </View>

        {/* --- ZONA DE PELIGRO: ELIMINAR CUENTA --- */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Zona de Peligro</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount} disabled={isDeleting}>
              <View style={[styles.menuIconBox, { backgroundColor: "#fee2e2" }]}>
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Feather name="trash-2" size={18} color="#ef4444" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuItemTitle, { color: "#ef4444" }]}>Eliminar Cuenta</Text>
                <Text style={[styles.menuItemSub, { color: colors.mutedForeground }]}>Esta acción es irreversible</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
        
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, zIndex: 10 },
  screenTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  title: { fontSize: 24, fontWeight: "800" },
  subtitle: { fontSize: 15, marginTop: 8, lineHeight: 22 },
  primaryBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  content: { padding: 20, gap: 24 },
  profileCard: { padding: 24, borderRadius: 24, borderWidth: 1, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  avatarBox: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  userEmail: { fontSize: 14, fontWeight: '500' },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 12 },
  adminBadgeText: { fontSize: 12, fontWeight: '700' },
  section: { gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 8 },
  menuCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  menuIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuItemTitle: { fontSize: 16, fontWeight: '600' },
  menuItemSub: { fontSize: 13, marginTop: 2 },
});