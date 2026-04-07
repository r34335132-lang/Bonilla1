import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

interface Notification {
  id: string;
  icon: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "info" | "success" | "warning";
}

const USER_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    icon: "check-circle",
    title: "Reserva confirmada",
    message: "Tu reserva BT-005678 ha sido confirmada. Salida el 10 de abril.",
    time: "Hace 2 horas",
    read: false,
    type: "success",
  },
  {
    id: "2",
    icon: "clock",
    title: "Recordatorio de viaje",
    message: "Tu viaje a Guadalajara es mañana a las 14:00. Llega 30 min antes.",
    time: "Hace 1 día",
    read: false,
    type: "info",
  },
  {
    id: "3",
    icon: "tag",
    title: "Oferta especial",
    message: "20% de descuento en viajes entre semana. Válido hasta el 15 de abril.",
    time: "Hace 3 días",
    read: true,
    type: "info",
  },
  {
    id: "4",
    icon: "alert-circle",
    title: "Cambio de horario",
    message: "El horario de tu viaje del 5 de abril ha cambiado a las 08:30.",
    time: "Hace 4 días",
    read: true,
    type: "warning",
  },
];

const GUEST_NOTIFICATIONS: Notification[] = [
  {
    id: "g1",
    icon: "mail",
    title: "Reserva por email",
    message: "Como invitado, recibes confirmaciones a tu correo electrónico.",
    time: "Ahora",
    read: false,
    type: "info",
  },
  {
    id: "g2",
    icon: "user-plus",
    title: "Crea tu cuenta",
    message: "Obtén notificaciones push y gestiona tus viajes más fácil.",
    time: "Siempre disponible",
    read: true,
    type: "info",
  },
];

const TYPE_COLORS = {
  info: "#1A56DB",
  success: "#10B981",
  warning: "#F59E0B",
};

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useAuth();

  const notifications = user ? USER_NOTIFICATIONS : GUEST_NOTIFICATIONS;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>
          Notificaciones
        </Text>
        {!isGuest && (
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.primary, borderRadius: 10 },
            ]}
          >
            <Text style={styles.badgeText}>
              {notifications.filter((n) => !n.read).length}
            </Text>
          </View>
        )}
      </View>

      {isGuest && (
        <View
          style={[
            styles.guestBanner,
            {
              backgroundColor: colors.accent,
              margin: 16,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Feather name="mail" size={18} color={colors.primary} />
          <Text style={[styles.guestBannerText, { color: colors.primary }]}>
            Como invitado, las confirmaciones se envían a tu email. Crea una
            cuenta para recibir notificaciones push.
          </Text>
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.notifCard,
              {
                backgroundColor: item.read ? colors.card : colors.accent,
                borderRadius: colors.radius,
                borderColor: colors.border,
                marginHorizontal: 16,
                marginBottom: 10,
              },
            ]}
          >
            <View
              style={[
                styles.notifIcon,
                {
                  backgroundColor:
                    TYPE_COLORS[item.type] + "20",
                  borderRadius: 20,
                },
              ]}
            >
              <Feather
                name={item.icon as any}
                size={18}
                color={TYPE_COLORS[item.type]}
              />
            </View>
            <View style={styles.notifContent}>
              <View style={styles.notifHeader}>
                <Text
                  style={[
                    styles.notifTitle,
                    { color: colors.foreground },
                  ]}
                >
                  {item.title}
                </Text>
                {!item.read && (
                  <View
                    style={[
                      styles.unreadDot,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.notifMessage,
                  { color: colors.mutedForeground },
                ]}
              >
                {item.message}
              </Text>
              <Text
                style={[
                  styles.notifTime,
                  { color: colors.mutedForeground },
                ]}
              >
                {item.time}
              </Text>
            </View>
          </View>
        )}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80),
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  screenTitle: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5, flex: 1 },
  badge: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  guestBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
  },
  guestBannerText: { flex: 1, fontSize: 13, fontWeight: "500", lineHeight: 18 },
  notifCard: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderWidth: 1,
  },
  notifIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  notifContent: { flex: 1 },
  notifHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  notifTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  notifMessage: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  notifTime: { fontSize: 11, fontWeight: "500" },
});
