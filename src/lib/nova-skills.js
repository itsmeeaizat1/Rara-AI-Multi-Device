// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-skills.js — SKILL REGISTRY agent (.novaagent), request owner 12 Sep
// 2026: "jadi tool, skills dan mcp banyak yg dipasang lengkap agent sebagai
// tool tambahan atau kebutuhan yang dibutuhkan agent".
// Skill = tool kecil serba bisa (kalkulator, translate, kurs, qr, dll) yang
// ke-merge otomatis ke daftar TOOLS .novaagent — AI bebas milih pas butuh.
//   * Bentuk entry IDENTIK TOOLS (perm/args/danger/desc/done/run) → executor
//     novaai.js (gerbang admin/owner + konfirmasi danger) jalan tanpa edit.
//   * Built-in 14 skill — SEMUA gratis tanpa API key.
//   * Source pack eksternal: taruh file .js di src/source/ (export default
//     {name, skill}) → ke-load otomatis (registerSkillPacks).
// Seam: setSkillsHttp / resetSkillsHttp buat e2e (tanpa network).

// ── seam injectable http (default: fetch asli) ──
let skillsHttp = async (url, opts) => fetch(url, opts)
export function setSkillsHttp(fn) { skillsHttp = fn || (async (u, o) => fetch(u, o)) }
export function resetSkillsHttp() { skillsHttp = async (url, opts) => fetch(url, opts) }

// ── REGISTRY ──
const SKILLS = {}
export function registerSkill(def) {
  if (!def?.name || typeof def?.run !== "function") return false
  SKILLS[def.name] = { perm: "user", danger: false, ...def }
  return true
}
export function getAllSkills() { return { ...SKILLS } }
export function getSkill(name) { return SKILLS[name] || null }

// ── helper reply ──
const say = (conn, m, text) => conn.sendMessage(m.chat, { text }, { quoted: m })

// ═══════════ BUILT-IN SKILLS (14 — semua gratis no-key) ═══════════

// 1. KALKULATOR
registerSkill({
  name: "calc", args: ["expr"], perm: "user", danger: false,
  desc: "KALKULATOR matematika (tambah kurang kali bagi pangkat akar persen) — pakai kalau user minta hitung angka. expr = ekspresi matematika",
  done: "✅ Hasilnya di atas ya.",
  run: async (conn, m, a) => {
    let e = String(a?.expr || a?.text || a?.value || "").trim().replace(/x|×/gi, "*").replace(/÷/g, "/").replace(/\^/g, "**")
    if (!/^[\d\s+\-*/().%]+$/.test(e) || !/[+\-*/%]/.test(e)) throw new Error("ekspresi matematikanya mana? (contoh: 25*4+10)")
    // whitelist ketat → aman dieval
    const val = Function(`"use strict"; return (${e})`)()
    if (!Number.isFinite(val)) throw new Error("hasilnya bukan angka valid")
    const pretty = Math.abs(val) >= 1e15 ? val.toExponential(6) : (Math.round(val * 1e10) / 1e10).toLocaleString("id-ID", { maximumFractionDigits: 10 })
    await say(conn, m, `🧮 ${e} = ${pretty}`)
  }
})

// 2. TRANSLATE (Google translate gtx — gratis)
registerSkill({
  name: "translate", args: ["text", "to"], perm: "user", danger: false,
  desc: "TERJEMAHIN teks ke bahasa lain (id/en/ja/ko/zh/ar/es/fr/de/dll) — pakai kalau user minta arti/terjemahan. text = teksnya, to = kode bahasa tujuan (default id)",
  done: "✅ Terjemahannya di atas ya.",
  run: async (conn, m, a) => {
    const text = String(a?.text || a?.value || "").trim()
    if (!text) throw new Error("teksnya apa yang mau diterjemahin?")
    const to = String(a?.to || a?.lang || "id").trim().toLowerCase() || "id"
    const res = await skillsHttp(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(text)}`)
    if (!res.ok) throw new Error("service translate sibuk (HTTP " + res.status + ")")
    const data = await res.json()
    const out = (Array.isArray(data?.[0]) ? data[0] : []).map((x) => x?.[0]).join("")
    const src = data?.[2] || "?"
    if (!out) throw new Error("hasil translate kosong")
    await say(conn, m, `🌐 Dari [${src}] → [${to}]:\n\n${out}`)
  }
})

// 3. KURS MATA UANG (open.er-api.com — gratis no key)
registerSkill({
  name: "kurs", args: ["from", "to", "amount"], perm: "user", danger: false,
  desc: "KURS mata uang — konversi USD/IDR/EUR/JPY/dll (contoh: 100 usd ke idr). from = kode asal, to = kode tujuan, amount = jumlah",
  done: "✅ Kursnya di atas ya.",
  run: async (conn, m, a) => {
    const from = String(a?.from || "USD").toUpperCase()
    const to = String(a?.to || "IDR").toUpperCase()
    const amount = Number(a?.amount || 1) || 1
    const res = await skillsHttp(`https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`)
    if (!res.ok) throw new Error("service kurs sibuk (HTTP " + res.status + ")")
    const data = await res.json()
    const rate = data?.rates?.[to]
    if (!rate) throw new Error("kode mata uang gak dikenal: " + from + "/" + to)
    const total = amount * rate
    await say(conn, m, `💱 ${amount.toLocaleString("id-ID")} ${from} = ${total.toLocaleString("id-ID", { maximumFractionDigits: 2 })} ${to}\n(rate 1 ${from} = ${rate.toLocaleString("id-ID", { maximumFractionDigits: 4 })} ${to})`)
  }
})

// 4. QR CODE (api.qrserver.com — gratis)
registerSkill({
  name: "qr", args: ["text"], perm: "user", danger: false,
  desc: "BUAT QR CODE dari teks/link/wifi — pakai kalau user minta bikin qr code. text = isi qr-nya",
  done: "✅ QR code-nya di atas ya.",
  run: async (conn, m, a) => {
    const text = String(a?.text || a?.value || "").trim()
    if (!text) throw new Error("isi qr-nya apa? (teks/link)")
    const res = await skillsHttp(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(text)}`)
    if (!res.ok) throw new Error("service qr sibuk (HTTP " + res.status + ")")
    const buf = Buffer.from(await res.arrayBuffer())
    if (!buf.length) throw new Error("qr kosong")
    await conn.sendMessage(m.chat, { image: buf, caption: "📱 QR Code" }, { quoted: m })
  }
})

// 5. BACA HALAMAN WEB
registerSkill({
  name: "webread", args: ["url"], perm: "user", danger: false,
  desc: "BACA ISI halaman web dari link — ringkasan teks lengkap halamannya. url = link halaman",
  done: "✅ Isi halamannya di atas ya.",
  run: async (conn, m, a) => {
    const url = String(a?.url || a?.link || "").trim()
    if (!/^https?:\/\//i.test(url)) throw new Error("link-nya (http/https) mana?")
    const { fetchPagePreview } = await import("./nova-websearch.js")
    const p = await fetchPagePreview(url)
    if (!p || p.error || !p.text?.trim()) throw new Error("halamannya gak bisa dibaca (diblok/JS-only?)")
    const out = `📄 ${p.title || "Halaman Web"}\n${url}\n\n${p.text.slice(0, 2500)}${p.text.length > 2500 ? "\n…(dipotong)" : ""}`
    await say(conn, m, out)
  }
})

// 6. WIKIPEDIA (id/en — gratis)
registerSkill({
  name: "wiki", args: ["topic"], perm: "user", danger: false,
  desc: "CARI RINGKASAN Wikipedia tentang topik/istilah/orang (contoh: 'soekarno siapa') — pakai kalau user nanya definisi/biografi/penjelasan topik. topic = topiknya",
  done: "✅ Ringkasannya di atas ya.",
  run: async (conn, m, a) => {
    let topic = String(a?.topic || a?.text || a?.query || "").trim()
    if (!topic) throw new Error("topiknya apa?")
    const lang = /inggris|english/i.test(String(a?.lang || "")) ? "en" : "id"
    let res = await skillsHttp(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic.replace(/\s+/g, "_"))}`)
    if (!res.ok) {
      // fallback: cari dulu lewat search API
      const sr = await skillsHttp(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&srlimit=1`)
      if (!sr.ok) throw new Error("wikipedia sibuk")
      const sd = await sr.json()
      const first = sd?.query?.search?.[0]?.title
      if (!first) throw new Error(`topik "${topic}" gak ketemu di Wikipedia`)
      res = await skillsHttp(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(first.replace(/\s+/g, "_"))}`)
    }
    if (!res.ok) throw new Error(`topik "${topic}" gak ketemu di Wikipedia`)
    const d = await res.json()
    if (!d?.extract) throw new Error("gak ada ringkasan buat topik itu")
    await say(conn, m, `📚 ${d.title}\n\n${d.extract}\n\n🔗 ${d.content_urls?.desktop?.page || ""}`)
  }
})

// 7. CUACA (Open-Meteo — gratis no key)
registerSkill({
  name: "cuaca", args: ["kota"], perm: "user", danger: false,
  desc: "CEK CUACA kota sekarang (suhu, hujan, angin) — pakai kalau user nanya cuaca suatu kota. kota = nama kota",
  done: "✅ Cuacanya di atas ya.",
  run: async (conn, m, a) => {
    const kota = String(a?.kota || a?.city || a?.text || "").trim()
    if (!kota) throw new Error("kotanya mana?")
    const gr = await skillsHttp(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(kota)}&count=1&language=id`)
    if (!gr.ok) throw new Error("service cuaca sibuk")
    const g = (await gr.json())?.results?.[0]
    if (!g) throw new Error(`kota "${kota}" gak ketemu`)
    const wr = await skillsHttp(`https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`)
    if (!wr.ok) throw new Error("service cuaca sibuk")
    const c = (await wr.json())?.current
    if (!c) throw new Error("data cuaca kosong")
    const KODE = { 0: "☀️ Cerah", 1: "🌤️ Cerah berawan", 2: "⛅ Berawan", 3: "☁️ Mendung", 45: "🌫️ Berkabut", 51: "🌦️ Gerimis ringan", 61: "🌧️ Hujan ringan", 63: "🌧️ Hujan sedang", 65: "⛈️ Hujan lebat", 80: "🌦️ Hujan lokal", 95: "⛈️ Badai petir" }
    await say(conn, m, `🌤️ Cuaca ${g.name}${g.country ? ", " + g.country : ""} sekarang:\n• Kondisi: ${KODE[c.weather_code] || "kode " + c.weather_code}\n• Suhu: ${c.temperature_2m}°C\n• Kelembapan: ${c.relative_humidity_2m}%\n• Angin: ${c.wind_speed_10m} km/jam`)
  }
})

// 8. WAKTU DUNIA
registerSkill({
  name: "waktu", args: ["zona"], perm: "user", danger: false,
  desc: "CEK WAKTU di kota/zona dunia (contoh: 'jam berapa di tokyo') — zona = nama kota/zona (wib/wita/wit juga bisa)",
  done: "✅ Jamnya di atas ya.",
  run: async (conn, m, a) => {
    const q = String(a?.zona || a?.zone || a?.text || "").trim().toLowerCase()
    const ALIAS = { wib: "Asia/Jakarta", wita: "Asia/Makassar", wit: "Asia/Jayapura", "saudi": "Asia/Riyadh", arab: "Asia/Riyadh", mekah: "Asia/Riyadh", madinah: "Asia/Riyadh", "new york": "America/New_York", la: "America/Los_Angeles", "los angeles": "America/Los_Angeles", london: "Europe/London", tokyo: "Asia/Tokyo", jepang: "Asia/Tokyo", korea: "Asia/Seoul", seoul: "Asia/Seoul", beijing: "Asia/Shanghai", china: "Asia/Shanghai", sydney: "Australia/Sydney", "australia": "Australia/Sydney", dubai: "Asia/Dubai", mesir: "Africa/Cairo", kairo: "Africa/Cairo" }
    let zone = ALIAS[q]
    if (!zone) {
      // tebak dari nama kota: <city>/<city> → coba beberapa zona umum via Intl
      const { findZoneByCity } = await import("./nova-skills-zones.js")
      zone = findZoneByCity(q)
    }
    if (!zone) {
      try { new Intl.DateTimeFormat("id-ID", { timeZone: q }).format(new Date()); zone = q } catch { throw new Error(`zona waktu "${q}" gak dikenal (contoh: tokyo, london, wib, america/new_york)`) }
    }
    const now = new Date()
    const tgl = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: zone }).format(now)
    const jam = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: zone }).format(now)
    await say(conn, m, `🕒 ${zone}\n${tgl}\nJam ${jam}`)
  }
})

// 9. BASE64
registerSkill({
  name: "base64", args: ["text", "mode"], perm: "user", danger: false,
  desc: "ENCODE/DECODE base64. text = teksnya, mode = encode (default) atau decode",
  done: "✅ Hasilnya di atas ya.",
  run: async (conn, m, a) => {
    const text = String(a?.text || a?.value || "").trim()
    if (!text) throw new Error("teksnya apa?")
    const mode = String(a?.mode || "encode").toLowerCase()
    if (mode === "decode") {
      const out = Buffer.from(text, "base64").toString("utf-8")
      if (!out || /�/.test(out)) throw new Error("bukan base64 yang valid")
      await say(conn, m, `🔓 Decode base64:\n\n${out}`)
    } else {
      await say(conn, m, `🔒 Encode base64:\n\n${Buffer.from(text, "utf-8").toString("base64")}`)
    }
  }
})

// 10. HASH
registerSkill({
  name: "hash", args: ["text", "algo"], perm: "user", danger: false,
  desc: "HASH teks jadi md5/sha1/sha256 (fingerprint). text = teksnya, algo = md5/sha1/sha256 (default sha256)",
  done: "✅ Hash-nya di atas ya.",
  run: async (conn, m, a) => {
    const text = String(a?.text || a?.value || "").trim()
    if (!text) throw new Error("teksnya apa?")
    const algo = String(a?.algo || "sha256").toLowerCase()
    if (!["md5", "sha1", "sha256", "sha512"].includes(algo)) throw new Error("algo harus md5/sha1/sha256/sha512")
    const { createHash } = await import("node:crypto")
    await say(conn, m, `🔐 ${algo}:\n${createHash(algo).update(text).digest("hex")}`)
  }
})

// 11. HITUNG HARI (countdown)
registerSkill({
  name: "hitunghari", args: ["tanggal"], perm: "user", danger: false,
  desc: "HITUNG HARI menuju tanggal tertentu (contoh: 'berapa hari lagi sampai 25 desember 2026'). tanggal = DD bulan YYYY atau DD-MM-YYYY",
  done: "✅ Hitungannya di atas ya.",
  run: async (conn, m, a) => {
    const raw = String(a?.tanggal || a?.date || a?.text || "").trim()
    if (!raw) throw new Error("tanggalnya kapan? (contoh: 25 desember 2026)")
    const BULAN = { januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5, juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11 }
    let d = null
    let mm = raw.match(/(\d{1,2})\s*[-/ ]?\s*([a-z]+)\s*[-/ ]?\s*(\d{4})/i)
    if (mm) {
      const mo = BULAN[mm[2].toLowerCase()]
      if (mo !== undefined) d = new Date(Date.UTC(+mm[3], mo, +mm[1]))
    }
    if (!d) {
      mm = raw.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
      if (mm) d = new Date(Date.UTC(+mm[3], +mm[2] - 1, +mm[1]))
    }
    if (!d || isNaN(d)) throw new Error("format tanggalnya gak kebaca (contoh: 25 desember 2026 atau 25-12-2026)")
    const now = new Date()
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    const diff = Math.round((d.getTime() - today) / 86400000)
    const label = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d)
    if (diff > 0) await say(conn, m, `📅 ${label}\nMasih ${diff} hari lagi (${Math.ceil(diff / 7)} minggu)`)
    else if (diff === 0) await say(conn, m, `📅 ${label}\nHARI INI! 🎉`)
    else await say(conn, m, `📅 ${label}\nUdah lewat ${-diff} hari yang lalu`)
  }
})

// 12. RANDOM PICK
registerSkill({
  name: "randompick", args: ["list"], perm: "user", danger: false,
  desc: "PILIH ACAK satu dari beberapa pilihan (contoh: 'pilih acak: nasi goreng / mie ayam / bakso'). list = daftar pilihan dipisah koma/atau",
  done: "✊ Pilihannya udah aku tentuin di atas ya.",
  run: async (conn, m, a) => {
    let list = a?.list || a?.options || a?.text || a?.value
    if (Array.isArray(list)) list = list.map(String).join(",")
    list = String(list || "").trim()
    if (!list) throw new Error("pilihannya apa aja? (pisah dengan koma atau 'atau')")
    const items = list.split(/[,;]|\s+atau\s+|\s+\/\s+/i).map((s) => s.trim()).filter(Boolean)
    if (items.length < 2) throw new Error("minimal 2 pilihan (pisah dengan koma)")
    const pick = items[Math.floor(Math.random() * items.length)]
    await say(conn, m, `🎲 Dari ${items.length} pilihan, aku milih:\n\n👉 ${pick}`)
  }
})

// 13. ROLL DADU / ANGKA ACAK
registerSkill({
  name: "roll", args: ["min", "max", "jumlah"], perm: "user", danger: false,
  desc: "ROLL angka/dadu acak (contoh: 'lempar dadu', 'acak angka 1 sampai 100'). min = angka awal (default 1), max = angka akhir (default 6), jumlah = berapa angka (default 1)",
  done: "✅ Hasilnya di atas ya.",
  run: async (conn, m, a) => {
    let min = parseInt(a?.min ?? 1, 10)
    let max = parseInt(a?.max ?? 6, 10)
    const jumlah = Math.min(Math.max(parseInt(a?.jumlah ?? a?.count ?? 1, 10) || 1, 1), 10)
    if (isNaN(min)) min = 1
    if (isNaN(max)) max = 6
    if (min > max) [min, max] = [max, min]
    const out = Array.from({ length: jumlah }, () => min + Math.floor(Math.random() * (max - min + 1)))
    const label = jumlah === 1 && min === 1 && max === 6 ? "🎲 Dadu" : `🎰 Angka acak ${min}-${max}`
    await say(conn, m, `${label}:\n\n${out.join("  •  ")}`)
  }
})

// 14. PENENDEK URL (is.gd — gratis)
registerSkill({
  name: "shorturl", args: ["url"], perm: "user", danger: false,
  desc: "PENDEKIN link URL panjang jadi pendek (is.gd). url = link-nya",
  done: "✅ Link pendeknya di atas ya.",
  run: async (conn, m, a) => {
    const url = String(a?.url || a?.link || "").trim()
    if (!/^https?:\/\//i.test(url)) throw new Error("link-nya (http/https) mana?")
    const res = await skillsHttp(`https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`)
    if (!res.ok) throw new Error("service pendekin sibuk (HTTP " + res.status + ")")
    const d = await res.json()
    if (!d?.shorturl) throw new Error(d?.errormessage || "gak bisa dipendekin")
    await say(conn, m, `🔗 ${d.shorturl}`)
  }
})

// ── loader source pack eksternal (src/source/*.js) — best-effort ──
// auto-load source pack src/source/ saat modul ke-import —
// think()/getAgentTools() nunggu packsReady jadi prompt & registry
// selalu ke-list skill pack (request owner 12 Sep 2026).
const packsReady = registerSkillPacks().catch(() => 0)
export function awaitSkillPacks() { return packsReady }

export async function registerSkillPacks() {
  const { readdir } = await import("node:fs/promises")
  let loaded = 0
  let dir
  try { dir = await readdir(new URL("../source/", import.meta.url)) } catch { return 0 }
  for (const f of dir.filter((x) => x.endsWith(".js"))) {
    try {
      const mod = await import(new URL("../source/" + f, import.meta.url).href)
      const def = mod.default || mod.skill
      if (def?.name && typeof def?.run === "function" && registerSkill({ ...def, name: def.name })) loaded++
    } catch (e) { console.log("[nova-skills] source pack " + f + " gagal load: " + e.message) }
  }
  return loaded
}
