import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser"; 
import * as Linking from "expo-linking"; 
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useState, useMemo } from "react";
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { BookingCard } from "@/components/BookingCard";
import { useBooking, Booking } from "@/contexts/BookingContext"; 
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase"; 

export default function MyTripsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { bookings, isLoading, fetchGuestBookings } = useBooking();

  const [guestEmail, setGuestEmail] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // --- ORDENAMOS LOS VIAJES DEL MÁS RECIENTE AL MÁS ANTIGUO ---
  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [bookings]);

  const handleGuestSearch = async () => {
    if (!guestEmail.trim()) {
      Alert.alert("Aviso", "Ingresa tu correo electrónico para buscar");
      return;
    }
    await fetchGuestBookings(guestEmail.trim());
    setHasSearched(true);
  };

  const handleCancel = (id: string) => {
    Alert.alert(
      "Políticas de Cancelación",
      `Por seguridad y políticas de Bonilla Tours, los boletos no pueden ser cancelados desde la aplicación.\n\nPara solicitar una cancelación, liberación de asiento o reembolso, comunícate directamente con nuestra sucursal y proporciona tu Folio: ${id}`,
      [
        {
          text: "Llamar a Sucursal",
          onPress: () => Linking.openURL("tel:+526180000000"), 
        },
        {
          text: "Enviar Correo",
          onPress: () => Linking.openURL(`mailto:contacto@bonillatours.com?subject=Solicitud de Cancelación Folio ${id}`), 
        },
        { 
          text: "Entendido", 
          style: "cancel" 
        }
      ]
    );
  };

  const handlePay = async (booking: Booking) => {
    try {
      Alert.alert("Conectando", "Generando tu link de pago seguro con Clip...");
      
      const is15Days = (booking as any).is_15_days;
      const isRoundTrip = (booking as any).is_round_trip;
      const tipoViaje = is15Days ? '15 Días' : isRoundTrip ? 'Redondo' : 'Sencillo';

      const unitPrice = booking.totalPrice / (booking.seats.length || 1);

      const { data, error } = await supabase.functions.invoke('create-clip-payment', {
        body: {
          title: `Viaje ${tipoViaje}: ${booking.trip.origin} a ${booking.trip.destination}`,
          quantity: booking.seats.length || 1,
          price: unitPrice, 
          email: booking.passengerEmail,
          bookingId: booking.id 
        }
      });

      if (error) throw new Error(`Conexión fallida: ${error.message}`);
      if (data && data.ok === false) throw new Error(`Clip rechazó la petición: ${data.error}`);
      if (!data?.payment_url) throw new Error("No se recibió el link seguro de pago de Clip.");

      await WebBrowser.openBrowserAsync(data.payment_url);

      const { data: checkBooking } = await supabase
        .from('bookings')
        .select('status')
        .eq('id', booking.id)
        .single();

      if (checkBooking?.status === "confirmed") {
        Alert.alert("¡Éxito!", "Tu pago fue procesado correctamente y tu viaje está confirmado.");
        if (!user) {
          fetchGuestBookings(guestEmail.trim());
        }
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err.message || "No se pudo abrir el pago.");
    }
  };

  const handlePrintBoleto = async (booking: Booking) => {
    try {
      const is15Days = (booking as any).is_15_days;
      const isRoundTrip = (booking as any).is_round_trip;
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

  // --- VISTA PARA USUARIOS REGISTRADOS ---
  if (user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20), backgroundColor: colors.card }]}>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>Historial de Viajes</Text>
        </View>

        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : sortedBookings.length === 0 ? (
          <View style={styles.centerBox}>
            <View style={[styles.iconCircle, { backgroundColor: colors.muted }]}>
              <Feather name="folder" size={32} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sin historial</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Aún no tienes viajes registrados.</Text>
            <AppButton title="Buscar boletos" onPress={() => router.navigate("/(tabs)")} fullWidth={false} />
          </View>
        ) : (
          <FlatList
            data={sortedBookings}
            keyExtractor={(b) => b.id}
            renderItem={({ item }) => <BookingCard booking={item} onCancel={handleCancel} onPay={handlePay} onPrint={handlePrintBoleto} />} 
            contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 80 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    );
  }

  // --- VISTA PARA INVITADOS ---
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20), backgroundColor: colors.card }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Historial de Viajes</Text>
      </View>

      <View style={styles.guestContainer}>
        <View style={[styles.infoBox, { backgroundColor: colors.secondary, borderRadius: 16 }]}>
          <Feather name="info" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            Ingresa tu correo para ver todos tus boletos.
          </Text>
        </View>

        <View style={styles.guestForm}>
          <Text style={[styles.label, { color: colors.foreground }]}>Correo electrónico</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, borderRadius: 16, backgroundColor: colors.card, color: colors.foreground }]}
            value={guestEmail}
            onChangeText={setGuestEmail}
            placeholder="tu@correo.com"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <AppButton title="Buscar mi historial" onPress={handleGuestSearch} loading={isLoading} />
        </View>

        {hasSearched && !isLoading && (
          <View style={styles.results}>
            {sortedBookings.length === 0 ? (
              <View style={styles.noResults}>
                <Feather name="search" size={32} color={colors.mutedForeground} />
                <Text style={[styles.noResultsText, { color: colors.mutedForeground }]}>
                  No encontramos reservaciones para ese correo.
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.resultsTitle, { color: colors.foreground }]}>Tus Boletos</Text>
                {sortedBookings.map((b) => (
                  <BookingCard key={b.id} booking={b} onCancel={handleCancel} onPay={handlePay} onPrint={handlePrintBoleto} /> 
                ))}
              </>
            )}
          </View>
        )}

        <View style={[styles.convertBox, { backgroundColor: colors.card, borderRadius: 16, borderColor: colors.border }]}>
          <View style={[styles.convertIconBox, { backgroundColor: colors.muted }]}>
            <Feather name="user-plus" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.convertTitle, { color: colors.foreground }]}>Crea tu cuenta</Text>
            <Text style={[styles.convertText, { color: colors.mutedForeground }]}>Gestiona tus viajes más rápido</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
            <Text style={[styles.convertAction, { color: colors.primary }]}>Registrarme</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, zIndex: 10 },
  screenTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32, marginTop: 60 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: "800" },
  emptyText: { fontSize: 15, textAlign: "center", marginBottom: 12 },
  guestContainer: { padding: 20, gap: 24 },
  infoBox: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  infoText: { flex: 1, fontSize: 14, fontWeight: "600", lineHeight: 20 },
  guestForm: { gap: 12 },
  label: { fontSize: 14, fontWeight: "700", marginLeft: 4 },
  input: { borderWidth: 1, paddingHorizontal: 16, height: 54, fontSize: 16 },
  results: { gap: 16, marginTop: 8 },
  resultsTitle: { fontSize: 18, fontWeight: "800" },
  noResults: { alignItems: "center", gap: 12, paddingVertical: 32 },
  noResultsText: { fontSize: 15, textAlign: "center" },
  convertBox: { flexDirection: "row", alignItems: "center", gap: 16, padding: 16, borderWidth: 1, marginTop: 12 },
  convertIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  convertTitle: { fontSize: 15, fontWeight: "700" },
  convertText: { fontSize: 13, marginTop: 2 },
  convertAction: { fontSize: 14, fontWeight: "800" },
});