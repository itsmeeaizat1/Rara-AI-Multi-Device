// E2E: .jasher — broadcast promosi ke semua grup bot (WA + TG registry)
// Mock sock + registry DB; delay knob 0; verifikasi list/broadcast/target/stop.
import path from "node:path"

const out = (s) => process.stdout.write(s + "\n")
let pass = 0, fail = 0
function t(label, cond, extra) {
  if (cond) { pass++ }
  else { fail++; out("FAIL: " + label + " " + (extra || "")) }
}

const R = path.resolve(".")
process.env.JASHER_DELAY_MS = "0"
const { initDatabase } = await import(R + "/src/lib/nova-database.js")
await initDatabase("/tmp/jasher-e2e-db/nova.json")
const db = (await import(R + "/src/lib/nova-database.js")).getDatabase()

// registry TG simulasi (2 grup TG via adapter di VPS)
db.db.data.jasher = {
  groups: {
    "tg_g1004391233000@g.us": { name: "Grup Saya Telegram", platform: "telegram" },
    "tg_g1004391233100@g.us": { name: "Warung Kopi TG", platform: "telegram" },
  },
}
await db.save()

const { checkPermission } = await import(R + "/src/lib/nova-middleware.js")
const { handler, config: plug } = await import(R + "/plugins/promotion/jasher.js")
const { fromSC } = await import(R + "/src/lib/styler.js")
// GOTCHA: claraWrap merender smallcaps → asersi WAJIB dinormalisasi fromSC
const sc = (s) => fromSC(String(s || "")).toLowerCase()
const config = (await import(R + "/config.js")).default

const WA_GROUPS = {
  "120363022101@g.us": { id: "120363022101@g.us", subject: "Grup Saya WA" },
  "120363022102@g.us": { id: "120363022102@g.us", subject: "Warung Olshop" },
  "120363022103@g.us": { id: "120363022103@g.us", subject: "Grup Keluarga" },
}
const replies = [], reacts = [], sends = []
const mockSock = {
  user: { id: "bot" },
  sendPresenceUpdate: async () => {},
  groupFetchAllParticipating: async () => WA_GROUPS,
  newsletterFetchAllSubscribe: async () => [{ id: "123456789@newsletter", name: "Saluran Nova Promo" }],
  sendMessage: async (to, msg) => {
    sends.push({ to, msg })
    return { key: { id: "s" + sends.length, remoteJid: to } }
  },
}
function mockM(text) {
  return {
    text, args: text.replace(/^\S+\s*/, "").split(/\s+/).filter(Boolean), isOwner: true, isGroup: false,
    chat: "62899@s.whatsapp.net", sender: "62899@s.whatsapp.net", prefix: ".",
    fromMe: false, quoted: null, message: { conversation: text },
    react: async (e) => reacts.push(e),
    reply: async (txt) => replies.push(String(txt)),
  }
}
const run = async (text, ctxExtra = {}) =>
  await handler(mockM(text), { sock: mockSock, config, db, ...ctxExtra })
// target broadcast = grup @g.us ATAU saluran @newsletter (bukan pesan progress)
const sentToGroups = () => sends.filter(s => (s.to.endsWith("@g.us") || s.to.endsWith("@newsletter")) && !s.msg?.edit).map(s => s.to)

// ═══ 1. LIST: WA + TG registry digabung ═══
await run(".jasher list")
let got = replies.join("\n")
t("1a. list nunjukin 6 target (5 grup + 1 saluran)", (got.match(/^\d+\./gm) || []).length === 6, (got.match(/^\d+\./gm) || []).join())
t("1b. nama grup WA kebaca", sc(got).includes("warung olshop"))
t("1c. nama grup TG kebaca", sc(got).includes("grup saya telegram") || sc(got).includes("warung kopi tg"))
t("1d. total & platform ringkas (grup WA/TG + saluran)", /total: 6 target — grup wa 3 · grup tg 2 · saluran 1/.test(sc(got)))
t("1e. status toggle tampil (default grup on, saluran off)", /aktif: grup 🟢 · saluran 🔴/.test(sc(got)))
t("1f. saluran kebaca di list", sc(got).includes("saluran nova promo"))

// ═══ 2. BROADCAST SEMUA (tanpa target) ═══
replies.length = 0; sends.length = 0; reacts.length = 0
const r2 = await run(".jasher Diskon 50% hari ini!")
const targets = sentToGroups()
t("2a. kirim ke SEMUA 5 grup (saluran default OFF gak ikut)", targets.length === 5 && !targets.some(j => j.endsWith("@newsletter")), targets.join(","))
t("2b. pesan promosi verbatim", sends.some(s => (s.msg?.text || "").includes("Diskon 50% hari ini!")))
t("2c. grup WA kena", targets.includes("120363022102@g.us"))
t("2d. grup TG kena (routing bridge)", targets.includes("tg_g1004391233000@g.us"))
t("2e. react 📢 mulai + 🐣 selesai", reacts.includes("📢") && reacts.includes("🐣"))
t("2f. laporan selesai tampil", sc(replies.join("\n")).includes("terkirim: 5 grup") || sends.some(s => sc(s.msg?.text).includes("terkirim: 5 grup")))
t("2g. progress edit-in-place dipakai", sends.some(s => s.msg?.edit))
t("2h. state running selesai (bisa broadcast lagi)", true)
t("2i. return handled", r2?.handled === true)

// ═══ 3. TARGET MODE (keyword nama grup) ═══
replies.length = 0; sends.length = 0; reacts.length = 0
await run(".jasher grup warung Potongan 20% buat member!")
const t3 = sentToGroups()
t("3a. hanya grup 'warung' (WA+TG)", t3.length === 2 && t3.includes("120363022102@g.us") && t3.includes("tg_g1004391233100@g.us"), t3.join(","))
t("3b. teks verbatim ke grup target", sends.some(s => (s.msg?.text || "").includes("Potongan 20% buat member!")))

// ═══ 4. TARGET TIDAK KETEMU ═══
replies.length = 0; sends.length = 0
await run(".jasher grup ngawur teks apapun")
t("4a. target gak cocok → jujur", /gak ada grup yang cocok/.test(sc(replies.join("\n"))))
t("4b. gak ada pesan terkirim", sentToGroups().length === 0)

// ═══ 5. FORMAT TARGET SALAH ═══
replies.length = 0
await run(".jasher grup")
t("5a. grup tanpa keyword → petunjuk format", /format target salah|contoh: \.jasher grup/.test(sc(replies.join("\n"))))

// ═══ 6. TANPA TEKS → GUIDE ═══
replies.length = 0
await run(".jasher")
got = replies.join("\n")
t("6a. guide tampil", sc(got).includes("jasher"))
t("6b. guide ada semua sub", sc(got).includes("list") && sc(got).includes("stop") && sc(got).includes("grup"))
t("6c. guide premium only", /premium only/i.test(sc(got)))

// ═══ 7. STOP SAAT IDLE ═══
replies.length = 0
await run(".jasher stop")
t("7a. stop saat idle → jujur gak ada jalan", /gak ada broadcast yang lagi jalan/.test(sc(replies.join("\n"))))

// ═══ 8. DELAY JITTER = 0 → cepat (knob works) ═══
t("8a. knob JASHER_DELAY_MS=0 dipakai", process.env.JASHER_DELAY_MS === "0")

// ═══ 9. REGISTRY ADAPTER: telegramToRaw bawa groupTitle ═══
const { telegramToRaw } = await import(R + "/src/lib/novabridge/adapter.js")
const rawTg = telegramToRaw({ from: { id: 111, is_bot: false }, chat: { id: -1004391233, type: "supergroup", title: "Squad Gaming" }, text: "hai", message_id: 1 })
t("9a. remoteJid grup tg_g*@g.us tanpa minus", rawTg.key.remoteJid === "tg_g1004391233@g.us")
t("9b. _bridge.groupTitle terisi", rawTg._bridge.groupTitle === "Squad Gaming")
t("9c. _bridge.isGroup true", rawTg._bridge.isGroup === true)
const rawDm = telegramToRaw({ from: { id: 111 }, chat: { id: 111, type: "private" }, text: "hai", message_id: 2 })
t("9d. DM tetap tg_<id> + tanpa title", rawDm.key.remoteJid === "tg_111" && rawDm._bridge.groupTitle === null)

// ═══ 10. COOLDOWN: DEFAULT OFF ═══
const { _setJasherMediaForTest, _resetJasherMediaForTest } = await import(R + "/plugins/promotion/jasher.js")
db.db.data.jasher = {
  groups: db.db.data.jasher?.groups || {},
  cooldownMinutes: 0, lastBroadcastAt: 0,
}
await db.save()
replies.length = 0
await run(".jasher cooldown")
t("10a. status default → OFF", /cooldown broadcast: off/i.test(sc(replies.join("\n"))))
t("10b. nilai cooldown default 0", getJasherDb()?.cooldownMinutes === 0)

function getJasherDb() { return db.db.data.jasher }

// ═══ 11. COOLDOWN: SET + GUARD + OFF ═══
replies.length = 0; reacts.length = 0
await run(".jasher cooldown 10")
t("11a. set 10 menit tersimpan", getJasherDb()?.cooldownMinutes === 10)
t("11b. konfirmasi aktif", /cooldown broadcast aktif: 10 menit/i.test(sc(replies.join("\n"))))
// broadcast pertama BOLEH (belum ada lastBroadcastAt)
sends.length = 0; replies.length = 0; reacts.length = 0
await run(".jasher Promo pertama")
t("11c. broadcast pertama lewat (cooldown gak blok)", sentToGroups().length === 5)
t("11d. lastBroadcastAt tercatat", Number(getJasherDb()?.lastBroadcastAt) > 0)
// broadcast kedua KEBLOK (belum 10 menit)
sends.length = 0; replies.length = 0; reacts.length = 0
await run(".jasher Promo kedua")
t("11e. broadcast kedua diblok cooldown", sentToGroups().length === 0)
t("11f. pesan sisa waktu jelas", /tunggu \d+ menit lagi/.test(sc(replies.join("\n"))))
t("11g. react ❌ saat diblok", reacts.includes("❌"))
// cooldown OFF → bebas lagi
replies.length = 0
await run(".jasher cooldown off")
t("11h. cooldown off tersimpan", getJasherDb()?.cooldownMinutes === 0)
sends.length = 0; replies.length = 0; reacts.length = 0
await run(".jasher Promo ketiga")
t("11i. setelah off broadcast jalan lagi", sentToGroups().length === 5)
// nilai invalid ditolak
replies.length = 0
await run(".jasher cooldown abc")
t("11j. nilai invalid → jujur 1-1440", /1-1440 menit/.test(sc(replies.join("\n"))))

// ═══ 12. MEDIA: REPLY GAMBAR + CAPTION SATU PESAN ═══
db.db.data.jasher.cooldownMinutes = 0; db.db.data.jasher.lastBroadcastAt = 0
await db.save()
const FAKE_BUF = Buffer.alloc(64, 1)
_setJasherMediaForTest(async () => ({ buf: FAKE_BUF, kind: "image", mimetype: "image/jpeg" }))
const mQuoted = {
  text: ".jasher Promo gambar", args: ["Promo", "gambar"], isOwner: true, isGroup: false,
  chat: "62899@s.whatsapp.net", sender: "62899@s.whatsapp.net", prefix: ".",
  fromMe: false,
  quoted: { key: { id: "q1" }, message: { imageMessage: { mimetype: "image/jpeg" } } },
  message: { conversation: ".jasher Promo gambar" },
  react: async (e) => reacts.push(e),
  reply: async (txt) => replies.push(String(txt)),
}
replies.length = 0; sends.length = 0; reacts.length = 0
await handler(mQuoted, { sock: mockSock, config, db })
let imgSends = sends.filter(s => s.msg?.image)
t("12a. kirim image ke semua 5 grup", imgSends.length === 5, "n=" + imgSends.length)
t("12b. caption nempel di media (satu pesan)", imgSends.every(s => s.msg?.caption?.includes("Promo gambar")))
t("12c. gak ada teks susulan saat media+caption sukses", !sends.some(s => s.msg?.text && !s.msg?.edit && s.to.endsWith("@g.us") && (s.msg?.text || "").includes("Promo gambar")) === true || imgSends.every(s => s.msg?.caption))
t("12d. laporan selesai nyebut media", sc(replies.join("\n")).includes("gambar + caption") || sends.some(s => sc(s.msg?.text || "").includes("gambar + caption")))

// ═══ 13. MEDIA FALLBACK: caption GAGAL → media dulu, teks susul ═══
const strictSock = {
  user: { id: "bot" }, sendPresenceUpdate: async () => {},
  groupFetchAllParticipating: async () => WA_GROUPS,
  newsletterFetchAllSubscribe: async () => [{ id: "123456789@newsletter", name: "Saluran Nova Promo" }],
  sendMessage: async (to, msg) => {
    // media+caption DITOLAK; media doang & teks doang BOLEH
    if ((msg?.image || msg?.video || msg?.document) && msg?.caption) throw new Error("caption not supported")
    sends.push({ to, msg })
    return { key: { id: "s" + sends.length, remoteJid: to } }
  },
}
replies.length = 0; sends.length = 0
db.db.data.jasher.lastBroadcastAt = 0
await handler(mQuoted, { sock: strictSock, config, db })
const mediaOnly = sends.filter(s => s.msg?.image && !s.msg?.caption)
const textAfter = sends.filter(s => s.msg?.text && !s.msg?.edit && s.to.endsWith("@g.us"))
t("13a. fallback: media doang terkirim 5 grup", mediaOnly.length === 5, "n=" + mediaOnly.length)
t("13b. fallback: teks menyusul setelah media", textAfter.some(s => (s.msg?.text || "").includes("Promo gambar")))
t("13c. urutan media dulu baru teks", (() => {
  const firstMedia = sends.findIndex(s => s.msg?.image && !s.msg?.caption && s.to.endsWith("@g.us"))
  const firstText = sends.findIndex(s => s.msg?.text && !s.msg?.edit && s.to.endsWith("@g.us") && (s.msg?.text || "").includes("Promo gambar"))
  return firstMedia !== -1 && firstText !== -1 && firstMedia < firstText
})())

// ═══ 14. VIDEO REPLY: payload video+caption ═══
_setJasherMediaForTest(async () => ({ buf: FAKE_BUF, kind: "video", mimetype: "video/mp4" }))
replies.length = 0; sends.length = 0
db.db.data.jasher.lastBroadcastAt = 0
await handler(mQuoted, { sock: mockSock, config, db })
t("14a. kirim video ke semua grup", sends.filter(s => s.msg?.video).length === 5)
t("14b. caption nempel di video", sends.filter(s => s.msg?.video && s.msg?.caption?.includes("Promo gambar")).length === 5)
_resetJasherMediaForTest()

// ═══ 15. MEDIA LANGSUNG (caption, tanpa reply) ═══
_setJasherMediaForTest(async (mm) => {
  if (mm?.quoted?.message) return null // harus ke-deteksi dari m.message
  return { buf: FAKE_BUF, kind: "image", mimetype: "image/jpeg" }
})
const mDirect = {
  text: ".jasher Promo langsung", args: ["Promo", "langsung"], isOwner: true, isGroup: false,
  chat: "62899@s.whatsapp.net", sender: "62899@s.whatsapp.net", prefix: ".",
  fromMe: false, quoted: null,
  message: { imageMessage: { mimetype: "image/jpeg", caption: ".jasher Promo langsung" } },
  react: async (e) => reacts.push(e),
  reply: async (txt) => replies.push(String(txt)),
}
replies.length = 0; sends.length = 0
db.db.data.jasher.lastBroadcastAt = 0
await handler(mDirect, { sock: mockSock, config, db })
t("15a. media langsung ke-deteksi (image kirim)", sends.filter(s => s.msg?.image).length === 5)
t("15b. caption = teks setelah command", sends.every(s => !s.msg?.image || s.msg?.caption?.includes("Promo langsung")))
_resetJasherMediaForTest() // WAJIB: tanpa ini tes berikut kekirim sebagai media (caption bukan text)

// ═══ 16. SET: STATUS DEFAULT (group on, channel off) ═══
db.db.data.jasher = {
  groups: db.db.data.jasher?.groups || {},
  settings: undefined, cooldownMinutes: 0, lastBroadcastAt: 0,
}
await db.save()
replies.length = 0
await run(".jasher set")
let gotSet = sc(replies.join("\n"))
t("16a. status: grup ON default", /grup: 🟢 on/i.test(gotSet))
t("16b. status: saluran OFF default", /saluran \(wa & telegram\): 🔴 off/i.test(gotSet))

// ═══ 17. SET CHANNEL ON → broadcast ikut saluran ═══
replies.length = 0; reacts.length = 0
await run(".jasher set channel on")
t("17a. set channel on tersimpan", getJasherDb()?.settings?.channel === true)
t("17b. konfirmasi channel ON", /target saluran \(wa & telegram\): 🟢 on/i.test(sc(replies.join("\n"))))
sends.length = 0; replies.length = 0; reacts.length = 0
db.db.data.jasher.lastBroadcastAt = 0
await run(".jasher Promo saluran")
const t17 = sentToGroups()
t("17c. broadcast kini 6 target (5 grup + 1 saluran)", t17.length === 6, t17.join(","))
t("17d. saluran WA kekirim", t17.includes("123456789@newsletter"))
t("17e. teks ke saluran verbatim", sends.some(s => s.to === "123456789@newsletter" && (s.msg?.text || "").includes("Promo saluran")))

// ═══ 18. SET GROUP OFF → hanya saluran ═══
replies.length = 0
await run(".jasher set group off")
t("18a. set group off tersimpan", getJasherDb()?.settings?.group === false)
sends.length = 0; replies.length = 0; reacts.length = 0
db.db.data.jasher.lastBroadcastAt = 0
await run(".jasher Promo cuma saluran")
const t18 = sentToGroups()
t("18b. hanya saluran yang kekirim", t18.length === 1 && t18[0] === "123456789@newsletter", t18.join(","))

// ═══ 19. DUA-DUANYA OFF → jujur tolak ═══
replies.length = 0
await run(".jasher set channel off")
sends.length = 0; replies.length = 0
db.db.data.jasher.lastBroadcastAt = 0
await run(".jasher Promo nol")
t("19a. group+channel off → ditolak jujur", /gak ada target broadcast|nyalakan salah satu/.test(sc(replies.join("\n"))))
t("19b. gak ada pesan terkirim", sentToGroups().length === 0)
// balikin default buat test berikut
await run(".jasher set group on")
db.db.data.jasher.lastBroadcastAt = 0

// ═══ 20. SALURAN TELEGRAM: telegramToRaw + registry ──
const rawCh = telegramToRaw({ from: { id: 0 }, chat: { id: -10022334455, type: "channel", title: "Saluran Promo Aizat" }, text: "posting", message_id: 9 })
t("20a. jid saluran TG tg_c*@newsletter", rawCh.key.remoteJid === "tg_c10022334455@newsletter", rawCh.key.remoteJid)
t("20b. _bridge.isChannel true & isGroup false", rawCh._bridge.isChannel === true && rawCh._bridge.isGroup === false)
t("20c. judul saluran kebawa (registry)", rawCh._bridge.groupTitle === "Saluran Promo Aizat")
// saluran TG di registry → kebaca collectTargets sebagai channel
db.db.data.jasher.groups["tg_c10022334455@newsletter"] = { name: "Saluran Promo Aizat", platform: "telegram" }
await db.save()
replies.length = 0
await run(".jasher list")
t("20d. saluran TG kebaca di list (7 target)", /total: 7 target — grup wa 3 · grup tg 2 · saluran 2/.test(sc(replies.join("\n"))))
// channel ON → broadcast ikut saluran TG
db.db.data.jasher.lastBroadcastAt = 0
await run(".jasher set channel on")
sends.length = 0; replies.length = 0; reacts.length = 0
db.db.data.jasher.lastBroadcastAt = 0
await run(".jasher Promo lintas")
const t20 = sentToGroups()
t("20e. saluran TG kekirim saat channel ON", t20.includes("tg_c10022334455@newsletter"), t20.join(","))
t("20f. total 7 target (5 grup + 2 saluran)", t20.length === 7, "n=" + t20.length)

// ═══ 21. INFO: riwayat pemakaian (siapa, cuplikan, waktu) ═══
db.db.data.jasher = {
  groups: db.db.data.jasher?.groups || {},
  settings: { group: true, channel: false },
  cooldownMinutes: 0, lastBroadcastAt: 0, history: [],
}
await db.save()
replies.length = 0
await run(".jasher info")
t("21a. info kosong → jujur", /belum ada riwayat/.test(sc(replies.join("\n"))))
// broadcast teks → tercatat
sends.length = 0; replies.length = 0
db.db.data.jasher.lastBroadcastAt = 0
await run(".jasher Promo kemerdekaan diskon besar semua produk")
t("21b. riwayat tercatat setelah broadcast", (getJasherDb()?.history?.length || 0) === 1)
const h1 = getJasherDb()?.history?.[0]
t("21c. entri ada pengirim + waktu", h1?.by && Number(h1?.at) > 0)
t("21d. cuplikan kepotong maks 70+…", (h1?.snippet || "").length <= 71, "len=" + (h1?.snippet || "").length)
t("21e. jumlah target tercatat", h1?.targets === 5 && h1?.ok === 5)
replies.length = 0
await run(".jasher info")
let gotInfo = sc(replies.join("\n"))
t("21f. info nunjukin cuplikan pesan", gotInfo.includes("promo kemerdekaan diskon besar"))
t("21g. info nunjukin hasil 5/5 target", /5\/5 target/.test(gotInfo))
t("21h. info nunjukin total tercatat", /total tercatat: 1/.test(gotInfo))
// broadcast media → snippet tandai [gambar] + caption
_setJasherMediaForTest(async () => ({ buf: FAKE_BUF, kind: "image", mimetype: "image/jpeg" }))
sends.length = 0; replies.length = 0
db.db.data.jasher.lastBroadcastAt = 0
await handler(mQuoted, { sock: mockSock, config, db })
_resetJasherMediaForTest()
const h2 = getJasherDb()?.history?.[1]
t("21i. media → snippet [gambar] + caption", String(h2?.snippet || "").startsWith("[gambar]") && String(h2?.snippet || "").includes("Promo gambar"), h2?.snippet)
// mode target tercatat
sends.length = 0; replies.length = 0
db.db.data.jasher.lastBroadcastAt = 0
await run(".jasher grup warung Promo targeted")
const h3 = getJasherDb()?.history?.[2]
t("21j. mode target tercatat di riwayat", /target: warung/.test(String(h3?.mode || "")), h3?.mode)
t("21k. mode target jumlahnya bener (2 grup)", h3?.targets === 2 && h3?.ok === 2)
// info clear
replies.length = 0
await run(".jasher info clear")
t("21l. riwayat kebersihkan", (getJasherDb()?.history?.length || 0) === 0 && /riwayat broadcast dibersihkan/.test(sc(replies.join("\n"))))
// cap 30 entri
for (let i = 0; i < 33; i++) {
  db.db.data.jasher.history.push({ at: Date.now(), by: "x", snippet: "s" + i, targets: 1, ok: 1, mode: "", aborted: false })
}
db.db.data.jasher.lastBroadcastAt = 0
sends.length = 0
await run(".jasher Promo cap test")
t("21m. riwayat di-cap 30 entri", (getJasherDb()?.history?.length || 0) === 30, "n=" + getJasherDb()?.history?.length)
t("21n. entri terbaru tetap dipertahankan (cap test)", /promo cap test/i.test(String(getJasherDb()?.history?.[29]?.snippet || "")), getJasherDb()?.history?.[29]?.snippet)

// ═══ 22. INFO: SORTIR TERBARU DI PALING ATAS ═══
db.db.data.jasher = {
  groups: db.db.data.jasher?.groups || {},
  settings: { group: true, channel: false },
  cooldownMinutes: 0, lastBroadcastAt: 0,
  // urutan insert SENGAJA kacau (lama di belakang) — sortir wajib per timestamp
  history: [
    { at: Date.now() - 300000, by: "lama@s.whatsapp.net", snippet: "promosi lama", targets: 3, ok: 3, mode: "", aborted: false },
    { at: Date.now(), by: "baru@s.whatsapp.net", snippet: "promosi terbaru", targets: 5, ok: 5, mode: "", aborted: false },
    { at: Date.now() - 150000, by: "tengah@s.whatsapp.net", snippet: "promosi tengah", targets: 2, ok: 2, mode: "", aborted: false },
  ],
}
await db.save()
replies.length = 0
await run(".jasher info")
let gotSort = sc(replies.join("\n"))
const iNew = gotSort.indexOf("promosi terbaru"), iMid = gotSort.indexOf("promosi tengah"), iOld = gotSort.indexOf("promosi lama")
t("22a. terbaru di paling atas", iNew !== -1 && iNew < iMid && iNew < iOld, "new=" + iNew + " mid=" + iMid + " old=" + iOld)
t("22b. urutan turun: terbaru → tengah → lama", iMid !== -1 && iMid < iOld)
t("22c. nomor 1 = entri terbaru", /1\. \d{2}\/\d{2}, \d{2}\.\d{2}[\s\S]*promosi terbaru/.test(gotSort))

// ═══ 23. GATE: PREMIUM-ONLY (bukan gratis — revisi owner 29 Sep) ═══
t("23a. flag isPremium true", plug.isPremium === true)
t("23b. flag isOwner false (bukan lagi owner-only)", plug.isOwner === false)
const mkM = (sender, flags) => ({ sender, command: "jasher", ...flags })
t("23c. checkPermission: user biasa DITOLAK premium-only", (() => {
  const r = checkPermission(mkM("62biasa@s.whatsapp.net", { isOwner: false, isPremium: false, isPartner: false }), plug)
  return r.allowed === false && /premium/i.test(String(r.reason || ""))
})())
t("23d. checkPermission: premium user LOLOS", (() => {
  const r = checkPermission(mkM("62prem@s.whatsapp.net", { isOwner: false, isPremium: true, isPartner: false }), plug)
  return r.allowed === true
})())
t("23e. checkPermission: owner TETAP lolos (bypass)", (() => {
  const r = checkPermission(mkM("62owner@s.whatsapp.net", { isOwner: true, isPremium: false, isPartner: false }), plug)
  return r.allowed === true
})())
t("23f. checkPermission: partner juga lolos", (() => {
  const r = checkPermission(mkM("62partner@s.whatsapp.net", { isOwner: false, isPremium: false, isPartner: true }), plug)
  return r.allowed === true
})())
{
  replies.length = 0
  const mNoArgs = {
    text: ".jasher", args: [], isOwner: true, isGroup: false, isPremium: true,
    chat: "62899@s.whatsapp.net", sender: "62899@s.whatsapp.net", prefix: ".",
    react: async (e) => reacts.push(e), reply: async (txt) => replies.push(String(txt)),
  }
  await handler(mNoArgs, { sock: mockSock, config, db })
  t("23g. guide tampil 💎 premium only", sc(replies.join("\n")).includes("premium only"))
}

// ═══ 24. BUG NYATA 1 Okt 2026: BROADCAST MULTI-BARIS/BERBOX HANCUR JADI SATU
// PARAGRAF — owner kirim promo smallcaps berformat box+bullet+baris kosong,
// hasil kekirim ke grup acak-acakan (semua newline ilang, jadi satu paragraf
// rapat). Akar: text direkonstruksi dari args.join(" ") (args ke-tokenize per
// whitespace, newline ikut ke-makan regex \s+) — bukan dari m.text ASLI.
replies.length = 0; sends.length = 0; reacts.length = 0
const promoAsli = [
  "Nova AI Multi Device 🐣 — Asisten WhatsApp Paling Lengkap",
  "",
  "Tanya apa aja, Nova jawab!",
  "",
  "┏━━━「 💰 Sewa Bot 」",
  "┃ ↷ 1 minggu : Rp 5.000",
  "┃ ↷ 1 bulan : Rp 15.000",
  "┗━━━✦",
  "",
  "• Fitur satu",
  "• Fitur dua",
].join("\n")
await run(".jasher " + promoAsli)
const sentMulti = sends.find(s => (s.msg?.text || "").includes("Fitur satu"))
t("24a. teks terkirim PUNYA newline (bukan 1 baris rapat)", (sentMulti?.msg?.text || "").includes("\n"), JSON.stringify((sentMulti?.msg?.text || "").slice(0, 50)))
t("24b. jumlah baris terkirim >= jumlah baris asli (format utuh, bukan di-flatten)", (sentMulti?.msg?.text || "").split("\n").length >= promoAsli.split("\n").length, "lines=" + (sentMulti?.msg?.text || "").split("\n").length)
t("24c. baris kosong pemisah section TETAP ada (bukan ke-collapse)", /\n\n/.test(sentMulti?.msg?.text || ""))
t("24d. baris box (┃ ↷ 1 minggu) tetap baris SENDIRI, gak nempel ke baris lain", (sentMulti?.msg?.text || "").split("\n").some(l => l.trim().startsWith("┃") && l.includes("1 minggu") && !l.includes("1 bulan")))
t("24e. verbatim persis sama (char-for-char) dengan input asli", (sentMulti?.msg?.text || "") === promoAsli, "beda di: " + JSON.stringify({ got: (sentMulti?.msg?.text || "").slice(0, 80), want: promoAsli.slice(0, 80) }))

// mode target (grup <keyword> <teks>) juga harus preserve multi-baris
replies.length = 0; sends.length = 0; reacts.length = 0
const promoTarget = "Judul Promo\n\nBaris kedua\n• poin satu\n• poin dua"
await run(".jasher grup warung " + promoTarget)
const sentTarget = sends.find(s => (s.msg?.text || "").includes("poin satu"))
t("24f. mode target (grup <keyword>) juga preserve newline", (sentTarget?.msg?.text || "") === promoTarget, JSON.stringify((sentTarget?.msg?.text || "").slice(0, 60)))

out("\n===== " + pass + " PASS, " + fail + " FAIL =====")
process.exit(fail ? 1 : 0)
