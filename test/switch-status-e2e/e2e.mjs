// E2E: .switch format status baru (nama fitur smallcaps + status di akhir)
// + command ".switch status all" menampilkan semua status aktif & mati.
import path from "node:path"

const out = (s) => process.stdout.write(s + "\n")
let pass = 0, fail = 0
function t(label, cond, extra) {
  if (cond) pass++
  else { fail++; out("FAIL: " + label + " " + (extra || "")) }
}

const R = path.resolve(".")
const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js")
await initDatabase("/tmp/switch-status-db/nova.json")
const db = getDatabase()

const { handler } = await import(R + "/plugins/owner/switch.js")
const { toSC } = await import(R + "/src/lib/nova-menu-style.js")
const config = { command: { prefix: "." }, saluran: { name: "Test" } }

const replies = []
function mockM(args, opts = {}) {
  return {
    command: "switch", args, prefix: ".",
    chat: opts.chat || "628999@s.whatsapp.net",
    isGroup: opts.isGroup ?? false,
    isOwner: true,
    react: async () => {},
    reply: async (txt) => replies.push(String(txt)),
  }
}

const scOn = toSC("on"), scOff = toSC("off")
const expectLine = (txt, key, state) =>
  txt.includes(toSC(key) + " " + (state ? scOn : scOff))

// ═══ 1. .switch status all (DM) ═══
await handler(mockM(["status", "all"]), { sock: {}, config })
const all = replies.at(-1)
t("1a. header kategori smallcaps", all.includes(toSC("Info & Utilitas")), all.slice(0, 200))
t("1b. gak ada lagi format lama 'ON  key'", !/^ON {1,2}/m.test(all) && !/\nON /.test(all))
t("1c. bencanawatch ada status di akhir", expectLine(all, "bencanawatch", true) || expectLine(all, "bencanawatch", false))
t("1d. semua fitur auto ke-list (webwatch)", all.includes(toSC("webwatch")))
t("1e. automovienotifier masuk daftar", all.includes(toSC("automovienotifier")))
t("1f. cryptoalert masuk daftar", all.includes(toSC("cryptoalert")))
t("1g. section saluran ada", all.includes(toSC("Saluran")))
t("1h. ringkasan fitur command nonaktif", all.includes(toSC("command nonaktif")))
const recapRe = new RegExp(toSC("Aktif") + ": \\d+ \\| " + toSC("Mati") + ": \\d+ \\| " + toSC("Total") + ": \\d+")
t("1i. rekap aktif/mati/total", recapRe.test(all), all.split("\n").at(-2))
t("1j. dari DM → gak ada section group", !all.includes(toSC("Group (Chat Ini)")))

// ═══ 2. .switch auto — format baru ═══
await handler(mockM(["auto"]), { sock: {}, config })
const auto = replies.at(-1)
t("2a. header kategori smallcaps", auto.includes(toSC("Sistem & Respon")))
t("2b. format 'ʙᴇɴᴄᴀɴᴀᴡᴀᴛᴄʜ ᴏɴ' di akhir fitur", expectLine(auto, "bencanawatch", true) || expectLine(auto, "bencanawatch", false))
t("2c. gak ada 'ON  autoread' lama", !auto.includes("ON  ") && !auto.includes("OFF  "))
t("2d. semua AUTO_CATEGORIES hadir", ["Sistem & Respon", "Pemeliharaan", "Retensi & Finansial", "Info & Utilitas"].every((c) => auto.includes(toSC(c))))

// ═══ 3. .switch group di grup — format baru ═══
await handler(mockM(["group"], { chat: "12036302@g.us", isGroup: true }), { sock: {}, config })
const grp = replies.at(-1)
t("3a. listing group format baru (welcome + status di akhir)", expectLine(grp, "welcome", true) || expectLine(grp, "welcome", false))
t("3b. listing group gak ada format lama", !grp.includes("ON  ") && !grp.includes("OFF  "))

// ═══ 4. .switch channel — status di akhir label ═══
await handler(mockM(["channel"]), { sock: {}, config })
const ch = replies.at(-1)
t("4a. channel gak pakai format '— ON' lama", !/— \*ON\*/.test(ch) && !/— \*OFF\*/.test(ch))
t("4b. channel label + status kecil di akhir", ch.includes(scOn) || ch.includes(scOff))

// ═══ 5. .switch status (tanpa 'all') juga jalan ═══
await handler(mockM(["status"]), { sock: {}, config })
t("5a. '.switch status' → status semua juga", replies.at(-1).includes(toSC("Info & Utilitas")))

// ═══ 6. Sampling format baris persis contoh owner ═══
const sample = all.split("\n").find((l) => l.startsWith(toSC("bencanawatch")))
out("   ↳ contoh baris: " + sample)
t("6a. baris persis pola '<fitur>ᴏɴ/ᴏꜰꜰ' tanpa bullet", sample && (sample.endsWith(scOn) || sample.endsWith(scOff)))

process.stdout.write("\n===== " + pass + " PASS, " + fail + " FAIL =====\n")
await new Promise((r) => setTimeout(r, 400))
process.exit(fail ? 1 : 0)
