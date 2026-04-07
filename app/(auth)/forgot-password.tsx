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
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase"; // Asegúrate de que la ruta a tu archivo supabase sea correcta

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleResetPassword = async () => {
    setError("");
    if (!email.trim()) {
      setError("Por favor, ingresa tu correo electrónico");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Ingresa un correo electrónico válido");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      
      // Si todo sale bien, cambiamos a la vista de éxito
      setIsSuccess(true);
    } catch (err) {
      Alert.alert("Error", "No pudimos enviar el correo de recuperación. Intenta de nuevo.");
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

          {isSuccess ? (
            // VISTA DE ÉXITO
            <View style={styles.successContainer}>
              <View style={styles.logoWrapper}>
                <LinearGradient
                  colors={[colors.success || "#10B981", "#059669"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.logoGradient, { shadowColor: "#10B981" }]}
                >
                  <Feather name="mail" size={26} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Revisa tu correo
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Hemos enviado un enlace de recuperación a <Text style={{fontWeight: '700', color: colors.foreground}}>{email}</Text>. Sigue las instrucciones para crear una nueva contraseña.
              </Text>
              
              <View style={{ width: "100%", marginTop: 24 }}>
                <AppButton
                  title="Volver a iniciar sesión"
                  onPress={() => router.replace("/(auth)/login")}
                />
              </View>
            </View>
          ) : (
            // VISTA DEL FORMULARIO
            <>
              <View style={styles.logoWrapper}>
                <LinearGradient
                  colors={[colors.primary, "#8B0000"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoGradient}
                >
                  <Feather name="key" size={26} color="#fff" />
                </LinearGradient>
              </View>

              <Text style={[styles.title, { color: colors.foreground }]}>
                Recuperar cuenta
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Ingresa el correo electrónico asociado a tu cuenta y te enviaremos instrucciones para restablecer tu contraseña.
              </Text>

              <View style={styles.formSection}>
                <Field
                  icon="mail"
                  label="Correo electrónico"
                  value={email}
                  onChangeText={setEmail}
                  error={error}
                  placeholder="tu@correo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  colors={colors}
                />

                <View style={{ marginTop: 12 }}>
                  <AppButton
                    title="Enviar enlace"
                    onPress={handleResetPassword}
                    loading={loading}
                  />
                </View>
              </View>
            </>
          )}
        </View>

        {/* FOOTER */}
        {!isSuccess && (
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              ¿Recordaste tu contraseña?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/login")} activeOpacity={0.7}>
              <Text style={[styles.link, { color: colors.primary }]}>
                Inicia sesión
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
  keyboardType,
  autoCapitalize,
  colors,
  icon,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  colors: any;
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
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? "none"}
          autoCorrect={false}
        />
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
    width: "100%",
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
    gap: 16,
    width: "100%",
  },
  successContainer: {
    alignItems: "flex-start",
    width: "100%",
    marginTop: 10,
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