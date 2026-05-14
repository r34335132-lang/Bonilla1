import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req) => {
  try {
    // Leemos la notificación que manda Clip
    const body = await req.json().catch(() => ({}));
    console.log("Notificación recibida de Clip:", body);

    // Buscamos el ID del boleto (BT-XXXXXX) que mandamos como custom_id
    // Clip a veces lo manda en la raíz o dentro de un objeto 'transaction'
    const bookingId = body.custom_id || body?.transaction?.custom_id || body.reference_id; 
    
    // Verificamos si el pago fue exitoso
    // Clip usa estatus como "APPROVED", "PAID", o manda eventos "payment.success"
    const status = body.status || body?.transaction?.status;
    const isApproved = status === "APPROVED" || status === "PAID" || body.type === "PAYMENT.SUCCESS";

    if (isApproved && bookingId) {
      
      // Nos conectamos a la base de datos de Supabase
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      const supabase = createClient(supabaseUrl, supabaseKey);

      // 1. Confirmamos el boleto de ida y pedimos datos para el regreso
      const { data: updatedBooking, error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId)
        .select('return_trip_id, passenger_email')
        .single();

      if (error) {
        console.error("Error actualizando la reserva de ida:", error);
        throw error;
      }
      
      console.log(`¡ÉXITO! Reserva de ida ${bookingId} marcada como pagada.`);

      // 2. Confirmamos el boleto de regreso duplicado (si existe)
      if (updatedBooking?.return_trip_id) {
        const { error: returnError } = await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('trip_id', updatedBooking.return_trip_id)
          .eq('passenger_email', updatedBooking.passenger_email); // Filtramos por email por seguridad
        
        if (returnError) {
          console.error("Error confirmando el boleto de regreso:", returnError);
        } else {
          console.log("¡Boleto de regreso duplicado confirmado con éxito!");
        }
      }
    }

    // Le respondemos a Clip inmediatamente con un 200 OK para que deje de enviar notificaciones
    return new Response("Webhook procesado", { status: 200 });

  } catch (error: any) {
    console.error("Error crítico procesando el webhook de Clip:", error.message);
    // Aunque haya un error interno, solemos responder 200 OK para que Clip no sature el servidor reintentando
    return new Response("Error manejado internamente", { status: 200 });
  }
});