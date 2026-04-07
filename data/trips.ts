import { supabase } from "../lib/supabase";
import { Trip } from "@/contexts/BookingContext";
import { BONILLA_ROUTE } from "@/utils/routeLogic"; // <-- Importamos la ruta maestra

// Agregamos rutas populares reales de Bonilla Tour's (Sin Mazatlán)
export const POPULAR_ROUTES = [
  { origin: "Durango", destination: "Guadalajara" },
  { origin: "Durango", destination: "Zacatecas" },
  { origin: "Fresnillo", destination: "Aguascalientes" },
  { origin: "Zacatecas", destination: "Guadalajara" },
  { origin: "Sombrerete", destination: "San Juan de los Lagos" },
];

export async function searchTrips(origin: string, destination: string, searchDate: string): Promise<Trip[]> {
  // 1. Verificamos índices de la ruta matemática
  const searchStart = BONILLA_ROUTE.indexOf(origin);
  const searchEnd = BONILLA_ROUTE.indexOf(destination);

  if (searchStart === -1 || searchEnd === -1 || searchStart >= searchEnd) {
    return []; // Ruta inválida
  }

  // 2. Consultamos a Supabase TODOS los viajes de ese día
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("date", searchDate);

  if (error || !data) {
    console.error("Error al buscar viajes:", error);
    return [];
  }

  // 3. Filtramos los camiones que SÍ pasan por el tramo deseado
  const validTrips = data.filter((trip) => {
    const tripStart = BONILLA_ROUTE.indexOf(trip.origin);
    const tripEnd = BONILLA_ROUTE.indexOf(trip.destination);
    
    // El camión sirve si empieza ANTES o IGUAL que el origen, y termina DESPUÉS o IGUAL que el destino
    return searchStart >= tripStart && searchEnd <= tripEnd;
  });

  // 4. Convertimos los datos de Supabase al formato de la app
  return validTrips.map((t) => ({
    id: t.id,
    origin: t.origin, // Ojo: Aquí mandamos el origen absoluto del camión. El HomeScreen lo sobreescribe.
    destination: t.destination,
    date: searchDate, 
    departureTime: t.departure_time,
    arrivalTime: t.arrival_time,
    duration: t.duration,
    price: t.price,
    availableSeats: t.available_seats,
    totalSeats: t.total_seats,
    busType: t.bus_type,
    amenities: t.amenities || [],
    occupiedSeats: t.occupied_seats || [],
  }));
}