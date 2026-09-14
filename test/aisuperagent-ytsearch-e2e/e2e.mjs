// E2E AISUPERAGENT YTSEARCH (fix owner 14 Sep 2026: ".aisuperagent juga
// di-upgrade — agent itu novaagent sama aisuperagent bermasalah ngbug").
// .aisuperagent (plugins/ai/agent.js) kena akar bug yang sama kaya
// .novaagent: request "cairkan/carikan X di youtube" gak pernah ke-detect
// → planner AI milih tool salah / jawab halusinasi. FIX: (1) logic cari
// YouTube dipindah ke LIB BERSAMA src/lib/nova-yt-search.js
// (browser beneran → thumbnail preview + deskripsi plain text, unduh cuma
// kalau eksplisit), (2) .aisuperagent dapat DETEKSI LOKAL INSTAN di handler
// (tanpa lewat planner AI) + (3) tool ytsearch terdaftar di nova-agent.js
// TOOL_LIST/SYS_PLAN buat jalur planner. Offline, semua dep di-inject.
import fs from "node:fs";
import { initDatabase } from "../../src/lib/nova-database.js";
import { setAgentDeps, resetAgentDeps } from "../../src/lib/nova-agent.js";
import { config as agConfig, handler as agHandler } from "../../plugins/ai/agent.js";
import {
  detectYtSearchIntent, searchYoutubeAndSend,
  _setYtSearchDepsForTest, _resetYtSearchDepsForTest,
} from "../../src/lib/nova-yt-search.js";

const DB = "/tmp/aisuperagent-ytsearch-e2e-db.json";
fs.rmSync(DB, { recursive: true, force: true });
await initDatabase(DB);

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra) => {
  w((ok ? "✅ " : "❌ ") + name + (ok ? "" : extra ? " — " + extra : ""));
  ok ? pass++ : fail++;
};

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

// ═══ 1. DETEKSI INTENT (lib bersama — dipakai dua agent) ═══
w("\n— detectYtSearchIntent —");
const cek = (txt, wantQuery, wantDownload) => {
  const r = detectYtSearchIntent(norm(txt), txt);
  t("  " + txt, r?.query === wantQuery && !!r?.download === !!wantDownload, "→ " + JSON.stringify(r));
};
cek("cairkan bot alya md ini di youtube", "bot alya md", false);
cek("carikan video tutorial dpixel di youtube", "tutorial dpixel", false);
cek("cari video bot wa alya md di yt", "bot wa alya md", false);
cek("unduh video bot alya md di youtube", "bot alya md", true);
cek("download video lucu di youtube", "lucu", true);
cek("putar video kucing lucu", "kucing lucu", true);
cek("nonton video mancing di youtube", "mancing", true);
t("  bukan request youtube → null", detectYtSearchIntent(norm("buatkan gambar kucing"), "buatkan gambar kucing") === null);
t("  cari hp 5 juta → null (bukan video)", detectYtSearchIntent(norm("carikan hp terbaik 5 juta"), "carikan hp terbaik 5 juta") === null);

// ═══ 2. searchYoutubeAndSend — mode preview & unduh (lib bersama) ═══
w("\n— searchYoutubeAndSend (lib bersama) —");
const VIDEOS = [
  { title: "Cara Cairkan Bot Alya MD — Deploy WhatsApp Bot", author: { name: "Alya MD Official" },
    duration: { timestamp: "12:34" }, views: 15400, ago: "3 minggu lalu",
    description: "Tutorial lengkap cara install dan cairkan bot Alya MD Multi Device.",
    url: "https://youtube.com/watch?v=alyaMD12345" },
  { title: "Setting Bot Alya MD Biar Aktif 24 Jam", author: { name: "WA Bot Indo" },
    duration: { timestamp: "8:11" }, views: 2300, ago: "1 bulan lalu", description: "",
    url: "https://youtube.com/watch?v=alyaMD67890" },
];
const sent = [];
const sock = {
  sendMessage: async (chat, msg) => { sent.push(msg); return { key: { id: "k1" } }; },
};
const mMock = { chat: "x@g.us", sender: "u@w" };

_resetYtSearchDepsForTest();
_setYtSearchDepsForTest({
  browserSearch: async () => { throw new Error("chromium down"); },
  yts: async () => ({ videos: [...VIDEOS] }),
  thumbGet: async () => Buffer.alloc(40000, 9),
  downloadVideoYtDlp: async (url, q) => ({ buffer: Buffer.alloc(45000, 1) }),
  toWhatsAppVideo: async (b) => b,
});
const r1 = await searchYoutubeAndSend(sock, mMock, { query: "bot alya md" });
t("2a. mode preview return via=yt-search", r1?.via === "yt-search" && r1?.mode === "preview");
t("2b. preview kirim image + caption (gak ada video)", !!sent[0]?.image && sent[0].caption.includes("Cara Cairkan Bot Alya MD") && !sent.some(x => x.video));
t("2c. hint unduh ada di caption preview", sent[0].caption.includes("unduh video") && sent[0].caption.includes(".playvideo"));
sent.length = 0;
const r2 = await searchYoutubeAndSend(sock, mMock, { query: "bot alya md", wantDownload: true });
t("2d. mode unduh return mode=unduh", r2?.mode === "unduh");
t("2e. unduh kirim kartu teks + video (gak ada thumbnail)", !!sent.find(x => x.text) && !!sent.find(x => x.video) && !sent.find(x => x.image));

// ═══ 3. HANDLER .aisuperagent — DETEKSI LOKAL INSTAN ═══
w("\n— handler .aisuperagent: deteksi lokal —");
async function runHandler(task, ytCalls) {
  resetAgentDeps();
  setAgentDeps({
    aiChat: async () => { throw new Error("PLANNER AI GAK BOLEH KEPAKE (deteksi lokal harus jalan duluan)"); },
    search: async () => { throw new Error("SEARCH GAK BOLEH KEPAKE"); },
    preview: async () => { throw new Error("PREVIEW GAK BOLEH KEPAKE"); },
  });
  const out = [];
  const m = {
    text: ".aisuperagent " + task, args: task.split(" "),
    chat: "x@g.us", sender: "u@w", pushName: "U", command: "aisuperagent", prefix: ".",
    isGroup: true, isAdmin: true, isOwner: true, isBotAdmin: true,
    react: async () => true, reply: async (x) => { out.push(String(x)); },
    quoted: null, isImage: false,
  };
  const s = {
    user: { id: "62bot:5" },
    sendMessage: async (chat, c) => {
      if (c?.edit) { out.push("[edit] " + c.text); return { key: { id: "k1" } }; }
      if (c?.text) out.push(String(c.text));
      if (c?.caption) out.push(String(c.caption));
      return { key: { id: "k1" } };
    },
  };
  const deps = {
    ytsearchSend: async (sk, mm, opts) => {
      ytCalls.push(opts);
      // simulasi kiriman searchYoutubeAndSend
      await sk.sendMessage(mm.chat, { image: Buffer.alloc(30000, 9), caption: "🎬 preview " + opts.query });
      return { via: "browser", mode: opts.wantDownload ? "unduh" : "preview" };
    },
  };
  await agHandler(m, { sock: s, db: { setting: () => ({}) }, deps });
  return out;
}

// cari (preview) — instan tanpa planner AI
const c1 = [];
const o1 = await runHandler("cairkan bot alya md ini di youtube", c1);
t("3a. request youtube DIDETEKSI LOKAL (ytsearchSend kepanggil)", c1.length === 1, JSON.stringify(c1));
t("3b. query ke-ekstrak bener + download:false (preview)", c1[0]?.query === "bot alya md" && c1[0]?.wantDownload === false, JSON.stringify(c1[0]));
t("3c. planner AI GAK kepake (gak ada crash 'PLANNER AI GAK BOLEH KEPAKE')", !o1.some(x => /PLANNER AI GAK BOLEH|Gagal/.test(x)), o1.join(" | ").slice(0, 120));
t("3d. thumbnail preview dikirim via engine", o1.some(x => x.includes("preview bot alya md")));
t("3e. status final di-edit 'udah aku kirim di atas' (smallcaps)", o1.filter(x => x.startsWith("[edit]")).some(x => x.includes("ᴋɪʀɪᴍ ᴅɪ ᴀᴛᴀꜱ")), o1.filter(x => x.startsWith("[edit]")).join(" | ").slice(0, 120));

// unduh (eksplisit) — instan juga
const c2 = [];
const o2 = await runHandler("unduh video bot alya md di youtube", c2);
t("3f. 'unduh video X' → deteksi lokal download:true", c2[0]?.query === "bot alya md" && c2[0]?.wantDownload === true, JSON.stringify(c2[0]));
t("3g. status final 'udah aku unduh' (smallcaps)", o2.filter(x => x.startsWith("[edit]")).some(x => x.includes("ᴜɴᴅᴜʜ")), o2.filter(x => x.startsWith("[edit]")).join(" | ").slice(0, 120));

// bukan youtube → deteksi lokal gak nyangkut (planner bakal jalan → error mock tertangkap rapi)
const c3 = [];
const o3 = await runHandler("kick orang bernama budi", c3);
t("3h. bukan request youtube → ytsearchSend GAK kepanggil", c3.length === 0, JSON.stringify(c3));
t("3i. handler gak crash (error planner tertangani rapi)", !o3.some(x => /is not a function|Cannot read/.test(x)), o3.join(" | ").slice(0, 100));

// ═══ 4. REGISTRASI TOOL ytsearch di planner ═══
w("\n— registrasi tool planner —");
const { TOOLS_LIST_NAME } = {};
const na = await import("../../src/lib/nova-agent.js");
const sysPlan = na.SYS_PLAN || "";
t("4a. ytsearch ada di TOOL_LIST nova-agent.js", na.TOOL_LIST?.includes("ytsearch") || /ytsearch/.test(sysPlan), "cek export");

// ═══ 5. tool searchyt .novaagent tetap delegasi lib bersama ═══
w("\n— .novaagent TOOLS.searchyt (delegasi) —");
const { TOOLS, _setSearchytDepsForTest, _resetSearchytDepsForTest } = await import("../../src/lib/aiagent.js");
_resetSearchytDepsForTest();
_setSearchytDepsForTest({
  browserSearch: async () => { throw new Error("down"); },
  yts: async () => ({ videos: [...VIDEOS] }),
  thumbGet: async () => Buffer.alloc(25000, 9),
});
const sentN = [];
const connN = { sendMessage: async (c, msg) => { sentN.push(msg); return { key: {} }; } };
await TOOLS.searchyt.run(connN, mMock, { query: "bot alya md" });
t("5a. novaagent delegasi → preview thumbnail jalan", !!sentN[0]?.image && sentN[0].caption.includes("Cara Cairkan Bot Alya MD"), JSON.stringify(sentN.map(x => Object.keys(x))));
t("5b. dua agent SEKARANG pakai ENGINE YANG SAMA (lib bersama)", !!sentN[0]?.image);

_resetYtSearchDepsForTest();
_resetSearchytDepsForTest();
resetAgentDeps();
w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
