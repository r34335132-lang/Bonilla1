import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// 1. Pega aquí tu Clave API (A veces llamada Client ID o Public Key)
const CLIP_API_KEY = '9f7dd0b8-49f6-4fa3-b8a6-cfddf36fc608';

// 2. Pega aquí tu Secret Key (Clave Privada)
const CLIP_SECRET = '3f6f69ef-09d2-48d1-b4c4-783a8f49fc7b';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { title, quantity, price } = await req.json()

    // Monto exacto con 2 decimales
    const finalAmount = parseFloat((price * quantity).toFixed(2));
    
    // Limpiamos la descripción
    const safeTitle = title.replace(/[^a-zA-Z0-9 :_-]/g, '').substring(0, 100);

    // Payload oficial minimalista
    const payload = {
      amount: finalAmount,
      currency: "MXN",
      purchase_description: safeTitle,
      redirection_url: {
        success: "https://bonillatours.com",
        error: "https://bonillatours.com",
        default: "https://bonillatours.com"
      }
    };

    // EL TRUCO MAESTRO: Unimos ambas claves y las encriptamos en Base64
    const credentials = `${CLIP_API_KEY}:${CLIP_SECRET}`;
    const base64Credentials = btoa(credentials);
    const authHeader = `Basic ${base64Credentials}`;

    // Hacemos la petición al endpoint oficial de Checkout
    const response = await fetch('https://api.payclip.com/v2/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(payload)
    });

    const clipData = await response.json();

    if (!response.ok) {
      console.error("ERROR DE CLIP:", clipData); 
      throw new Error(clipData.message || JSON.stringify(clipData));
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        payment_url: clipData.payment_request_url 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})