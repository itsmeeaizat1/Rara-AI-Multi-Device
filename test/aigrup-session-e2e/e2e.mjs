// E2E: aigrup per-session jadibot — default OFF saat pairing pertama
// + isolasi dari flag global bot utama + toggle on/off per-session.
import fs from "node:fs"
import path from "node:path"

const out = (s) => process.stdout.write(s + "\n")
let pass = 0, fail = 0
function t(label, cond, extra) {
  if (cond) { pass++ }
  else { fail++; out("FAIL: " + label + " " + (extra || "")) }
}

const R = path.resolve(".")
const { initDatabase } = await import(R + "/src/lib/nova-database.js")
await initDatabase("/tmp/aigrup-session-db/nova.json")
const db = (await import(R + "/src/lib/nova-database.js")).getDatabase()

const { isAiGrupEnabled, handleAiGrup } = await import(R + "/src/lib/nova-aigroupchat.js")
const { handler } = await import(R + "/plugins/ai/aigroupchat.js")
const { getJadibotSetting, setJadibotSetting } = await import(R + "/src/lib/nova-jadibot-database.js")
const config = (await import(R + "/config.js")).default

const CHILD = "628111222333@s.whatsapp.net"
const ctx = { sock: {}, config, isJadibot: true, jadibotId: CHILD }

const replies = [], reacts = []
const sent = []
const mockSock = (botId) => ({
  user: { id: botId },
  sendPresenceUpdate: async () => {},
  sendMessage: async (to, msg) => { sent.push({ to, msg }); return { key: { id: "m" + sent.length } } },
  relayMessage: async (to, msg, o) => { sent.push({ to, msg }); return { key: { id: "m" + sent.length } } },
})
function mockM(text, opts = {}) {
  return {
    text, isOwner: opts.isOwner ?? true, isGroup: opts.isGroup ?? true,
    chat: opts.chat || "120363022101@g.us",
    sender: "628999@s.whatsapp.net",
    fromMe: false, mentionedJid: opts.mentioned || null, quoted: null,
    message: { conversation: text },
    react: async (e) => reacts.push(e),
    reply: async (txt) => replies.push(String(txt)),
  }
}

// ═══ 1. DEFAULT OFF SAAT PAIRING PERTAMA ═══
t("1a. session baru → isAiGrupEnabled false (default OFF)", isAiGrupEnabled(ctx) === false)

// flag global bot utama dipaksa ON — session baru TETAP OFF (isolation)
db.db.data.aigrup = { enabled: true, groups: {}, probability: 10, format: "openai", model: "deepseek-v4-flash:free" }
await db.save()
t("1b. global bot utama ON, session baru TETAP OFF", isAiGrupEnabled(ctx) === false)
t("1c. bot utama isAiGrupEnabled({}) → true", isAiGrupEnabled({}) === true)

// handleAiGrup gak nimbrung walau ada pesan (state session OFF)
const before = replies.length
const noReply = await handleAiGrup(mockM("halo semua apa kabar?", { mentioned: [CHILD] }), mockSock(CHILD), undefined, ctx)
t("1d. handleAiGrup session OFF → tidak nimbrung", noReply === false && replies.length === before)

// ═══ 2. TOGGLE PER-SESSION ═══
// .aigrup status di session → nunjukin OFF + default info
await handler(mockM(".aigrup status"), ctx)
const stTxt = replies.at(-1)
t("2a. status session: OFF", /ᴏꜰꜰ|OFF/i.test(stTxt))
t("2b. status session: kasih tahu default baru OFF", /ᴅᴇꜰᴀᴜʟᴛ|default/i.test(stTxt))

// .aigrup on di session
await handler(mockM(".aigrup on"), ctx)
t("2c. .aigrup on session → reply ON", /ᴏɴ|ON/i.test(replies.at(-1)))
const st = getJadibotSetting(CHILD, "aigrup")
t("2d. state session persist enabled=true", st?.enabled === true, JSON.stringify(st))
t("2e. global bot utama gak keubah", db.db.data.aigrup.enabled === true)
t("2f. isAiGrupEnabled(ctx) sekarang true", isAiGrupEnabled(ctx) === true)

// ═══ 3. NIMBRUNG SETELAH ON (AI live via Tio) ═══
replies.length = 0
const handled = await handleAiGrup(
  mockM("halo nova, ada yang tau film bagus?", { mentioned: [CHILD] }),
  mockSock(CHILD), undefined, ctx
)
t("3a. handleAiGrup session ON → nimbrung (handled true)", handled === true)
t("3b. ada balasan AI terkirim", replies.length > 0 || sent.length > 0, "replies=" + replies.length + " sent=" + sent.length)
const sample = replies[0] || JSON.stringify(sent[0]?.msg || {}).slice(0, 200)
if (sample) out("   ↳ balasan AI: " + String(sample).slice(0, 90))

// ═══ 4. OFF LAGI + NON-OWNER DITOLAK ═══
setJadibotSetting(CHILD, "aigrup", { ...st, enabled: false })
t("4a. setelah off, isAiGrupEnabled false", isAiGrupEnabled(ctx) === false)
await handler(mockM(".aigrup on", { isOwner: false }), ctx)
t("4b. non-owner nyoba on → ditolak", /ᴅɪᴛᴏʟᴀᴋ|ditolak/i.test(replies.at(-1)))
t("4c. state tetap OFF setelah penolakan", getJadibotSetting(CHILD, "aigrup")?.enabled === false)

// ═══ 5. REGRESI: jalur bot utama tetap kayak dulu ═══
// (handler dipanggil tanpa isJadibot → kode lama jalan)
const mainCtx = { sock: {}, config }
replies.length = 0
await handler(mockM(".aigrup status", { isGroup: false, chat: "628999@s.whatsapp.net" }), mainCtx)
t("5a. bot utama status tetap jalan (baca global)", replies.length > 0)
await handler(mockM(".aigrup off", { isGroup: false, chat: "628999@s.whatsapp.net" }), mainCtx)
out("   ↳ reply off: " + String(replies.at(-1) || "<kosong>").split("\n").join(" | ").slice(0, 140))
t("5b. bot utama .aigrup off → global OFF", db.db.data.aigrup.enabled === false)

// bersihin state jadibot test
try { fs.rmSync(path.join(R, "session", "jadibot", CHILD.replace("@s.whatsapp.net", "")), { recursive: true, force: true }) } catch {}

process.stdout.write("\n===== " + pass + " PASS, " + fail + " FAIL =====\n")
await new Promise((r) => setTimeout(r, 400))
process.exit(fail ? 1 : 0)
