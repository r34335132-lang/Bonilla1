import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { BONILLA_ROUTE } from "@/utils/routeLogic";

type AdminTab = "dashboard" | "trips" | "fans";

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, role } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  
  // Estados Generales
  const [users, setUsers] = useState<any[]>([]);
  const [tripsList, setTripsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados para Crear Viaje (¡AHORA SÍ INCLUYE HORA DE LLEGADA!)
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [tripForm, setTripForm] = useState({
    date: "",
    departure_time: "",
    arrival_time: "", // <-- El culpable
    price: "500",
    total_seats: "40",
    bus_type: "Primera Clase",
  });

  useEffect(() => {
    if (role === "admin") {
      fetchUsers();
      fetchTrips();
    }
  }, [role]);

  // --- LÓGICA DE BASE DE DATOS ---
  const fetchUsers = async () => {
    try {
      const { data } = await supabase.from("profiles").select("id, name, email, is_fan").order("name");
      setUsers(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("trips").select("*").order("date", { ascending: true });
      setTripsList(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFanStatus = async (userId: string, currentStatus: boolean) => {
    try {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_fan: !currentStatus } : u)));
      const { error } = await supabase.from("profiles").update({ is_fan: !currentStatus }).eq("id", userId);
      if (error) throw error;
    } catch (error: any) {
      Alert.alert("Error", error.message);
      fetchUsers(); 
    }
  };

  const handleCreateTrip = async () => {
    // AHORA VALIDAMOS QUE TAMBIÉN LLENEN LA HORA DE LLEGADA
    if (!tripForm.date || !tripForm.departure_time || !tripForm.arrival_time || !tripForm.price || !tripForm.total_seats) {
      Alert.alert("Incompleto", "Llena todos los campos incluyendo la hora de llegada.");
      return;
    }

    setIsCreatingTrip(true);
    try {
      const { error } = await supabase.from("trips").insert({
        origin: BONILLA_ROUTE[0], 
        destination: BONILLA_ROUTE[BONILLA_ROUTE.length - 1], 
        date: tripForm.date,
        departure_time: tripForm.departure_time,
        arrival_time: tripForm.arrival_time, // <-- AHORA SÍ MANDAMOS UNA HORA REAL
        duration: "Aprox 8h",
        price: Number(tripForm.price),
        total_seats: Number(tripForm.total_seats),
        available_seats: Number(tripForm.total_seats), 
        occupied_seats: [],
        bus_type: tripForm.bus_type,
        amenities: ["WiFi", "A/C", "Asientos Reclinables", "WC"],
      });

      if (error) throw error;
      Alert.alert("¡Éxito!", "Viaje creado correctamente.");
      setTripForm({ ...tripForm, date: "", departure_time: "", arrival_time: "" }); 
      fetchTrips(); 
    } catch (error: any) {
      Alert.alert("Error al crear viaje", error.message);
    } finally {
      setIsCreatingTrip(false);
    }
  };

  // Cálculos para el Dashboard
  const totalSeats = tripsList.reduce((acc, trip) => acc + trip.total_seats, 0);
  const availableSeats = tripsList.reduce((acc, trip) => acc + trip.available_seats, 0);
  const soldSeats = totalSeats - availableSeats;
  const salesPercentage = totalSeats === 0 ? 0 : Math.round((soldSeats / totalSeats) * 100);

  if (role !== "admin") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Feather name="lock" size={48} color={colors.mutedForeground} />
        <Text style={[styles.title, { color: colors.foreground, marginTop: 16 }]}>Acceso Denegado</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 20, backgroundColor: colors.card }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Panel Admin</Text>
      </View>

      {/* TABS SELECTOR */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === "dashboard" && { backgroundColor: colors.primary }]} onPress={() => setActiveTab("dashboard")}>
          <Feather name="pie-chart" size={16} color={activeTab === "dashboard" ? "#fff" : colors.mutedForeground} />
          <Text style={[styles.tabText, { color: activeTab === "dashboard" ? "#fff" : colors.mutedForeground }]}>Métricas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === "trips" && { backgroundColor: colors.primary }]} onPress={() => setActiveTab("trips")}>
          <Feather name="truck" size={16} color={activeTab === "trips" ? "#fff" : colors.mutedForeground} />
          <Text style={[styles.tabText, { color: activeTab === "trips" ? "#fff" : colors.mutedForeground }]}>Viajes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === "fans" && { backgroundColor: colors.primary }]} onPress={() => setActiveTab("fans")}>
          <Feather name="star" size={16} color={activeTab === "fans" ? "#fff" : colors.mutedForeground} />
          <Text style={[styles.tabText, { color: activeTab === "fans" ? "#fff" : colors.mutedForeground }]}>Fans</Text>
        </TouchableOpacity>
      </View>

      {/* 1. CONTENIDO DASHBOARD */}
      {activeTab === "dashboard" && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Visión General</Text>
          
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="users" size={24} color={colors.primary} style={{marginBottom: 8}}/>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{users.length}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Usuarios Totales</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="truck" size={24} color="#B8860B" style={{marginBottom: 8}}/>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{tripsList.length}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Viajes Programados</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground, marginBottom: 16 }]}>Rendimiento de Asientos</Text>
            
            <View style={styles.barContainer}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
                <Text style={{color: colors.mutedForeground, fontWeight: '600'}}>Ocupación Total</Text>
                <Text style={{color: colors.foreground, fontWeight: '800'}}>{salesPercentage}%</Text>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: colors.muted }]}>
                <View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: `${salesPercentage}%` }]} />
              </View>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 8}}>
                <Text style={{color: colors.mutedForeground, fontSize: 12}}>{soldSeats} vendidos</Text>
                <Text style={{color: colors.mutedForeground, fontSize: 12}}>{availableSeats} libres</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* 2. CONTENIDO VIAJES */}
      {activeTab === "trips" && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
                <Feather name="plus-circle" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Crear Nueva Salida</Text>
            </View>
            
            <View style={styles.form}>
              <View style={styles.row}>
                <View style={styles.inputWrap}>
                  <Text style={[styles.label, { color: colors.foreground }]}>Fecha (YYYY-MM-DD)</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]} value={tripForm.date} onChangeText={(v) => setTripForm({ ...tripForm, date: v })} placeholder="Ej. 2026-12-25" placeholderTextColor={colors.mutedForeground} />
                </View>
                <View style={styles.inputWrap}>
                  <Text style={[styles.label, { color: colors.foreground }]}>Hora Salida</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]} value={tripForm.departure_time} onChangeText={(v) => setTripForm({ ...tripForm, departure_time: v })} placeholder="Ej. 20:00" placeholderTextColor={colors.mutedForeground} />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.inputWrap}>
                  <Text style={[styles.label, { color: colors.foreground }]}>Hora Llegada</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]} value={tripForm.arrival_time} onChangeText={(v) => setTripForm({ ...tripForm, arrival_time: v })} placeholder="Ej. 06:00" placeholderTextColor={colors.mutedForeground} />
                </View>
                <View style={styles.inputWrap}>
                  <Text style={[styles.label, { color: colors.foreground }]}>Asientos</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]} value={tripForm.total_seats} onChangeText={(v) => setTripForm({ ...tripForm, total_seats: v })} keyboardType="numeric" />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.inputWrap}>
                  <Text style={[styles.label, { color: colors.foreground }]}>Precio ($)</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]} value={tripForm.price} onChangeText={(v) => setTripForm({ ...tripForm, price: v })} keyboardType="numeric" />
                </View>
                <View style={styles.inputWrap}>
                  <Text style={[styles.label, { color: colors.foreground }]}>Autobús</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]} value={tripForm.bus_type} onChangeText={(v) => setTripForm({ ...tripForm, bus_type: v })} placeholder="Ej. Primera" placeholderTextColor={colors.mutedForeground} />
                </View>
              </View>

              <AppButton title="Crear Viaje" onPress={handleCreateTrip} loading={isCreatingTrip} />
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 16 }]}>Viajes Programados</Text>
          {loading ? <ActivityIndicator color={colors.primary} /> : (
            tripsList.map((trip) => (
              <View key={trip.id} style={[styles.tripItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tripDate, { color: colors.foreground }]}>{trip.date} • {trip.departure_time}</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{trip.origin} - {trip.destination}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: colors.primary, fontWeight: '800' }}>${trip.price}</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{trip.available_seats} asnt. libres</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* 3. CONTENIDO DE CLIENTES FAN */}
      {activeTab === "fans" && (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.scrollContent}
          renderItem={({ item }) => (
            <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.foreground }}>{item.name ? item.name.charAt(0).toUpperCase() : "V"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.userName, { color: colors.foreground }]}>{item.name || "Sin nombre"}</Text>
                <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{item.email}</Text>
              </View>
              <Switch value={item.is_fan} onValueChange={() => toggleFanStatus(item.id, item.is_fan)} trackColor={{ false: colors.muted, true: colors.secondary }} thumbColor={item.is_fan ? colors.primary : "#f4f3f4"} />
            </View>
          )}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, zIndex: 10 },
  screenTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  title: { fontSize: 20, fontWeight: "700" },
  tabsContainer: { flexDirection: "row", padding: 16, gap: 12 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12 },
  tabText: { fontSize: 13, fontWeight: "700" },
  scrollContent: { padding: 16, paddingBottom: 100 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12 },
  
  // Dashboard
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, padding: 20, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '900' },
  statLabel: { fontSize: 12, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  barContainer: { marginTop: 8 },
  progressBarBg: { height: 12, borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 6 },

  // Trip Form
  card: { padding: 20, borderRadius: 24, borderWidth: 1, elevation: 2 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 18, fontWeight: "800" },
  form: { gap: 16 },
  row: { flexDirection: "row", gap: 12 },
  inputWrap: { flex: 1, gap: 6 },
  label: { fontSize: 12, fontWeight: "700", marginLeft: 4, textTransform: "uppercase" },
  input: { height: 50, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, fontWeight: "500" },
  
  // Trip List
  tripItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  tripDate: { fontSize: 15, fontWeight: '700', marginBottom: 4 },

  // User Card
  userCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 1, gap: 12, marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  userName: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  userEmail: { fontSize: 13 },
});