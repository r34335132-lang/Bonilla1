import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TripCard } from "@/components/TripCard";
import { Trip, useBooking } from "@/contexts/BookingContext";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { getOccupiedSeatsForSegment, BONILLA_ROUTE } from "@/utils/routeLogic"; 

const ROUTE_OFFSETS: Record<string, number> = {
  "Durango": 0,
  "Nombre de Dios": 45,
  "Vicente Guerrero": 75,
  "Sombrerete": 135,
  "Río Florido": 180,
  "Fresnillo": 240,
  "Zacatecas": 285,
  "Aguascalientes": 405,
  "San Juan de los Lagos": 480,
  "Guadalajara": 600,
};

const calculateSegmentData = (trip: any, searchOrigin: string, searchDest: string) => {
  if (!trip.departure_time) return { dep: "", arr: "", dur: "", price: trip.price };

  const [hours, minutes] = trip.departure_time.split(":").map(Number);
  const baseMinutes = hours * 60 + minutes;

  const originOffset = ROUTE_OFFSETS[searchOrigin] || 0;
  const destOffset = ROUTE_OFFSETS[searchDest] || 0;

  const depTotal = baseMinutes + originOffset;
  const arrTotal = baseMinutes + destOffset;

  const formatTime = (totalMins: number) => {
    const h = Math.floor(totalMins / 60) % 24;
    const m = totalMins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const durationMins = destOffset - originOffset;
  const durH = Math.floor(durationMins / 60);
  const durM = durationMins % 60;
  const durText = durM > 0 ? `${durH}h ${durM}m` : `${durH}h`;

  let exactPrice = trip.price; 
  
  if (trip.prices && typeof trip.prices === 'object' && Object.keys(trip.prices).length > 0) {
    if (trip.origin === searchOrigin) {
      const directPrice = Number(trip.prices[searchDest]);
      if (directPrice > 0) exactPrice = directPrice;
    } else {
      const priceToDest = Number(trip.prices[searchDest]) || 0;
      const priceToOrigin = Number(trip.prices[searchOrigin]) || 0;
      
      if (priceToDest > priceToOrigin && priceToOrigin > 0) {
        exactPrice = priceToDest - priceToOrigin;
      } else {
        const tripTotalMins = 600;
        exactPrice = Math.round(((trip.price / tripTotalMins) * durationMins) / 10) * 10;
      }
    }
  } else {
    const tripTotalMins = 600;
    exactPrice = Math.round(((trip.price / tripTotalMins) * durationMins) / 10) * 10;
  }

  return {
    dep: formatTime(depTotal),
    arr: formatTime(arrTotal),
    dur: durText,
    price: exactPrice
  };
};

export default function SearchResultsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  // --- MAGIA NUEVA: Recibimos también is15Days desde el Home ---
  const { origin, destination, date, isRoundTrip, returnDate, is15Days } = useLocalSearchParams<{
    origin: string;
    destination: string;
    date: string;
    isRoundTrip?: string;
    returnDate?: string;
    is15Days?: string; // <-- NUEVO
  }>();
  const { setPendingTrip, setPendingSeats } = useBooking();

  const [liveTrips, setLiveTrips] = useState<Trip[]>([]);
  const [isCalculating, setIsCalculating] = useState(true);

  const formattedDate = useMemo(() => {
    try {
      if (!date) return "";
      const [year, month, day] = date.split("-").map(Number);
      return new Date(year, month - 1, day).toLocaleDateString("es-MX", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    } catch {
      return date;
    }
  }, [date]);

  useEffect(() => {
    const fetchAndCalculateTrips = async () => {
      if (!origin || !destination || !date) return;
      
      setIsCalculating(true);
      try {
        const searchStart = BONILLA_ROUTE.indexOf(origin);
        const searchEnd = BONILLA_ROUTE.indexOf(destination);

        if (searchStart === -1 || searchEnd === -1 || searchStart >= searchEnd) {
          setLiveTrips([]);
          return;
        }

        const { data: tripsData, error: tripsError } = await supabase
          .from("trips")
          .select("*")
          .eq("date", date);

        if (tripsError) throw tripsError;

        const validTrips = (tripsData || []).filter((trip) => {
          const tripStart = BONILLA_ROUTE.indexOf(trip.origin);
          const tripEnd = BONILLA_ROUTE.indexOf(trip.destination);
          return searchStart >= tripStart && searchEnd <= tripEnd;
        });

        if (validTrips.length === 0) {
          setLiveTrips([]);
          return;
        }

        const formattedTrips = validTrips.map(t => {
          const segmentData = calculateSegmentData(t, origin, destination);
          
          let finalPrice = segmentData.price;
          
          // --- AQUÍ APLICAMOS LA TARIFA DE 15 DÍAS O IDA Y VUELTA ---
          if (is15Days === "true" && t.price_15_days) {
            // Buscamos el precio especial de 15 días en la BD
            const specialPrice = Number(t.price_15_days);
            if (specialPrice > 0) finalPrice = specialPrice;
          } else if (isRoundTrip === "true" && t.round_trip_prices && typeof t.round_trip_prices === 'object') {
            // Buscamos el precio redondo en la BD
            const roundPrice = Number(t.round_trip_prices[destination]);
            if (roundPrice > 0) finalPrice = roundPrice;
          }

          return {
            id: t.id,
            origin: origin,
            destination: destination,
            date: t.date,
            departureTime: segmentData.dep,
            arrivalTime: segmentData.arr,
            duration: segmentData.dur,
            price: finalPrice, 
            price_15_days: t.price_15_days, // Lo guardamos por si acaso
            availableSeats: t.available_seats,
            totalSeats: t.total_seats,
            busType: t.bus_type,
            amenities: t.amenities || [],
            occupiedSeats: t.occupied_seats || []
          };
        });

        const tripIds = formattedTrips.map((t) => t.id);
        
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select("trip_id, status, seats, trip:trips!bookings_trip_id_fkey(origin, destination)")
          .in("trip_id", tripIds)
          .neq("status", "cancelled");

        let updatedTrips = formattedTrips;
        
        if (!bookingsError && bookingsData) {
          updatedTrips = formattedTrips.map((trip) => {
            const tripBookings = bookingsData
              .filter((b) => b.trip_id === trip.id)
              .map((b: any) => ({
                status: b.status,
                seats: b.seats,
                trip: { origin: b.trip.origin, destination: b.trip.destination },
              }));

            const occupiedSeats = getOccupiedSeatsForSegment(tripBookings, origin, destination);
            return {
              ...trip,
              availableSeats: trip.totalSeats - occupiedSeats.length,
            };
          });
        }

        setLiveTrips(updatedTrips);
      } catch (err) {
        console.error("Error cargando viajes:", err);
      } finally {
        setIsCalculating(false);
      }
    };

    fetchAndCalculateTrips();
  }, [origin, destination, date, isRoundTrip, is15Days]); // <-- Agregamos is15Days aquí

  const handleSelect = (trip: Trip) => {
    if (trip.availableSeats <= 0) return; 

    setPendingTrip(trip);
    setPendingSeats([]);
    
    // --- MAGIA: Mandamos el estado hacia la selección de asientos ---
    router.push({
      pathname: "/seat-selection",
      params: { 
        isRoundTrip,
        returnDate,
        is15Days // <-- PASAMOS LA ESTAFETA AL MAPA DE ASIENTOS
      }
    }); 
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12),
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
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
          <Text style={[styles.route, { color: colors.foreground }]} numberOfLines={1}>
            {origin} a {destination}
          </Text>
          <Text style={[styles.dateText, { color: colors.primary }]}>
            {formattedDate} {isRoundTrip === "true" ? "(Ida y Vuelta)" : is15Days === "true" ? "(Paquete 15 Días)" : ""}
          </Text>
        </View>
      </View>

      {isCalculating ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Buscando unidades en ruta...
          </Text>
        </View>
      ) : (
        <FlatList
          data={liveTrips}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <TripCard trip={item} onSelect={handleSelect} />
          )}
          contentContainerStyle={{
            paddingTop: 20,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 40),
          }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            liveTrips.length > 0 ? (
              <Text style={[styles.count, { color: colors.mutedForeground }]}>
                {liveTrips.length} salida{liveTrips.length !== 1 ? "s" : ""} encontrada{liveTrips.length !== 1 ? "s" : ""}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIconBox, { backgroundColor: colors.secondary }]}>
                <Feather name="map" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No hay salidas disponibles
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Intenta buscando para una fecha diferente o verifica tu origen y destino.
              </Text>
              <TouchableOpacity 
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.back()}
              >
                <Text style={styles.emptyBtnText}>Volver a buscar</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
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
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    zIndex: 10,
  },
  backBtn: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  headerInfo: { flex: 1 },
  route: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  dateText: { fontSize: 13, fontWeight: "600", marginTop: 2, textTransform: "capitalize" },
  count: { fontSize: 13, fontWeight: "600", paddingHorizontal: 20, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  emptyText: { fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 32 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});