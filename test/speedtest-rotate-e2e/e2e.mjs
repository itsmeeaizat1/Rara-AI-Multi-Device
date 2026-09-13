// E2E — SPEEDTEST STATUS ROTATE (13 Sep 2026, batch 4 variasi polos)
// ".speedtest tes 5-60 dtk cuma react 🕒 terus diam" — sekarang kartu
// status 1 pesan di-edit berputar 🔍 ping → ⬇️ unduh → ⬆️ unggah →
// ✅ susun hasil, terus jadi kartu hasil di pesan yang sama.
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

// knob rotasi dipercepat buat e2e
process.env.NOVA_SPEEDTEST_ROTATE_MS = "300";

const DB_DIR = "/tmp/nova-speed-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(DB_DIR + "/db.json");

const mod = await import(R + "/plugins/info/speedtest.js");
const { handler, _setSpeedtestFnForTest } = mod;
const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(String(s)).toLowerCase();

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SENDER = "628123456789@s.whatsapp.net";
const CHAT = "628123456789@s.whatsapp.net";

function mkMock() {
  const sends = [];
  const reacts = [];
  const m = {
    sender: SENDER, chat: CHAT, pushName: "Budi",
    react: async (e) => { reacts.push(e); },
    reply: async (txt) => { sends.push({ payload: { text: txt }, opts: {} }); return { key: { id: "r" + sends.length } }; },
  };
  const sock = {
    sendMessage: async (chat, payload, opts) => {
      sends.push({ chat, payload, opts });
      return { key: { id: "m" + sends.length } };
    },
  };
  return { m, sock, sends, reacts };
}

// ═══════════════════════════════════════════════════════════════
w("\n— happy path: rotasi status → kartu hasil di pesan sama —");
{
  const { m, sock, sends, reacts } = mkMock();
  // tes "lama" 1.6 dtk biar fase rotasi sempat jalan (rotate 300ms)
  _setSpeedtestFnForTest(async () => {
    await sleep(1600);
    return { ping: "12.34 ms", download: "88.50 Mbps", upload: "45.20 Mbps", method: "speedtest-cli" };
  });
  await handler(m, { sock });
  await sleep(300);

  const texts = sends.map((s) => ({ txt: s.payload?.text || "", edit: !!s.payload?.edit, key: s.payload?.edit?.id }));
  const first = texts[0]; // pesan awal (tanpa .edit)
  const firstKey = texts.find((x) => x.edit)?.key; // semua edit nempel di key kartu status
  check("kartu status awal kekirim (⚡ TES DIMULAI)", norm(first.txt).includes("dimulai"));
  const rotEdits = texts.filter((x) => x.edit && x.key === firstKey && !norm(x.txt).includes("hasil tes kecepatan"));
  check("rotasi jalan: fase unduh/unggah/susun sempat muncul", rotEdits.length >= 2, "edits=" + rotEdits.length);
  const rotTexts = rotEdits.map((x) => norm(x.txt)).join(" ");
  check("fase teks bener: mengunduh + mengunggah + menyusun", rotTexts.includes("mengunduh") && rotTexts.includes("mengunggah") && rotTexts.includes("menyusun"), rotTexts.slice(0, 120));
  const finalMsg = texts.find((x) => norm(x.txt).includes("hasil tes kecepatan"));
  check("kartu hasil AKHIR muncul (⚡ HASIL TES)", !!finalMsg);
  check("kartu hasil di pesan yang sama (edit key sama)", finalMsg && finalMsg.key === firstKey);
  const fn = norm(finalMsg?.txt || "");
  check("hasil: ping/download/upload/metode keisi", fn.includes("12.34 ms") && fn.includes("88.50 mbps") && fn.includes("45.20 mbps") && fn.includes("speedtest-cli"));
  check("hasil: info sistem (host/cores/ram) ada", fn.includes("host") && fn.includes("cores") && fn.includes("ram"));
  check("react ⚡ dulu terus 🐣", reacts[0] === "⚡" && reacts[reacts.length - 1] === "🐣");
  // rotasi berhenti setelah selesai
  const editsBefore = texts.filter((x) => x.edit && x.key === firstKey && norm(x.txt).includes("meng")).length;
  await sleep(800);
  const texts2 = sends.map((s) => ({ txt: s.payload?.text || "", edit: !!s.payload?.edit }));
  const editsAfter = texts2.filter((x) => x.edit && norm(x.txt).includes("meng")).length;
  check("rotasi STOP setelah hasil keluar", editsAfter === editsBefore, `${editsBefore} → ${editsAfter}`);
}

// ═══════════════════════════════════════════════════════════════
w("\n— tes kilat: hasil instan, gak sempat rotasi —");
{
  const { m, sock, sends, reacts } = mkMock();
  _setSpeedtestFnForTest(async () => ({ ping: "1 ms", download: "1 Mbps", upload: "1 Mbps", method: "cloudflare-fallback" }));
  await handler(m, { sock });
  await sleep(200);
  const fn = norm(sends.map((s) => s.payload?.text || "").join("\n"));
  check("hasil tetep keluar walau instan", fn.includes("hasil tes kecepatan"));
  check("react 🐣 di ujung", reacts[reacts.length - 1] === "🐣");
}

// ═══════════════════════════════════════════════════════════════
w("\n— error: speedtest gagal → react ❌ + pesan error —");
{
  const { m, sock, sends, reacts } = mkMock();
  _setSpeedtestFnForTest(async () => { throw new Error("jaringan mati"); });
  await handler(m, { sock });
  await sleep(200);
  check("react ❌ + pesan error sopan", reacts[reacts.length - 1] === "❌" && norm(sends.at(-1)?.payload?.text || "").includes("error"));
}


w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
