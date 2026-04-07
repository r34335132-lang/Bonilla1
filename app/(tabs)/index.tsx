import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  ImageBackground,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AppButton } from "@/components/AppButton";
import { useAuth } from "@/contexts/AuthContext";
import { useBooking } from "@/contexts/BookingContext";
import { useColors } from "@/hooks/useColors";
import { POPULAR_ROUTES } from "@/data/trips"; 
import { supabase } from "@/lib/supabase"; 
import { BONILLA_ROUTE } from "@/utils/routeLogic"; 

// --- SOLUCIÓN ZONA HORARIA (Evita que busque un día antes/después) ---
const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const TODAY = getLocalDateString(new Date());

// --- MAGIA: TIEMPOS DE LA RUTA EN MINUTOS DESDE DURANGO ---
const ROUTE_OFFSETS: Record<string, number> = {
  "Durango": 0,
  "Nombre de Dios": 45,       // 45 mins
  "Vicente Guerrero": 75,     // 1h 15m
  "Sombrerete": 135,          // 2h 15m
  "Río Florido": 180,         // 3h
  "Fresnillo": 240,           // 4h
  "Zacatecas": 285,           // 4h 45m
  "Aguascalientes": 405,      // 6h 45m
  "San Juan de los Lagos": 480, // 8h
  "Guadalajara": 600,         // 10h (Ej: de 20:00 a 06:00)
};

// Función maestra para calcular los tiempos y precios del tramo
const calculateSegmentData = (baseDepartureTime: string, basePrice: number, origin: string, destination: string) => {
  if (!baseDepartureTime) return { dep: "", arr: "", dur: "", price: basePrice };
  
  const [hours, minutes] = baseDepartureTime.split(":").map(Number);
  const baseMinutes = hours * 60 + minutes;

  const originOffset = ROUTE_OFFSETS[origin] || 0;
  const destOffset = ROUTE_OFFSETS[destination] || 0;

  // Calculamos horas de salida y llegada reales
  const depTotal = baseMinutes + originOffset;
  const arrTotal = baseMinutes + destOffset;

  const formatTime = (totalMins: number) => {
    const h = Math.floor(totalMins / 60) % 24;
    const m = totalMins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  // Calculamos la duración en texto (Ej: 2h 30m)
  const durationMins = destOffset - originOffset;
  const durH = Math.floor(durationMins / 60);
  const durM = durationMins % 60;
  const durText = durM > 0 ? `${durH}h ${durM}m` : `${durH}h`;

  // Calculamos precio dinámico (Proporcional a la distancia)
  const tripTotalMins = 600; // Lo que dura toda la ruta maestra
  const calculatedPrice = Math.round(((basePrice / tripTotalMins) * durationMins) / 10) * 10; // Redondeado a 10s

  return {
    dep: formatTime(depTotal),
    arr: formatTime(arrTotal),
    dur: durText,
    price: calculatedPrice || basePrice // Si algo falla, cobra el precio base
  };
};

const ROUTE_IMAGES: Record<string, string> = {
  "Durango": "https://images.unsplash.com/photo-1620002093394-17f1a30ca5e3?auto=format&fit=crop&q=80&w=400",
  "Nombre de Dios": "https://images.unsplash.com/photo-1588614959060-4d144f28b207?auto=format&fit=crop&q=80&w=400",
  "Vicente Guerrero": "https://images.unsplash.com/photo-1596395819057-e37f55a851e3?auto=format&fit=crop&q=80&w=400",
  "Sombrerete": "https://images.unsplash.com/photo-1601027847350-0285867a50ca?auto=format&fit=crop&q=80&w=400",
  "Río Florido": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=400",
  "Fresnillo": "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?auto=format&fit=crop&q=80&w=400",
  "Zacatecas": "https://images.unsplash.com/photo-1580837119756-563d608dc11c?auto=format&fit=crop&q=80&w=400",
  "Aguascalientes": "https://images.unsplash.com/photo-1629910408453-6110f81d58ec?auto=format&fit=crop&q=80&w=400",
  "San Juan de los Lagos": "https://images.unsplash.com/photo-1548115184-bc6544d06a58?auto=format&fit=crop&q=80&w=400",
  "Guadalajara": "https://images.unsplash.com/photo-1583037189850-1921be232522?auto=format&fit=crop&q=80&w=400",
  "Default": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=400"
};

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isGuest, role } = useAuth();
  const { setPendingTrip, setPendingSeats } = useBooking();

  const [origin, setOrigin] = useState("Durango");
  const [destination, setDestination] = useState("Guadalajara");
  const [isSearching, setIsSearching] = useState(false);
  
  const [pickerType, setPickerType] = useState<"origin" | "destination" | null>(null);
  const [dateObj, setDateObj] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const dateInput = dateObj.toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
  
  const formattedSearchDate = getLocalDateString(dateObj);
  const isToday = formattedSearchDate === TODAY;

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const handleSearch = async () => {
    setIsSearching(true);
    
    try {
      const searchStart = BONILLA_ROUTE.indexOf(origin);
      const searchEnd = BONILLA_ROUTE.indexOf(destination);

      if (searchStart === -1 || searchEnd === -1 || searchStart >= searchEnd) {
        Alert.alert(
          "Ruta no disponible", 
          "Verifica que el destino vaya después del origen en la ruta seleccionada."
        );
        setIsSearching(false);
        return;
      }

      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("date", formattedSearchDate);

      if (error) throw error;

      const validTrips = (data || []).filter((trip) => {
        const tripStart = BONILLA_ROUTE.indexOf(trip.origin);
        const tripEnd = BONILLA_ROUTE.indexOf(trip.destination);
        return searchStart >= tripStart && searchEnd <= tripEnd;
      });

      const formattedTrips = validTrips.map(t => {
        // AQUÍ ESTÁ LA MAGIA QUE CREA HORAS Y PRECIOS DINÁMICOS
        const segmentData = calculateSegmentData(t.departure_time, t.price, origin, destination);

        return {
          id: t.id,
          origin: origin, 
          destination: destination, 
          date: t.date,
          departureTime: segmentData.dep,
          arrivalTime: segmentData.arr,
          duration: segmentData.dur,
          price: segmentData.price, 
          availableSeats: t.available_seats,
          totalSeats: t.total_seats,
          busType: t.bus_type,
          amenities: t.amenities,
          occupiedSeats: t.occupied_seats || []
        };
      });

      router.push({
        pathname: "/search-results",
        params: { origin, destination, date: formattedSearchDate, results: JSON.stringify(formattedTrips) },
      });

    } catch (err) {
      console.error("Error buscando viajes:", err);
      Alert.alert("Error", "Ocurrió un problema al buscar las rutas.");
    } finally {
      setIsSearching(false);
    }
  };

  const handlePopularRoute = (o: string, d: string) => {
    setOrigin(o);
    setDestination(d);
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDateObj(selectedDate);
    }
  };

  const handleCitySelect = (city: string) => {
    if (pickerType === "origin") setOrigin(city);
    if (pickerType === "destination") setDestination(city);
    setPickerType(null);
  };

  const userName = user?.user_metadata?.name || "Viajero";

  const greeting = user
    ? `Hola, ${userName.split(" ")[0]}`
    : isGuest
    ? "Hola, invitado"
    : "Busca tu viaje";

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100),
        }}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
      >
        <View style={{ position: "absolute", top: -1000, left: 0, right: 0, height: 1000, backgroundColor: colors.primary }} />

        <LinearGradient
          colors={[colors.primary, "#8B0000"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.header,
            {
              paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20),
              borderBottomLeftRadius: 40,
              borderBottomRightRadius: 40,
            },
          ]}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{greeting} 👋</Text>
              <Text style={styles.headerSub}>¿A dónde viajamos hoy?</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.badge,
                { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 24 },
              ]}
              onPress={() => router.push("/(tabs)/profile")}
              activeOpacity={0.8}
            >
              <Feather
                name={role === "admin" ? "shield" : isGuest ? "user" : "user-check"}
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.searchCard,
              {
                backgroundColor: colors.card,
                borderRadius: 28,
                marginTop: 28,
                shadowColor: colors.primary, 
              },
            ]}
          >
            <View style={styles.routeContainer}>
              <TouchableOpacity 
                style={styles.inputWrapper} 
                activeOpacity={0.7}
                onPress={() => setPickerType("origin")}
              >
                <View style={[styles.iconContainer, { backgroundColor: colors.muted }]}>
                  <Feather name="map-pin" size={18} color={colors.mutedForeground} />
                </View>
                <View style={styles.routeField}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                    Origen
                  </Text>
                  <Text style={[styles.fieldText, { color: colors.foreground }]}>
                    {origin}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.swapBtnContainer}>
                <TouchableOpacity
                  onPress={handleSwap}
                  style={[
                    styles.swapBtn,
                    { backgroundColor: colors.secondary, borderRadius: 20 },
                  ]}
                  activeOpacity={0.7}
                >
                  <Feather name="repeat" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.inputWrapper} 
                activeOpacity={0.7}
                onPress={() => setPickerType("destination")}
              >
                <View style={[styles.iconContainer, { backgroundColor: colors.secondary }]}>
                  <Feather name="map" size={18} color={colors.primary} />
                </View>
                <View style={styles.routeField}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                    Destino
                  </Text>
                  <Text style={[styles.fieldText, { color: colors.foreground }]}>
                    {destination}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.muted }]} />

            <TouchableOpacity 
              style={styles.dateRow} 
              activeOpacity={0.7}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.muted }]}>
                <Feather name="calendar" size={18} color={colors.mutedForeground} />
              </View>
              <View>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                  Fecha de salida
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={[styles.dateText, { color: colors.foreground, textTransform: "capitalize" }]}>
                    {dateInput}
                  </Text>
                  {isToday && (
                    <View style={[styles.todayBadge, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.todayBadgeText, { color: colors.primary }]}>Hoy</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={dateObj}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={onChangeDate}
              />
            )}

            {Platform.OS === 'ios' && showDatePicker && (
              <TouchableOpacity 
                style={styles.iosDateDoneBtn} 
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={[styles.iosDateDoneText, { color: colors.primary }]}>
                  Confirmar fecha
                </Text>
              </TouchableOpacity>
            )}

            <View style={{ marginTop: 12 }}>
              <AppButton title="Buscar Boletos" onPress={handleSearch} loading={isSearching} />
            </View>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Inspírate a viajar
            </Text>
            <Feather name="compass" size={20} color={colors.primary} />
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
            style={{ marginHorizontal: -20, paddingBottom: 10 }}
          >
            {POPULAR_ROUTES.map(({ origin: o, destination: d }) => {
              const imageUrl = ROUTE_IMAGES[d] || ROUTE_IMAGES["Default"];
              
              return (
                <TouchableOpacity
                  key={`${o}-${d}`}
                  onPress={() => handlePopularRoute(o, d)}
                  activeOpacity={0.8}
                  style={[styles.routeCardWrapper, { shadowColor: colors.foreground }]}
                >
                  <ImageBackground
                    source={{ uri: imageUrl }}
                    style={styles.routeCardImg}
                    imageStyle={{ borderRadius: 20 }}
                  >
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.85)"]}
                      style={styles.routeCardGradient}
                    >
                      <Text style={styles.routeCardOrigin}>{o}</Text>
                      <Feather name="arrow-down" size={14} color="rgba(255,255,255,0.7)" style={{ marginVertical: 4 }} />
                      <Text style={styles.routeCardDest}>{d}</Text>
                    </LinearGradient>
                  </ImageBackground>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={[styles.section, { paddingTop: 24 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Viaja con nosotros
          </Text>
          <View style={styles.featuresGrid}>
            {[
              { icon: "shield", title: "Seguridad", desc: "Flotilla moderna" },
              { icon: "clock", title: "Puntualidad", desc: "Salidas exactas" },
              { icon: "wifi", title: "Comodidad", desc: "WiFi y USB" },
              { icon: "credit-card", title: "Pago Flexible", desc: "Tarjeta o efectivo" },
            ].map(({ icon, title, desc }) => (
              <View
                key={title}
                style={[
                  styles.featureCard,
                  {
                    backgroundColor: colors.card,
                    borderRadius: 24,
                    shadowColor: "#000",
                  },
                ]}
              >
                <View
                  style={[
                    styles.featureIconBox,
                    {
                      backgroundColor: colors.secondary,
                      borderRadius: 16,
                    },
                  ]}
                >
                  <Feather name={icon as any} size={22} color={colors.primary} />
                </View>
                <Text style={[styles.featureTitle, { color: colors.foreground }]}>
                  {title}
                </Text>
                <Text style={[styles.featureDesc, { color: colors.mutedForeground }]}>
                  {desc}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* --- MODAL PARA SELECCIONAR CIUDAD --- */}
      <Modal
        visible={pickerType !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPickerType(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, paddingBottom: insets.bottom || 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                Selecciona {pickerType === "origin" ? "Origen" : "Destino"}
              </Text>
              <TouchableOpacity onPress={() => setPickerType(null)} style={styles.modalCloseBtn}>
                <Feather name="x" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={BONILLA_ROUTE}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = item === (pickerType === "origin" ? origin : destination);
                return (
                  <TouchableOpacity
                    style={[
                      styles.cityOption,
                      { borderBottomColor: colors.border },
                      isSelected && { backgroundColor: colors.secondary }
                    ]}
                    onPress={() => handleCitySelect(item)}
                  >
                    <Text style={[styles.cityOptionText, { color: isSelected ? colors.primary : colors.foreground }]}>
                      {item}
                    </Text>
                    {isSelected && <Feather name="check" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 50 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  greeting: { fontSize: 28, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  headerSub: { fontSize: 16, color: "rgba(255,255,255,0.9)", marginTop: 6, fontWeight: "500" },
  badge: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  searchCard: { padding: 24, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 10 },
  routeContainer: { position: "relative" },
  inputWrapper: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  iconContainer: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  routeField: { flex: 1 },
  fieldLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  
  fieldText: { fontSize: 18, fontWeight: "700", paddingVertical: Platform.OS === 'ios' ? 4 : 0 },
  
  swapBtnContainer: { position: "absolute", right: 0, top: "50%", marginTop: -28, zIndex: 10 },
  swapBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  divider: { height: 1, marginBottom: 20, marginTop: 4 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 24 },
  dateText: { fontSize: 17, fontWeight: "700" },
  todayBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  todayBadgeText: { fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  iosDateDoneBtn: { alignItems: 'center', marginBottom: 16, marginTop: -8 },
  iosDateDoneText: { fontWeight: '700', fontSize: 16 },
  section: { paddingHorizontal: 20, paddingTop: 36 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  sectionTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  routeCardWrapper: { shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  routeCardImg: { width: 140, height: 180 },
  routeCardGradient: { flex: 1, borderRadius: 20, padding: 16, justifyContent: "flex-end" },
  routeCardOrigin: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" },
  routeCardDest: { color: "#fff", fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  featuresGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 16, marginTop: 16 },
  featureCard: { width: "47%", padding: 20, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  featureIconBox: { width: 48, height: 48, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  featureTitle: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  featureDesc: { fontSize: 13, lineHeight: 18 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "80%", paddingTop: 24, paddingHorizontal: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  modalCloseBtn: { padding: 4 },
  cityOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 18, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 12 },
  cityOptionText: { fontSize: 16, fontWeight: "600" },
});