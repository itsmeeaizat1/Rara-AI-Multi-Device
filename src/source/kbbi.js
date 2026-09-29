// NOVA SKILL PACK — KBBI / ARTI KATA (12 Sep 2026)
// Arti kata Indonesia via Wiktionary id (w/api.php, gratis no-key).
// Source pack: taruh di src/source/ → ke-load otomatis registerSkillPacks.
// Seam: _setKbbiHttp buat e2e.

// Wikimedia butuh User-Agent proper — tanpa itu balik HTML (bukan JSON)
let kbbiHttp = async (url) => fetch(url, { headers: { "User-Agent": "NovaBot/1.0 (+https://id.wiktionary.org)" } })
export function _setKbbiHttp(fn) { kbbiHttp = fn || (async (u) => fetch(u, { headers: { "User-Agent": "NovaBot/1.0 (+https://id.wiktionary.org)" } })) }

function parseDefs(extract) {
  // Ambil bagian "== Bahasa Indonesia ==" → baris definisi
  const idx = String(extract || "").indexOf("== Bahasa Indonesia ==")
  const sec = idx >= 0 ? String(extract).slice(idx) : String(extract || "")
  // cari section berikutnya (\n== — bukan "==" polos: penutup heading sendiri
  // jangan sampai kehitung, dulu body cuma kepotong judul doang)
  const rest = sec.indexOf("\n==", 2)
  const body = rest > 0 ? sec.slice(0, rest) : sec
  const lines = body.split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("==") && !l.startsWith("{{rfdef") && !/\{\{rfdef\}\}/.test(l))
  // buang kalimat template perbaikan wiktionary
  const defs = lines.filter((l) => !/^Tolong bantu|^Definisi dari istilah|^Artikel /i.test(l))
  return defs.slice(0, 8)
}

const skill = {
  name: "kbbi",
  desc: "CARI ARTI kata bahasa Indonesia (kamus) — pakai kalau user nanya 'arti kata X apa' / 'kbbi X'. kata = kata yang mau dicari artinya",
  args: ["kata"],
  perm: "user",
  danger: false,
  async run(conn, m, a) {
    const kata = (typeof a === "string" ? a : String(a?.kata || "")).trim().toLowerCase()
    if (!kata || !/^[\p{L}\- ]{2,30}$/u.test(kata)) throw new Error("kata-nya mana? kasih 1 kata Indonesia (huruf doang)")
    const url = `https://id.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(kata)}&prop=extracts&explaintext=1&format=json&redirects=1`
    const res = await kbbiHttp(url)
    const data = await res.json()
    const pages = data?.query?.pages || {}
    const page = Object.values(pages)[0]
    if (!page || page.extract === undefined || page.missing !== undefined) {
      throw new Error(`kata "${kata}" gak ketemu di kamus`)
    }
    const defs = parseDefs(page.extract)
    if (!defs.length) throw new Error(`kata "${kata}" gak punya definisi di kamus`)
    const lines = [
      `📖 Arti kata "${kata}" (Wiktionary):`,
      "",
      ...defs.map((d, i) => `${i + 1}. ${d.slice(0, 200)}`),
      "",
      `🔗 https://id.wiktionary.org/wiki/${encodeURIComponent(kata)}`,
    ]
    await conn.sendMessage(m.chat, { text: lines.join("\n") }, { quoted: m })
  },
}
export default skill
