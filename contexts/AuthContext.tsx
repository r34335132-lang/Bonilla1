import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";

export type UserRole = "customer" | "admin" | "supervisor";

export interface GuestInfo {
  name: string;
  email: string;
  phone: string;
}

interface AuthState {
  user: SupabaseUser | null;
  session: Session | null;
  role: UserRole;
  isGuest: boolean;
  isLoading: boolean;
  guestInfo: GuestInfo | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
  setGuestInfo: (info: GuestInfo) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY_GUEST = "bonilla_guest";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>("customer");
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [guestInfo, setGuestInfoState] = useState<GuestInfo | null>(null);

  useEffect(() => {
    let mounted = true;

    // --- FUNCIÓN UNIFICADA Y SEGURA ---
    // Esta función maneja todo el flujo sin carreras ni tropiezos
    const handleAuthChange = async (currentSession: Session | null) => {
      try {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          setIsGuest(false);
          // Buscamos el rol de forma segura
          const { data, error } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", currentSession.user.id)
            .single();

          if (data && !error && mounted) {
            setRole(data.role as UserRole);
          }
        } else {
          if (mounted) setRole("customer");
          
          // Si no hay sesión, revisamos si era invitado
          const storedGuest = await AsyncStorage.getItem(STORAGE_KEY_GUEST);
          if (storedGuest && mounted) {
            setGuestInfoState(JSON.parse(storedGuest));
            setIsGuest(true);
          }
        }
      } catch (error) {
        console.error("Error en flujo de Auth:", error);
      } finally {
        // Pase lo que pase (éxito o error), ¡quitamos la ruedita de carga!
        if (mounted) setIsLoading(false);
      }
    };

    // 1. Obtenemos la sesión inicial al abrir la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) handleAuthChange(session);
    });

    // 2. Nos quedamos escuchando si el usuario inicia o cierra sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) handleAuthChange(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true); // Aquí sí ponemos carga porque hay una pantalla estática esperando
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setIsLoading(false);
      throw error;
    }
    // No usamos setIsLoading(false) aquí porque el 'onAuthStateChange' de arriba lo hará
    setIsGuest(false);
    setGuestInfoState(null);
    await AsyncStorage.removeItem(STORAGE_KEY_GUEST);
  };

  const register = async (name: string, email: string, phone: string, password: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone } },
    });
    if (error) {
      setIsLoading(false);
      throw error;
    }
    setIsGuest(false);
    setGuestInfoState(null);
    await AsyncStorage.removeItem(STORAGE_KEY_GUEST);
  };

  // --- CORRECCIÓN DEL BUCLE INFINITO ---
  const logout = async () => {
    // ¡QUITAMOS EL setIsLoading(true)! 
    // Dejamos que React Router navegue suavemente mientras borramos los datos en el fondo.
    await supabase.auth.signOut();
    setIsGuest(false);
    setRole("customer");
    setGuestInfoState(null);
    await AsyncStorage.removeItem(STORAGE_KEY_GUEST);
  };

  const continueAsGuest = () => {
    setIsGuest(true);
  };

  const setGuestInfo = (info: GuestInfo) => {
    setGuestInfoState(info);
    AsyncStorage.setItem(STORAGE_KEY_GUEST, JSON.stringify(info));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        isGuest,
        isLoading,
        guestInfo,
        login,
        register,
        logout,
        continueAsGuest,
        setGuestInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};