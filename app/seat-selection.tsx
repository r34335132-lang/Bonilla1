import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { SeatMap } from "@/components/SeatMap";
import { useBooking } from "@/contexts/BookingContext";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase"; 
import { getOccupiedSeatsForSegment } from "@/utils/routeLogic"; 

export default function SeatSelectionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  // --- MAGIA: Atrapamos también la instrucción de 15 Días ---
  const { isRoundTrip, returnDate, is15Days } = useLocalSearchParams<{
    isRoundTrip?: string;
    returnDate?: string;
    is15Days?: string; // <-- NUEVO
  }>();
  
  const { pendingTrip, pendingSeats, setPendingSeats } = useBooking();

  const [realOccupiedSeats, setRealOccupiedSeats] = useState<number[]>([]);
  const [isCalculating, setIsCalculating] = useState(true);

  useEffect(() => {
    if (!pendingTrip) return;

    const fetchAndCalculateSeats = async () => {
      setIsCalculating(true);
      try {
        const { data, error } = await supabase
          .from("bookings")
          .select("status, seats, trip:trips!bookings_trip_id_fkey(origin, destination)")
          .eq("trip_id", pendingTrip.id)
          .neq("status", "cancelled"); 

        if (error) throw error;

        const formattedBookings = data.map((b: any) => ({
          status: b.status,
          seats: b.seats,
          trip: {
            origin: b.trip.origin,
            destination: b.trip.destination,
          },
        }));

        const occupied = getOccupiedSeatsForSegment(
          formattedBookings,
          pendingTrip.origin,
          pendingTrip.destination
        );

        setRealOccupiedSeats(occupied);

        const stillAvailableSelected = pendingSeats.filter(
          (s) => !occupied.includes(s)
        );
        if (stillAvailableSelected.length !== pendingSeats.length) {
          setPendingSeats(stillAvailableSelected);
        }
      } catch (err) {
        console.error("Error calculando asientos por tramo:", err);
      } finally {
        setIsCalculating(false);
      }
    };

    fetchAndCalculateSeats();
  }, [pendingTrip]);

  if (!pendingTrip) {
    router.back();
    return null;
  }

  const handleToggleSeat = (seat: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setPendingSeats(
      pendingSeats.includes(seat)
        ? pendingSeats.filter((s) => s !== seat)
        : [...pendingSeats, seat]
    );
  };

  const handleContinue = () => {
    // --- MAGIA: Pasamos la instrucción de 15 Días a la caja registradora (Checkout) ---
    router.push({
      pathname: "/checkout",
      params: {
        isRoundTrip,
        returnDate,
        is15Days // <-- PASAMOS LA ESTAFETA
      }
    });
  };

  const totalPrice = pendingSeats.length * pendingTrip.price;
  const realAvailableSeats = pendingTrip.totalSeats - realOccupiedSeats.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12),
            backgroundColor: colors.card,
            shadowColor: "#000",
          },
        ]}
      >
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backBtn, { backgroundColor: colors.muted }]}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Selecciona asientos
          </Text>
          <Text style={[styles.headerSub, { color: colors.primary }]}>
            {pendingTrip.origin} a {pendingTrip.destination} • {pendingTrip.departureTime}
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {isCalculating ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Calculando disponibilidad en tiempo real...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 140),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.busInfo,
              {
                backgroundColor: colors.card,
                shadowColor: "#000",
              },
            ]}
          >
            <View style={styles.busInfoRow}>
              <View style={styles.busInfoItem}>
                <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
                  <Feather name="truck" size={16} color={colors.mutedForeground} />
                </View>
                <Text style={[styles.busInfoLabel, { color: colors.mutedForeground }]}>
                  Tipo
                </Text>
                <Text style={[styles.busInfoValue, { color: colors.foreground }]}>
                  {pendingTrip.busType}
                </Text>
              </View>
              
              <View style={styles.busInfoItem}>
                <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
                  <Feather name="users" size={16} color={colors.mutedForeground} />
                </View>
                <Text style={[styles.busInfoLabel, { color: colors.mutedForeground }]}>
                  Disponibles
                </Text>
                <Text style={[styles.busInfoValue, { color: colors.foreground }]}>
                  {realAvailableSeats} 
                </Text>
              </View>

              <View style={styles.busInfoItem}>
                <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
                  <Feather name="dollar-sign" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.busInfoLabel, { color: colors.mutedForeground }]}>
                  Precio c/u
                </Text>
                <Text style={[styles.busInfoValue, { color: colors.primary }]}>
                  ${pendingTrip.price}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.seatMapContainer}>
            <SeatMap
              totalSeats={pendingTrip.totalSeats}
              occupiedSeats={realOccupiedSeats} 
              selectedSeats={pendingSeats}
              onToggleSeat={handleToggleSeat}
            />
          </View>

          {pendingSeats.length > 0 ? (
            <View
              style={[
                styles.selectedInfo,
                {
                  backgroundColor: colors.secondary,
                  borderRadius: 16,
                },
              ]}
            >
              <View style={[styles.selectedIconBox, { backgroundColor: colors.primary }]}>
                <Feather name="check" size={16} color="#fff" />
              </View>
              <View>
                <Text style={[styles.selectedTitle, { color: colors.primary }]}>
                  Asientos elegidos
                </Text>
                <Text style={[styles.selectedSeats, { color: colors.foreground }]}>
                  {pendingSeats.sort((a, b) => a - b).join(", ")}
                </Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}

      {pendingSeats.length > 0 && !isCalculating ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + (Platform.OS === "web" ? 20 : 16),
              shadowColor: "#000",
            },
          ]}
        >
          <View style={styles.footerInfo}>
            <Text style={[styles.footerSeats, { color: colors.mutedForeground }]}>
              {pendingSeats.length} asiento{pendingSeats.length !== 1 ? "s" : ""}
            </Text>
            <Text style={[styles.footerTotal, { color: colors.primary }]}>
              ${totalPrice} <Text style={[styles.footerCurrency, { color: colors.primary }]}>MXN</Text>
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <AppButton title="Continuar" onPress={handleContinue} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  loadingText: { fontSize: 15, fontWeight: "600" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    zIndex: 10,
  },
  backBtn: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  headerInfo: { alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  headerSub: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  scroll: { padding: 20 },
  busInfo: { padding: 20, borderRadius: 24, marginBottom: 24, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 3 },
  busInfoRow: { flexDirection: "row", justifyContent: "space-between" },
  busInfoItem: { alignItems: "center", gap: 4, flex: 1 },
  iconBox: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  busInfoLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  busInfoValue: { fontSize: 16, fontWeight: "800" },
  seatMapContainer: { paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  selectedInfo: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, marginTop: 24 },
  selectedIconBox: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  selectedTitle: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  selectedSeats: { fontSize: 18, fontWeight: "800", marginTop: 2 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 20, borderTopLeftRadius: 32, borderTopRightRadius: 32, shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 10 },
  footerInfo: { alignItems: "flex-start" },
  footerSeats: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  footerTotal: { fontSize: 24, fontWeight: "800", marginTop: 2, letterSpacing: -0.5 },
  footerCurrency: { fontSize: 14, fontWeight: "700" },
});