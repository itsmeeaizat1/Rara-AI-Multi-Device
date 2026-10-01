// E2E: notif hari besar & tanggal merah Indonesia — kalender, langganan,
// dispatch jam 08:00 WIB (sekali per hari per chat), custom day, AI inspirasi
import path from "node:path";

const out = (s) => process.stdout.write(s + "\n")
let pass = 0, fail = 0
function t(label, cond, extra) {
  if (cond) pass++
  else { fail++; out("FAIL: " + label + " " + (extra || "")) }
}

import fs from "node:fs"
fs.rmSync("/tmp/haribesar-e2e-db", { recursive: true, force: true })

const R = path.resolve(".")
const { initDatabase } = await import(R + "/src/lib/rara-database.js")
await initDatabase("/tmp/haribesar-e2e-db/rara.json")
const config = (await import(R + "/config.js")).default

const L = await import(R + "/src/lib/rara-haribesar.js")
const {
  getHariBesar, addCustomDay, removeCustomDay, listCustomDays,
  setSubscribed, setAllGroups, getAllGroups, getSubs, isSubscribed,
  _setHariBesarAiForTest, _haribesarRunTickForTest, initHariBesarScheduler,
  cariLiburPanjang, getLiburOn, nextLibur, listLiburMendatang,
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
t("1g. 10 November = Hari Pahlawan (peringatan, BUKAN libur)", /Pahlawan/i.test(pahlawan?.nama || "") && pahlawan?.merah === false && getLiburOn("2026-11-10") === null)

// ═══ 1h-1n. SKB 3 MENTERI RESMI + package fallback ═══
const fitri = getLiburOn("2026-03-21")
t("1h. SKB 2026: Idulfitri 21-03-2026 (BUKAN 20-21 versi package)", /idul ?fitri/i.test(fitri?.nama || "") && fitri?.merah === true && fitri?.skb === true, JSON.stringify(fitri))
const cuti20 = getLiburOn("2026-03-20")
t("1i. CUTI BERSAMA SKB 20-03-2026 = libur (cuti flag), gak digreet", /cuti/i.test(cuti20?.nama || "") && cuti20?.cuti === true && cuti20?.merah === true && getHariBesar("2026-03-20") === null, JSON.stringify(cuti20))
t("1j. SKB 2026: Isra Mikraj 16-01 (package salah label 'Maulid')", /isra ?mikraj/i.test(getLiburOn("2026-01-16")?.nama || ""), JSON.stringify(getLiburOn("2026-01-16")))
t("1k. SKB 2026: Maulid asli 25-08-2026 (ternyata libur resmi SKB)", /maulid/i.test(getLiburOn("2026-08-25")?.nama || ""))
t("1l. SKB 2027: Idulfitri 10-11 Mar (package bilang 9-10)", /idul ?fitri/i.test(getLiburOn("2027-03-11")?.nama || ""))
t("1m. SKB 2027: Isra Mikraj 05-01-2027", /isra ?mikraj/i.test(getLiburOn("2027-01-05")?.nama || ""), JSON.stringify(getLiburOn("2027-01-05")))
t("1n. package cuma fallback non-SKB: sampah 2028-12-14 dibuang, asli 2028-08-03 kebaca", getLiburOn("2028-12-14") === null && /maulid/i.test(getLiburOn("2028-08-03")?.nama || ""), JSON.stringify([getLiburOn("2028-12-14"), getLiburOn("2028-08-03")]))
t("1o. MEGA chain Nyepi+Idulfitri 2026: cuti 18 Mar s/d cuti 24 Mar = 7 hari", cariLiburPanjang("2026-03-18", 0)?.totalHari === 7, JSON.stringify(cariLiburPanjang("2026-03-18", 0)))

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

// ═══ 3. Langganan + dispatch + H-X + libur panjang ═══
const GID = "120363021234567890@g.us"
const GID2 = "1203630aaabbbcccddd@g.us"
const DM = "6281234567890@s.whatsapp.net"
const sent = []
const mockSock = {
  sendMessage: async (to, msg) => { sent.push({ to, msg }); return {} },
  groupFetchAllParticipating: async () => ({ [GID2]: { id: GID2 }, [GID]: { id: GID } }),
}

setSubscribed(GID, true)
setSubscribed(DM, true)
setAllGroups(true)
t("3a. langganan kecatat", isSubscribed(GID) && isSubscribed(DM) && getSubs().length === 2)
t("3b. mode semua grup ON", getAllGroups() === true)

// helper: libur nyata di repo — Natal 25-12-2026 = JUMAT (built-in merah)
// → rantai Jumat+Nat 25, Sabtu 26, Minggu 27 = libur panjang 3 hari ASLI
const chainNatal = cariLiburPanjang("2026-12-25", 0)
t("3c. deteksi libur panjang Natal (Jum+Sabt+Ming 3 hari)", chainNatal?.totalHari === 3 && chainNatal?.mulaiYmd === "2026-12-25" && /Natal/i.test(chainNatal?.nama || ""), JSON.stringify(chainNatal))
t("3d. weekend polos gak dianggap libur panjang", cariLiburPanjang("2026-09-19", 0) === null, JSON.stringify(cariLiburPanjang("2026-09-19", 0)))
t("3e. getLiburOn cuma hari MERAH (Kartini bukan libur)", getLiburOn("2026-04-21") === null && !!getLiburOn("2026-08-17"))
t("3f. nextLibur dari 2026-12-26 → Tahun Baru", nextLibur("2026-12-26", 30)?.ymd === "2027-01-01")

// — dispatch H-7 (17 Des 2026 → cuti bersama 24 Des = 7 hari lagi) —
const r7 = await _haribesarRunTickForTest(mockSock, "2026-12-17")
t("3g. H-7: countdown minggu lagi (target cuti bersama 24-12) terkirim 3 chat", r7.sent === 3 && r7.events.includes("H-7"), JSON.stringify(r7))
t("3h. isi H-7 ada nama libur (Cuti Bersama Menjelang Natal)", sent.some((s) => /natal|Natal/.test(String(s.msg.text || ""))), (sent[0]?.msg.text || "").slice(0, 150))

// — dispatch 22 Desember 2026: greeting Hari Ibu + info libur panjang (chain mulai cuti 24-12) —
sent.length = 0
const r1 = await _haribesarRunTickForTest(mockSock, "2026-12-22")
t("3i. 22 Des: greeting Hari Ibu + libur panjang 4 hari (cuti 24 + Natal 25 + weekend)", r1.sent === 6 && r1.events.includes("hariH") && r1.events.includes("panjang") && !r1.events.includes("H-3"), JSON.stringify(r1))
const msgIbu = sent.find((s) => s.to === DM && String(s.msg.text || "").includes("🌷"))
t("3j. isi greeting: emoji hari + AI inspirasi", !!msgIbu && String(msgIbu.msg.text).includes("12112"), (msgIbu ? String(msgIbu.msg.text).slice(0, 120) : "missing"))
t("3k. dedup — tick kedua hari sama → 0 kirim", (await _haribesarRunTickForTest(mockSock, "2026-12-22")).sent === 0)

// — dispatch 24 Desember 2026 (HARI CUTI BERSAMA): greeting cuti + H-1 Natal + chain merge —
sent.length = 0
const rH1 = await _haribesarRunTickForTest(mockSock, "2026-12-24")
t("3l. 24 Des cuti: greeting cuti (chain merge) + H-1 Natal, tanpa panjang terpisah", rH1.sent === 6 && rH1.events.includes("cuti") && rH1.events.includes("H-1") && !rH1.events.includes("panjang"), JSON.stringify(rH1))
const dmMsgs = sent.filter((s) => s.to === DM).map((s) => String(s.msg.text || ""))
t("3m. H-1 isi: besok libur + 4 hari beruntun (merge chain)", dmMsgs.some((x) => /besok/.test(x) && /4 hari|beruntun/.test(x)), dmMsgs.join(" ||| ").slice(0, 250))

// — dispatch 20-03-2026: CUSTOM exact Idulfitri owner menimpa SKB cuti → greeting hariH —
sent.length = 0
const rCuti = await _haribesarRunTickForTest(mockSock, "2026-03-20")
t("3m2. 20-03: custom owner (Idulfitri 1447 H) menimpa SKB cuti → hariH + H-1 fitri", rCuti.sent === 6 && rCuti.events.includes("hariH") && rCuti.events.includes("H-1") && rCuti.day === "Idulfitri 1447 H", JSON.stringify(rCuti))

// — dispatch HARI CUTI BERSAMA POLOS 23-03-2026 (Senin, tanpa custom) —
sent.length = 0
const rCuti2 = await _haribesarRunTickForTest(mockSock, "2026-03-23")
t("3m3. hari cuti bersama polos: greeting cuti + H-1 (cuti 24-03)", rCuti2.sent === 6 && rCuti2.events.includes("cuti") && rCuti2.events.includes("H-1") && !rCuti2.events.includes("panjang"), JSON.stringify(rCuti2))
t("3m4. isi pesan cuti: nama cuti bersama", sent.some((s) => /cuti bersama|cuti bersama/i.test(String(s.msg.text || ""))))

// — dispatch 19 September 2026 (Sabtu biasa, libur 6 hari lagi = bukan checkpoint) —
sent.length = 0
const rSat = await _haribesarRunTickForTest(mockSock, "2026-09-19")
t("3n. bukan checkpoint → gak spam notif", rSat.sent === 0 && rSat.events.length === 0, JSON.stringify(rSat))

// — dispatch HARI-H Natal: greeting + chain merge + H-7 Tahun Baru —
sent.length = 0
const r2 = await _haribesarRunTickForTest(mockSock, "2026-12-25")
t("3o. Natal: greeting (dgn info libur panjang) + H-7 Tahun Baru", r2.sent === 6 && r2.events.includes("hariH") && r2.events.includes("H-7"), JSON.stringify(r2))
t("3p. greeting Natal ada info 3 hari beruntun", sent.some((s) => s.to === DM && /beruntun|beruntun/.test(String(s.msg.text || "")) && String(s.msg.text).includes("12112")))

// — libur panjang TERPISAH: custom merah Senin 04-01-2027 → chain 4 hari mulai 01-01 —
addCustomDay("04-01-2027", "Libur Uji Coba", true)
sent.length = 0
const rLong = await _haribesarRunTickForTest(mockSock, "2026-12-30")
t("3q. notif LIBUR PANJANG terpisah (chain 5 hari mulai 01-01)", rLong.sent === 3 && rLong.events.includes("panjang"), JSON.stringify(rLong))
t("3r. isi libur panjang: 5 hari (Tahun Baru+Uji Coba+Maulid paket)", sent.some((s) => /5 hari|5 hari/.test(String(s.msg.text || ""))))

// — dispatch 2027-01-01: greeting Tahun Baru + chain 4-hari merge + H-3 (04-01) —
sent.length = 0
const rNY = await _haribesarRunTickForTest(mockSock, "2027-01-01")
t("3s. Tahun Baru: greeting + H-3 Uji Coba (chain merge di greeting)", rNY.sent === 6 && rNY.events.includes("hariH") && rNY.events.includes("H-3"), JSON.stringify(rNY))

// — bukan hari besar + gak ada event → gak kirim —
sent.length = 0
const r3 = await _haribesarRunTickForTest(mockSock, "2026-09-16")
t("3t. hari biasa → 0 kirim", r3.sent === 0 && r3.day === null)

// — unsubscribe → berhenti —
setSubscribed(DM, false)
sent.length = 0
const r4 = await _haribesarRunTickForTest(mockSock, "2027-05-01") // Hari Buruh built-in merah 01-05
t("3u. unsubscribe → sisa target sesuai (2 chat)", r4.sent === 2 && !sent.some((s) => s.to === DM), "sent=" + JSON.stringify(sent.map((s) => s.to)))

// ═══ 4. Scheduler init (gak dobel + gak crash) ═══
t("4a. scheduler init ok", initHariBesarScheduler(mockSock) === true)
t("4b. scheduler gak dobel", initHariBesarScheduler(mockSock) === false)
if (global.__novaHariBesarTimer?.unref) t("4c. timer unref (test gak hang)", true)
else t("4c. timer unref (test gak hang)", false)

// ═══ 5. Plugin handler — on/status/tambah + gate owner ═══
const { pluginConfig, handler } = await import(R + "/plugins/info/nationalday.js")
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
t("5d. .haribesar test kirim contoh kartu", /12112|🌷|contoh/.test(replies.at(-1) || ""), (replies.at(-1) || "").slice(0, 100))

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

// ═══ 5i-5o. subcommand libur/penting + plugin .harilibur (tanpa API) ═══
{
  const now = new Date(Date.now() + 7 * 3600 * 1000)
  const d20 = new Date(now.getTime() + 20 * 86400000)
  const pd = (n) => String(n).padStart(2, "0")
  const customDate = `${pd(d20.getUTCDate())}-${pd(d20.getUTCMonth() + 1)}-${d20.getUTCFullYear()}` // DD-MM-YYYY
  const iso20 = `${d20.getUTCFullYear()}-${pd(d20.getUTCMonth() + 1)}-${pd(d20.getUTCDate())}`
  const addR = addCustomDay(customDate, "Libur Demo H-X", true)
  t("5i. tambah libur demo H-20", addR.ok === true, JSON.stringify(addR))
  t("5j. listLiburMendatang baca libur demo (H-20)", listLiburMendatang(null, 90).some((x) => x.ymd === iso20 && x.h === 20), JSON.stringify(listLiburMendatang(null, 90).slice(0, 3)))
  await handler(mockM(["libur"]), { sock: mockSock, args: ["libur"], prefix: "." })
  const rlibur = replies.at(-1) || ""
  t("5k. .haribesar libur nampilin tanggal + label H-20", rlibur.includes(customDate) && /h-20|H-20/.test(rlibur), rlibur.slice(0, 200))
  t("5l. .haribesar libur baca libur BERGERAK package (25-12-2026)", rlibur.includes("25-12-2026"), rlibur.slice(0, 300))

  // .haripenting (alias tanpa sub) + .haribesar penting
  const mockMPenting = (args) => ({ ...mockM(args), command: "haripenting" })
  await handler(mockMPenting([]), { sock: mockSock, args: [], prefix: "." })
  const rp = replies.at(-1) || ""
  t("5m. .haripenting (alias) → daftar hari penting (28-10 Sumpah Pemuda)", rp.includes("28-10"), rp.slice(0, 160))
  await handler(mockM(["penting"]), { sock: mockSock, args: ["penting"], prefix: "." })
  t("5n. .haribesar penting → hari penting (bukan libur)", /28-10|21-04|25-11/.test(replies.at(-1) || ""))

  // plugin .harilibur ROMBAK — data lokal package, tanpa API eksternal
  const { handler: liburHandler } = await import(R + "/plugins/info/holiday.js")
  const lReplies = []
  const mLibur = { chat: GID, isGroup: true, isOwner: true, reply: async (txt) => lReplies.push(String(txt)) }
  await liburHandler(mLibur, { sock: mockSock })
  const rl = (lReplies.at(-1) || "")
  t("5o. .harilibur tanpa API — daftar libur package (25-12-2026) + tanpa error", rl.includes("25-12-2026") && rl.length > 50, rl.slice(0, 200))
  const src = await import("node:fs").then(fs => fs.readFileSync(path.resolve("plugins/info/holiday.js"), "utf8"))
  t("5p. .harilibur gak pakai axios/API eksternal lagi", !/axios|nexray|api\./.test(src))
}

// ═══ 6. Import guard senyap: modul + plugin ke-import tanpa error ═══
try { await import(R + "/plugins/info/nationalday.js"); t("6a. re-import plugin aman", true) }
catch (e) { t("6a. re-import plugin aman", false, e.message) }

out("")
out("— summary —")
process.stdout.write("\n===== " + pass + " PASS, " + fail + " FAIL =====\n")
process.exit(fail ? 1 : 0)
