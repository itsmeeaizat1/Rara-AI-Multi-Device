// E2E: welcome/goodbye — jalur lengkap dari toggle sampai pesan ke-kirim
import path from "node:path"

const out = (s) => process.stdout.write(s + "\n")
let pass = 0, fail = 0
function t(label, cond, extra) {
  if (cond) pass++
  else { fail++; out("FAIL: " + label + " " + (extra || "")) }
}

const R = path.resolve(".")
const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js")
await initDatabase("/tmp/welcome-e2e-db/nova.json")
const db = getDatabase()

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
const mockSock = {
  user: { id: "628777000111:5@s.whatsapp.net" },
  profilePictureUrl: async () => ppUrlMock,
  sendPresenceUpdate: async () => {},
  sendMessage: async (to, msg) => { sent.push({ to, msg }); return { key: { id: "m" + sent.length } } },
  groupMetadata: async (gid) => ({
    id: gid, subject: "Grup Test", desc: "Deskripsi grup test",
    owner: "6289998887777@s.whatsapp.net",
    participants: [{ id: NEWBIE, admin: null }, { id: "6289998887777@s.whatsapp.net", admin: "superadmin" }],
  }),
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

// ═══ 5. THUMBNAIL: pp tersedia → welcome/goodbye kirim IMAGE + caption ═══
await switchHandler(mockM(["group", "welcome", "on"]), { sock: mockSock, config })
await switchHandler(mockM(["group", "bye", "on"]), { sock: mockSock, config })
ppUrlMock = "https://cdn.test/pp.jpg"
const realFetch = globalThis.fetch
globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]).buffer })
sent.length = 0
await groupHandler({ id: GID, action: "add", participants: [NEWBIE] }, mockSock)
await new Promise((r) => setTimeout(r, 300))
const imgWelcome = sent.find((s) => s.msg?.image)
t("5a. welcome kirim IMAGE (pp member)", !!imgWelcome && !!imgWelcome.msg.caption, "sent=" + sent.length)
if (imgWelcome) out("   ↳ welcome image caption: " + String(imgWelcome.msg.caption).split("\n")[0].slice(0, 60))
await groupHandler({ id: GID, action: "remove", participants: [NEWBIE] }, mockSock)
await new Promise((r) => setTimeout(r, 300))
const imgBye = sent.find((s) => s.msg?.image && String(s.msg.caption || "").includes("🚪"))
t("5b. goodbye kirim IMAGE (pp member)", !!imgBye, "sent=" + sent.length)
globalThis.fetch = realFetch

// ═══ 6. pp private → fallback teks (aman) ═══
ppUrlMock = null
sent.length = 0
await groupHandler({ id: GID, action: "add", participants: [NEWBIE] }, mockSock)
await new Promise((r) => setTimeout(r, 300))
t("6a. pp private → fallback pesan teks", sent.length === 1 && !!sent[0].msg?.text, "sent=" + sent.length)

// ═══ 7. GUARD DM: toggle bye dari DM → ditolak jelas, gak nyimpen ke jid DM ═══
replies.length = 0
await switchHandler(mockM(["group", "bye", "on"], { chat: "628999@s.whatsapp.net", isGroup: false }), { sock: mockSock, config })
const dmReply = replies.at(-1)
t("7a. toggle dari DM ditolak dengan arahan", /ʜᴀʀᴜꜱ|di dalam grup/i.test(dmReply), String(dmReply).slice(0, 100))
t("7b. gak ada status nyasar ke jid DM", (db.getGroup("628999@s.whatsapp.net") || {}).goodbye === undefined, JSON.stringify(db.getGroup("628999@s.whatsapp.net")))

process.stdout.write("\n===== " + pass + " PASS, " + fail + " FAIL =====\n")
await new Promise((r) => setTimeout(r, 400))
process.exit(fail ? 1 : 0)
