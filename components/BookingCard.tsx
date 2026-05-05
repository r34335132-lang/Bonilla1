import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Booking } from "@/contexts/BookingContext";

interface BookingCardProps {
  booking: Booking;
  onCancel?: (id: string) => void;
  onPay?: (booking: Booking) => void; 
  onPrint?: (booking: Booking) => void; 
  isAdmin?: boolean;
}

const STATUS_CONFIG = {
  confirmed: { label: "Confirmado", color: "#10B981" },
  pending: { label: "Pendiente de Pago", color: "#F59E0B" },
  cancelled: { label: "Cancelado", color: "#EF4444" },
};

export function BookingCard({ booking, onCancel, onPay, onPrint, isAdmin }: BookingCardProps) {
  const colors = useColors();
  const statusInfo = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  
  const date = new Date(booking.createdAt).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: booking.status === "pending" ? statusInfo.color : colors.border,
          borderWidth: booking.status === "pending" ? 1.5 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.bookingId, { color: colors.mutedForeground }]}>
            # {booking.id}
          </Text>
          <Text style={[styles.route, { color: colors.foreground }]}>
            {booking.trip.origin} → {booking.trip.destination}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: statusInfo.color + "20",
              borderRadius: colors.radius / 2,
            },
          ]}
        >
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.details}>
        <DetailRow
          icon="calendar"
          label="Fecha"
          value={booking.trip.date}
          colors={colors}
        />
        <DetailRow
          icon="clock"
          label="Salida"
          value={`${booking.trip.departureTime} - ${booking.trip.arrivalTime}`}
          colors={colors}
        />
        <DetailRow
          icon="grid"
          label="Asientos"
          value={booking.seats && booking.seats.length > 0 ? booking.seats.join(", ") : "Abierto / Sin asignar"}
          colors={colors}
        />
        <DetailRow
          icon="credit-card"
          label="Pago"
          value={booking.paymentMethod === "card" ? "Tarjeta" : "En Taquilla"} // <-- CORREGIDO A "Tarjeta"
          colors={colors}
        />
        {isAdmin && (
          <>
            <DetailRow
              icon="user"
              label="Pasajero"
              value={booking.passengerName}
              colors={colors}
            />
            <DetailRow
              icon="mail"
              label="Email"
              value={booking.passengerEmail}
              colors={colors}
            />
            <DetailRow
              icon="phone"
              label="Tel"
              value={booking.passengerPhone}
              colors={colors}
            />
          </>
        )}
      </View>

      {isAdmin && booking.isGuest && (
        <View
          style={[
            styles.guestBadge,
            {
              backgroundColor: colors.accent,
              borderRadius: colors.radius / 2,
              marginTop: 8,
            },
          ]}
        >
          <Feather name="user" size={12} color={colors.accentForeground} />
          <Text style={[styles.guestText, { color: colors.accentForeground }]}>
            Reserva de invitado
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.footerLabel, { color: colors.mutedForeground }]}>
            Total
          </Text>
          <Text style={[styles.total, { color: colors.primary }]}>
            ${booking.totalPrice} MXN
          </Text>
        </View>
        
        <View style={{ flexDirection: "row", gap: 8 }}>
          {onCancel && booking.status !== "cancelled" && (
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                {
                  borderColor: colors.destructive,
                  borderRadius: colors.radius / 2,
                },
              ]}
              onPress={() => onCancel(booking.id)}
            >
              <Text style={[styles.cancelText, { color: colors.destructive }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          )}

          {onPay && booking.status === "pending" && (
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                {
                  backgroundColor: colors.primary, 
                  borderColor: colors.primary,
                  borderRadius: colors.radius / 2,
                },
              ]}
              onPress={() => onPay(booking)}
            >
              <Text style={[styles.cancelText, { color: "#fff" }]}>
                Pagar Ahora
              </Text>
            </TouchableOpacity>
          )}

          {onPrint && booking.status === "confirmed" && (
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                {
                  backgroundColor: colors.secondary,
                  borderColor: colors.secondary,
                  borderRadius: colors.radius / 2,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6
                },
              ]}
              onPress={() => onPrint(booking)}
            >
              <Feather name="download" size={14} color={colors.primary} />
              <Text style={[styles.cancelText, { color: colors.primary }]}>
                Boleto
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={[styles.date, { color: colors.mutedForeground }]}>
        Reservado el {date}
      </Text>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.detailRow}>
      <Feather name={icon as any} size={14} color={colors.mutedForeground} />
      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
        {label}:
      </Text>
      <Text style={[styles.detailValue, { color: colors.foreground }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  bookingId: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  route: {
    fontSize: 16,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800", 
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  details: {
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "500",
    width: 60,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  guestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  guestText: {
    fontSize: 12,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  footerLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  total: {
    fontSize: 18,
    fontWeight: "800",
  },
  cancelBtn: {
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: "600",
  },
  date: {
    fontSize: 11,
    marginTop: 8,
  },
});