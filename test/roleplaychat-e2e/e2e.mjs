// E2E — AI ROLEPLAY CHAT (.airoleplaychat, 14 Sep 2026)
// Request owner: fitur roleplay AI via fazzcode.eu.cc chatbot-role
// (list 17 karakter / start / custom persona / chat konteks lokal / stop / status)
// Seam: _setFazzRoleHttpForTest — HTTP di-mock, gak nembak API live.
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const DB_DIR = "/tmp/nova-rpchat-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(DB_DIR + "/db.json");
const db = getDatabase();

const { handler } = await import(R + "/plugins/ai/airoleplaychat.js");
const { _setFazzRoleHttpForTest, _resetFazzRoleHttpForTest } = await import(R + "/src/scraper/fazzroleplay.js");
const { getFazzcodeKey } = await import(R + "/src/lib/config/env-loader.js");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

// ── mock HTTP: record calls + respond per action
const calls = [];
const fakeHttp = {
  get: async (url, { params } = {}) => {
    calls.push({ url, params });
    if (params?.action === "list") {
      return { data: { status: true, characters: [
        { name: "Sakura", preview: "cheerful playful tone" },
        { name: "Gojo Satoru", preview: "confident playful" },
      ] } };
    }
    if (params?.action === "create") {
      return { data: { status: true, name: params.name, reply: "Halo! Aku " + params.character + "!" } };
    }
    if (params?.action === "chat") {
      const ctx = (params.query || "").startsWith("[context:");
      return { data: { status: true, reply: ctx ? "Aku inget obrolan kita!" : "Balasan karakter." } };
    }
    return { data: { status: false, message: "action tidak valid" } };
  },
};
_setFazzRoleHttpForTest(fakeHttp);

const SENDER = "6289988776655@s.whatsapp.net";
function mkMock(args) {
  const sends = [];
  const m = {
    sender: SENDER, chat: "c@g.us", pushName: "Budi", isOwner: false, isGroup: false,
    args, text: args.join(" "), command: "airoleplaychat", prefix: ".",
    mentionedJid: [], quoted: null,
    react: async () => {},
    reply: async (txt) => { sends.push(String(txt)); return { key: { id: "r" + sends.length } }; },
  };
  return { m, sock: {}, sends };
}
const { fromSC } = await import(R + "/src/lib/styler.js");
// GOTCHA (ke-6x): claraWrap = smallcaps — asersi WAJIB lewat fromSC
const out = (mk) => fromSC(mk.sends.join("\n──\n"));

// ═══════════════════════════════════════════════════════════════
w("\n— setup & guide —");
check("API key fazzcode kebaca dari apikeys.json", !!getFazzcodeKey(), getFazzcodeKey() || "(kosong)");

{
  const mk = mkMock([]);
  await handler(mk.m, { sock: mk.sock });
  const o = out(mk);
  check("tanpa args → guide lengkap (list/start/custom/chat/stop)", o.includes("start") && o.includes("custom") && o.includes("stop") && o.includes("list"));
}

// ═══════════════════════════════════════════════════════════════
w("\n— list karakter —");
{
  const mk = mkMock(["list"]);
  await handler(mk.m, { sock: mk.sock });
  const o = out(mk);
  check("daftar karakter tampil + jumlah", o.includes("sakura") && o.includes("gojo satoru"));
  check("action=list kepanggil dengan api_key", calls.at(-1)?.params?.action === "list" && calls.at(-1)?.params?.api_key === getFazzcodeKey());
}

// ═══════════════════════════════════════════════════════════════
w("\n— start sesi —");
{
  const mk = mkMock(["start", "sakura"]);
  await handler(mk.m, { sock: mk.sock });
  const o = out(mk);
  check("sesi mulai — kartu roleplay", o.includes("roleplay dimulai") && o.includes("sakura"));
  const c = calls.at(-1);
  check("action=create + name=pushName", c?.params?.action === "create" && c?.params?.character === "sakura" && c?.params?.name === "Budi", JSON.stringify(c?.params));
  const sess = db.getPlayerData(SENDER, "roleplaySession");
  check("sesi persist di db", sess?.character === "sakura" && Array.isArray(sess.history));
}

// ═══════════════════════════════════════════════════════════════
w("\n— chat lanjut + konteks lokal —");
{
  const mk = mkMock(["kamu", "lagi", "ngapain?"]);
  await handler(mk.m, { sock: mk.sock });
  const o = out(mk);
  check("chat dibalas karakter", o.includes("inget obrolan") || o.includes("Balasan"), o.slice(0, 80));
  const c = calls.at(-1);
  check("action=chat + konteks di-inject ke query", c?.params?.action === "chat" && c?.params?.query?.startsWith("[context:"), c?.params?.query?.slice(0, 60));
  check("konteks = nama user + riwayat", (c?.params?.query || "").includes("User: halo") && (c?.params?.query || "").includes("sakura: Halo! Aku sakura!"));
  const sess = db.getPlayerData(SENDER, "roleplaySession");
  check("riwayat nambah 2 giliran (max 6)", (sess?.history || []).length === 4, (sess?.history || []).length + " entri");
}

// ═══════════════════════════════════════════════════════════════
w("\n— status & stop —");
{
  const mk1 = mkMock(["status"]);
  await handler(mk1.m, { sock: mk1.sock });
  const o1 = out(mk1);
  check("status: karakter + nama + giliran", o1.includes("sakura") && o1.includes("budi") && o1.includes("giliran"));

  const mk2 = mkMock(["stop"]);
  await handler(mk2.m, { sock: mk2.sock });
  const o2 = out(mk2);
  check("stop: sesi berakhir", o2.includes("berakhir"));
  const sess = db.getPlayerData(SENDER, "roleplaySession");
  check("sesi kehapus dari db", !sess?.character);
}

// ═══════════════════════════════════════════════════════════════
w("\n— custom persona —");
{
  const mk = mkMock(["custom", "Miko", "|", "tsundere", "sahabat", "masa", "kecil"]);
  await handler(mk.m, { sock: mk.sock });
  const o = out(mk);
  check("custom: sesi persona bebas jalan", o.includes("roleplay dimulai") && o.includes("miko"), o.slice(0, 80));
  const c = calls.at(-1);
  check("prompt persona kekirim ke API", c?.params?.action === "create" && (c?.params?.prompt || "").includes("tsundere"), JSON.stringify(c?.params?.prompt));
  const sess = db.getPlayerData(SENDER, "roleplaySession");
  check("persona ke-save di sesi", (sess?.persona || "").includes("tsundere"));
}

// ═══════════════════════════════════════════════════════════════
w("\n— chat tanpa sesi ditolak sopan —");
{
  db.setPlayerData(SENDER, "roleplaySession", null);
  const mk = mkMock(["halo"]);
  await handler(mk.m, { sock: mk.sock });
  const o = out(mk);
  check("tanpa sesi → suruh start dulu", o.includes("belum ada sesi") && o.includes("start"));
}

// ═══════════════════════════════════════════════════════════════
w("\n— error API ditangani —");
{
  _setFazzRoleHttpForTest({ get: async () => { throw Object.assign(new Error("req fail"), { response: { data: { message: "server sibuk" } } }); } });
  const mk = mkMock(["start", "sakura"]);
  await handler(mk.m, { sock: mk.sock });
  const o = out(mk);
  check("error create → pesan ramah", o.includes("gagal") && o.includes("server sibuk"), o.slice(0, 80));
  _setFazzRoleHttpForTest(fakeHttp);
}

_resetFazzRoleHttpForTest();
w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
