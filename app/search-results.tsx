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
  "San José de Fénix": 150,
  "Sain Alto": 165,
  "Río Florido": 180,
  "Fresnillo": 240,
  "Calera": 265,
  "Zacatecas": 285,
  "Aguascalientes": 405,
  "San Juan de los Lagos": 480,
  "Guadalajara": 600,
};

const calculateSegmentData = (trip: any, searchOrigin: string, searchDest: string, exactPrice: number) => {
  if (!trip.departure_time) return { dep: "", arr: "", dur: "", price: exactPrice };

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

  const durationMins = Math.abs(destOffset - originOffset);
  const durH = Math.floor(durationMins / 60);
  const durM = durationMins % 60;
  const durText = durM > 0 ? `${durH}h ${durM}m` : `${durH}h`;

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
  
  const { origin, destination, date, isRoundTrip, returnDate, is15Days } = useLocalSearchParams<{
    origin: string;
    destination: string;
    date: string;
    isRoundTrip?: string;
    returnDate?: string;
    is15Days?: string; 
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

        if (searchStart === -1 || searchEnd === -1 || searchStart === searchEnd) {
          setLiveTrips([]);
          return;
        }

        const isGoingSouth = searchStart < searchEnd;

        // 1. Traer los viajes programados para ese día
        const { data: tripsData, error: tripsError } = await supabase
          .from("trips")
          .select("*")
          .eq("date", date);

        if (tripsError) throw tripsError;

        // 2. Filtrar viajes que cubran esta ruta 
        const validTrips = (tripsData || []).filter((trip) => {
          const tripStart = BONILLA_ROUTE.indexOf(trip.origin);
          const tripEnd = BONILLA_ROUTE.indexOf(trip.destination);
          
          if (tripStart === -1 || tripEnd === -1 || tripStart === tripEnd) return false;
          
          const tripGoesSouth = tripStart < tripEnd;

          // El camión debe ir en la misma dirección que el cliente
          if (isGoingSouth !== tripGoesSouth) return false;

          if (isGoingSouth) {
            return tripStart <= searchStart && tripEnd >= searchEnd;
          } else {
            return tripStart >= searchStart && tripEnd <= searchEnd;
          }
        });

        if (validTrips.length === 0) {
          setLiveTrips([]);
          return;
        }

        // 3. Buscar el precio exacto en el Tarifario Global (Igual que en la Web)
        const { data: priceData } = await supabase
          .from("route_prices")
          .select("*")
          .or(`and(origin.eq.${origin},destination.eq.${destination}),and(origin.eq.${destination},destination.eq.${origin})`)
          .single();

        let exactPrice = 0;
        
        if (priceData) {
          if (is15Days === "true") exactPrice = priceData.price_15_days;
          else if (isRoundTrip === "true") exactPrice = priceData.price_round_trip;
          else exactPrice = priceData.price_one_way;
        }

        const formattedTrips = validTrips.map(t => {
            // Si por alguna razón no hay tarifa guardada, usamos un valor de fallback
            const finalPrice = exactPrice > 0 ? exactPrice : t.price;
            const segmentData = calculateSegmentData(t, origin, destination, finalPrice);
          
          return {
            id: t.id,
            origin: origin, 
            destination: destination,
            date: t.date,
            departureTime: segmentData.dep,
            arrivalTime: segmentData.arr,
            duration: segmentData.dur,
            price: segmentData.price, 
            price_15_days: is15Days === "true" ? finalPrice : 0, 
            availableSeats: t.available_seats,
            totalSeats: t.total_seats,
            busType: t.bus_type,
            amenities: t.amenities || [],
            occupiedSeats: t.occupied_seats || []
          };
        });

        const tripIds = formattedTrips.map((t) => t.id);
        
        // 4. Checar la disponibilidad de asientos real en ese tramo
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select("trip_id, status, seats, origin, destination")
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
                trip: { origin: b.origin, destination: b.destination }, // Importante: usar origin/dest de la reserva
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
  }, [origin, destination, date, isRoundTrip, is15Days]);

  const handleSelect = (trip: Trip) => {
    if (trip.availableSeats <= 0) return; 

    setPendingTrip(trip);
    setPendingSeats([]);
    
    // --- Mandamos el estado hacia la selección de asientos ---
    router.push({
      pathname: "/seat-selection",
      params: { 
        isRoundTrip,
        returnDate,
        is15Days 
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