// E2E — FAZZCODE AI (14 Sep 2026): .turboseek + .notrack + chain step 1.7
// Sweep owner: "cba cek ai lain di fazzcode tmbah ke bot" — yang hidup:
// turboseek (search AI + sumber), notrack (chat AI), agnes (bansos router).
// Seam: _setFazzAiHttpForTest — HTTP di-mock, gak nembak API live.
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const DB_DIR = "/tmp/nova-fazzai-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(DB_DIR + "/db.json");

const { turboseekSearch, notrackChat, agnesChat, fazzcodeAiChat,
        _setFazzAiHttpForTest, _resetFazzAiHttpForTest } =
  await import(R + "/src/scraper/fazzcode-ai.js");
const { handler: tsHandler } = await import(R + "/plugins/ai/turboseek.js");
const { handler: ntHandler } = await import(R + "/plugins/ai/notrack.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
const { getFazzcodeKey } = await import(R + "/src/lib/config/env-loader.js");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

// GOTCHA (ke-6x): claraWrap = smallcaps — assert output kartu WAJIB fromSC (→ lowercase)
const norm = (s) => fromSC(String(s)).toLowerCase();

// ═══════════════════════════════════════════════════════════════
w("\n— scraper: turboseek —");
{
  _setFazzAiHttpForTest({
    get: async (url, { params } = {}) => {
      if (url.endsWith("/turboseek")) {
        if (params.question === "gagal") {
          return { data: { status: "error", message: "TurboSeek sedang down" } };
        }
        if (params.question === "kena lock") {
          throw Object.assign(new Error("x"), { response: { data: { message: "ENDPOINT_LOCKED: endpoint dikunci otomatis" } } });
        }
        return { data: { status: "success", result: {
          answer: "Prabowo Subianto, presiden ke-8 sejak 2024.",
          sources: ["https://id.wikipedia.org/wiki/Prabowo_Subianto", "https://example.com/2", "bukan-url", 123],
          similarQuestions: ["siapa wakil presiden"],
        } } };
      }
      throw Object.assign(new Error("req fail"), { response: { data: { message: "ENDPOINT_LOCKED: endpoint dikunci otomatis" } } });
    },
  });

  const r = await turboseekSearch("siapa presiden");
  check("turboseek ok + answer", r.ok && r.answer.includes("Prabowo"), JSON.stringify(r).slice(0, 80));
  check("sources ke-filter (http doang)", r.ok && r.sources.length === 2 && r.sources[0].includes("wikipedia") && !r.sources.includes("bukan-url"), JSON.stringify(r.sources));

  const r2 = await turboseekSearch("gagal");
  check("turboseek error → friendly", !r2.ok && r2.error.includes("TurboSeek"), r2.error);

  const r3 = await turboseekSearch("kena lock");
  check("ENDPOINT_LOCKED → pesan ramah lock", !r3.ok && r3.error.includes("kekunci sementara"), r3.error);
}

// ═══════════════════════════════════════════════════════════════
w("\n— scraper: notrack + agnes + fazzcodeAiChat —");
{
  let mode = "notrack-ok";
  _setFazzAiHttpForTest({
    get: async (url, { params } = {}) => {
      if (url.endsWith("/notrack")) {
        if (mode === "notrack-ok") return { data: { status: "success", result: { response: "Halo! Ada yang bisa dibantu?", chat_id: "x" } } };
        return { data: { status: "error", message: "endpoint dikunci otomatis (ENDPOINT_LOCKED)" } };
      }
      if (url.endsWith("/router/agnes-2.5-flash")) {
        if (mode === "agnes-ok") return { data: { status: "success", result: { response: "Halo dari Agnes!" } } };
        return { data: { status: "error", message: "router locked" } };
      }
      throw new Error("endpoint gak dikenal");
    },
  });

  const r = await notrackChat("tes");
  check("notrack ok (model C)", r.ok && r.reply.includes("dibantu"), JSON.stringify(r));

  mode = "agnes-ok";
  const r2 = await fazzcodeAiChat("tes");
  check("fazzcodeAiChat: notrack lock → fallback agnes", r2.includes("Agnes"), r2);

  mode = "semua-lock";
  let threw = false;
  try { await fazzcodeAiChat("tes"); } catch (e) { threw = e.message.includes("fazzcode"); }
  check("fazzcodeAiChat: dua-duanya gagal → throw utk rantai", threw);

  mode = "notrack-ok";
  const r4 = await agnesChat("tes");
  check("agnesChat error friendly", !r4.ok && r4.error.length > 0, r4.error);
}

// ═══════════════════════════════════════════════════════════════
w("\n— plugin .turboseek —");
{
  _setFazzAiHttpForTest({
    get: async (url) => {
      if (url.endsWith("/turboseek")) {
        return { data: { status: "success", result: {
          answer: "Fotosintesis adalah proses tanaman mengubah cahaya jadi energi.",
          sources: ["https://id.wikipedia.org/wiki/Fotosintesis"],
        } } };
      }
      throw new Error("wrong url " + url);
    },
  });

  // tanpa args → guide
  const s1 = [];
  const m1 = { sender: "s", args: [], text: "", react: async () => {}, reply: async (t) => s1.push(t) };
  await tsHandler(m1, {});
  const o1 = norm(s1[0]);
  check("tanpa args → guide", o1.includes("turboseek") && o1.includes("contoh"), o1.slice(0, 60));

  // dengan query → jawaban + sumber
  const s2 = [];
  const m2 = { sender: "s", args: ["apa", "itu", "fotosintesis"], text: "", react: async () => {}, reply: async (t) => s2.push(t) };
  await tsHandler(m2, {});
  const o2 = norm(s2[0]);
  check("query → jawaban AI", o2.includes("fotosintesis adalah proses"), o2.slice(0, 80));
  check("sumber domain singkat tampil", o2.includes("id.wikipedia.org"), o2.slice(0, 200));

  // error API → pesan ramah
  _setFazzAiHttpForTest({ get: async () => { throw Object.assign(new Error("x"), { response: { data: { message: "ENDPOINT_LOCKED" } } }); } });
  const s3 = [];
  const m3 = { sender: "s", args: ["tes"], text: "", react: async () => {}, reply: async (t) => s3.push(t) };
  await tsHandler(m3, {});
  const o3 = norm(s3[0]);
  check("error → pesan ramah + lock", o3.includes("gagal") && o3.includes("kekunci"), o3.slice(0, 60));
}

// ═══════════════════════════════════════════════════════════════
w("\n— plugin .notrack —");
{
  _setFazzAiHttpForTest({
    get: async (url) => {
      if (url.endsWith("/notrack")) return { data: { status: "success", result: { response: "Ini leluconnya!" } } };
      throw new Error("wrong url");
    },
  });

  const s1 = [];
  const m1 = { sender: "s", args: [], text: "", react: async () => {}, reply: async (t) => s1.push(t) };
  await ntHandler(m1, {});
  check("tanpa args → guide", norm(s1[0]).includes("notrack"), norm(s1[0]).slice(0, 50));

  const s2 = [];
  const m2 = { sender: "s", args: ["ceritain", "lelucon"], text: "", react: async () => {}, reply: async (t) => s2.push(t) };
  await ntHandler(m2, {});
  check("chat → reply AI", norm(s2[0]).includes("lelucon"), norm(s2[0]).slice(0, 60));
}

// ═══════════════════════════════════════════════════════════════
w("\n— rantai fallback: step 1.7 terpasang —");
{
  const src = fs.readFileSync(R + "/src/lib/nova-ai-fallback.js", "utf-8");
  const iNexai = src.indexOf("1.6 NexAI");
  const iFazz = src.indexOf("fazzcodeAiChat");
  const iHaidar = src.indexOf("// 2. Haidar");
  check("step 1.7 fazzcode ada di rantai", iFazz > -1);
  check("posisi benar: setelah nexai (1.6), sebelum haidar (2)", iNexai > -1 && iNexai < iFazz && iFazz < iHaidar, `${iNexai} < ${iFazz} < ${iHaidar}`);
  check("key fazzcode terbaca dari apikeys.json", !!getFazzcodeKey());
}

_resetFazzAiHttpForTest();
w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
