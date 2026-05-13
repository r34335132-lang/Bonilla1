import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
import { CameraView, useCameraPermissions } from 'expo-camera';

// --- TABLA DE DISTANCIAS APROXIMADAS (EN KM) ---
const DISTANCES_KM: Record<string, number> = {
  "Durango": 0,
  "Nombre de Dios": 55,
  "Vicente Guerrero": 90,
  "Sombrerete": 130,
  "San José de Fénix": 150,
  "Sain Alto": 175,
  "Río Florido": 210,
  "Fresnillo": 235,
  "Calera": 265,
  "Zacatecas": 290,
  "Aguascalientes": 410,
  "San Juan de los Lagos": 490,
  "Guadalajara": 630
};

// COSTO POR KILÓMETRO RECORRIDO
const PRICE_PER_KM = 16; 

type AdminTab = "dashboard" | "trips" | "paqueteria" | "fans" | "scanner";

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, role } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  
  // Estados Generales
  const [users, setUsers] = useState<any[]>([]);
  const [tripsList, setTripsList] = useState<any[]>([]);
  const [parcels, setParcels] = useState<any[]>([]); 
  const [routePrices, setRoutePrices] = useState<any[]>([]); // NUEVO: Para guardar el tarifario global
  const [loading, setLoading] = useState(false);

  // Estados Escáner QR
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // --- ESTADOS PARA LISTA DE PASAJEROS (MANIFIESTO) ---
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);
  const [tripPassengers, setTripPassengers] = useState<any[]>([]);
  const [loadingPassengers, setLoadingPassengers] = useState(false);

  // --- ESTADOS PARA VENTA RÁPIDA ---
  const [showSellModal, setShowSellModal] = useState(false); 
  const [showGlobalSellModal, setShowGlobalSellModal] = useState(false); 
  const [isSelling, setIsSelling] = useState(false);
  const [sellForm, setSellForm] = useState({
    tripId: "", tripLabel: "", tripPrice: 0,
    name: "", seat: "", type: "normal", takeCommission: true, 
    sellOrigin: "Durango", sellDest: "Guadalajara"
  });

  // Estados Crear Viaje / Paquetería
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [tripForm, setTripForm] = useState({ date: "", departure_time: "", arrival_time: "", price: "500", total_seats: "40", bus_type: "Primera Clase" });
  const [isCreatingParcel, setIsCreatingParcel] = useState(false);
  const [parcelForm, setParcelForm] = useState({ sender: "", receiver: "", origin: "Durango", destination: "Guadalajara", price: "" });
  
  // Manejador UNIFICADO para listas
  const [pickerType, setPickerType] = useState<"origin" | "destination" | "sellOrigin" | "sellDest" | "sellTrip" | null>(null);

  useEffect(() => {
    if (role === "admin" || role === "supervisor") {
      if (role === "admin") fetchUsers(); 
      fetchTrips(); 
      fetchParcels(); 
      fetchRoutePrices(); // Cargamos el tarifario al iniciar
    }
  }, [role]);

  // --- FUNCIONES DE BASE DE DATOS ---
  const fetchUsers = async () => { try { const { data } = await supabase.from("profiles").select("id, name, email, is_fan").order("name"); setUsers(data || []); } catch (error) {} };
  const fetchTrips = async () => { setLoading(true); try { const { data } = await supabase.from("trips").select("*").order("date", { ascending: true }); setTripsList(data || []); } catch (error) {} finally { setLoading(false); } };
  const fetchParcels = async () => { try { const { data } = await supabase.from("parcels").select("*").order("created_at", { ascending: false }); setParcels(data || []); } catch (error) {} };
  
  // NUEVO: Traer el tarifario para usarlo en la app móvil
  const fetchRoutePrices = async () => {
    try {
      const { data } = await supabase.from('route_prices').select('*');
      if (data) setRoutePrices(data);
    } catch (error) {}
  };

  const fetchPassengersForTrip = async (tripId: string) => {
    setLoadingPassengers(true);
    try {
      const { data, error } = await supabase.from('bookings').select('*').eq('trip_id', tripId).order('passenger_name', { ascending: true });
      if (error) throw error;
      setTripPassengers(data || []);
    } catch (error: any) { Alert.alert("Error", "No se pudieron cargar los pasajeros."); } finally { setLoadingPassengers(false); }
  };

  const handleManualBoarding = async (bookingId: string, passengerName: string) => {
    Alert.alert("Confirmar Abordaje", `¿Marcar a ${passengerName} como ABORDADO manualmente?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Sí, abordar", onPress: async () => {
          try {
            const { error } = await supabase.from('bookings').update({ status: 'boarded' }).eq('id', bookingId);
            if (error) throw error;
            setTripPassengers(prev => prev.map(p => p.id === bookingId ? { ...p, status: 'boarded' } : p));
          } catch (err: any) { Alert.alert("Error", "No se pudo actualizar el estado."); }
        }
      }
    ]);
  };

  // --- CÁLCULO DE DISTANCIA (X KILOMETRO) ---
  const calculateDistancePrice = () => {
    const kmOrigin = DISTANCES_KM[sellForm.sellOrigin] || 0;
    const kmDest = DISTANCES_KM[sellForm.sellDest] || 0;
    const totalKm = Math.abs(kmDest - kmOrigin);
    const price = Math.round(totalKm * PRICE_PER_KM);
    return { km: totalKm, price: price > 0 ? price : 50 }; // $50 mínimo
  };

  // --- OBTENER PRECIO EXACTO DEL TARIFARIO WEB ---
  const getExactPrice = (origin: string, dest: string, fallback: number) => {
    if (!routePrices || routePrices.length === 0) return fallback;
    const route = routePrices.find(p => 
      (p.origin === origin && p.destination === dest) || 
      (p.origin === dest && p.destination === origin)
    );
    return route && route.price_one_way ? Number(route.price_one_way) : fallback;
  };

  // --- FUNCIÓN UNIFICADA DE VENTA RÁPIDA ---
  const executeSell = async (isGlobal: boolean) => {
    const tId = isGlobal ? sellForm.tripId : selectedTrip?.id;
    const tPrice = isGlobal ? sellForm.tripPrice : selectedTrip?.price;

    if (!tId) return Alert.alert("Error", "Debes seleccionar a qué viaje se subirá el pasajero.");
    if (!sellForm.name.trim()) return Alert.alert("Error", "Ingresa el nombre del pasajero.");
    if (sellForm.sellOrigin === sellForm.sellDest) {
      return Alert.alert("Error", "El origen y el destino no pueden ser iguales.");
    }
    
    setIsSelling(true);
    try {
      // 1. Calculamos ambas opciones (Tarifario Normal vs Por Distancia)
      const distInfo = calculateDistancePrice();
      const exactNormalPrice = getExactPrice(sellForm.sellOrigin, sellForm.sellDest, tPrice);
      
      // 2. Elegimos la que haya seleccionado el supervisor en el UI
      const finalPrice = sellForm.type === 'distancia' ? distInfo.price : exactNormalPrice;
      const finalCommission = sellForm.takeCommission ? 100 : 0;
      const bookingRef = "BT-" + Math.floor(100000 + Math.random() * 900000).toString().slice(0, 6);

      const passOrigin = sellForm.sellOrigin;
      const passDest = sellForm.sellDest;

      const { error } = await supabase.from('bookings').insert({
        booking_ref: bookingRef, trip_id: tId, passenger_name: sellForm.name, passenger_email: "venta_rapida@bonillatours.com", passenger_phone: "0000000000", payment_method: "cash", status: "boarded", is_guest: true, total_price: finalPrice, origin: passOrigin, destination: passDest, seats: sellForm.seat ? [Number(sellForm.seat)] : [], commission_amount: finalCommission, is_distance_ticket: sellForm.type === 'distancia'
      });

      if (error) throw error;

      Alert.alert("¡Venta Exitosa!", `Se vendió boleto a ${sellForm.name} por $${finalPrice}.\nComisión retenida: $${finalCommission}`);
      
      if (isGlobal) { setShowGlobalSellModal(false); fetchTrips(); } 
      else { setShowSellModal(false); fetchPassengersForTrip(tId); }
      
      setSellForm({ tripId: "", tripLabel: "", tripPrice: 0, name: "", seat: "", type: "normal", takeCommission: true, sellOrigin: "Durango", sellDest: "Guadalajara" });
    } catch (err: any) { Alert.alert("Error de Venta", err.message); } finally { setIsSelling(false); }
  };

  const handleCreateTrip = async () => {
    if (role !== "admin") return;
    if (!tripForm.date || !tripForm.departure_time || !tripForm.arrival_time || !tripForm.price || !tripForm.total_seats) return Alert.alert("Incompleto", "Llena todos los campos.");
    setIsCreatingTrip(true);
    try {
      const { error } = await supabase.from("trips").insert({
        origin: BONILLA_ROUTE[0], destination: BONILLA_ROUTE[BONILLA_ROUTE.length - 1], date: tripForm.date, departure_time: tripForm.departure_time, arrival_time: tripForm.arrival_time, duration: "Aprox 8h", price: Number(tripForm.price), total_seats: Number(tripForm.total_seats), available_seats: Number(tripForm.total_seats), occupied_seats: [], bus_type: tripForm.bus_type, amenities: ["WiFi", "A/C", "WC"],
      });
      if (error) throw error;
      Alert.alert("¡Éxito!", "Viaje creado correctamente.");
      setTripForm({ ...tripForm, date: "", departure_time: "", arrival_time: "" }); fetchTrips(); 
    } catch (error: any) { Alert.alert("Error", error.message); } finally { setIsCreatingTrip(false); }
  };

  const handleCreateParcel = async () => {
    if (role !== "admin") return;
    if (!parcelForm.sender || !parcelForm.receiver || !parcelForm.price) return Alert.alert("Error", "Llena todos los campos.");
    setIsCreatingParcel(true);
    try {
      const { error } = await supabase.from('parcels').insert({ sender_name: parcelForm.sender, receiver_name: parcelForm.receiver, origin: parcelForm.origin, destination: parcelForm.destination, price: Number(parcelForm.price), status: 'pending' });
      if (error) throw error;
      Alert.alert("¡Éxito!", "Paquete registrado.");
      setParcelForm({ ...parcelForm, sender: '', receiver: '', price: '' }); fetchParcels(); 
    } catch (err: any) { Alert.alert("Error", err.message); } finally { setIsCreatingParcel(false); }
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string, data: string }) => {
    setScanned(true);
    try {
      const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(data);
      let query = supabase.from('bookings').select('*, trips(origin, destination, date)');
      if (isUUID) query = query.eq('id', data); else query = query.eq('booking_ref', data);

      const { data: booking, error: fetchError } = await query.single();
      if (fetchError || !booking) throw new Error("No se encontró el boleto.");
      if (booking.status === 'boarded') return Alert.alert("Atención ⚠️", "El boleto ya está ABORDADO.", [{ text: "Aceptar", onPress: () => setScanned(false) }]);

      const { error: updateError } = await supabase.from('bookings').update({ status: 'boarded' }).eq('id', booking.id);
      if (updateError) throw updateError;
      Alert.alert("¡Acceso Permitido! ✅", `Pasajero: ${booking.passenger_name}\nRegistrado como ABORDADO.`, [{ text: "Continuar", onPress: () => setScanned(false) }]);
    } catch (err: any) { Alert.alert("Error", err.message || "No se pudo procesar.", [{ text: "Intentar de nuevo", onPress: () => setScanned(false) }]); }
  };

  const toggleFanStatus = async (userId: string, currentStatus: boolean) => {
    if (role !== "admin") return; 
    try {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_fan: !currentStatus } : u)));
      await supabase.from("profiles").update({ is_fan: !currentStatus }).eq("id", userId);
    } catch (error: any) { Alert.alert("Error", error.message); fetchUsers(); }
  };

  // --- RENDERIZADO DEL FORMULARIO Y SELECTORES (REUTILIZABLE) ---
  const renderSellModalContent = (isGlobal: boolean) => {
    const distInfo = calculateDistancePrice();
    const baseP = isGlobal ? sellForm.tripPrice : (selectedTrip?.price || 0);
    const exactNormalPrice = getExactPrice(sellForm.sellOrigin, sellForm.sellDest, baseP);

    // Si el selector está activo, REEMPLAZA el formulario temporalmente
    if (['sellTrip', 'sellOrigin', 'sellDest'].includes(pickerType || '')) {
      return (
        <View style={{ height: 450 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '800' }}>{pickerType === 'sellTrip' ? 'Seleccionar Viaje' : 'Selecciona Parada'}</Text>
            <TouchableOpacity onPress={() => setPickerType(null)}><Feather name="x" size={24} color="#666" /></TouchableOpacity>
          </View>
          <FlatList
            data={pickerType === 'sellTrip' ? tripsList : BONILLA_ROUTE}
            keyExtractor={item => pickerType === 'sellTrip' ? item.id : item}
            ListEmptyComponent={<Text style={{textAlign:'center', marginTop:20, color:'#666'}}>Aún no hay viajes programados.</Text>}
            renderItem={({item}) => {
              if (pickerType === 'sellTrip') {
                const isSel = item.id === sellForm.tripId;
                return (
                  <TouchableOpacity style={[styles.cityOption, isSel && {backgroundColor: colors.secondary}]} onPress={() => {
                      setSellForm({...sellForm, tripId: item.id, tripLabel: `${item.departure_time} - ${item.origin} a ${item.destination}`, tripPrice: item.price, sellOrigin: item.origin, sellDest: item.destination});
                      setPickerType(null);
                  }}>
                    <View>
                      <Text style={{fontWeight:'800', fontSize:16}}>{item.departure_time} hrs • {item.date}</Text>
                      <Text style={{fontSize:13, color:'#666'}}>{item.origin} a {item.destination}</Text>
                    </View>
                    {isSel && <Feather name="check" size={20} color={colors.primary}/>}
                  </TouchableOpacity>
                )
              }
              const isSel = (pickerType === 'sellOrigin' && item === sellForm.sellOrigin) || (pickerType === 'sellDest' && item === sellForm.sellDest);
              return (
                <TouchableOpacity style={[styles.cityOption, isSel && {backgroundColor: colors.secondary}]} onPress={() => {
                  if (pickerType === 'sellOrigin') setSellForm({...sellForm, sellOrigin: item});
                  if (pickerType === 'sellDest') setSellForm({...sellForm, sellDest: item});
                  setPickerType(null);
                }}>
                  <Text style={{fontSize: 16, fontWeight: '600', color: isSel ? colors.primary : '#000'}}>{item}</Text>
                  {isSel && <Feather name="check" size={20} color={colors.primary}/>}
                </TouchableOpacity>
              )
            }}
          />
        </View>
      )
    }

    // SI NO HAY SELECTOR, MUESTRA EL FORMULARIO
    return (
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: '800' }}>{isGlobal ? 'Taquilla Rápida' : 'Venta Local'}</Text>
          <TouchableOpacity onPress={() => { isGlobal ? setShowGlobalSellModal(false) : setShowSellModal(false); setPickerType(null); }}><Feather name="x" size={24} color="#666" /></TouchableOpacity>
        </View>

        <View style={{ gap: 12 }}>
          {isGlobal && (
            <View>
              <Text style={styles.labelModal}>1. Seleccionar Autobús/Viaje</Text>
              <TouchableOpacity style={[styles.inputModal, {justifyContent:'center', borderWidth:1, borderColor:'#cbd5e1'}]} onPress={() => setPickerType('sellTrip')}>
                <Text style={{fontWeight: sellForm.tripLabel ? '700' : '500', color: sellForm.tripLabel ? '#0f172a' : '#94a3b8'}}>{sellForm.tripLabel || "Toca para elegir de la lista..."}</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 2 }}>
              <Text style={styles.labelModal}>{isGlobal ? '2.' : ''} Pasajero</Text>
              <TextInput style={styles.inputModal} value={sellForm.name} onChangeText={t => setSellForm({...sellForm, name: t})} placeholder="Ej. Juan Pérez" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.labelModal}>Asiento</Text>
              <TextInput style={styles.inputModal} value={sellForm.seat} onChangeText={t => setSellForm({...sellForm, seat: t})} keyboardType="numeric" placeholder="#" />
            </View>
          </View>

          {/* RUTA DEL PASAJERO: SIEMPRE VISIBLE */}
          <View>
            <Text style={styles.labelModal}>{isGlobal ? '3.' : ''} Ruta del Pasajero</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.labelModal, {fontSize: 9}]}>Sube en:</Text>
                <TouchableOpacity style={[styles.inputModal, {height: 40, justifyContent: 'center'}]} onPress={() => setPickerType('sellOrigin')}>
                  <Text style={{fontSize: 12, fontWeight: '600'}}>{sellForm.sellOrigin}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.labelModal, {fontSize: 9}]}>Baja en:</Text>
                <TouchableOpacity style={[styles.inputModal, {height: 40, justifyContent: 'center'}]} onPress={() => setPickerType('sellDest')}>
                  <Text style={{fontSize: 12, fontWeight: '600'}}>{sellForm.sellDest}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* TIPO DE COBRO (Usa los datos de arriba para calcular precio) */}
          <View>
            <Text style={styles.labelModal}>{isGlobal ? '4.' : ''} Tipo de Cobro</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={[styles.inputModal, { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: sellForm.type === 'normal' ? '#f0f9ff' : '#f8fafc' }]} onPress={() => setSellForm({...sellForm, type: 'normal'})}>
                <Text style={{ fontWeight: '700', color: sellForm.type === 'normal' ? '#0369a1' : '#94a3b8' }}>Normal (${exactNormalPrice})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.inputModal, { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: sellForm.type === 'distancia' ? '#fff7ed' : '#f8fafc' }]} onPress={() => setSellForm({...sellForm, type: 'distancia'})}>
                <Text style={{ fontWeight: '700', color: sellForm.type === 'distancia' ? '#c2410c' : '#94a3b8' }}>Por Distancia</Text>
              </TouchableOpacity>
            </View>
          </View>

          {sellForm.type === 'distancia' && (
            <View style={{ backgroundColor: '#fff7ed', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: '#ffedd5', marginTop: 4 }}>
              <Text style={{fontSize: 13, fontWeight: '800', textAlign: 'center', color: '#ea580c'}}>
                {distInfo.km} Km recorridos = Cobrar ${distInfo.price} MXN
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginTop: 4 }}>
            <View style={{flex: 1}}>
              <Text style={{ fontWeight: '700', color: '#0f172a' }}>Retener Comisión ($100)</Text>
              <Text style={{ fontSize: 11, color: '#64748b' }}>Ganancia directa del supervisor.</Text>
            </View>
            <Switch value={sellForm.takeCommission} onValueChange={v => setSellForm({...sellForm, takeCommission: v})} trackColor={{ false: "#cbd5e1", true: colors.primary }} />
          </View>

          <TouchableOpacity style={{ backgroundColor: '#10b981', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 }} onPress={() => executeSell(isGlobal)} disabled={isSelling || (isGlobal && !sellForm.tripId)}>
            {isSelling ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Finalizar Venta e Ingresar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const totalSeats = tripsList.reduce((acc, trip) => acc + trip.total_seats, 0);
  const availableSeats = tripsList.reduce((acc, trip) => acc + trip.available_seats, 0);
  const soldSeats = totalSeats - availableSeats;
  const salesPercentage = totalSeats === 0 ? 0 : Math.round((soldSeats / totalSeats) * 100);

  if (role !== "admin" && role !== "supervisor") {
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
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>
          {role === "admin" ? "Panel Admin" : "Panel Supervisor"}
        </Text>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          <TouchableOpacity style={[styles.tab, activeTab === "dashboard" && { backgroundColor: colors.primary }]} onPress={() => setActiveTab("dashboard")}>
            <Feather name="pie-chart" size={16} color={activeTab === "dashboard" ? "#fff" : colors.mutedForeground} />
            <Text style={[styles.tabText, { color: activeTab === "dashboard" ? "#fff" : colors.mutedForeground }]}>Métricas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === "trips" && { backgroundColor: colors.primary }]} onPress={() => setActiveTab("trips")}>
            <Feather name="truck" size={16} color={activeTab === "trips" ? "#fff" : colors.mutedForeground} />
            <Text style={[styles.tabText, { color: activeTab === "trips" ? "#fff" : colors.mutedForeground }]}>Viajes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === "paqueteria" && { backgroundColor: colors.primary }]} onPress={() => setActiveTab("paqueteria")}>
            <Feather name="package" size={16} color={activeTab === "paqueteria" ? "#fff" : colors.mutedForeground} />
            <Text style={[styles.tabText, { color: activeTab === "paqueteria" ? "#fff" : colors.mutedForeground }]}>Paquetería</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === "scanner" && { backgroundColor: colors.primary }]} onPress={() => setActiveTab("scanner")}>
            <Feather name="maximize" size={16} color={activeTab === "scanner" ? "#fff" : colors.mutedForeground} />
            <Text style={[styles.tabText, { color: activeTab === "scanner" ? "#fff" : colors.mutedForeground }]}>Escáner QR</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* DASHBOARD */}
      {activeTab === "dashboard" && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={[styles.card, { backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20, paddingVertical: 24 }]} onPress={() => setShowGlobalSellModal(true)}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 100 }}><Feather name="dollar-sign" size={28} color="#fff" /></View>
            <View>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>Vender Boleto Rápido</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' }}>Selecciona un viaje y da acceso</Text>
            </View>
          </TouchableOpacity>

           <View style={styles.statsRow}>
            {role === "admin" && (
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="users" size={24} color={colors.primary} style={{marginBottom: 8}}/><Text style={[styles.statValue, { color: colors.foreground }]}>{users.length}</Text><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Usuarios Totales</Text>
              </View>
            )}
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="truck" size={24} color="#B8860B" style={{marginBottom: 8}}/><Text style={[styles.statValue, { color: colors.foreground }]}>{tripsList.length}</Text><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Viajes Programados</Text>
            </View>
          </View>
          
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground, marginBottom: 16 }]}>Rendimiento de Asientos</Text>
            <View style={styles.barContainer}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
                <Text style={{color: colors.mutedForeground, fontWeight: '600'}}>Ocupación Total</Text><Text style={{color: colors.foreground, fontWeight: '800'}}>{salesPercentage}%</Text>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: colors.muted }]}>
                <View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: `${salesPercentage}%` }]} />
              </View>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 8}}>
                <Text style={{color: colors.mutedForeground, fontSize: 12}}>{soldSeats} vendidos</Text><Text style={{color: colors.mutedForeground, fontSize: 12}}>{availableSeats} libres</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* VIAJES Y MANIFIESTO */}
      {activeTab === "trips" && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {role === "admin" && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 16 }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}><Feather name="plus-circle" size={20} color={colors.primary} /></View>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Crear Nueva Salida</Text>
              </View>
              <View style={styles.form}>
                <View style={styles.row}>
                  <View style={styles.inputWrap}><Text style={[styles.label, { color: colors.foreground }]}>Fecha (YYYY-MM-DD)</Text><TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]} value={tripForm.date} onChangeText={(v) => setTripForm({ ...tripForm, date: v })} placeholder="Ej. 2026-12-25" placeholderTextColor={colors.mutedForeground} /></View>
                  <View style={styles.inputWrap}><Text style={[styles.label, { color: colors.foreground }]}>Hora Salida</Text><TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]} value={tripForm.departure_time} onChangeText={(v) => setTripForm({ ...tripForm, departure_time: v })} placeholder="Ej. 20:00" placeholderTextColor={colors.mutedForeground} /></View>
                </View>
                <View style={styles.row}>
                  <View style={styles.inputWrap}><Text style={[styles.label, { color: colors.foreground }]}>Hora Llegada</Text><TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]} value={tripForm.arrival_time} onChangeText={(v) => setTripForm({ ...tripForm, arrival_time: v })} placeholder="Ej. 06:00" placeholderTextColor={colors.mutedForeground} /></View>
                  <View style={styles.inputWrap}><Text style={[styles.label, { color: colors.foreground }]}>Asientos</Text><TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]} value={tripForm.total_seats} onChangeText={(v) => setTripForm({ ...tripForm, total_seats: v })} keyboardType="numeric" /></View>
                </View>
                <View style={styles.row}>
                  <View style={styles.inputWrap}><Text style={[styles.label, { color: colors.foreground }]}>Precio Base ($)</Text><TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]} value={tripForm.price} onChangeText={(v) => setTripForm({ ...tripForm, price: v })} keyboardType="numeric" /></View>
                  <View style={styles.inputWrap}><Text style={[styles.label, { color: colors.foreground }]}>Autobús</Text><TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]} value={tripForm.bus_type} onChangeText={(v) => setTripForm({ ...tripForm, bus_type: v })} placeholder="Ej. Primera" placeholderTextColor={colors.mutedForeground} /></View>
                </View>
                <AppButton title="Crear Viaje" onPress={handleCreateTrip} loading={isCreatingTrip} />
              </View>
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Viajes Programados (Ver Pasajeros)</Text>
          {loading ? <ActivityIndicator color={colors.primary} /> : (
            tripsList.map((trip) => (
              <TouchableOpacity key={trip.id} style={[styles.tripItem, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {
                  setSelectedTrip(trip);
                  setSellForm(prev => ({...prev, sellOrigin: trip.origin, sellDest: trip.destination}));
                  fetchPassengersForTrip(trip.id);
                }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tripDate, { color: colors.foreground }]}>{trip.date} • {trip.departure_time}</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{trip.origin} - {trip.destination}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: colors.primary, fontWeight: '800' }}>${trip.price}</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{trip.available_seats} asnt. libres</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* PAQUETERIA */}
      {activeTab === "paqueteria" && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {role === "admin" && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: "#FFF3CD" }]}><Feather name="package" size={20} color="#E67E22" /></View>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Registrar Paquete</Text>
              </View>
              <View style={styles.form}>
                <View style={styles.inputWrap}><Text style={[styles.label, { color: colors.foreground }]}>Remitente (Envía)</Text><TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]} value={parcelForm.sender} onChangeText={(v) => setParcelForm({ ...parcelForm, sender: v })} placeholder="Nombre completo" /></View>
                <View style={styles.inputWrap}><Text style={[styles.label, { color: colors.foreground }]}>Destinatario (Recibe)</Text><TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]} value={parcelForm.receiver} onChangeText={(v) => setParcelForm({ ...parcelForm, receiver: v })} placeholder="Nombre completo" /></View>
                <View style={styles.row}>
                  <View style={styles.inputWrap}>
                    <Text style={[styles.label, { color: colors.foreground }]}>Origen</Text>
                    <TouchableOpacity style={[styles.input, { backgroundColor: colors.muted, justifyContent: 'center' }]} onPress={() => setPickerType('origin')}>
                      <Text style={{ color: colors.foreground, fontWeight: "500" }}>{parcelForm.origin}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inputWrap}>
                    <Text style={[styles.label, { color: colors.foreground }]}>Destino</Text>
                    <TouchableOpacity style={[styles.input, { backgroundColor: colors.muted, justifyContent: 'center' }]} onPress={() => setPickerType('destination')}>
                      <Text style={{ color: colors.foreground, fontWeight: "500" }}>{parcelForm.destination}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.inputWrap}><Text style={[styles.label, { color: colors.foreground }]}>Costo de Envío ($)</Text><TextInput style={[styles.input, { backgroundColor: colors.muted, color: "#E67E22", fontWeight: 'bold' }]} value={parcelForm.price} onChangeText={(v) => setParcelForm({ ...parcelForm, price: v })} keyboardType="numeric" placeholder="0.00" /></View>
                <TouchableOpacity style={[styles.createBtn, { backgroundColor: "#E67E22" }]} onPress={handleCreateParcel} disabled={isCreatingParcel}>
                  {isCreatingParcel ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>Generar Folio y Cobrar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: role === "admin" ? 24 : 0 }]}>Historial de Envíos</Text>
          {loading ? <ActivityIndicator color={colors.primary} /> : (
            parcels.length === 0 ? (
              <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 20 }}>No hay paquetes registrados.</Text>
            ) : (
              parcels.map((p) => (
                <View key={p.id} style={[styles.tripItem, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'flex-start' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tripDate, { color: "#E67E22" }]}>PAQ-{p.id ? p.id.slice(0,6).toUpperCase() : p.folio}</Text>
                    <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '700' }}>{p.origin} a {p.destination}</Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 4 }}>De: {p.sender_name}</Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Para: {p.receiver_name}</Text>
                  </View>
                  <View style={{ justifyContent: 'center', height: '100%' }}>
                    <Text style={{ color: colors.foreground, fontWeight: '900', fontSize: 18 }}>${p.price}</Text>
                  </View>
                </View>
              ))
            )
          )}
        </ScrollView>
      )}

      {/* ESCANER */}
      {activeTab === "scanner" && (
        <View style={{ flex: 1, padding: 20 }}>
          {!permission?.granted ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: colors.foreground, marginBottom: 16, textAlign: 'center', fontSize: 16 }}>Se requiere acceso a la cámara.</Text>
              <AppButton title="Conceder Permiso" onPress={requestPermission} />
            </View>
          ) : (
            <View style={{ flex: 1, borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: colors.border }}>
              <CameraView style={StyleSheet.absoluteFillObject} facing="back" onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} />
            </View>
          )}
        </View>
      )}

      {/* --- 1. MODAL DE LISTA DE PASAJEROS (MANIFIESTO) --- */}
      <Modal visible={!!selectedTrip} animationType="slide" onRequestClose={() => setSelectedTrip(null)}>
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
          <View style={[styles.modalHeaderFullScreen, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setSelectedTrip(null)} style={{ padding: 8 }}><Feather name="chevron-left" size={28} color={colors.foreground} /></TouchableOpacity>
            <Text style={[styles.screenTitle, { color: colors.foreground, fontSize: 18, flex: 1, textAlign: 'center' }]}>Lista de Pasajeros</Text>
            <View style={{ width: 44 }} /> 
          </View>

          {selectedTrip && (
            <View style={{ padding: 20, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ color: colors.primary, fontWeight: '900', fontSize: 18, marginBottom: 12 }}>
                {selectedTrip.origin} a {selectedTrip.destination}
              </Text>
              <TouchableOpacity style={styles.sellBtn} onPress={() => setShowSellModal(true)}>
                <Feather name="dollar-sign" size={18} color="#fff" />
                <Text style={styles.sellBtnText}>Vender Boleto Rápido</Text>
              </TouchableOpacity>
            </View>
          )}

          {loadingPassengers ? (
            <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={tripPassengers}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 20 }}
              ListEmptyComponent={<View style={{ alignItems: 'center', marginTop: 40 }}><Feather name="info" size={48} color={colors.mutedForeground} style={{ marginBottom: 16 }} /><Text style={{ color: colors.mutedForeground, fontSize: 16, textAlign: 'center' }}>Aún no hay boletos vendidos.</Text></View>}
              renderItem={({ item }) => {
                const isBoarded = item.status === 'boarded';
                return (
                  <View style={[styles.passengerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.foreground, fontWeight: '800', fontSize: 16, marginBottom: 4 }}>{item.passenger_name}</Text>
                      {item.is_distance_ticket && (
                        <Text style={{ color: '#E67E22', fontSize: 11, fontWeight: 'bold', marginBottom: 2 }}>Viaje corto: {item.origin} a {item.destination}</Text>
                      )}
                      <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Asientos: <Text style={{ fontWeight: 'bold', color: colors.foreground }}>{item.seats.join(', ') || 'N/A'}</Text></Text>
                      <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }}>Ref: {item.booking_ref}</Text>
                    </View>
                    {isBoarded ? (
                      <View style={[styles.statusBadge, { backgroundColor: '#10b981' }]}><Text style={styles.statusBadgeText}>ABORDÓ</Text></View>
                    ) : (
                      <TouchableOpacity style={[styles.statusBadge, { backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 16 }]} onPress={() => handleManualBoarding(item.id, item.passenger_name)}>
                        <Text style={[styles.statusBadgeText, { fontSize: 13 }]}>DAR ACCESO</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
          )}
        </View>
      </Modal>

      {/* --- 2. MODAL GLOBAL DE VENTA RÁPIDA --- */}
      <Modal visible={showGlobalSellModal} transparent animationType="fade" onRequestClose={() => {setShowGlobalSellModal(false); setPickerType(null);}}>
        <View style={styles.sellModalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.sellModalContent}>
              {renderSellModalContent(true)}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* --- 3. MODAL LOCAL DE VENTA RÁPIDA --- */}
      <Modal visible={showSellModal} transparent animationType="fade" onRequestClose={() => {setShowSellModal(false); setPickerType(null);}}>
        <View style={styles.sellModalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.sellModalContent}>
              {renderSellModalContent(false)}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* --- 4. MODAL EXTERNO DE PAQUETERÍA (Solo origen/destino) --- */}
      <Modal visible={pickerType === 'origin' || pickerType === 'destination'} transparent={true} animationType="slide" onRequestClose={() => setPickerType(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, paddingBottom: insets.bottom || 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Selecciona la ciudad</Text>
              <TouchableOpacity onPress={() => setPickerType(null)} style={styles.modalCloseBtn}><Feather name="x" size={24} color={colors.foreground} /></TouchableOpacity>
            </View>
            <FlatList
              data={BONILLA_ROUTE}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = item === (pickerType === "origin" ? parcelForm.origin : parcelForm.destination);
                return (
                  <TouchableOpacity
                    style={[styles.cityOption, { borderBottomColor: colors.border }, isSelected && { backgroundColor: colors.secondary }]}
                    onPress={() => {
                      if (pickerType === "origin") setParcelForm({...parcelForm, origin: item});
                      if (pickerType === "destination") setParcelForm({...parcelForm, destination: item});
                      setPickerType(null);
                    }}
                  >
                    <Text style={[styles.cityOptionText, { color: isSelected ? colors.primary : colors.foreground }]}>{item}</Text>
                    {isSelected && <Feather name="check" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, zIndex: 10 },
  screenTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  title: { fontSize: 20, fontWeight: "700" },
  tabsContainer: { flexDirection: "row", padding: 16, gap: 12 },
  tab: { paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12 },
  tabText: { fontSize: 13, fontWeight: "700" },
  scrollContent: { padding: 16, paddingBottom: 100 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12 },
  
  // Dashboard & Cards
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, padding: 20, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '900' },
  statLabel: { fontSize: 12, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  barContainer: { marginTop: 8 },
  progressBarBg: { height: 12, borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 6 },
  card: { padding: 20, borderRadius: 24, borderWidth: 1, elevation: 2 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 18, fontWeight: "800" },
  form: { gap: 16 },
  row: { flexDirection: "row", gap: 12 },
  inputWrap: { flex: 1, gap: 6 },
  label: { fontSize: 12, fontWeight: "700", marginLeft: 4, textTransform: "uppercase", color: '#64748b' },
  input: { height: 50, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, fontWeight: "500" },
  createBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  createBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  // Lists
  tripItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  tripDate: { fontSize: 15, fontWeight: '900', marginBottom: 4 },
  userCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 1, gap: 12, marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  userName: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  userEmail: { fontSize: 13 },

  // Modals Globales
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "80%", paddingTop: 24, paddingHorizontal: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  modalCloseBtn: { padding: 4 },
  cityOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 18, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 12 },
  cityOptionText: { fontSize: 16, fontWeight: "600" },

  // Passenger Modal Styles
  modalHeaderFullScreen: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  passengerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusBadgeText: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },

  // Estilos para Venta Rápida
  sellBtn: { backgroundColor: '#10b981', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  sellBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  sellModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  sellModalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  inputModal: { backgroundColor: '#f1f5f9', height: 48, borderRadius: 12, paddingHorizontal: 16, fontSize: 14, fontWeight: "500", borderBottomWidth: 0 },
  labelModal: { fontSize: 11, fontWeight: "800", marginLeft: 4, marginBottom: 4, textTransform: "uppercase", color: '#475569' },

  // Scanner
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.4)" },
  scanTarget: { width: 250, height: 250, borderWidth: 2, borderColor: "#fff", borderRadius: 16, backgroundColor: "transparent" },
  scanText: { color: "#fff", marginTop: 24, fontSize: 16, fontWeight: "700", backgroundColor: "rgba(0,0,0,0.6)", padding: 8, borderRadius: 8 },
  scannedActions: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center" }
});