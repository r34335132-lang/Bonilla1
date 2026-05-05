import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { Booking } from "@/contexts/BookingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function BookingSuccessScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useAuth();
  const { bookingId, bookingData } = useLocalSearchParams<{
    bookingId: string;
    bookingData: string;
  }>();

  const booking: Booking | null = bookingData ? JSON.parse(bookingData) : null;

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 12,
        stiffness: 180,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGoHome = () => {
    router.replace("/(tabs)");
  };

  const handleCreateAccount = () => {
    router.push("/(auth)/register");
  };

  const handleViewTrips = () => {
    router.replace("/(tabs)/my-trips");
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.scroll,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 40),
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 40),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={[
          styles.successCircle,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <LinearGradient
          colors={[colors.success, "#059669"]}
          style={[styles.successIconBg, { borderRadius: 60 }]}
        >
          <Feather name="check" size={48} color="#fff" />
        </LinearGradient>
      </Animated.View>

      <Animated.View style={[styles.textBlock, { opacity: opacityAnim }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          ¡Reserva exitosa!
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Tu viaje ha sido confirmado
        </Text>
      </Animated.View>

      {/* Condicional seguro para evitar el error de texto */}
      {booking ? (
        <View
          style={[
            styles.bookingCard,
            {
              backgroundColor: colors.card,
              borderRadius: 24,
              shadowColor: "#000",
            },
          ]}
        >
          <View style={styles.bookingIdRow}>
            <Text style={[styles.bookingIdLabel, { color: colors.mutedForeground }]}>
              ID DE RESERVA
            </Text>
            <Text style={[styles.bookingId, { color: colors.primary }]}>
              {booking.id}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.detailsGrid}>
            {[
              {
                icon: "map",
                label: "Ruta",
                // ¡AQUÍ ESTÁ LA CORRECCIÓN! 
                // Lee el origen y destino directamente del trip de esta reserva específica (su tramo)
                value: `${booking.trip.origin} a ${booking.trip.destination}`,
              },
              {
                icon: "calendar",
                label: "Fecha y Hora",
                value: `${booking.trip.date} • ${booking.trip.departureTime}`,
              },
              {
                icon: "grid",
                label: "Asientos",
                value: booking.seats.sort((a, b) => a - b).join(", "),
              },
              {
                icon: "user",
                label: "Pasajero",
                value: booking.passengerName,
              },
              {
                icon: "credit-card",
                label: "Método de Pago",
                value: booking.paymentMethod === "card" ? "Tarjeta (Pagado/Pendiente)" : "Efectivo (Pago en Taquilla)",
              },
              // --- NUEVA SECCIÓN PARA MOSTRAR SI ES DE 15 DÍAS ---
              ...(booking.is15Days ? [{
                icon: "clock",
                label: "Tipo de Boleto",
                value: "Paquete 15 Días (Regreso Abierto)",
              }] : []),
            ].map(({ icon, label, value }) => (
              <View key={label} style={styles.detailRow}>
                <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
                  <Feather name={icon as any} size={14} color={colors.mutedForeground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
                    {label}
                  </Text>
                  <Text
                    style={[styles.detailValue, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {value}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View
            style={[
              styles.totalRow,
              {
                backgroundColor: colors.secondary,
              },
            ]}
          >
            <Text style={[styles.totalLabel, { color: colors.primary }]}>
              Total
            </Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              ${booking.totalPrice} MXN
            </Text>
          </View>
        </View>
      ) : null}

      {/* Condicional seguro */}
      {isGuest ? (
        <View
          style={[
            styles.guestBox,
            {
              backgroundColor: colors.secondary,
              borderRadius: 16,
            },
          ]}
        >
          <View style={[styles.guestIconBox, { backgroundColor: colors.primary }]}>
            <Feather name="mail" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.guestBoxTitle, { color: colors.primary }]}>
              Guarda tu recibo
            </Text>
            <Text style={[styles.guestBoxText, { color: colors.primary }]}>
              Toma captura de pantalla a tu ID de reserva o crea una cuenta para gestionar este viaje más fácilmente.
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        {/* Condicionales seguros */}
        {isGuest ? (
          <AppButton
            title="Crear cuenta gratis"
            onPress={handleCreateAccount}
            variant="primary"
          />
        ) : null}
        
        {user ? (
          <AppButton
            title="Ver mis viajes"
            onPress={handleViewTrips}
            variant="primary"
          />
        ) : null}
        
        <AppButton
          title="Volver al inicio"
          onPress={handleGoHome}
          variant={isGuest || user ? "outline" : "primary"}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 24,
  },
  successCircle: {
    marginTop: 10,
    marginBottom: 4,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  successIconBg: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: { alignItems: "center", marginBottom: 8 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 16, marginTop: 6, fontWeight: "500" },
  bookingCard: {
    width: "100%",
    padding: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 5,
  },
  bookingIdRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  bookingIdLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.8 },
  bookingId: { fontSize: 20, fontWeight: "800", letterSpacing: 1 },
  divider: { height: 1, marginBottom: 20 },
  detailsGrid: { gap: 16, marginBottom: 24 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: { fontSize: 12, fontWeight: "600", marginBottom: 2 },
  detailValue: { fontSize: 15, fontWeight: "700" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
  },
  totalLabel: { fontSize: 15, fontWeight: "700" },
  totalValue: { fontSize: 22, fontWeight: "800" },
  guestBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    width: "100%",
  },
  guestIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  guestBoxTitle: { fontSize: 15, fontWeight: "800", marginBottom: 4 },
  guestBoxText: { fontSize: 13, lineHeight: 18, fontWeight: "500", opacity: 0.8 },
  actions: { width: "100%", gap: 12, marginTop: 8 },
});