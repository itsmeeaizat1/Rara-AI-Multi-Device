// E2E: welcome/goodbye — jalur lengkap dari toggle sampai pesan ke-kirim
import path from "node:path"

const out = (s) => process.stdout.write(s + "\n")
let pass = 0, fail = 0
function t(label, cond, extra) {
  if (cond) pass++
  else { fail++; out("FAIL: " + label + " " + (extra || "")) }
}

const R = path.resolve(".")
const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js")
await initDatabase("/tmp/welcome-e2e-db/rara.json")
const db = getDatabase()

const { _setWelcomeCardAiForTest } = await import(R + "/src/lib/rara-welcome-canvas.js")
_setWelcomeCardAiForTest(async () => "Terima kasih atas setiap momennya di sini.")

const { handler: switchHandler } = await import(R + "/plugins/owner/switch.js")
const { groupHandler } = await import(R + "/src/handler.js")
const config = (await import(R + "/config.js")).default

const GID = "120363021234567890@g.us"
const NEWBIE = "6281234567890@s.whatsapp.net"

const replies = [], sent = []
function mockM(args, opts = {}) {
  return {
    command: "switch", args, prefix: ".", text: ".switch " + args.join(" "),
    chat: opts.chat || GID, isGroup: opts.isGroup ?? true, isOwner: true,
    fromMe: false, mentionedJid: null, quoted: null,
    react: async () => {},
    reply: async (txt) => replies.push(String(txt)),
  }
}
let ppUrlMock = null // null = pp private/none
const GROUPS = {
  "120363021234567890@g.us": { id: "120363021234567890@g.us", subject: "Grup Test", participants: [1, 2, 3] },
  "120363098765432109@g.us": { id: "120363098765432109@g.us", subject: "Grup Kedua", participants: [1, 2] },
}
const buttons = []
const mockSock = {
  user: { id: "628777000111:5@s.whatsapp.net" },
  profilePictureUrl: async () => ppUrlMock,
  groupFetchAllParticipating: async () => ({ ...GROUPS }),
  sendButton: async (to, thumb, text, msgCtx, opts) => { buttons.push({ to, text: String(text), opts }); return {} },
  sendPresenceUpdate: async () => {},
  sendMessage: async (to, msg) => { sent.push({ to, msg }); return { key: { id: "m" + sent.length } } },
  groupMetadata: async (gid) => {
    const g = GROUPS[gid]
    if (!g) throw new Error("not found")
    return {
      id: gid, subject: g.subject, desc: "Deskripsi grup test",
      owner: "6289998887777@s.whatsapp.net",
      participants: [{ id: NEWBIE, admin: null }, { id: "6289998887777@s.whatsapp.net", admin: "superadmin" }],
    }
  },
  groupParticipantsUpdate: async () => {},
}

// ═══ 1. Toggle via .switch group welcome on (DI DALAM GRUP) ═══
await switchHandler(mockM(["group", "welcome", "on"]), { sock: mockSock, config })
t("1a. toggle welcome balas", replies.length > 0, "no reply: " + JSON.stringify(replies.at(-1)))
t("1b. db group welcome=true", (db.getGroup(GID) || {}).welcome === true, JSON.stringify(db.getGroup(GID)))

await switchHandler(mockM(["group", "bye", "on"]), { sock: mockSock, config })
t("1c. toggle goodbye (alias bye) balas", replies.length >= 2)
t("1d. db group goodbye=true", (db.getGroup(GID) || {}).goodbye === true, JSON.stringify(db.getGroup(GID)))

// ═══ 2. Event member join → welcome harus ke-kirim ═══
db.setting("botMode", "public")
db.save()
await groupHandler({ id: GID, action: "add", participants: [NEWBIE] }, mockSock)
await new Promise((r) => setTimeout(r, 300))
const welcomeMsg = sent.find((s) => /welcome/i.test(s.msg?.text || "") || /selamat datang|nyampe|mampir/i.test(s.msg?.text || ""))
t("2a. pesan welcome ke-kirim ke grup", !!welcomeMsg, "sent=" + sent.length)
if (welcomeMsg) out("   ↳ welcome: " + String(welcomeMsg.msg.text).split("\n").slice(0, 4).join(" | ").slice(0, 140))
t("2b. welcome mention member baru", JSON.stringify(welcomeMsg?.msg?.mentions || []).includes(NEWBIE))

// ═══ 3. Event member keluar → goodbye harus ke-kirim ═══
await groupHandler({ id: GID, action: "remove", participants: [NEWBIE] }, mockSock)
await new Promise((r) => setTimeout(r, 300))
const byeMsg = sent.find((s) => s.msg && (s.msg.text || "").includes("🚪"))
out("   ↳ isi sent: " + JSON.stringify(sent.map((s) => ({ to: s.to, text: String(s.msg?.text || "").slice(0, 60) })), null, 1).slice(0, 500))
t("3a. pesan goodbye ke-kirim", !!byeMsg, "sent=" + sent.length)
if (byeMsg) out("   ↳ goodbye: " + String(byeMsg.msg.text).split("\n").slice(0, 3).join(" | ").slice(0, 120))

// ═══ 4. Toggle OFF → gak kirim lagi ═══
sent.length = 0
await switchHandler(mockM(["group", "welcome", "off"]), { sock: mockSock, config })
await groupHandler({ id: GID, action: "add", participants: [NEWBIE] }, mockSock)
await new Promise((r) => setTimeout(r, 300))
t("4a. welcome OFF → gak ada pesan", sent.length === 0, "sent=" + sent.length)

// ═══ 5. KARTU CANVAS DALAM PREVIEW (owner 16 Sep 2026): welcome/goodbye kirim
// TEXT + externalAdReply.thumbnail (canvas card), BUKAN image media ═══
await switchHandler(mockM(["group", "welcome", "on"]), { sock: mockSock, config })
await switchHandler(mockM(["group", "bye", "on"]), { sock: mockSock, config })
ppUrlMock = "https://cdn.test/pp.jpg"
const realFetch = globalThis.fetch
// PNG ASLI 1x1 pixel — buffer magic-doang bikin loadImage native segfault
const REAL_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64")
globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => REAL_PNG.buffer.slice(REAL_PNG.byteOffset, REAL_PNG.byteOffset + REAL_PNG.byteLength) })
sent.length = 0
await groupHandler({ id: GID, action: "add", participants: [NEWBIE] }, mockSock)
await new Promise((r) => setTimeout(r, 300))
// NOTE: engineText ke-smallcaps ("W E L C O M E") — match via thumbnail + emoji 👋
const pvWelcome = sent.find((s) => s.msg?.contextInfo?.externalAdReply?.thumbnail && String(s.msg.text || "").includes("👋"))
t("5a. welcome kartu canvas ditanam di PREVIEW (thumbnail)", !!pvWelcome, "sent=" + sent.length)
t("5b. welcome BUKAN media image (gak bisa disimpan galeri)", !!pvWelcome && !pvWelcome.msg.image, "masih ada image")
if (pvWelcome) out("   ↳ welcome preview: " + String(pvWelcome.msg.text).split("\n")[0].slice(0, 60) + " | thumb=" + pvWelcome.msg.contextInfo.externalAdReply.thumbnail.length + "B")
t("5c. welcome mention tetap ada", !!pvWelcome && JSON.stringify(pvWelcome.msg.mentions || []).includes(NEWBIE))
await groupHandler({ id: GID, action: "remove", participants: [NEWBIE] }, mockSock)
await new Promise((r) => setTimeout(r, 300))
const pvBye = sent.find((s) => s.msg?.contextInfo?.externalAdReply?.thumbnail && String(s.msg.text || "").includes("🚪"))
t("5d. goodbye kartu canvas ditanam di PREVIEW (thumbnail)", !!pvBye, "sent=" + sent.length)
t("5e. goodbye BUKAN media image", !!pvBye && !pvBye.msg.image, "masih ada image")
globalThis.fetch = realFetch

// ═══ 6. pp private → kartu tetap jalan (avatar inisial) + preview ═══
ppUrlMock = null
sent.length = 0
await groupHandler({ id: GID, action: "add", participants: [NEWBIE] }, mockSock)
await new Promise((r) => setTimeout(r, 300))
t("6a. pp private → kartu avatar inisial + preview", sent.length === 1 && !!sent[0].msg?.text && !!sent[0].msg?.contextInfo?.externalAdReply?.thumbnail, "sent=" + sent.length)

// ═══ 6b. UNIT: kartu canvas welcome/goodbye render bener (PNG valid) ═══
const { generateWelcomeCard, generateGoodbyeCard } = await import(R + "/src/lib/rara-welcome-canvas.js")
const cardW = await generateWelcomeCard({ groupName: "Grup Test", ppBuffer: null, name: "Budi", memberKe: 5, totalMember: 5 })
const cardB = await generateGoodbyeCard({ groupName: "Grup Test", ppBuffer: null, name: "Budi", apresiasi: "Terima kasih atas setiap momennya di sini." })
t("6b. kartu welcome render (PNG > 10KB)", cardW.length > 10000, cardW.length + "B")
t("6c. kartu goodbye render (PNG > 10KB)", cardB.length > 10000, cardB.length + "B")

// ═══ 7. TARGET TERPUSAT (request owner 10 Sep 2026) ═══
const DM = { chat: "628999@s.whatsapp.net", isGroup: false }
const OTHER_GID = "120363098765432109@g.us"

// 7a. toggle dari DM tanpa target → popup daftar grup (gak nyasar ke jid DM)
buttons.length = 0
await switchHandler(mockM(["group", "bye", "on"], DM), { sock: mockSock, config })
t("7a. DM tanpa target → popup daftar grup", buttons.length === 1 && JSON.stringify(buttons[0].opts).includes("single_select"), "buttons=" + buttons.length)
t("7b. gak ada status nyasar ke jid DM", (db.getGroup(DM.chat) || {}).goodbye === undefined, JSON.stringify(db.getGroup(DM.chat)))

// 7c. .switch group bye on list → popup daftar grup tersedia
buttons.length = 0
await switchHandler(mockM(["group", "bye", "on", "list"], DM), { sock: mockSock, config })
const listBtn = JSON.stringify(buttons[0]?.opts || {})
t("7c. 'on list' → popup list grup", listBtn.includes("single_select") && listBtn.includes(OTHER_GID), listBtn.slice(0, 120))
const before7d = JSON.stringify(db.getGroup(OTHER_GID) || {})
t("7d. list gak ngeset apa-apa", JSON.stringify(db.getGroup(OTHER_GID) || {}) === before7d)

// 7e. .switch group welcome on all → semua grup ON
await switchHandler(mockM(["group", "welcome", "on", "all"], DM), { sock: mockSock, config })
t("7e. 'on all' → kedua grup welcome ON", (db.getGroup(GID) || {}).welcome === true && (db.getGroup(OTHER_GID) || {}).welcome === true, JSON.stringify({ a: db.getGroup(GID)?.welcome, b: db.getGroup(OTHER_GID)?.welcome }))
t("7f. 'on all' balas total grup", /2/.test(replies.at(-1)))

// 7g. .switch group bye on <jid spesifik> → cuma grup itu
await switchHandler(mockM(["group", "bye", "on", OTHER_GID], DM), { sock: mockSock, config })
t("7g. on <jid> → grup itu ON", (db.getGroup(OTHER_GID) || {}).goodbye === true)

// 7i. jid grup yang bot gak masuk → ditolak jelas
const before = JSON.stringify(db.getGroup("1111222233334444@g.us"))
await switchHandler(mockM(["group", "bye", "on", "1111222233334444@g.us"], DM), { sock: mockSock, config })
t("7i. jid gak dikenal ditolak", JSON.stringify(db.getGroup("1111222233334444@g.us")) === before, String(replies.at(-1)).slice(0, 90))

// 7j. .switch group bye off all → semua OFF
await switchHandler(mockM(["group", "bye", "off", "all"], DM), { sock: mockSock, config })
t("7j. 'off all' → kedua grup bye OFF", (db.getGroup(GID) || {}).goodbye === false && (db.getGroup(OTHER_GID) || {}).goodbye === false, JSON.stringify({ a: db.getGroup(GID)?.goodbye, b: db.getGroup(OTHER_GID)?.goodbye }))

process.stdout.write("\n===== " + pass + " PASS, " + fail + " FAIL =====\n")
await new Promise((r) => setTimeout(r, 400))
process.exit(fail ? 1 : 0)
