// utils/routeLogic.ts

// 1. EL MAPA MAESTRO DE TU RUTA
export const BONILLA_ROUTE = [
  "Durango",
  "Nombre de Dios",
  "Vicente Guerrero",
  "Sombrerete",
  "Río Florido",
  "Fresnillo",
  "Zacatecas",
  "Aguascalientes",
  "San Juan de los Lagos",
  "Guadalajara",
];

// 2. LA FUNCIÓN MÁGICA DE CHOQUE DE ASIENTOS
export function getOccupiedSeatsForSegment(
  allBookings: any[], // Todas las reservas de este viaje
  searchOrigin: string, // Donde se quiere subir el cliente
  searchDest: string // Donde se quiere bajar el cliente
): number[] {
  
  const startIndex = BONILLA_ROUTE.indexOf(searchOrigin);
  const endIndex = BONILLA_ROUTE.indexOf(searchDest);

  // Si buscaron una ciudad que no existe o el origen es después del destino, bloqueamos todo
  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    return []; 
  }

  const occupiedSeats = new Set<number>();

  allBookings.forEach((booking) => {
    // Si la reserva está cancelada, ignoramos sus asientos (están libres)
    if (booking.status === "cancelled") return;

    // Aquí asumimos que booking.trip.origin tiene la ciudad donde se sube ESA persona
    const bStart = BONILLA_ROUTE.indexOf(booking.trip.origin);
    const bEnd = BONILLA_ROUTE.indexOf(booking.trip.destination);

    // LÓGICA MATEMÁTICA DE SUPERPOSICIÓN:
    // Chocan si: El inicio de la reserva es MENOR al fin de mi búsqueda 
    // Y el fin de la reserva es MAYOR al inicio de mi búsqueda
    if (bStart < endIndex && bEnd > startIndex) {
      booking.seats.forEach((seat: number) => occupiedSeats.add(seat));
    }
  });

  return Array.from(occupiedSeats);
}