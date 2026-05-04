import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser"; 
import * as Linking from "expo-linking"; // <-- IMPORTAMOS LINKING PARA LLAMADAS Y CORREOS
import React, { useState } from "react";
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

  const handleGuestSearch = async () => {
    if (!guestEmail.trim()) {
      Alert.alert("Aviso", "Ingresa tu correo electrónico para buscar");
      return;
    }
    await fetchGuestBookings(guestEmail.trim());
    setHasSearched(true);
  };

  // --- LA REGLA ESTRICTA DE CANCELACIÓN ---
  const handleCancel = (id: string) => {
    Alert.alert(
      "Políticas de Cancelación",
      `Por seguridad y políticas de Bonilla Tours, los boletos no pueden ser cancelados desde la aplicación.\n\nPara solicitar una cancelación, liberación de asiento o reembolso, comunícate directamente con nuestra sucursal y proporciona tu Folio: ${id}`,
      [
        {
          text: "Llamar a Sucursal",
          onPress: () => Linking.openURL("tel:+526180000000"), // PON AQUÍ TU TELÉFONO REAL
        },
        {
          text: "Enviar Correo",
          onPress: () => Linking.openURL(`mailto:contacto@bonillatours.com?subject=Solicitud de Cancelación Folio ${id}`), // PON AQUÍ TU CORREO REAL
        },
        { 
          text: "Entendido", 
          style: "cancel" 
        }
      ]
    );
  };

  // --- FUNCIÓN PARA RETOMAR EL PAGO (ACTUALIZADA A CLIP) ---
  const handlePay = async (booking: Booking) => {
    try {
      Alert.alert("Conectando", "Generando tu link de pago seguro con Clip...");
      
      const { data, error } = await supabase.functions.invoke('create-clip-payment', {
        body: {
          title: `Viaje: ${booking.trip.origin} a ${booking.trip.destination}`,
          quantity: booking.seats.length,
          price: booking.trip.price,
          email: booking.passengerEmail,
          bookingId: booking.id 
        }
      });

      if (error) throw new Error(`Conexión fallida: ${error.message}`);
      if (data && data.ok === false) throw new Error(`Clip rechazó la petición: ${data.error}`);
      if (!data?.payment_url) throw new Error("No se recibió el link seguro de pago de Clip.");

      // Abrimos la página oficial de pago de Clip
      await WebBrowser.openBrowserAsync(data.payment_url);

      // Verificamos si pagó después de cerrar
      const { data: checkBooking } = await supabase
        .from('bookings')
        .select('status')
        .eq('id', booking.id)
        .single();

      if (checkBooking?.status === "confirmed") {
        Alert.alert("¡Éxito!", "Tu pago fue procesado correctamente y tu viaje está confirmado.");
        if (!user) {
          // Refrescamos la lista si es invitado
          fetchGuestBookings(guestEmail.trim());
        }
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err.message || "No se pudo abrir el pago.");
    }
  };

  if (user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20), backgroundColor: colors.card }]}>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>Mis Viajes</Text>
        </View>

        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.centerBox}>
            <View style={[styles.iconCircle, { backgroundColor: colors.muted }]}>
              <Feather name="map" size={32} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sin reservas activas</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Aún no tienes viajes programados.</Text>
            <AppButton title="Buscar boletos" onPress={() => router.navigate("/(tabs)")} fullWidth={false} />
          </View>
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(b) => b.id}
            renderItem={({ item }) => <BookingCard booking={item} onCancel={handleCancel} onPay={handlePay} />} 
            contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 80 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20), backgroundColor: colors.card }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Mis Viajes</Text>
      </View>

      <View style={styles.guestContainer}>
        <View style={[styles.infoBox, { backgroundColor: colors.secondary, borderRadius: 16 }]}>
          <Feather name="info" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            Si reservaste como invitado, ingresa tu correo para ver tus boletos.
          </Text>
        </View>

        <View style={styles.guestForm}>
          <Text style={[styles.label, { color: colors.foreground }]}>Correo electrónico de reserva</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, borderRadius: 16, backgroundColor: colors.card, color: colors.foreground }]}
            value={guestEmail}
            onChangeText={setGuestEmail}
            placeholder="tu@correo.com"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <AppButton title="Buscar mis boletos" onPress={handleGuestSearch} loading={isLoading} />
        </View>

        {hasSearched && !isLoading && (
          <View style={styles.results}>
            {bookings.length === 0 ? (
              <View style={styles.noResults}>
                <Feather name="search" size={32} color={colors.mutedForeground} />
                <Text style={[styles.noResultsText, { color: colors.mutedForeground }]}>
                  No encontramos reservaciones activas para ese correo.
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.resultsTitle, { color: colors.foreground }]}>Resultados</Text>
                {bookings.map((b) => (
                  <BookingCard key={b.id} booking={b} onCancel={handleCancel} onPay={handlePay} /> 
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