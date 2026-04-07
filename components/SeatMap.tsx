import { Feather } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface SeatMapProps {
  totalSeats: number;
  occupiedSeats: (number | string)[]; // Aceptamos strings por seguridad
  selectedSeats: number[];
  onToggleSeat: (seat: number) => void;
  maxSelectable?: number;
}

export function SeatMap({
  totalSeats,
  occupiedSeats = [],
  selectedSeats = [],
  onToggleSeat,
  maxSelectable = 6,
}: SeatMapProps) {
  const colors = useColors();

  // Generamos las filas del autobús (4 asientos por fila)
  const rows: number[][] = [];
  for (let i = 1; i <= totalSeats; i += 4) {
    const row: number[] = [];
    for (let j = i; j < i + 4 && j <= totalSeats; j++) {
      row.push(j);
    }
    rows.push(row);
  }

  // Solución al problema de tipos (Number/String)
  const getSeatStatus = (seat: number) => {
    if (occupiedSeats.some((s) => Number(s) === seat)) return "occupied";
    if (selectedSeats.some((s) => Number(s) === seat)) return "selected";
    return "available";
  };

  const handleSeatPress = (seat: number) => {
    const status = getSeatStatus(seat);
    if (status === "occupied") return;
    if (status === "available" && selectedSeats.length >= maxSelectable) return;
    onToggleSeat(seat);
  };

  return (
    <View style={styles.container}>
      
      {/* INDICADOR MINIMALISTA DE FRENTE */}
      <View style={styles.frontIndicator}>
        <Feather name="chevron-up" size={16} color={colors.mutedForeground} />
        <Text style={[styles.frontText, { color: colors.mutedForeground }]}>FRENTE DEL AUTOBÚS</Text>
        <Feather name="chevron-up" size={16} color={colors.mutedForeground} />
      </View>

      {/* ÁREA DE ASIENTOS (FLOTANTE, SIN BORDE DE CAMIÓN) */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.seatsScroll}
        contentContainerStyle={styles.seatsContainer}
        nestedScrollEnabled={true}
      >
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((seat, seatIdx) => {
              const status = getSeatStatus(seat);
              const isAisle = seatIdx === 2; // Pasillo en el medio

              return (
                <React.Fragment key={seat}>
                  {isAisle && <View style={styles.aisle} />}
                  
                  <TouchableOpacity
                    style={[
                      styles.seatBase,
                      {
                        backgroundColor:
                          status === "occupied"
                            ? colors.muted + "40" // Gris muy tenue para ocupados
                            : status === "selected"
                            ? colors.primary
                            : colors.card,
                        borderColor:
                          status === "available"
                            ? colors.border
                            : "transparent",
                        borderWidth: status === "available" ? 1 : 0,
                        // Sombra sutil solo para disponibles y seleccionados
                        shadowColor: status === "occupied" ? "transparent" : "#000",
                      },
                    ]}
                    onPress={() => handleSeatPress(seat)}
                    disabled={status === "occupied"}
                    activeOpacity={0.8}
                  >
                    {/* Detalle Premium: Costura/Reposacabezas sutil */}
                    <View 
                      style={[
                        styles.headrest, 
                        { 
                          backgroundColor: 
                            status === "selected" 
                              ? "rgba(255,255,255,0.15)" 
                              : colors.muted + "80"
                        }
                      ]} 
                    />
                    
                    <Text
                      style={[
                        styles.seatNumber,
                        {
                          color: 
                            status === "selected" 
                              ? "#ffffff" 
                              : status === "occupied"
                              ? colors.mutedForeground + "80"
                              : colors.foreground,
                          opacity: status === "occupied" ? 0.6 : 1,
                        },
                      ]}
                    >
                      {seat}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* LEYENDA PREMIUM */}
      <View style={[styles.legend, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <LegendItem
          color={colors.card}
          textColor={colors.foreground}
          label="Libre"
          borderColor={colors.border}
        />
        <LegendItem
          color={colors.primary}
          textColor="#fff"
          label="Tu selección"
        />
        <LegendItem
          color={colors.muted + "40"}
          textColor={colors.mutedForeground}
          label="Ocupado"
        />
      </View>
    </View>
  );
}

function LegendItem({
  color,
  textColor,
  label,
  borderColor,
}: {
  color: string;
  textColor: string;
  label: string;
  borderColor?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendSwatch,
          {
            backgroundColor: color,
            borderWidth: borderColor ? 1 : 0,
            borderColor: borderColor ?? "transparent",
          },
        ]}
      />
      <Text style={[styles.legendLabel, { color: colors.foreground }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 10,
  },
  frontIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
    width: '100%',
    justifyContent: 'center'
  },
  frontText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  seatsScroll: {
    maxHeight: 420,
    width: '100%',
  },
  seatsContainer: {
    alignItems: "center",
    gap: 16, // Más espacio entre filas (Premium feeling)
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: "row",
    gap: 14, // Más espacio entre asientos
    alignItems: "center",
  },
  aisle: {
    width: 32, // Pasillo muy amplio
  },
  seatBase: {
    width: 52, // Asiento más ancho
    height: 52, // Asiento cuadrado
    borderRadius: 14, // Curvas más suaves
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headrest: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 12, // Reposacabezas más sutil
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  seatNumber: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 10, // Bajamos el número para no tapar el reposacabezas
    letterSpacing: -0.5,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendSwatch: {
    width: 20,
    height: 20,
    borderRadius: 6,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
});