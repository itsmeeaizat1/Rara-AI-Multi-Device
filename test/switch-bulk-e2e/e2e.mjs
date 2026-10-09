// E2E: bulk on/off terpusat — .switch auto all | .switch group all [target] | .switch semua (master)
import path from "node:path"

const out = (s) => process.stdout.write(s + "\n")
let pass = 0, fail = 0
function t(label, cond, extra) {
  if (cond) pass++
  else { fail++; out("FAIL: " + label + " " + (extra || "")) }
}

const R = path.resolve(".")
const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js")
await initDatabase("/tmp/switch-bulk-e2e/db.json")
const db = getDatabase()

const { handler: switchHandler } = await import(R + "/plugins/owner/switch.js")
// Format promosi 9 Okt 2026: kartu switch pakai teks polos (bukan smallcaps)
const reSC = (s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
const { getAllNotifyStatus } = await import(R + "/src/lib/rara-saluran-broadcast.js")
const config = (await import(R + "/config.js")).default

const GID = "120363021234567890@g.us"
const OTHER_GID = "120363098765432109@g.us"
const replies = []
const buttons = []

function mockM(args, opts = {}) {
  return {
    command: "switch", args, prefix: ".", text: ".switch " + args.join(" "),
    chat: opts.chat || GID, isGroup: opts.isGroup ?? true, isOwner: true,
    fromMe: false, mentionedJid: null, quoted: null,
    react: async () => {},
    reply: async (txt) => replies.push(String(txt)),
  }
}
const mockSock = {
  user: { id: "628777000111:5@s.whatsapp.net" },
  groupFetchAllParticipating: async () => ({
    [GID]: { id: GID, subject: "Grup Test", participants: [1, 2, 3] },
    [OTHER_GID]: { id: OTHER_GID, subject: "Grup Kedua", participants: [1, 2] },
  }),
  sendButton: async (to, thumb, text, msgCtx, opts) => { buttons.push({ opts }); return {} },
  groupMetadata: async (gid) => ({ id: gid, subject: "Grup " + gid.slice(-4), participants: [1, 2] }),
}

// ═══ 1. .switch auto all on → semua fitur otomatis ON ═══
await switchHandler(mockM(["auto", "all", "on"]), { sock: mockSock, config })
t("1a. auto all on balas ALL ON", reSC("ALL ON").test(replies.at(-1) || ""), String(replies.at(-1)).slice(0, 80))
t("1b. autoRead ON", db.setting("autoRead") === true, String(db.setting("autoRead")))
t("1c. autoTyping ON", db.setting("autoTyping") === true, String(db.setting("autoTyping")))

// ═══ 2. .switch auto all off → semua OFF ═══
await switchHandler(mockM(["auto", "all", "off"]), { sock: mockSock, config })
t("2a. auto all off balas ALL OFF", reSC("ALL OFF").test(replies.at(-1) || ""))
t("2b. autoRead OFF", db.setting("autoRead") === false)

// ═══ 3. .switch auto all (tanpa verb) → panduan ═══
await switchHandler(mockM(["auto", "all"]), { sock: mockSock, config })
t("3a. auto all tanpa verb → panduan", reSC("switch auto all on").test(replies.at(-1) || ""))

// ═══ 4. .switch group all on (di dalam grup) → semua fitur grup ON ═══
await switchHandler(mockM(["group", "all", "on"]), { sock: mockSock, config })
const gd = db.getGroup(GID) || {}
t("4a. group all on → welcome ON", gd.welcome === true, JSON.stringify(gd).slice(0, 80))
t("4b. group all on → goodbye ON", gd.goodbye === true)
t("4c. group all on → antilinkgc ON (mode string)", gd.antilinkgc === "on", String(gd.antilinkgc))

// ═══ 5. .switch group all off <jid> dari DM → grup itu semua OFF ═══
await switchHandler(mockM(["group", "all", "off", OTHER_GID], { chat: "628999@s.whatsapp.net", isGroup: false }), { sock: mockSock, config })
const od = db.getGroup(OTHER_GID) || {}
t("5a. group all off <jid> → goodbye OFF", od.goodbye === false, JSON.stringify(od).slice(0, 80))
t("5b. group all off <jid> → welcome OFF", od.welcome === false)

// ═══ 6. .switch group all on dari DM tanpa target → wajib target ═══
await switchHandler(mockM(["group", "all", "on"], { chat: "628999@s.whatsapp.net", isGroup: false }), { sock: mockSock, config })
t("6a. DM tanpa target → wajib target", reSC("wajib pakai target").test(replies.at(-1) || "") || reSC("<jid-grup>").test(replies.at(-1) || ""), String(replies.at(-1)).slice(0, 80))

// ═══ 7. .switch group all on list → popup ═══
buttons.length = 0
await switchHandler(mockM(["group", "all", "on", "list"], { chat: "628999@s.whatsapp.net", isGroup: false }), { sock: mockSock, config })
t("7a. group all on list → popup grup", buttons.length === 1 && JSON.stringify(buttons[0].opts).includes(GID))

// ═══ 8. MASTER .switch semua on → auto + saluran + group sekaligus ═══
db.setting("autoRead", false); db.save()
await switchHandler(mockM(["semua", "on"]), { sock: mockSock, config })
const masterReply = replies.at(-1) || ""
t("8a. master on → SEMUA ON", reSC("SEMUA ON").test(masterReply), masterReply.slice(0, 100))
t("8b. master on → autoRead ON", db.setting("autoRead") === true)
const statuses = getAllNotifyStatus()
const chOn = Object.values(statuses).filter((s) => s.enabled).length
t("8c. master on → semua event saluran ON", chOn === Object.keys(statuses).length, chOn + "/" + Object.keys(statuses).length)
const gd2 = db.getGroup(GID) || {}
t("8d. master on → group welcome ON", gd2.welcome === true)

// ═══ 9. MASTER .switch semua off ═══
await switchHandler(mockM(["semua", "off"]), { sock: mockSock, config })
t("9a. master off → SEMUA OFF", reSC("SEMUA OFF").test(replies.at(-1) || ""))
t("9b. master off → autoRead OFF", db.setting("autoRead") === false)
t("9c. master off → group welcome OFF", (db.getGroup(GID) || {}).welcome === false)

// ═══ 10. .switch semua tanpa verb → panduan master ═══
await switchHandler(mockM(["semua"]), { sock: mockSock, config })
t("10a. master tanpa verb → panduan", reSC("master switch terpusat").test(replies.at(-1) || ""))

// ═══ 11. DIRECT: .switch welcome on (tanpa keyword subsistem) ═══
db.setGroup(GID, { welcome: false }); db.save()
await switchHandler(mockM(["welcome", "on"]), { sock: mockSock, config })
t("11a. .switch welcome on → fitur grup aktif", (db.getGroup(GID) || {}).welcome === true, JSON.stringify(db.getGroup(GID)))

// ═══ 12. DIRECT + TARGET: .switch welcome on all ═══
db.setGroup(GID, { welcome: false }); db.setGroup(OTHER_GID, { welcome: false }); db.save()
await switchHandler(mockM(["welcome", "on", "all"]), { sock: mockSock, config })
t("12a. .switch welcome on all → semua grup", (db.getGroup(GID) || {}).welcome === true && (db.getGroup(OTHER_GID) || {}).welcome === true)

// ═══ 13. DIRECT: .switch antilinkgc on <jid> ═══
db.setGroup(OTHER_GID, { antilinkgc: "off" }); db.save()
await switchHandler(mockM(["antilinkgc", "on", OTHER_GID]), { sock: mockSock, config })
t("13a. .switch antilinkgc on <jid> → grup itu ON", (db.getGroup(OTHER_GID) || {}).antilinkgc === "on", JSON.stringify(db.getGroup(OTHER_GID)))

// ═══ 14. DIRECT: .switch autoread on (fitur otomatis) ═══
db.setting("autoRead", false); db.save()
await switchHandler(mockM(["autoread", "on"]), { sock: mockSock, config })
t("14a. .switch autoread on → autoRead ON", db.setting("autoRead") === true, String(db.setting("autoRead")))
await switchHandler(mockM(["autoread", "off"]), { sock: mockSock, config })
t("14b. .switch autoread off → autoRead OFF", db.setting("autoRead") === false)

// ═══ 15. DIRECT: .switch sewaRegister off (event saluran) ═══
const statuses15 = getAllNotifyStatus()
const evKey = Object.keys(statuses15)[0]
db.save()
await switchHandler(mockM([evKey, "off"]), { sock: mockSock, config })
t("15a. .switch <event> off → event saluran OFF", getAllNotifyStatus()[evKey]?.enabled === false, JSON.stringify(getAllNotifyStatus()[evKey]))
await switchHandler(mockM([evKey, "on"]), { sock: mockSock, config })
t("15b. .switch <event> on → event saluran ON", getAllNotifyStatus()[evKey]?.enabled === true)

// ═══ 16. DIRECT dari DM tanpa target → popup daftar grup ═══
buttons.length = 0
await switchHandler(mockM(["goodbye", "on"], { chat: "628999@s.whatsapp.net", isGroup: false }), { sock: mockSock, config })
t("16a. direct DM tanpa target → popup grup", buttons.length === 1 && JSON.stringify(buttons[0].opts).includes(GID))

// ═══ 17. DETEKSI KETERSEDIAAN: .switch welcome (tanpa verb) → info scope ═══
db.setGroup(GID, { welcome: true }); db.save()
await switchHandler(mockM(["welcome"]), { sock: mockSock, config })
const infoReply = replies.at(-1) || ""
t("17a. info scope grup", infoReply.includes("📍") && reSC("Grup").test(infoReply), infoReply.slice(0, 90))
t("17b. info status grup ini", reSC("Status di grup ini").test(infoReply))
t("17c. info cara on/off", reSC("Aktifkan").test(infoReply))

// ═══ 18. DETEKSI dari DM: fitur grup gak bisa aktif di DM ═══
await switchHandler(mockM(["welcome"], { chat: "628999@s.whatsapp.net", isGroup: false }), { sock: mockSock, config })
t("18a. DM → info gak bisa aktif di DM", reSC("gak bisa aktif di DM").test(replies.at(-1) || ""), String(replies.at(-1)).slice(0, 90))

// ═══ 19. SCOPE di reply toggle: grup 📍 / global 🌍 / saluran 📢 ═══
await switchHandler(mockM(["welcome", "on"]), { sock: mockSock, config })
t("19a. toggle grup → baris 📍 Grup", (replies.at(-1) || "").includes("📍"))
await switchHandler(mockM(["autoread", "on"]), { sock: mockSock, config })
t("19b. toggle auto → baris 🌍 Global", (replies.at(-1) || "").includes("🌍"))
await switchHandler(mockM([evKey, "on"]), { sock: mockSock, config })
t("19c. toggle saluran → baris 📢", (replies.at(-1) || "").includes("📢"))

// ═══ 19b. BROADCAST CPANEL via .switch auto (request owner 6 Okt) ═══
const cbc = (await import(R + "/src/lib/rara-saluran-broadcast.js"))
await switchHandler(mockM(["auto", "broadcastcpanel", "on"]), { sock: mockSock, config })
t("19b-a. .switch auto broadcastcpanel on → serverCreated ON",
  (await cbc.getAllNotifyStatus()).serverCreated?.enabled === true,
  JSON.stringify((await cbc.getAllNotifyStatus()).serverCreated))
t("19b-b. balasan menyebut label fitur", /Broadcast Cpanel/i.test(replies.at(-1) || ""), String(replies.at(-1)).slice(0, 80))
await switchHandler(mockM(["auto", "cpanel", "off"]), { sock: mockSock, config })
t("19b-c. alias .switch auto cpanel off → serverCreated OFF",
  (await cbc.getAllNotifyStatus()).serverCreated?.enabled === false)
await switchHandler(mockM(["auto", "broadcastcpanel"]), { sock: mockSock, config })
t("19b-d. tanpa verb → info status fitur (gak error)", replies.at(-1) != null && replies.length > 0)

// ═══ 20. .switch status all → legenda scope ═══
await switchHandler(mockM(["status", "all"]), { sock: mockSock, config })
const stReply = replies.at(-1) || ""
t("20a. status all legenda scope", stReply.includes("📍") && stReply.includes("🌍") && stReply.includes("📢"))

out("\n===== " + pass + " PASS, " + fail + " FAIL =====")
await new Promise((r) => setTimeout(r, 400))
process.exit(fail ? 1 : 0)
