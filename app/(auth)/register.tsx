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

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Nombre requerido";
    if (!form.email.trim()) e.email = "Email requerido";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Email inválido";
    if (!form.phone.trim()) e.phone = "Teléfono requerido";
    if (!form.password) e.password = "Contraseña requerida";
    else if (form.password.length < 6) e.password = "Mínimo 6 caracteres";
    if (form.password !== form.confirmPassword)
      e.confirmPassword = "Las contraseñas no coinciden";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.phone.trim(), form.password);
      router.replace("/(tabs)");
    } catch {
      Alert.alert("Error", "No se pudo crear la cuenta. Intenta de nuevo.");
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
              <Feather name="user-plus" size={26} color="#fff" style={{ marginLeft: 2 }} />
            </LinearGradient>
          </View>

          {/* TEXTOS */}
          <Text style={[styles.title, { color: colors.foreground }]}>
            Crear Cuenta
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Únete a Bonilla Tour's para gestionar tus reservas de forma rápida y sencilla.
          </Text>
        </View>

        {/* FORMULARIO */}
        <View style={styles.formSection}>
          <Field
            icon="user"
            label="Nombre completo"
            value={form.name}
            onChangeText={(v) => update("name", v)}
            error={errors.name}
            placeholder="Ej. Juan Pérez"
            colors={colors}
          />
          <Field
            icon="mail"
            label="Correo electrónico"
            value={form.email}
            onChangeText={(v) => update("email", v)}
            error={errors.email}
            placeholder="tu@correo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            colors={colors}
          />
          <Field
            icon="phone"
            label="Teléfono"
            value={form.phone}
            onChangeText={(v) => update("phone", v)}
            error={errors.phone}
            placeholder="10 dígitos"
            keyboardType="phone-pad"
            colors={colors}
          />
          
          <Field
            icon="lock"
            label="Contraseña"
            value={form.password}
            onChangeText={(v) => update("password", v)}
            error={errors.password}
            placeholder="Mínimo 6 caracteres"
            secureTextEntry={!showPwd}
            colors={colors}
            autoCapitalize="none"
          />
          <Field
            icon="check-circle"
            label="Confirmar contraseña"
            value={form.confirmPassword}
            onChangeText={(v) => update("confirmPassword", v)}
            error={errors.confirmPassword}
            placeholder="Repite tu contraseña"
            secureTextEntry={!showPwd}
            colors={colors}
            autoCapitalize="none"
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

          <View style={{ marginTop: 8 }}>
            <AppButton
              title="Registrarme"
              onPress={handleRegister}
              loading={loading}
            />
          </View>
        </View>

        {/* FOOTER ESPACIADO AL FONDO */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            ¿Ya tienes una cuenta?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.replace("/(auth)/login")} activeOpacity={0.7}>
            <Text style={[styles.link, { color: colors.primary }]}>
              Inicia sesión
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
          autoCapitalize={autoCapitalize ?? "words"}
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
    justifyContent: "space-between", 
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
    marginBottom: 32,
  },
  formSection: {
    gap: 16,
    flex: 1, 
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
  
  footer: { 
    flexDirection: "row", 
    justifyContent: "center", 
    paddingTop: 32,
    paddingBottom: 12,
  },
  footerText: { fontSize: 15, fontWeight: "500" },
  link: { fontSize: 15, fontWeight: "800" },
});