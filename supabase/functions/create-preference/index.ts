const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. AQUI ESTÁ LA CORRECCIÓN: Agregamos bookingId a las variables extraídas
    const { title, quantity, price, email, bookingId } = await req.json();

    // 2. TU TOKEN (¡Sin la I al final!)
    const MP_ACCESS_TOKEN = "APP_USR-2942358747360592-040222-a43bd8144eaf87858d81418db87de7b7-3310908232"; 

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{
          title: title,
          quantity: quantity,
          currency_id: 'MXN',
          unit_price: price
        }],
        payer: {
          email: email || "comprador.falso@gmail.com"
        },
        // 3. AQUI ESTÁ LA OTRA CORRECCIÓN: Solo usamos bookingId, sin el "body."
        external_reference: bookingId, 
        back_urls: {
          success: "https://tudominio.com/success",
          failure: "https://tudominio.com/failure",
          pending: "https://tudominio.com/pending"
        },
        auto_return: "approved",
      })
    });

    const data = await response.json();

    if (!response.ok) {
       return new Response(JSON.stringify({ ok: false, error: data.message || "Error en MP", details: data }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         status: 200, 
       });
    }

    return new Response(JSON.stringify({ ok: true, init_point: data.init_point }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});