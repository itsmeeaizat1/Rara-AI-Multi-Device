// NOVA SKILL PACK — GEMPA TERKINI (12 Sep 2026)
// Info gempa terbaru: BMKG autogempa (Indonesia, M signifikan) + USGS last-day
// M4.5+ dunia. Gratis no-key. Seam: _setGempaHttp buat e2e.

let gempaHttp = async (url) => fetch(url)
export function _setGempaHttp(fn) { gempaHttp = fn || (async (u) => fetch(u)) }

const r6 = (n) => String(n).replace(/\.\d+/, "").padStart(2, "0")

async function gempaBmkg() {
  try {
    const res = await gempaHttp("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json")
    const data = await res.json()
    const g = data?.Infogempa?.gempa
    if (!g?.Magnitude) return null
    return {
      sumber: "BMKG",
      waktu: `${g.Tanggal}, ${g.Jam}`,
      magnitudo: g.Magnitude,
      kedalaman: g.Kedalaman,
      lokasi: g.Wilayah || `${g.Lintang} ${g.Bujur}`,
      potensi: g.Potensi || "",
      maps: g.Shakemap ? `https://data.bmkg.go.id/DataMKG/TEWS/${g.Shakemap}` : "",
    }
  } catch { return null }
}

async function gempaUsgs(limit = 5) {
  try {
    const res = await gempaHttp("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson")
    const data = await res.json()
    return (data?.features || [])
      .slice(0, limit)
      .map((f) => ({
        sumber: "USGS",
        waktu: new Date(f.properties.time).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB",
        magnitudo: String(f.properties.mag),
        kedalaman: r6(Math.round((f.geometry?.coordinates?.[3] ?? 0) * 10) / 10) + " km",
        lokasi: f.properties.place || "-",
      }))
  } catch { return [] }
}

const skill = {
  name: "gempa",
  desc: "CEK GEMPA TERKINI — gempa terbaru signifikan Indonesia (BMKG) + dunia M4.5+ 24 jam (USGS). Pakai kalau user nanya 'ada gempa?' / 'gempa terbaru mana'. wilayah = 'indonesia' (default) atau 'dunia'",
  args: ["wilayah"],
  perm: "user",
  danger: false,
  async run(conn, m, a) {
    const wilayah = (typeof a === "string" ? a : String(a?.wilayah || "")).toLowerCase().trim()
    const lines = []
    if (!wilayah || wilayah === "indonesia" || wilayah === "bmkg") {
      const g = await gempaBmkg()
      if (g) {
        lines.push("🌋 GEMPA TERKINI INDONESIA (BMKG)", `🕐 ${g.waktu}`, `Magnitude: M${g.magnitudo} — Kedalaman: ${g.kedalaman}`, `📍 ${g.lokasi}`, g.potensi ? `⚠️ ${g.potensi}` : "", "")
      } else lines.push("🌋 BMKG: gak ada data gempa signifikan terbaru / sumber gak kebuka", "")
    }
    if (!wilayah || wilayah === "dunia" || wilayah === "usgs") {
      const list = await gempaUsgs(5)
      lines.push("🌍 GEMPA DUNIA M4.5+ (24 jam, USGS):")
      if (list.length) {
        for (const g of list) lines.push(`• M${g.magnitudo} — ${g.lokasi} (${g.kedalaman}) — ${g.waktu}`)
      } else lines.push("(gak ada / sumber USGS gak kebuka)")
    }
    if (!lines.length) lines.push("(gak ada data gempa buat wilayah itu)")
    lines.push("", "🔔 Info resmi: bmkg.go.id — ikuti arahan lokal kalau ada guncangan.")
    await conn.sendMessage(m.chat, { text: lines.filter((x) => x !== undefined).join("\n") }, { quoted: m })
  },
}
export default skill
