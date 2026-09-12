// E2E SKILL PACK (12 Sep 2026) — 4 pack baru src/skills/ ke-load otomatis:
// kbbi (arti kata) | gempa (BMKG+USGS) | hoki (nomor hoki primbon) | lirik (LRCLIB)
// + integrasi: registry getAgentTools + prompt buildThinkSystemPrompt.
import fs from "node:fs"
import { initDatabase } from "../../src/lib/nova-database.js"
import { getAgentTools, buildThinkSystemPrompt } from "../../src/lib/aiagent.js"
import { hitungHoki } from "../../src/skills/hoki.js"
import { _setKbbiHttp } from "../../src/skills/kbbi.js"
import { _setGempaHttp } from "../../src/skills/gempa.js"
import { _setLirikFn } from "../../src/skills/lirik.js"

const DB = "/tmp/skillpack-e2e-db.json"
fs.rmSync(DB, { recursive: true, force: true })
await initDatabase(DB)
let pass = 0, fail = 0
const w = (s) => process.stdout.write(s + "\n")
const t = (name, ok, extra) => { w((ok ? "✅ " : "❌ ") + name + (ok ? "" : extra ? " — " + extra : "")); ok ? pass++ : fail++; }
const sent = []
const conn = { sendMessage: async (chat, msg) => { sent.push(msg); return { key: {} }; } }
const mockM = { chat: "pc@test", sender: "x@test" }
const last = () => String(sent.at(-1)?.text || "")

// ═══ 1. INTEGRASI — packs ke-load otomatis ═══
w("\n— integrasi registry & prompt —")
const REG = await getAgentTools()
t("1a. 4 pack ke-load otomatis ke registry", !!REG.kbbi && !!REG.gempa && !!REG.hoki && !!REG.lirik, Object.keys(REG).filter((k) => ["kbbi","gempa","hoki","lirik"].includes(k)).join(","));
t("1b. built-in skill lama tetep ada (calc/translate)", !!REG.calc && !!REG.translate);
const prompt = buildThinkSystemPrompt({ botname: "Nova AI" })
t("1c. prompt ke-list pack baru (kbbi/gempa/hoki/lirik)", prompt.includes("kbbi") && prompt.includes("gempa") && prompt.includes("hoki") && prompt.includes("lirik"));
t("1d. desc kbbi & hoki ke-list di prompt", prompt.includes("CARI ARTI kata") && prompt.includes("RAMAL NOMOR HOKI"));

// ═══ 2. HOKI (lokal) ═══
w("\n— hoki (nomor hoki) —")
const hk = hitungHoki("081234567890")
t("2a. 5 kategori + skor 0-100 + total", hk.hasil.length === 5 && hk.hasil.every((h) => h.skor >= 3 && h.skor <= 99) && hk.total >= 3, JSON.stringify(hk));
t("2b. deterministik (nomor sama = hasil sama)", hitungHoki("081234567890").total === hk.total);
let eh = ""; try { hitungHoki("123") } catch (e) { eh = e.message }
t("2c. <4 digit ditolak", /minimal 4/.test(eh), eh);
sent.length = 0
await REG.hoki.run(conn, mockM, { nomor: "081234567890" })
t("2d. output: bar skor + total + disclaimer", last().includes("/100") && last().includes("primbon"), last().slice(0, 80));
let eh2 = ""; try { await REG.hoki.run(conn, mockM, {}) } catch (e) { eh2 = e.message }
t("2e. tanpa nomor → error sopan", /nomor-nya mana/.test(eh2), eh2);

// ═══ 3. KBBI (mock) ═══
w("\n— kbbi (arti kata) —")
_setKbbiHttp(async () => ({
  json: async () => ({ batchcomplete: "", query: { pages: { 1: { pageid: 1, title: "makan", extract: "== Bahasa Indonesia ==\n\nmemasukkan makanan ke dalam mulut\nmencuri\n\n== Bahasa Jawa ==\nbermula" } } } }),
}))
sent.length = 0
await REG.kbbi.run(conn, mockM, { kata: "makan" })
t("3a. arti kata dari Bahasa Indonesia section", last().includes("makan") && last().includes("memasukkan makanan") && last().includes("mencuri"), last().slice(0, 90));
t("3b. section bahasa lain gak ikut kebawa", !last().includes("bermula"));
t("3c. link wiktionary nyertain", last().includes("id.wiktionary.org"));
_setKbbiHttp(async () => ({ json: async () => ({ query: { pages: { 1: { pageid: 1, title: "x", missing: "" } } } }) }))
let ek = ""; try { await REG.kbbi.run(conn, mockM, { kata: "zzzxq" }) } catch (e) { ek = e.message }
t("3d. kata gak ada → error sopan", /gak ketemu di kamus/.test(ek), ek);
let ek2 = ""; try { await REG.kbbi.run(conn, mockM, {}) } catch (e) { ek2 = e.message }
t("3e. tanpa kata → error sopan", /kata-nya mana/.test(ek2), ek2);

// ═══ 4. GEMPA (mock) ═══
w("\n— gempa (BMKG + USGS) —")
const bmkgJson = { Infogempa: { gempa: { Tanggal: "12 Sep 2026", Jam: "13:14:33 WIB", Magnitude: "5.1", Kedalaman: "10 km", Wilayah: "Pusat gempa di laut 92 km Barat Laut Saumlaki", Potensi: "tidak berpotensi tsunami", Shakemap: "20260912131433.mme.jpg" } } }
const usgsJson = { features: [
  { properties: { mag: 5.4, place: "102 km SE of Amahai, Indonesia", time: 1789195000000 }, geometry: { coordinates: [129.5, -3.9, 34] } },
  { properties: { mag: 4.8, place: "Fiji region", time: 1789194000000 }, geometry: { coordinates: [-178.2, -19.1, 555] } },
] }
_setGempaHttp(async (u) => String(u).includes("bmkg") ? { json: async () => bmkgJson } : { json: async () => usgsJson })
sent.length = 0
await REG.gempa.run(conn, mockM, {})
t("4a. default = BMKG + USGS dua-duanya", last().includes("BMKG") && last().includes("M5.1") && last().includes("USGS") && last().includes("M5.4"), last().slice(0, 100));
t("4b. potensi tsunami & lokasi kebawa", last().includes("tidak berpotensi tsunami") && last().includes("Saumlaki"));
sent.length = 0
await REG.gempa.run(conn, mockM, { wilayah: "dunia" })
t("4c. wilayah dunia → USGS doang (M4.8 Fiji ada)", last().includes("Fiji") && !last().includes("Saumlaki"), last().slice(0, 80));
sent.length = 0
await REG.gempa.run(conn, mockM, { wilayah: "indonesia" })
t("4d. wilayah indonesia → BMKG doang", last().includes("Saumlaki") && !last().includes("Fiji"));
_setGempaHttp(async () => ({ json: async () => ({}) }))
sent.length = 0
await REG.gempa.run(conn, mockM, { wilayah: "indonesia" })
t("4e. sumber mati → gak crash, ada pesan fallback", last().length > 10 && /gak ada data gempa|gak kebuka/.test(last()), last().slice(0, 80));

// ═══ 5. LIRIK (mock) ═══
w("\n— lirik (LRCLIB) —")
_setLirikFn(async (q) => q === "komang raisa"
  ? { status: true, trackName: "Komang", artistName: "Raisa", plainLyrics: "Bawalah pergi\nHatiku bersamamu" }
  : { status: false, message: "Gagal mengambil lirik" })
sent.length = 0
await REG.lirik.run(conn, mockM, { judul: "komang raisa" })
t("5a. lirik plain + meta artis", last().includes("Komang") && last().includes("Raisa") && last().includes("Bawalah pergi"), last().slice(0, 80));
_setLirikFn(async () => ({ status: false }))
let el = ""; try { await REG.lirik.run(conn, mockM, { judul: "lagu ngaco" }) } catch (e) { el = e.message }
t("5b. lirik gak ketemu → error + hint artis", /gak ketemu/.test(el) && /penyanyi/.test(el), el);
let el2 = ""; try { await REG.lirik.run(conn, mockM, {}) } catch (e) { el2 = e.message }
t("5c. tanpa judul → error sopan", /judul lagunya mana/.test(el2), el2);
_setLirikFn(null)

w(`\n===== ${pass} PASS, ${fail} FAIL =====`)
process.exit(fail ? 1 : 0)
