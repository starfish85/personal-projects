const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY') || ''
  return Response.json(
    { publicKey, configured: Boolean(publicKey) },
    { headers: { ...cors, 'Content-Type': 'application/json' } },
  )
})
