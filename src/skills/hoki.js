// NOVA SKILL PACK — NOMOR HOKI (12 Sep 2026)
// Ramalan energi nomor HP ala primbon — 100% lokal deterministik, no network.
// Metode: tabel prima 10x4 klasik numerologi Indonesia — tiap digit
// dikalikan bobot posisi → energi → dirangkum jadi skor kategori 0-100.
// Hiburan primbon, bukan sains. Seam: gak perlu (murni lokal).

const PRIMA = [
  [2, 3, 5, 7], [1, 7, 4, 6], [5, 2, 9, 8], [7, 5, 3, 2], [9, 8, 7, 4],
  [6, 5, 1, 3], [8, 3, 2, 6], [5, 9, 6, 7], [3, 1, 6, 4], [7, 8, 5, 1],
]
const KATEGORI = [
  { nama: "Kekayaan", pos: [0, 1, 2], emoji: "💰" },
  { nama: "Kesehatan", pos: [3, 4], emoji: "❤️" },
  { nama: "Cinta & Relasi", pos: [5, 6], emoji: "💞" },
  { nama: "Kestabilan", pos: [7, 8], emoji: "🛡️" },
  { nama: "Keberuntungan", pos: [9, 10, 11], emoji: "🍀" },
]

export function hitungHoki(nomor) {
  const digits = String(nomor).replace(/\D/g, "").split("").map(Number)
  if (digits.length < 4) throw new Error("nomor-nya minimal 4 digit ya")
  if (digits.length > 16) throw new Error("nomor-nya kepanjangan (maks 16 digit)")
  const energy = digits.map((d, i) => PRIMA[d % 10][i % 4] * (1 + (i % 3)))
  const hasil = KATEGORI.map((k) => {
    const vals = k.pos.filter((p) => p < energy.length).map((p) => energy[p])
    const raw = vals.reduce((s, v) => s + v, 0)
    const max = vals.length * 32 || 32
    const skor = Math.min(99, Math.max(3, Math.round((raw / max) * 100)))
    return { ...k, skor }
  })
  const total = Math.round(hasil.reduce((s, h) => s + h.skor, 0) / hasil.length)
  const verdict =
    total >= 80 ? "Sangat hoki 🌟 — nomor ini bervibrasi tinggi"
    : total >= 60 ? "Cukup hoki ✨ — vibrasinya positif"
    : total >= 40 ? "Lumayan ⚖️ — biasa aja, jangan terlalu dipercaya"
    : "Rendah 🌧️ — cuma ramalan primbon, jangan ambil pusing"
  return { digits, hasil, total, verdict }
}

const skill = {
  name: "hoki",
  desc: "RAMAL NOMOR HOKI nomor HP/angka ala primbon (kekayaan/kesehatan/cinta/kestabilan/keberuntungan). Pakai kalau user nanya 'hoki gak nomorku' / 'cek nomor hoki 0812...'. nomor = nomor HP atau angka yang mau dicek",
  args: ["nomor"],
  perm: "user",
  danger: false,
  async run(conn, m, a) {
    const nomor = (typeof a === "string" ? a : String(a?.nomor || "")).trim()
    if (!nomor || !/\d/.test(nomor)) throw new Error("nomor-nya mana? contoh: hoki 081234567890")
    const { hasil, total, verdict } = hitungHoki(nomor)
    const bar = (n) => "█".repeat(Math.round(n / 10)) + "░".repeat(10 - Math.round(n / 10))
    const lines = [
      `🔮 Ramalan Nomor Hoki — ${nomor}`,
      "",
      ...hasil.map((h) => `${h.emoji} ${h.nama}: ${h.skor}/100 ${bar(h.skor)}`),
      "",
      `⚡ Skor total: ${total}/100 — ${verdict}`,
      "",
      "_Cuma hiburan primbon — keberhasilan tetap dari usaha, bukan nomor._",
    ]
    await conn.sendMessage(m.chat, { text: lines.join("\n") }, { quoted: m })
  },
}
export default skill
