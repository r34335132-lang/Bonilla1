import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router"; 
import * as WebBrowser from "expo-web-browser";
import React, { useState, useEffect } from "react"; 
import {
  Alert,
  KeyboardAvoidingView,
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
import { useAuth } from "@/contexts/AuthContext";
import { useBooking } from "@/contexts/BookingContext";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";

type PaymentMethod = "card" | "cash";

export default function CheckoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  const { isRoundTrip, returnDate, is15Days } = useLocalSearchParams<{
    isRoundTrip?: string;
    returnDate?: string;
    is15Days?: string;
  }>();

  const { user, isGuest, guestInfo, setGuestInfo } = useAuth();
  const userName = user?.user_metadata?.name || user?.name || guestInfo?.name || "";
  const userPhone = user?.user_metadata?.phone || user?.phone || guestInfo?.phone || "";

  const { pendingTrip, pendingSeats, confirmBooking } = useBooking();

  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(user?.email || guestInfo?.email || "");
  const [phone, setPhone] = useState(userPhone);
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!pendingTrip || pendingSeats.length === 0) {
      router.back();
    }
  }, [pendingTrip, pendingSeats]);

  if (!pendingTrip || pendingSeats.length === 0) {
    return null;
  }

  // --- LÓGICA DE PRECIOS ---
  let unitPrice = pendingTrip.price;
  
  if (is15Days === "true" && pendingTrip.price_15_days) {
    unitPrice = pendingTrip.price_15_days;
  }

  const totalPrice = pendingSeats.length * unitPrice;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nombre requerido";
    if (!email.trim()) e.email = "Email requerido";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Email inválido";
    if (!phone.trim()) e.phone = "Teléfono requerido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleConfirm = async () => {
    if (!validate()) return;
    setLoading(true);

    if (isGuest && setGuestInfo) {
      setGuestInfo({ name, email, phone });
    }

    try {
      // 1. Confirmamos la reserva base
      const booking = await confirmBooking({
        trip: pendingTrip, 
        seats: pendingSeats,
        passengerName: name,
        passengerEmail: email,
        passengerPhone: phone,
        paymentMethod,
        status: "pending", 
        userId: user?.id ?? null,
        isGuest: !user,
        totalPrice,
      });

      // 2. Sincronizamos los metadatos de tipo de viaje en Supabase
      await supabase.from('bookings').update({ 
        is_round_trip: isRoundTrip === "true",
        is_15_days: is15Days === "true" 
      }).eq('id', booking.id);

      // 3. Procesamiento de Pago con Clip
      if (paymentMethod === "card") {
        const { data, error } = await supabase.functions.invoke('create-clip-payment', {
          body: {
            title: `Viaje ${is15Days === 'true' ? 'Paquete 15 Días' : 'Sencillo'}: ${pendingTrip.origin} a ${pendingTrip.destination}`,
            quantity: pendingSeats.length,
            price: unitPrice,
            email: email,
            bookingId: booking.id 
          }
        });

        if (error) throw new Error(`Conexión fallida: ${error.message}`);
        if (data && data.ok === false) throw new Error(`Clip rechazó el pago: ${data.error}`);
        
        await WebBrowser.openBrowserAsync(data.payment_url);
        
        // Verificamos si se confirmó tras cerrar el navegador
        const { data: checkBooking } = await supabase
          .from('bookings')
          .select('status')
          .eq('id', booking.id)
          .single();

        if (checkBooking?.status !== "confirmed") {
          Alert.alert("Pago pendiente", "No pudimos confirmar tu pago automáticamente. Si ya pagaste, tu estado se actualizará pronto en 'Mis Viajes'.");
          router.navigate("/(tabs)/my-trips"); 
          return; 
        }
      }
      
      // 4. Éxito: Pasamos los datos completos (incluyendo la bandera is15Days para el boleto)
      router.replace({
        pathname: "/booking-success",
        params: { 
          bookingId: booking.id, 
          bookingData: JSON.stringify({ ...booking, is15Days: is15Days === "true" }) 
        },
      });
      
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error en la reserva", err.message || "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12), backgroundColor: colors.card, shadowColor: "#000" },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.muted }]} activeOpacity={0.7}>
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Completar Reserva</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100) }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Section title="Resumen de tu viaje" icon="map" colors={colors}>
          <View style={[styles.tripSummary, { borderColor: is15Days === "true" ? "#9b59b6" : colors.border }]}>
            <View style={styles.ticketHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ticketCity, { color: colors.foreground }]}>{pendingTrip.origin}</Text>
                <Text style={[styles.ticketTime, { color: colors.mutedForeground }]}>{pendingTrip.departureTime}</Text>
              </View>
              <View style={[styles.ticketArrowBox, { backgroundColor: colors.muted }]}>
                <Feather name="arrow-right" size={16} color={colors.mutedForeground} />
              </View>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={[styles.ticketCity, { color: colors.foreground }]}>{pendingTrip.destination}</Text>
                <Text style={[styles.ticketTime, { color: colors.mutedForeground }]}>{pendingTrip.arrivalTime}</Text>
              </View>
            </View>

            <View style={[styles.ticketDivider, { borderColor: colors.border }]} />

            <View style={styles.ticketDetails}>
              <View style={styles.ticketDetailCol}>
                <Text style={[styles.ticketLabel, { color: colors.mutedForeground }]}>Fecha de ida</Text>
                <Text style={[styles.ticketValue, { color: colors.foreground }]}>{pendingTrip.date}</Text>
              </View>
              
              {is15Days === "true" ? (
                <View style={styles.ticketDetailCol}>
                  <Text style={[styles.ticketLabel, { color: "#9b59b6" }]}>Tipo de Viaje</Text>
                  <Text style={[styles.ticketValue, { color: "#9b59b6" }]}>Paquete 15 Días</Text>
                </View>
              ) : isRoundTrip === "true" ? (
                <View style={styles.ticketDetailCol}>
                  <Text style={[styles.ticketLabel, { color: colors.primary }]}>Regreso</Text>
                  <Text style={[styles.ticketValue, { color: colors.primary }]}>{returnDate}</Text>
                </View>
              ) : (
                <View style={styles.ticketDetailCol}>
                  <Text style={[styles.ticketLabel, { color: colors.mutedForeground }]}>Tipo</Text>
                  <Text style={[styles.ticketValue, { color: colors.foreground }]}>Sencillo</Text>
                </View>
              )}

              <View style={[styles.ticketDetailCol, { alignItems: "flex-end" }]}>
                <Text style={[styles.ticketLabel, { color: colors.mutedForeground }]}>Asientos</Text>
                <Text style={[styles.ticketValue, { color: colors.primary }]}>
                  {pendingSeats.sort((a, b) => a - b).join(", ")}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={[styles.priceRow, { backgroundColor: colors.secondary }]}>
            <View>
              <Text style={[styles.priceLabel, { color: colors.primary }]}>Total a pagar</Text>
              {is15Days === "true" && (
                <Text style={{fontSize: 12, color: "#9b59b6", marginTop: 2, fontWeight: '700'}}>
                  Tarifa Especial Aplicada
                </Text>
              )}
            </View>
            <Text style={[styles.priceValue, { color: colors.primary }]}>
              ${totalPrice} <Text style={styles.priceCurrency}>MXN</Text>
            </Text>
          </View>
        </Section>

        <Section title="Datos del pasajero" icon="user" colors={colors}>
          <View style={{ gap: 16 }}>
            <FormField label="Nombre completo" value={name} onChangeText={setName} error={errors.name} placeholder="Ej. Juan Pérez" icon="user" colors={colors} />
            <FormField label="Correo electrónico" value={email} onChangeText={setEmail} error={errors.email} placeholder="tu@correo.com" keyboardType="email-address" autoCapitalize="none" icon="mail" colors={colors} />
            <FormField label="Teléfono móvil" value={phone} onChangeText={setPhone} error={errors.phone} placeholder="10 dígitos" keyboardType="phone-pad" icon="phone" colors={colors} />
          </View>
        </Section>

        <Section title="Método de pago" icon="credit-card" colors={colors}>
          <View style={{ gap: 12 }}>
            {(["card", "cash"] as PaymentMethod[]).map((method) => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.paymentOption,
                  {
                    backgroundColor: paymentMethod === method ? colors.secondary : colors.card,
                    borderColor: paymentMethod === method ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setPaymentMethod(method)}
                activeOpacity={0.7}
              >
                <View style={[styles.paymentIconBox, { backgroundColor: paymentMethod === method ? colors.primary : colors.muted }]}>
                  <Feather name={method === "card" ? "credit-card" : "dollar-sign"} size={18} color={paymentMethod === method ? "#fff" : colors.mutedForeground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paymentTitle, { color: paymentMethod === method ? colors.primary : colors.foreground }]}>
                    {method === "card" ? "Tarjeta (Clip)" : "Pago en Taquilla"}
                  </Text>
                  <Text style={[styles.paymentSub, { color: colors.mutedForeground }]}>
                    {method === "card" ? "Portal seguro de Clip" : "Paga antes de abordar"}
                  </Text>
                </View>
                <View style={[styles.radio, { borderColor: paymentMethod === method ? colors.primary : colors.border }]}>
                  {paymentMethod === method ? <View style={[styles.radioFill, { backgroundColor: colors.primary }]} /> : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.cardNotice, { backgroundColor: paymentMethod === 'card' ? colors.muted : "#fff3cd" }]}>
            <Feather name={paymentMethod === 'card' ? "lock" : "alert-circle"} size={14} color={paymentMethod === 'card' ? colors.mutedForeground : "#856404"} />
            <Text style={[styles.cardNoticeText, { color: paymentMethod === 'card' ? colors.mutedForeground : "#856404" }]}>
              {paymentMethod === 'card' 
                ? "Tu transacción es procesada de forma segura por Clip." 
                : "Importante: Tienes 2 horas para pagar en taquilla o tu reserva expirará."}
            </Text>
          </View>
        </Section>

        <View style={{ marginTop: 10 }}>
          <AppButton title="Finalizar Reserva" onPress={handleConfirm} loading={loading} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Sub-componentes auxiliares
function Section({ title, icon, children, colors }: { title: string; icon: any; children: React.ReactNode; colors: any; }) {
  return (
    <View style={[styles.section, { backgroundColor: colors.card, shadowColor: "#000" }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: colors.secondary }]}>
          <Feather name={icon} size={18} color={colors.primary} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function FormField({ label, value, onChangeText, error, placeholder, keyboardType, autoCapitalize, icon, colors }: { label: string; value: string; onChangeText: (v: string) => void; error?: string; placeholder?: string; keyboardType?: any; autoCapitalize?: any; icon: any; colors: any; }) {
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      <View style={[styles.inputContainer, { backgroundColor: colors.muted, borderColor: error ? colors.destructive : "transparent" }]}>
        <Feather name={icon} size={18} color={colors.mutedForeground} style={styles.inputIcon} />
        <TextInput 
            style={[styles.input, { color: colors.foreground }]} 
            value={value} 
            onChangeText={onChangeText} 
            placeholder={placeholder} 
            placeholderTextColor={colors.mutedForeground} 
            keyboardType={keyboardType} 
            autoCapitalize={autoCapitalize ?? "words"} 
            autoCorrect={false} 
        />
      </View>
      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4, zIndex: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  scroll: { padding: 20, gap: 24 },
  section: { borderRadius: 24, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 3, padding: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  sectionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  sectionContent: { gap: 4 },
  tripSummary: { borderWidth: 1.5, borderRadius: 16, padding: 16, marginBottom: 16 },
  ticketHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ticketCity: { fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  ticketTime: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  ticketArrowBox: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
  ticketDivider: { borderStyle: "dashed", borderWidth: 1, marginVertical: 16 },
  ticketDetails: { flexDirection: "row", justifyContent: "space-between" },
  ticketDetailCol: { flex: 1 },
  ticketLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  ticketValue: { fontSize: 14, fontWeight: "800" },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 18, borderRadius: 16 },
  priceLabel: { fontSize: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  priceValue: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  priceCurrency: { fontSize: 14, fontWeight: "700" },
  fieldLabel: { fontSize: 13, fontWeight: "700", marginBottom: 8, marginLeft: 4, letterSpacing: 0.3 },
  inputContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, height: 56 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: "500", height: "100%" },
  error: { fontSize: 12, marginTop: 6, marginLeft: 4, fontWeight: "600" },
  paymentOption: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderWidth: 1.5, borderRadius: 16 },
  paymentIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  paymentTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  paymentSub: { fontSize: 13, fontWeight: "500" },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioFill: { width: 12, height: 12, borderRadius: 6 },
  cardNotice: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, marginTop: 16 },
  cardNoticeText: { fontSize: 13, flex: 1, fontWeight: "600" },
});