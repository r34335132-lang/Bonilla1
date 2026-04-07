import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

Deno.serve(async (req) => {
  try {
    // Mercado Pago manda los datos en el cuerpo de la petición (JSON)
    const body = await req.json().catch(() => ({}));

    // Verificamos si es una notificación de pago ("payment")
    if (body.type === "payment" || body.topic === "payment") {
      const paymentId = body.data?.id;

      if (paymentId) {
        console.log(`Recibí aviso del pago #${paymentId}. Verificando con Mercado Pago...`);

        // 1. Le preguntamos directamente a Mercado Pago si este pago es real y está aprobado
        // PEGA TU TOKEN AQUÍ (¡Sin la letra extra al final! jaja)
        const MP_ACCESS_TOKEN = "APP_USR-2942358747360592-040222-a43bd8144eaf87858d81418db87de7b7-3310908232";
        
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
        });
        const paymentInfo = await mpResponse.json();

        // 2. Extraemos la referencia (el ID de tu reserva) y el estatus
        const bookingId = paymentInfo.external_reference; 
        const status = paymentInfo.status; // Puede ser "approved", "pending", "rejected"

        // 3. Si el pago fue aprobado y tenemos el ID de la reserva, la marcamos como pagada
        if (bookingId && status === "approved") {
          
          // Nos conectamos a tu base de datos de Supabase usando sus llaves secretas internas
          const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          );

          // Actualizamos la tabla de bookings
          const { error } = await supabase
            .from('bookings')
            .update({ status: 'confirmed' }) // Pasamos de "pending" a "confirmed"
            .eq('id', bookingId);

          if (error) throw error;
          console.log(`¡ÉXITO! Reserva ${bookingId} marcada como pagada.`);
        }
      }
    }

    // Siempre hay que contestarle rápido a Mercado Pago con un 200 OK para que sepa que lo recibimos
    return new Response("Webhook recibido", { status: 200 });
  } catch (error) {
    console.error("Error procesando el webhook:", error);
    return new Response("Error interno", { status: 400 });
  }
});