import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useEffect, useRef } from "react";
import {
  Alert,
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

  // --- FUNCIÓN PARA GENERAR Y COMPARTIR EL PDF ---
  const handlePrintBoleto = async () => {
    if (!booking) return;
    
    try {
      const is15Days = (booking as any).is15Days || (booking as any).is_15_days;
      const isRoundTrip = (booking as any).isRoundTrip || (booking as any).is_round_trip;
      const tipoViaje = is15Days ? 'Paquete 15 Días' : isRoundTrip ? 'Viaje Redondo' : 'Viaje Sencillo';
      const asientosStr = booking.seats && booking.seats.length > 0 ? booking.seats.join(', ') : 'Asignado al abordar';
      
      const logoUrl = "https://gisyiiljfplywcfhxxem.supabase.co/storage/v1/object/public/fls/WhatsApp%20Image%202026-05-04%20at%205.53.38%20PM.jpeg"; 

      const html = `
        <html><head><style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: auto; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
          .header img { max-width: 280px; margin-bottom: 10px; }
          .header h2 { margin: 5px 0 0 0; color: #555; font-size: 18px; letter-spacing: 2px; }
          .content { display: flex; justify-content: space-between; }
          .info { width: 65%; }
          .qr-section { width: 30%; text-align: center; }
          .qr-section img { width: 150px; height: 150px; margin-bottom: 10px; }
          .row { margin-bottom: 15px; }
          .label { font-size: 12px; color: #777; text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 2px; }
          .value { font-size: 18px; font-weight: bold; color: #000; }
          .highlight { background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #b91c1c; }
          .terms { margin-top: 40px; font-size: 11px; color: #555; border-top: 1px solid #ccc; padding-top: 20px; text-align: justify; line-height: 1.5; }
          .terms h4 { margin-top: 0; color: #000; font-size: 14px; }
        </style></head><body>
          <div class="header">
            <img src="${logoUrl}" alt="Bonilla Tours" />
            <h2>BOLETO REGULAR</h2>
          </div>
          <div class="content">
            <div class="info">
              <div class="row">
                <span class="label">Pasajero/a</span>
                <span class="value">${booking.passengerName}</span>
              </div>
              <div class="row highlight">
                <span class="label">Destino</span>
                <span class="value" style="font-size: 24px;">${booking.trip.destination}</span>
              </div>
              <div class="row">
                <span class="label">Fecha y hora de viaje</span>
                <span class="value">${booking.trip.date} - ${booking.trip.departureTime}</span>
              </div>
              <div class="row">
                <span class="label">Viaje</span>
                <span class="value">Destino: ${booking.trip.destination} | ${tipoViaje}</span>
              </div>
              <div class="row" style="display: flex; gap: 40px;">
                <div>
                  <span class="label">Asiento(s)</span>
                  <span class="value">${asientosStr}</span>
                </div>
                <div>
                  <span class="label">Total Pagado</span>
                  <span class="value">$ ${Number(booking.totalPrice).toFixed(2)} MXN</span>
                </div>
              </div>
            </div>
            <div class="qr-section">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${booking.id}" alt="QR Code" />
              <div class="label">Folio de Reserva</div>
              <div class="value" style="font-size: 16px;">${booking.id}</div>
              <div style="margin-top: 20px; font-size: 12px; color: #666;">
                <strong>Emitido:</strong><br/>${new Date(booking.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
          <div class="terms">
            <h4>TÉRMINOS Y CONDICIONES</h4>
            <p>Deberá presentarse por lo menos 20 minutos antes del horario seleccionado en el punto de encuentro establecido en su reservación o itinerario.</p>
            <p>Para abordar, deberá presentar el código QR de su reservación o el folio impreso en este boleto.</p>
            <p>Para garantizar que los usuarios lleguen a tiempo a su destino, únicamente otorgamos 5 minutos de tolerancia en espera. Una vez transcurrido ese tiempo, el conductor dará comienzo al viaje. Situaciones excepcionales se valorarán y gestionarán de mutuo acuerdo entre empresa y usuarios.</p>
            <p>Cabe tener en cuenta que algún punto de encuentro o descenso puede cambiar a causa de situaciones ajenas a la empresa, tales como obras, bloqueos, accidentes etc. En tal caso, se les informará a los usuarios con antelación si ello fuera posible. De otro modo, se acordará con los usuarios una opción conveniente.</p>
            <h4 style="margin-top: 15px;">Cancelaciones</h4>
            <p>Las cancelaciones tienen un costo del 10% (trámite exclusivo en oficina) y aplican siempre y cuando se soliciten con al menos 1 hora de anticipación a la salida.</p>
          </div>
        </body></html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo generar el documento PDF.");
    }
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
                value: booking.seats && booking.seats.length > 0 ? booking.seats.sort((a, b) => a - b).join(", ") : "Sin asignar",
              },
              {
                icon: "user",
                label: "Pasajero",
                value: booking.passengerName,
              },
              {
                icon: "credit-card",
                label: "Método de Pago",
                value: booking.paymentMethod === "card" ? "Tarjeta (Pagado)" : "Efectivo (Pago en Taquilla)",
              },
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
        
        {/* --- NUEVO BOTÓN PARA DESCARGAR PDF (Solo sale si ya está confirmado) --- */}
        {booking?.status === "confirmed" && (
          <AppButton
            title="Descargar Boleto (PDF)"
            onPress={handlePrintBoleto}
            variant="primary"
          />
        )}

        {isGuest ? (
          <AppButton
            title="Crear cuenta gratis"
            onPress={handleCreateAccount}
            variant={booking?.status === "confirmed" ? "outline" : "primary"}
          />
        ) : null}
        
        {user ? (
          <AppButton
            title="Ver mis viajes"
            onPress={handleViewTrips}
            variant={booking?.status === "confirmed" ? "outline" : "primary"}
          />
        ) : null}
        
        <AppButton
          title="Volver al inicio"
          onPress={handleGoHome}
          variant="outline"
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