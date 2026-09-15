// E2E: notif hari besar & tanggal merah Indonesia — kalender, langganan,
// dispatch jam 08:00 WIB (sekali per hari per chat), custom day, AI inspirasi
import path from "node:path";

const out = (s) => process.stdout.write(s + "\n")
let pass = 0, fail = 0
function t(label, cond, extra) {
  if (cond) pass++
  else { fail++; out("FAIL: " + label + " " + (extra || "")) }
}

const R = path.resolve(".")
const { initDatabase } = await import(R + "/src/lib/nova-database.js")
await initDatabase("/tmp/haribesar-e2e-db/nova.json")
const config = (await import(R + "/config.js")).default

const L = await import(R + "/src/lib/nova-haribesar.js")
const {
  getHariBesar, addCustomDay, removeCustomDay, listCustomDays,
  setSubscribed, setAllGroups, getAllGroups, getSubs, isSubscribed,
  _setHariBesarAiForTest, _haribesarRunTickForTest, initHariBesarScheduler,
} = L
_setHariBesarAiForTest(async () => "12112 pesan inspirasi tes")

// ═══ 1. Kalender built-in ═══
const ibu = getHariBesar("2026-12-22")
t("1a. 22 Desember = Hari Ibu", ibu?.nama === "Hari Ibu" && ibu?.emoji === "🌷", JSON.stringify(ibu))
const proklamasi = getHariBesar("2026-08-17")
t("1b. 17 Agustus = Proklamasi Kemerdekaan", /Proklamasi/i.test(proklamasi?.nama || ""), JSON.stringify(proklamasi))
t("1c. 17 Agustus = TANGGAL MERAH", proklamasi?.merah === true)
const kartini = getHariBesar("2026-04-21")
t("1d. 21 April = Hari Kartini", kartini?.nama === "Hari Kartini")
t("1e. hari biasa → null", getHariBesar("2026-09-16") === null)
const natal = getHariBesar("2026-12-25")
t("1f. 25 Desember = Natal + merah", /Natal/i.test(natal?.nama || "") && natal?.merah === true)
const pahlawan = getHariBesar("2026-11-10")
t("1g. 10 November = Hari Pahlawan + merah", /Pahlawan/i.test(pahlawan?.nama || "") && pahlawan?.merah === true)

// ═══ 2. Custom day (libur bergerak pakai tanggal lengkap) ═══
const add = addCustomDay("20-03-2026", "Idulfitri 1447 H", true)
t("2a. tambah custom exact sukses", add.ok === true && add.key === "2026-03-20", JSON.stringify(add))
const idul = getHariBesar("2026-03-20")
t("2b. custom exact kebaca (merah)", idul?.nama === "Idulfitri 1447 H" && idul?.merah === true)
t("2c. custom exact HANYA tahun itu", getHariBesar("2027-03-20") === null || getHariBesar("2027-03-20")?.nama !== "Idulfitri 1447 H")
const addYearly = addCustomDay("22-02", "Hari Ahit")
t("2d. tambah custom tahunan sukses", addYearly.ok === true && addYearly.key === "22-02")
t("2e. custom tahunan kebaca tiap tahun", getHariBesar("2028-02-22")?.nama === "Hari Ahit")
t("2f. tanggal ngawur ditolak", addCustomDay("32-13", "X").ok === false && addCustomDay("", "X").ok === false)
t("2g. nama kosong ditolak", addCustomDay("15-05", "   ").ok === false)
const rm = removeCustomDay("22-02")
t("2h. hapus custom jalan", rm.ok === true && rm.removed === 1 && !listCustomDays().some((c) => c.key === "22-02"))

// ═══ 3. Langganan + dispatch ═══
const GID = "120363021234567890@g.us"
const DM = "6281234567890@s.whatsapp.net"
const sent = []
const mockSock = {
  sendMessage: async (to, msg) => { sent.push({ to, msg }); return {} },
  groupFetchAllParticipating: async () => ({ "1203630aaabbbcccddd@g.us": { id: "1203630aaabbbcccddd@g.us" }, [GID]: { id: GID } }),
}

setSubscribed(GID, true)
setSubscribed(DM, true)
t("3a. langganan kecatat", isSubscribed(GID) && isSubscribed(DM) && getSubs().length === 2)
setAllGroups(true)
t("3b. mode semua grup ON", getAllGroups() === true)

// dispatch Hari Ibu 2026
const r1 = await _haribesarRunTickForTest(mockSock, "2026-12-22")
t("3c. dispatch Hari Ibu terkirim 3 chat (grup langganan + DM + grup all)", r1.sent === 3, JSON.stringify(r1))
const msgIbu = sent.find((s) => s.to === DM && String(s.msg.text || "").includes("🌷"))
t("3d. isi pesan: emoji hari + tanggal + AI inspirasi", !!msgIbu && String(msgIbu.msg.text).includes("12112"), (msgIbu ? String(msgIbu.msg.text).slice(0, 120) : "missing"))
t("3e. dedup — tick kedua hari sama → 0 kirim", (await _haribesarRunTickForTest(mockSock, "2026-12-22")).sent === 0)

// dispatch hari berikutnya → kirim lagi
sent.length = 0
const r2 = await _haribesarRunTickForTest(mockSock, "2026-12-25")
t("3f. hari berikutnya (Natal) kirim lagi", r2.sent === 3 && /Natal/i.test(r2.day || ""), JSON.stringify(r2))
t("3g. pesan Natal pakai AI inspirasi juga", sent.some((s) => String(s.msg.text || "").includes("12112")))

// bukan hari besar → gak kirim apa-apa
sent.length = 0
const r3 = await _haribesarRunTickForTest(mockSock, "2026-09-16")
t("3h. hari biasa → 0 kirim", r3.sent === 0 && r3.day === null)

// off → berhenti
setSubscribed(DM, false)
sent.length = 0
const r4 = await _haribesarRunTickForTest(mockSock, "2027-01-01")
t("3i. unsubscribe → sisa target sesuai", r4.sent === 2 && !sent.some((s) => s.to === DM), "sent=" + JSON.stringify(sent.map((s) => s.to)))

// ═══ 4. Scheduler init (gak dobel + gak crash) ═══
t("4a. scheduler init ok", initHariBesarScheduler(mockSock) === true)
t("4b. scheduler gak dobel", initHariBesarScheduler(mockSock) === false)
if (global.__novaHariBesarTimer?.unref) t("4c. timer unref (test gak hang)", true)
else t("4c. timer unref (test gak hang)", false)

// ═══ 5. Plugin handler — on/status/tambah + gate owner ═══
const { pluginConfig, handler } = await import(R + "/plugins/info/haribesar.js")
t("5a. plugin config valid", pluginConfig.name === "haribesar" && pluginConfig.isEnabled === true && pluginConfig.category === "info")
const replies = []
function mockM(args, opts = {}) {
  return {
    chat: opts.chat || GID, isGroup: true, isOwner: opts.isOwner ?? false,
    args, prefix: ".", text: ".haribesar " + args.join(" "),
    reply: async (txt) => replies.push(String(txt)),
  }
}
await handler(mockM(["on"]), { sock: mockSock, args: ["on"], prefix: "." })
t("5b. .haribesar on balas + langganan tersimpan", replies.length > 0 && isSubscribed(GID) === true)
await handler(mockM(["status"]), { sock: mockSock, args: ["status"], prefix: "." })
t("5c. status balas (hari ini + terdekat)", replies.length >= 2 && /20\d\d-\d\d-\d\d/.test(replies.at(-1) || ""))
await handler(mockM(["test"]), { sock: mockSock, args: ["test"], prefix: "." })
t("5d. .haribesar test kirim contoh kartu", /12112|🌷|ᴄᴏɴᴛᴏʜ/.test(replies.at(-1) || ""), (replies.at(-1) || "").slice(0, 100))

// gate owner: non-owner gak boleh tambah custom
const beforeCustom = listCustomDays().length
await handler(mockM(["tambah", "20-03-2026", "|", "Idulfitri"]), { sock: mockSock, args: ["tambah", "20-03-2026"], prefix: "." })
t("5e. non-owner tambah → DITOLAK (custom gak nambah)", listCustomDays().length === beforeCustom, "before=" + beforeCustom + " after=" + listCustomDays().length)
// owner tambah sukses (via m.text pipe)
await handler(mockM(["tambah", "15-06-2027", "|", "Hari Uji Coba", "|", "merah"], { isOwner: true }), { sock: mockSock, args: ["tambah", "15-06-2027"], prefix: "." })
t("5f. owner tambah custom sukses", listCustomDays().some((c) => c.key === "2027-06-15" && c.merah === true), JSON.stringify(listCustomDays()))
await handler(mockM(["all", "on"], { isOwner: true }), { sock: mockSock, args: ["all", "on"], prefix: "." })
t("5g. owner .haribesar all on ok", getAllGroups() === true)
await handler(mockM(["list"], { isOwner: true }), { sock: mockSock, args: ["list"], prefix: "." })
t("5h. list custom + upcoming muncul", /2027-06-15|20\d\d-\d\d-\d\d/.test(replies.at(-1) || ""), (replies.at(-1) || "").slice(0, 120))

// ═══ 6. Import guard senyap: modul + plugin ke-import tanpa error ═══
try { await import(R + "/plugins/info/haribesar.js"); t("6a. re-import plugin aman", true) }
catch (e) { t("6a. re-import plugin aman", false, e.message) }

out("")
out("— summary —")
process.stdout.write("\n===== " + pass + " PASS, " + fail + " FAIL =====\n")
process.exit(fail ? 1 : 0)
