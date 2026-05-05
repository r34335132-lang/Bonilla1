// utils/routeLogic.ts

export const BONILLA_ROUTE = [
  "Durango",
  "Nombre de Dios",
  "Vicente Guerrero",
  "Sombrerete",
  "San José de Fénix",
  "Sain Alto",
  "Río Florido",
  "Fresnillo",
  "Calera",
  "Zacatecas",
  "Aguascalientes",
  "San Juan de los Lagos",
  "Guadalajara",
];

export function getOccupiedSeatsForSegment(
  allBookings: any[], 
  searchOrigin: string, 
  searchDest: string 
): number[] {
  
  const startIndex = BONILLA_ROUTE.indexOf(searchOrigin);
  const endIndex = BONILLA_ROUTE.indexOf(searchDest);

  // Si buscaron la misma ciudad o una que no existe, no hay asientos ocupados
  if (startIndex === -1 || endIndex === -1 || startIndex === endIndex) {
    return []; 
  }

  // Detectamos si el viaje va hacia el SUR (Durango->GDL) o al NORTE (GDL->Durango)
  const isGoingSouth = startIndex < endIndex;
  const occupiedSeats = new Set<number>();

  allBookings.forEach((booking) => {
    if (booking.status === "cancelled") return;

    const bStart = BONILLA_ROUTE.indexOf(booking.trip.origin);
    const bEnd = BONILLA_ROUTE.indexOf(booking.trip.destination);

    if (bStart === -1 || bEnd === -1 || bStart === bEnd) return;

    const bookingGoingSouth = bStart < bEnd;

    // Si una persona va hacia el Sur y otra hacia el Norte, sus asientos jamás chocarán
    if (isGoingSouth !== bookingGoingSouth) return;

    // LÓGICA DE CHOQUE BIDIRECCIONAL
    if (isGoingSouth) {
      if (bStart < endIndex && bEnd > startIndex) {
        booking.seats.forEach((seat: number) => occupiedSeats.add(seat));
      }
    } else {
      // Va de subida (Norte)
      if (bStart > endIndex && bEnd < startIndex) {
        booking.seats.forEach((seat: number) => occupiedSeats.add(seat));
      }
    }
  });

  return Array.from(occupiedSeats);
}