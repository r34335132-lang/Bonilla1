import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

export interface Trip {
  id: string;
  origin: string;
  destination: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number;
  availableSeats: number;
  totalSeats: number;
  busType: string;
  amenities: string[];
  occupiedSeats: number[];
}

export interface Booking {
  id: string;
  trip: Trip;
  seats: number[];
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
  paymentMethod: "card" | "cash";
  status: "confirmed" | "pending" | "cancelled";
  createdAt: string;
  userId: string | null;
  isGuest: boolean;
  totalPrice: number;
}

interface BookingContextValue {
  bookings: Booking[];
  pendingTrip: Trip | null;
  pendingSeats: number[];
  isLoading: boolean;
  setPendingTrip: (trip: Trip | null) => void;
  setPendingSeats: (seats: number[]) => void;
  confirmBooking: (booking: Omit<Booking, "id" | "createdAt">) => Promise<Booking>;
  fetchUserBookings: (userId: string) => Promise<void>;
  fetchGuestBookings: (email: string) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pendingTrip, setPendingTrip] = useState<Trip | null>(null);
  const [pendingSeats, setPendingSeats] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      fetchUserBookings(user.id);
    } else {
      setBookings([]);
    }
  }, [user]);

  const fetchUserBookings = useCallback(async (userId: string) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`*, trip:trips(*)`)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const formattedBookings: Booking[] = data.map((b) => ({
        id: b.booking_ref,
        trip: {
          id: b.trip.id,
          // --- CORRECCIÓN: Leemos el origin y destination de la reserva, no del trip ---
          origin: b.origin || b.trip.origin, 
          destination: b.destination || b.trip.destination,
          date: b.trip.date,
          departureTime: b.trip.departure_time,
          arrivalTime: b.trip.arrival_time,
          duration: b.trip.duration,
          price: b.trip.price,
          availableSeats: b.trip.available_seats,
          totalSeats: b.trip.total_seats,
          busType: b.trip.bus_type,
          amenities: b.trip.amenities,
          occupiedSeats: b.trip.occupied_seats,
        },
        seats: b.seats,
        passengerName: b.passenger_name,
        passengerEmail: b.passenger_email,
        passengerPhone: b.passenger_phone,
        paymentMethod: b.payment_method,
        status: b.status,
        createdAt: b.created_at,
        userId: b.user_id,
        isGuest: b.is_guest,
        totalPrice: b.total_price,
      }));
      setBookings(formattedBookings);
    }
    setIsLoading(false);
  }, []);

  const fetchGuestBookings = useCallback(async (email: string) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`*, trip:trips(*)`)
      .eq("is_guest", true)
      .ilike("passenger_email", email)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const formattedBookings: Booking[] = data.map((b) => ({
        id: b.booking_ref,
        trip: {
          id: b.trip.id,
          // --- CORRECCIÓN: Leemos el origin y destination de la reserva, no del trip ---
          origin: b.origin || b.trip.origin,
          destination: b.destination || b.trip.destination,
          date: b.trip.date,
          departureTime: b.trip.departure_time,
          arrivalTime: b.trip.arrival_time,
          duration: b.trip.duration,
          price: b.trip.price,
          availableSeats: b.trip.available_seats,
          totalSeats: b.trip.total_seats,
          busType: b.trip.bus_type,
          amenities: b.trip.amenities,
          occupiedSeats: b.trip.occupied_seats,
        },
        seats: b.seats,
        passengerName: b.passenger_name,
        passengerEmail: b.passenger_email,
        passengerPhone: b.passenger_phone,
        paymentMethod: b.payment_method,
        status: b.status,
        createdAt: b.created_at,
        userId: b.user_id,
        isGuest: b.is_guest,
        totalPrice: b.total_price,
      }));
      setBookings(formattedBookings);
    }
    setIsLoading(false);
  }, []);

  const confirmBooking = useCallback(
    async (bookingData: Omit<Booking, "id" | "createdAt">): Promise<Booking> => {
      setIsLoading(true);
      
      const bookingRef = "BT-" + Math.floor(100000 + Math.random() * 900000).toString().slice(0, 6);
      
      // 1. Insertamos usando el estatus que nos manda la pantalla (pending o confirmed)
      const { error } = await supabase
        .from("bookings")
        .insert({
          booking_ref: bookingRef,
          trip_id: bookingData.trip.id,
          user_id: bookingData.userId,
          seats: bookingData.seats,
          passenger_name: bookingData.passengerName,
          passenger_email: bookingData.passengerEmail,
          passenger_phone: bookingData.passengerPhone,
          payment_method: bookingData.paymentMethod,
          status: bookingData.status, 
          is_guest: bookingData.isGuest,
          total_price: bookingData.totalPrice,
          // --- CORRECCIÓN: Guardamos origin y destination en Supabase ---
          origin: bookingData.trip.origin,
          destination: bookingData.trip.destination,
        });

      if (error) {
        setIsLoading(false);
        console.error("Error Supabase:", error);
        throw new Error(error.message);
      }

      // ¡MAGIA DE TRAMOS APLICADA!
      // Hemos eliminado la actualización de "occupied_seats" en la tabla "trips".
      // Ahora los asientos se calcularán al vuelo leyendo las reservas.

      // 2. Formateamos la reserva para guardarla en el estado local de la app
      const newBooking: Booking = {
        ...bookingData,
        id: bookingRef,
        status: bookingData.status,
        createdAt: new Date().toISOString(),
      };

      setBookings((prev) => [newBooking, ...prev]);
      setIsLoading(false);
      return newBooking;
    },
    []
  );

  const cancelBooking = useCallback(async (bookingRef: string) => {
    setIsLoading(true);
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("booking_ref", bookingRef);

    if (!error) {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingRef ? { ...b, status: "cancelled" as const } : b))
      );
    }
    setIsLoading(false);
  }, []);

  return (
    <BookingContext.Provider
      value={{
        bookings,
        pendingTrip,
        pendingSeats,
        isLoading,
        setPendingTrip,
        setPendingSeats,
        confirmBooking,
        fetchUserBookings,
        fetchGuestBookings,
        cancelBooking,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}