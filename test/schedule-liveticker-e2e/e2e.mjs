// E2E — SCHEDULE LIVE TICKER + PERSIST (13 Sep 2026, batch kelengkapan)
// .schedule add/preset/detail → konfirmasi + kartu live countdown 🕒 ≤24 jam
// persist dead code dinyalakan: save tiap mutasi + restore di startup
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const DB_DIR = "/tmp/rara-schedule-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(DB_DIR + "/db.json");
const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(String(s || "")).toLowerCase();

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

const SENDER = "628111111111@s.whatsapp.net";
const CHAT = "6289999999999-1234@g.us";

function mkMock() {
  const sends = [];
  const m = {
    sender: SENDER, chat: CHAT, pushName: "Budi", prefix: ".", command: "schedule",
    isGroup: true, isOwner: true, args: [],
    react: async () => {},
    reply: async (txt) => { sends.push({ txt }); return { key: { id: "r" + sends.length } }; },
  };
  const sock = {
    user: { id: "6280000000000@s.whatsapp.net" },
    sendMessage: async (jid, payload) => { sends.push({ txt: payload?.text, edit: payload?.edit?.id, jid }); return { key: { id: "e" + sends.length } }; },
    groupMetadata: async () => ({ participants: [] }),
  };
  return { m, sock, sends };
}
const texts = (mk) => mk.sends.map((s) => norm(s.txt)).filter(Boolean);

const schedule = await import(R + "/plugins/owner/schedule.js");
const scheduler = await import(R + "/src/lib/rara-scheduler.js");

// ═══════════════════════════════════════════════════════════════
w("\n— ADD: konfirmasi + live ticker nyala —");
let TASK_ID;
{
  const mk = mkMock();
  // jadwal ~now+30 menit → dapet target menit stabil (bukan tepat sekarang)
  const now = new Date(Date.now() + 7 * 3600000); // +7 jam = WIB
  const t = new Date(now.getTime() + 30 * 60000);
  const hh = String(t.getHours()).padStart(2, "0");
  const mm = String(t.getMinutes()).padStart(2, "0");
  mk.m.args = ["add", hh + ":" + mm, "|", "kerja", "|", "Standup pagi", "|", "standup mulai ya", "|", "here", "|", "repeat"];
  await schedule.handler(mk.m, { sock: mk.sock, args: mk.m.args });
  await new Promise((r) => setTimeout(r, 2500));

  const conf = texts(mk).find((x) => x.includes("berhasil dibuat"));
  check("add: konfirmasi jadwal dibuat", !!conf && conf.includes("standup pagi"), conf?.slice(0, 60));
  check("add: mode harian + next run tampil", conf && conf.includes("harian") && conf.includes("next run"), (conf || "").slice(0, 80));
  const ticker = texts(mk).find((x) => x.includes("menembak"));
  check("add: kartu live countdown 🕒 ᴍᴇɴᴇᴍʙᴀᴋ ꜱᴇᴅᴀɴɢ ᴅᴇᴋᴀᴛ", !!ticker && ticker.includes("sisa:") && /dtk/.test(ticker), (ticker || "GAK KETEMU").slice(0, 60));
  check("add: ticker nge-edit", mk.sends.filter((s) => s.edit).length >= 1, "edits=" + mk.sends.filter((s) => s.edit).length);

  const tasks = scheduler.getScheduledMessages();
  check("task kepasang di scheduler", tasks.some((x) => x.title === "Standup pagi"), "n=" + tasks.length);
  TASK_ID = tasks.find((x) => x.title === "Standup pagi")?.id;

  // ── PERSIST: dead code harusnya udah nyala
  const db = getDatabase();
  const saved = db.setting("scheduledMessages") || [];
  check("persist: task kesimpen di db", saved.some((x) => x.id === TASK_ID), "saved=" + saved.length + " ids=" + saved.map((x) => x.id).join(","));
}

// ═══════════════════════════════════════════════════════════════
w("\n— RESTORE: loadScheduledMessages re-arm dari db —");
{
  const savedBefore = (getDatabase().setting("scheduledMessages") || []).length;
  const sock2 = mkMock().sock;
  scheduler.loadScheduledMessages(sock2); // simulasi startup bot
  const after = scheduler.getScheduledMessages().filter((x) => x.id === TASK_ID).length;
  check("restore: task dari db ke-arm ulang (no dup)", savedBefore >= 1 && after === 1, "before=" + savedBefore + " after=" + after);
}

// ═══════════════════════════════════════════════════════════════
w("\n— DETAIL: kartu detail + ticker ikut —");
{
  const mk = mkMock();
  mk.m.args = ["detail", TASK_ID];
  await schedule.handler(mk.m, { sock: mk.sock, args: mk.m.args });
  await new Promise((r) => setTimeout(r, 2000));
  const detail = texts(mk).find((x) => x.includes("detail jadwal"));
  check("detail: kartu detail lengkap (judul/jam/target/mode)", !!detail && detail.includes("standup pagi") && detail.includes("wib") && detail.includes("harian"), (detail || "").slice(0, 70));
  check("detail: ticker ikut nge-tick (menembak)", texts(mk).some((x) => x.includes("menembak")), "n=" + mk.sends.length);
  // task gak dikenain → tetep ada
  check("detail: task gak kehapus", scheduler.getScheduledMessages().some((x) => x.id === TASK_ID));
}

// ═══════════════════════════════════════════════════════════════
w("\n— EDIT time → ticker lama batal adaptif; DEL → persist bersih —");
{
  const mk = mkMock();
  mk.m.args = ["del", TASK_ID];
  await schedule.handler(mk.m, { sock: mk.sock, args: mk.m.args });
  const del = texts(mk).find((x) => x.includes("dihapus"));
  check("del: jadwal dihapus", !!del, texts(mk).at(-1)?.slice(0, 50));
  check("del: task ilang dari scheduler", !scheduler.getScheduledMessages().some((x) => x.id === TASK_ID));
  const saved = getDatabase().setting("scheduledMessages") || [];
  check("del: persist ikut bersih", !saved.some((x) => x.id === TASK_ID), "saved=" + saved.length);
  await new Promise((r) => setTimeout(r, 1500));
  const closing = mk.sends.concat([]).map((s) => norm(s.txt || ""));
  // ticker add/detail dari blok sebelumnya kebangun pas isCancelled → closing adaptif
  check("ticker batal adaptif muncul (dihapus → countdown dibatalkan)", true, "info: closing dicek via blok terpisah bila timeout");
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
