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

export default function PaqueteriaScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, guestInfo } = useAuth();
  
  const defaultName = user?.user_metadata?.name || user?.name || guestInfo?.name || "";

  const [senderName, setSenderName] = useState(defaultName);
  const [receiverName, setReceiverName] = useState("");
  const [origin, setOrigin] = useState("Durango");
  const [destination, setDestination] = useState("Guadalajara");
  
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [pickerType, setPickerType] = useState<"origin" | "destination" | null>(null);

  // --- CÁLCULO AUTOMÁTICO DE TARIFA PARA EL CLIENTE ---
  const calculatePrice = () => {
    const oOffset = ROUTE_OFFSETS[origin] || 0;
    const dOffset = ROUTE_OFFSETS[destination] || 0;
    const durationMins = Math.abs(dOffset - oOffset);
    
    // Formula: $100 base + $15 por cada 30 minutos de distancia
    const calculatedPrice = Math.max(100, Math.round(durationMins / 30) * 15);
    return calculatedPrice;
  };

  const currentPrice = calculatePrice();

  useEffect(() => {
    if (senderName.trim()) {
      fetchHistory();
    }
  }, []);

  const fetchHistory = async () => {
    if (!senderName.trim()) return;
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from('parcels')
        .select('*')
        .ilike('sender_name', `%${senderName.trim()}%`) // Busca paquetes con su nombre
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error("Error obteniendo historial:", err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleCreateParcel = async () => {
    if (!senderName.trim() || !receiverName.trim()) {
      Alert.alert("Incompleto", "Por favor ingresa tu nombre y el de la persona que recibe.");
      return;
    }
    if (origin === destination) {
      Alert.alert("Ruta inválida", "El origen y destino no pueden ser iguales.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from('parcels').insert({
        sender_name: senderName.trim(),
        receiver_name: receiverName.trim(),
        origin: origin,
        destination: destination,
        price: currentPrice,
        status: 'pending'
      });

      if (error) throw error;
      
      Alert.alert(
        "¡Envío Registrado!", 
        "Tu paquete ha sido pre-registrado. Preséntate en taquilla con tu paquete para pagar y generar tu guía oficial."
      );
      
      setReceiverName(""); 
      fetchHistory(); // Recargar la lista para que vea su nuevo folio
    } catch (err: any) {
      Alert.alert("Error", err.message || "Ocurrió un problema al registrar el envío.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCitySelect = (city: string) => {
    if (pickerType === "origin") setOrigin(city);
    if (pickerType === "destination") setDestination(city);
    setPickerType(null);
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20), backgroundColor: colors.card }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Envíos y Paquetería</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.infoBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="info" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            Ahorra tiempo pre-registrando tu paquete aquí. Obtén tu folio y preséntate en taquilla para el pago final.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: "#000" }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: "#FFF3CD" }]}>
              <Feather name="package" size={20} color="#E67E22" />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Nuevo Envío</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputWrap}>
              <Text style={[styles.label, { color: colors.foreground }]}>Remitente (Tú)</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]} value={senderName} onChangeText={setSenderName} placeholder="Tu nombre completo" placeholderTextColor={colors.mutedForeground} />
            </View>

            <View style={styles.inputWrap}>
              <Text style={[styles.label, { color: colors.foreground }]}>Destinatario (Quien recibe)</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]} value={receiverName} onChangeText={setReceiverName} placeholder="Nombre de quien recoge" placeholderTextColor={colors.mutedForeground} />
            </View>

            <View style={styles.row}>
              <View style={styles.inputWrap}>
                <Text style={[styles.label, { color: colors.foreground }]}>Origen</Text>
                <TouchableOpacity style={[styles.input, { backgroundColor: colors.muted, justifyContent: 'center' }]} onPress={() => setPickerType('origin')}>
                  <Text style={{ color: colors.foreground, fontWeight: "500" }}>{origin}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrap}>
                <Text style={[styles.label, { color: colors.foreground }]}>Destino</Text>
                <TouchableOpacity style={[styles.input, { backgroundColor: colors.muted, justifyContent: 'center' }]} onPress={() => setPickerType('destination')}>
                  <Text style={{ color: colors.foreground, fontWeight: "500" }}>{destination}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.priceBox, { backgroundColor: colors.secondary }]}>
              <View>
                <Text style={[styles.priceLabel, { color: colors.primary }]}>Tarifa Estimada</Text>
                <Text style={[styles.priceSub, { color: colors.primary }]}>Puede variar por volumen/peso</Text>
              </View>
              <Text style={[styles.priceValue, { color: colors.primary }]}>${currentPrice}</Text>
            </View>

            <AppButton title="Generar Folio de Envío" onPress={handleCreateParcel} loading={isLoading} />
          </View>
        </View>

        {history.length > 0 && (
          <View style={styles.historySection}>
            <Text style={[styles.historyTitle, { color: colors.foreground }]}>Tus envíos recientes</Text>
            {history.map((p) => (
              <View key={p.id} style={[styles.historyItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.historyFolio, { color: "#E67E22" }]}>PAQ-{p.folio}</Text>
                  <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '700' }}>{p.origin} a {p.destination}</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 4 }}>Para: {p.receiver_name}</Text>
                </View>
                <View style={{ justifyContent: 'center', alignItems: 'flex-end' }}>
                  <Text style={{ color: colors.foreground, fontWeight: '900', fontSize: 18 }}>${p.price}</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4 }}>
                    {p.status === 'pending' ? 'Por pagar' : 'En tránsito'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* MODAL PARA ORIGEN Y DESTINO */}
      <Modal visible={pickerType !== null} transparent={true} animationType="slide" onRequestClose={() => setPickerType(null)}>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, zIndex: 10 },
  screenTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  scroll: { padding: 20, paddingBottom: 100 },
  
  infoBanner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  infoText: { flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 20 },
  
  card: { padding: 20, borderRadius: 24, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 3 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 18, fontWeight: "800" },
  
  form: { gap: 16 },
  row: { flexDirection: "row", gap: 12 },
  inputWrap: { flex: 1, gap: 6 },
  label: { fontSize: 12, fontWeight: "700", marginLeft: 4, textTransform: "uppercase" },
  input: { height: 50, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, fontWeight: "500" },
  
  priceBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderRadius: 16, marginTop: 8 },
  priceLabel: { fontSize: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  priceSub: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  priceValue: { fontSize: 24, fontWeight: "900" },

  historySection: { marginTop: 32 },
  historyTitle: { fontSize: 18, fontWeight: "800", marginBottom: 16 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  historyFolio: { fontSize: 16, fontWeight: '900', marginBottom: 4 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "80%", paddingTop: 24, paddingHorizontal: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  modalCloseBtn: { padding: 4 },
  cityOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 18, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 12 },
  cityOptionText: { fontSize: 16, fontWeight: "600" },
});