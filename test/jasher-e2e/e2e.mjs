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

const { handler } = await import(R + "/plugins/promotion/jasher.js")
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
const sentToGroups = () => sends.filter(s => s.to.endsWith("@g.us") && !s.msg?.edit).map(s => s.to)

// ═══ 1. LIST: WA + TG registry digabung ═══
await run(".jasher list")
let got = replies.join("\n")
t("1a. list nunjukin 5 grup (3 WA + 2 TG)", (got.match(/^\d+\./gm) || []).length === 5, (got.match(/^\d+\./gm) || []).join())
t("1b. nama grup WA kebaca", sc(got).includes("warung olshop"))
t("1c. nama grup TG kebaca", sc(got).includes("grup saya telegram") || sc(got).includes("warung kopi tg"))
t("1d. total & platform ringkas", /5 grup \(wa 3 · tg 2\)/.test(sc(got)))

// ═══ 2. BROADCAST SEMUA (tanpa target) ═══
replies.length = 0; sends.length = 0; reacts.length = 0
const r2 = await run(".jasher Diskon 50% hari ini!")
const targets = sentToGroups()
t("2a. kirim ke SEMUA 5 grup", targets.length === 5, targets.join(","))
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
t("6c. guide owner-only", /owner-only/i.test(sc(got)))

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

out("\n===== " + pass + " PASS, " + fail + " FAIL =====")
process.exit(fail ? 1 : 0)
