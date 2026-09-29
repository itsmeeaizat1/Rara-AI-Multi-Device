// Integrasi smoke novabridge — pesan TG/Discord fake → messageHandler ASLI → plugin nyata.
// Run: node test/novabridge-e2e/integration-smoke.mjs (mode public dipaksa di DB tmp)
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
const R = path.resolve(".");
const url = (p) => pathToFileURL(path.join(R, p)).href;

const { initDatabase } = await import(url("src/lib/nova-database.js"));
await initDatabase(path.join(os.tmpdir(), "novabridge-itg-" + Date.now() + "-" + Math.random().toString(36).slice(2)));
const { loadPlugins } = await import(url("src/lib/nova-plugins.js"));
await loadPlugins(path.join(R, "plugins"));
const adapter = await import(url("src/lib/novabridge/adapter.js"));
const { messageHandler } = await import(url("src/handler.js"));
const { getDatabase } = await import(url("src/lib/nova-database.js"));
const db = getDatabase();
adapter.ensureBridgeState(db);
// mode public biar middleware gak blok di DB tmp (di VPS owner udah public)
try { db.setting("botMode", "public"); db.db.write(); } catch (e) { console.log("setting botMode:", e?.message); }

const sends = [];
const fakeClient = {
  sendMessage: async (c, t) => { sends.push(["TEXT", String(t)]); return { message_id: sends.length }; },
  sendPhoto: async (c, f, cap) => { sends.push(["PHOTO", String(cap ?? "")]); return { message_id: sends.length }; },
  sendVideo: async (c, f, cap) => { sends.push(["VIDEO", String(cap ?? "")]); return { message_id: sends.length }; },
  sendAudio: async (c, f, cap) => { sends.push(["AUDIO", String(cap ?? "")]); return { message_id: sends.length }; },
  sendDocument: async (c, f, cap) => { sends.push(["DOC", String(cap ?? ""), f?.filename]); return { message_id: sends.length }; },
  setMessageReaction: async (c, e) => { sends.push(["REACT", String(e)]); return null; },
  editMessageText: async () => null,
};
const chatMap = new Map();
const sock = adapter.makeBridgeSock({ platform: "telegram", client: fakeClient, chatMap });

async function run(text) {
  sends.length = 0;
  const raw = adapter.telegramToRaw({ from: { id: 777111, is_bot: false, first_name: "T" }, chat: { id: 777111 }, text, message_id: Math.floor(Math.random() * 1e6), date: Math.floor(Date.now() / 1000) });
  const res = await adapter.handleBridgeMessage(raw, sock, { db, messageHandler, prefix: ".", platform: "telegram", chatMap, log: (m) => console.log("  [log]", m) });
  await new Promise((r) => setTimeout(r, 2000));
  return res;
}

const { fromSC } = await import(url("src/lib/styler.js"));
const norm = (x) => fromSC(String(x)).toLowerCase();

let pass = 0, fail = 0;
const check = (name, ok, extra) => { console.log((ok ? "  ✅ " : "  ❌ ") + name + (ok ? "" : " → " + String(extra).slice(0, 200))); ok ? pass++ : fail++; };

const r1 = await run(".ftoolroman 9");
check("dispatch sukses", r1.handled === "dispatched", JSON.stringify(r1));
check("react loading 🕒 ke-client (bukan teks kosong)", sends.some((s) => s[0] === "REACT" && s[1] === "🕒"), JSON.stringify(sends));
check("balasan 'IX' sampai (smallcaps-aware)", sends.some((s) => s[0] === "TEXT" && /ix/.test(norm(s[1])) && /9/.test(norm(s[1]))), JSON.stringify(sends.map((s) => [s[0], String(s[1]).slice(0, 40)])));

const r2 = await run(".menu");
check(".menu ter-dispatch & ada balasan (teks/media)", r2.handled === "dispatched" && sends.some((s) => ["TEXT", "PHOTO", "AUDIO", "DOC", "VIDEO"].includes(s[0])), JSON.stringify(r2) + " → " + JSON.stringify(sends.map((s) => s[0])));

console.log(`\nINTEGRATION: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
process.exit(0);
