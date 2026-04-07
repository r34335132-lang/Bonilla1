import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
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

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = "Email requerido";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Email inválido";
    if (!password) e.password = "Contraseña requerida";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)");
    } catch {
      Alert.alert("Error", "No se pudo iniciar sesión. Verifica tus datos e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20),
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topSection}>
          {/* BOTÓN DE ATRÁS */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.muted }]}
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={24} color={colors.foreground} />
          </TouchableOpacity>

          {/* LOGO ELEGANTE */}
          <View style={styles.logoWrapper}>
            <LinearGradient
              colors={[colors.primary, "#8B0000"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            >
              <Feather name="map" size={28} color="#fff" style={{ marginLeft: -2 }} />
            </LinearGradient>
          </View>

          {/* TEXTOS DE BIENVENIDA */}
          <Text style={[styles.title, { color: colors.foreground }]}>
            Bienvenido
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Inicia sesión para continuar tu viaje con Bonilla Tour's.
          </Text>
        </View>

        {/* FORMULARIO */}
        <View style={styles.formSection}>
          <Field
            icon="mail"
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            placeholder="tu@correo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            colors={colors}
          />
          <Field
            icon="lock"
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            placeholder="••••••••"
            secureTextEntry={!showPwd}
            colors={colors}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={styles.eyeBtn}>
                <Feather
                  name={showPwd ? "eye-off" : "eye"}
                  size={20}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
            }
          />

          <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")} style={styles.forgotPwd} activeOpacity={0.7}>
            <Text style={[styles.forgotPwdText, { color: colors.primary }]}>
              ¿Olvidaste tu contraseña?
            </Text>
          </TouchableOpacity>

          <View style={{ marginTop: 8 }}>
            <AppButton
              title="Iniciar Sesión"
              onPress={handleLogin}
              loading={loading}
            />
          </View>
        </View>

        {/* FOOTER ESPACIADO AL FONDO */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            ¿Aún no tienes cuenta?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.replace("/(auth)/register")} activeOpacity={0.7}>
            <Text style={[styles.link, { color: colors.primary }]}>
              Regístrate aquí
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// --- SUBCOMPONENTE DE CAMPO DE TEXTO PREMIUM ---

function Field({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  colors,
  rightIcon,
  icon,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  colors: any;
  rightIcon?: React.ReactNode;
  icon: any;
}) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.muted,
            borderColor: error ? colors.destructive : "transparent",
          },
        ]}
      >
        <Feather name={icon} size={18} color={colors.mutedForeground} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? "sentences"}
          autoCorrect={false}
        />
        {rightIcon}
      </View>
      {error ? (
        <Text style={[styles.error, { color: colors.destructive }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { 
    paddingHorizontal: 24, 
    flexGrow: 1,
    justifyContent: "space-between", // Empuja el footer hacia abajo
  },
  topSection: {
    alignItems: "flex-start",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  logoWrapper: {
    marginBottom: 24,
    shadowColor: "#8B0000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  logoGradient: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { 
    fontSize: 34, 
    fontWeight: "800", 
    letterSpacing: -1, 
    marginBottom: 10 
  },
  subtitle: { 
    fontSize: 16, 
    lineHeight: 24,
    fontWeight: "500",
    marginBottom: 40,
  },
  formSection: {
    gap: 20,
    flex: 1, // Ocupa el espacio del centro
  },
  
  // Field Styles
  fieldContainer: { width: "100%" },
  label: { fontSize: 13, fontWeight: "700", marginBottom: 8, marginLeft: 4, letterSpacing: 0.3 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: "500", height: "100%" },
  eyeBtn: { padding: 4 },
  error: { fontSize: 12, marginTop: 6, marginLeft: 4, fontWeight: "600" },
  
  forgotPwd: { alignSelf: "flex-end", marginTop: 4, marginBottom: 20 },
  forgotPwdText: { fontSize: 14, fontWeight: "700" },
  
  footer: { 
    flexDirection: "row", 
    justifyContent: "center", 
    paddingTop: 32,
    paddingBottom: 12,
  },
  footerText: { fontSize: 15, fontWeight: "500" },
  link: { fontSize: 15, fontWeight: "800" },
});