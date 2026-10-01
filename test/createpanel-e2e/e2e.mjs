// E2E createserver — format baru .10gb unli, nama / .10gb unli, 200, nama
// Mock HTTP panel lokal (127.0.0.1) → verifikasi payload limits disk/cpu ke-tembak API.
import http from "node:http"
import fs from "node:fs"
const ckpt = (s) => fs.appendFileSync("/tmp/e2e-ckpt.log", s + "\n")
ckpt("start")
import { initDatabase } from "../../src/lib/rara-database.js"

await initDatabase("/tmp/createpanel-e2e-db/rara.json")
ckpt("db ok")
const { handler, parseDiskCpu, config } = await import("../../plugins/panel/createserver.js")
ckpt("plugin imported")
const cfg = (await import("../../config.js")).default
ckpt("config ok")

let pass = 0, fail = 0
function t(label, cond, extra) {
  if (cond) { pass++ }
  else { fail++; process.stdout.write("FAIL: " + label + " " + (extra || "") + "\n") }
}

ckpt("bagian1")
// ═══ BAGIAN 1: unit parser ═══
const u = parseDiskCpu("unli, budi")
t("1a. unli, budi → disk 0 cpu 0", u && u.diskMB === 0 && u.cpuPct === 0 && u.username === "budi")
const v = parseDiskCpu("unli, 200, nico")
t("1b. unli, 200, nico → cpu 200", v && v.diskMB === 0 && v.cpuPct === 200 && v.username === "nico")
const w = parseDiskCpu("unli 200, nico") // spasi campur koma (gaya kode owner)
t("1c. 'unli 200, nico' → sama 1b", w && w.diskMB === 0 && w.cpuPct === 200 && w.username === "nico")
const x = parseDiskCpu("5000, 100, nama, 62812345678")
t("1d. 5000, 100, nama, 628xxx → disk 5000 cpu 100 + target", x && x.diskMB === 5000 && x.cpuPct === 100 && x.username === "nama" && x.nomor === "62812345678")
t("1e. format LAMA username,628xxx → null (bukan format baru)", parseDiskCpu("budi, 62812345678") === null)
t("1f. 'budi' tanpa koma → null", parseDiskCpu("budi") === null)
t("1g. '0, budi' → disk unlimited", parseDiskCpu("0, budi")?.diskMB === 0)
t("1h. cpu unli eksplisit", parseDiskCpu("unli, unli, budi")?.cpuPct === 0)
t("1i. guard cpu > 1000 ditolak", parseDiskCpu("unli, 2000, budi") === null)

ckpt("bagian2: pass=" + pass + " fail=" + fail)
// ═══ BAGIAN 2: full flow ke mock panel HTTP ═══
const created = []   // payload servers yang diterima mock
const srv = http.createServer((req, res) => {
  let body = ""
  req.on("data", (c) => body += c)
  req.on("end", () => {
    const json = body ? JSON.parse(body) : {}
    res.setHeader("content-type", "application/json")
    if (req.url.startsWith("/api/application/users")) {
      res.end(JSON.stringify({ attributes: { id: 101, username: json.username, first_name: json.first_name } }))
    } else if (req.url.includes("/eggs/")) {
      res.end(JSON.stringify({ attributes: { startup: "npm start" } }))
    } else if (req.url.startsWith("/api/application/servers") && req.method === "POST") {
      created.push(json)
      res.end(JSON.stringify({ attributes: { id: 999, name: json.name } }))
    } else if (req.url.startsWith("/api/auth/login")) {
      res.statusCode = 401; res.end("{}")
    } else { res.statusCode = 404; res.end("{}") }
  })
})
await new Promise((r) => srv.listen(0, "127.0.0.1", r))
ckpt("server listen port=" + srv.address().port)
const PORT = srv.address().port
cfg.pterodactyl.server1 = { domain: "http://127.0.0.1:" + PORT, apikey: "ptla_mock", capikey: "", egg: "15", nestid: "5", location: "1" }

const { getDatabase } = await import("../../src/lib/rara-database.js")
getDatabase().setting("panelCreateJeda", 0) // matiin jeda 5 menit buat e2e

const replies = []
const reacted = []
const sock = {
  onWhatsApp: async (n) => [{ exists: true }],
  relayMessage: async (to, msg, o) => { replies.push({ to, kind: "relay" }) },
  waUploadToServer: async () => ({}),
}
function resetJeda() { getDatabase().setting("panelCreateLastUsed", 0) }
function mockM(cmd, text, opts = {}) {
  resetJeda()
  return {
    command: cmd, args: text.split(/[\s,]+/), text, prefix: ".",
    sender: opts.sender || "628000@s.whatsapp.net", chat: "628000@s.whatsapp.net",
    isOwner: opts.isOwner ?? true, isGroup: false,
    mentionedJid: null, quoted: null,
    react: async (e) => reacted.push(e),
    reply: async (txt) => replies.push({ kind: "reply", txt: String(txt) }),
  }
}

// 2a. .10gb unli, budi → RAM 10GB disk unli cpu unli
await handler(mockM("10gb", "unli, budi"), { sock })
let p = created[0]
t("2a. memory 10240 (10GB)", p?.limits?.memory === 10240, JSON.stringify(p?.limits))
t("2b. disk 0 (unli)", p?.limits?.disk === 0)
t("2c. cpu 0 (unli ikut)", p?.limits?.cpu === 0)
t("2d. reaksi 🕒 → 🐣", reacted[0] === "🕒" && reacted.at(-1) === "🐣")

// 2b. .10gb unli, 200, nico → cpu 200
await handler(mockM("10gb", "unli, 200, nico"), { sock })
p = created[1]
t("2e. cpu custom 200 (2 core)", p?.limits?.cpu === 200, JSON.stringify(p?.limits))
t("2f. disk tetap unli", p?.limits?.disk === 0)
t("2g. detail kirim ke target (relay)", replies.some(r => r.kind === "relay"))

// 2c. disk angka + cpu angka + target
await handler(mockM("5gb", "5000, 100, nama, 62812345678"), { sock })
p = created[2]
t("2h. memory 5120 (5GB)", p?.limits?.memory === 5120)
t("2i. disk 5000 MB", p?.limits?.disk === 5000)
t("2j. cpu 100", p?.limits?.cpu === 100)

// 2d. format LAMA masih jalan: .1gb username → spec default RAM_SPECS
await handler(mockM("1gb", "userlama"), { sock })
p = created[3]
t("2k. format lama disk 1024", p?.limits?.disk === 1024, JSON.stringify(p?.limits))
t("2l. format lama cpu 70", p?.limits?.cpu === 70)
t("2m. format lama memory 1024", p?.limits?.memory === 1024)

// 2e. label CPU/Storage muncul di output
const replyTxts = replies.map(r => r.txt || "").join("\n")
t("2n. label CPU muncul di reply", /CPU|ᴄᴘᴜ/i.test(replyTxts))
t("2o. label Storage muncul", /STORAGE|ꜱᴛᴏʀᴀɢᴇ/i.test(replyTxts))

ckpt("akhir: pass=" + pass + " fail=" + fail)
srv.close()
process.stdout.write("\n===== " + pass + " PASS, " + fail + " FAIL =====\n")
await new Promise(r => setTimeout(r, 400))
process.exit(fail ? 1 : 0)
