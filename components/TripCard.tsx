import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Trip } from "@/contexts/BookingContext";

interface TripCardProps {
  trip: Trip;
  onSelect: (trip: Trip) => void;
}

const AMENITY_ICONS: Record<string, string> = {
  WiFi: "wifi",
  AC: "wind",
  USB: "zap",
  Snacks: "coffee",
  Baño: "droplet",
  "Asientos cama": "moon",
};

export function TripCard({ trip, onSelect }: TripCardProps) {
  const colors = useColors();
  const availabilityPct = trip.availableSeats / trip.totalSeats;
  const isAlmostFull = availabilityPct < 0.2;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: 24, // Tarjetas más redondeadas
          shadowColor: "#000",
        },
      ]}
      onPress={() => onSelect(trip)}
      activeOpacity={0.85}
    >
      <View style={styles.topSection}>
        {/* Lado Izquierdo: Horarios */}
        <View style={styles.timeSection}>
          <View style={styles.timeRow}>
            <Text style={[styles.time, { color: colors.foreground }]}>
              {trip.departureTime}
            </Text>
            <Text style={[styles.cityText, { color: colors.mutedForeground }]}>
              {trip.origin.substring(0, 3).toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.durationRow}>
            <Text style={[styles.durationText, { color: colors.mutedForeground }]}>
              {trip.duration}
            </Text>
            <Text style={[styles.dots, { color: colors.border }]}>
               • • • • •
            </Text>
          </View>

          <View style={styles.timeRow}>
            <Text style={[styles.time, { color: colors.foreground }]}>
              {trip.arrivalTime}
            </Text>
            <Text style={[styles.cityText, { color: colors.mutedForeground }]}>
              {trip.destination.substring(0, 3).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Lado Derecho: Precio y Clase */}
        <View style={styles.priceSection}>
          <Text style={[styles.pricePrefix, { color: colors.mutedForeground }]}>Desde</Text>
          <Text style={[styles.price, { color: colors.primary }]}>
            ${trip.price}
          </Text>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: colors.secondary,
              },
            ]}
          >
            <Text style={[styles.busType, { color: colors.primary }]}>
              {trip.busType}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.muted }]} />

      <View style={styles.footer}>
        <View style={styles.amenities}>
          {trip.amenities.slice(0, 3).map((amenity) => (
            <View
              key={amenity}
              style={[
                styles.amenityChip,
                { borderColor: colors.border },
              ]}
            >
              <Feather
                name={(AMENITY_ICONS[amenity] as any) ?? "check"}
                size={12}
                color={colors.mutedForeground}
              />
              <Text style={[styles.amenityText, { color: colors.mutedForeground }]}>
                {amenity}
              </Text>
            </View>
          ))}
          {trip.amenities.length > 3 && (
            <Text style={[styles.amenityText, { color: colors.mutedForeground, marginLeft: 4 }]}>
              +{trip.amenities.length - 3}
            </Text>
          )}
        </View>
        
        <View style={[
          styles.seatsBadge, 
          { backgroundColor: isAlmostFull ? '#FEF2F2' : colors.muted }
        ]}>
          <Feather
            name="users"
            size={14}
            color={isAlmostFull ? colors.destructive : colors.foreground}
          />
          <Text
            style={[
              styles.seatsText,
              {
                color: isAlmostFull ? colors.destructive : colors.foreground,
              },
            ]}
          >
            {trip.availableSeats} libres
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  topSection: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeSection: {
    flex: 1,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  time: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  cityText: {
    fontSize: 14,
    fontWeight: "700",
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingLeft: 4, // Para alinear sutilmente
  },
  durationText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dots: {
    fontSize: 12,
    letterSpacing: 2,
    flex: 1,
  },
  priceSection: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
  },
  pricePrefix: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  price: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  busType: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  divider: {
    height: 1,
    marginVertical: 16,
    borderRadius: 1,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  amenities: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    flex: 1,
  },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 8,
  },
  amenityText: {
    fontSize: 11,
    fontWeight: "600",
  },
  seatsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  seatsText: {
    fontSize: 13,
    fontWeight: "700",
  },
});