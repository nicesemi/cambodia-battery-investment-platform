/**
 * GET /api/geocode?address=xxx
 * 地理编码代理：后端调用 Nominatim → 前端无需 VPN
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const address = url.searchParams.get('address')
    if (!address) {
      return Response.json({ error: 'Missing address parameter' }, { status: 400 })
    }

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { 'User-Agent': 'CambodiaBatteryPlatform/1.0' } }
    )

    if (!res.ok) {
      return Response.json({ error: `Nominatim returned ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    if (data && data.length > 0) {
      return Response.json({ lon: data[0].lon, lat: data[0].lat })
    }
    return Response.json({ error: 'Address not found' }, { status: 404 })
  } catch (e: any) {
    return Response.json({ error: e.message || 'Geocoding failed' }, { status: 500 })
  }
}
