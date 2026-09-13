// E2E — POMODORO PERSIST + LIVE TICKER (13 Sep 2026, batch 4 variasi polos)
// ".pomodoro timer tanpa timer + session RAM hilang pas restart" —
// engine persist + scheduler 30 dtk + live ticker 🕒 + restore tahan restart.
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const DB_DIR = "/tmp/nova-pomo-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(DB_DIR + "/db.json");

const {
  createSession, getSession, endSession, advancePhase, recomputeIfMissed,
  buildPhaseCard, buildTickCard, buildTransitionCard, phaseEndTs,
  firePhaseTicker, ensurePomodoroScheduler, restorePomodoro, _resetPomodoroForTest,
} = await import(R + "/src/lib/nova-pomodoro.js");
const { runLiveTicker } = await import(R + "/src/lib/nova-countdown.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(String(s)).toLowerCase();

const { handler } = await import(R + "/plugins/education/pomodoro.js");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SENDER = "628123456789@s.whatsapp.net";
const CHAT = "628123456789@s.whatsapp.net";

function freshStore() { _resetPomodoroForTest(); }
const mkSock = (sends) => ({
  sendMessage: async (chat, payload, opts) => { sends.push({ chat, payload, opts }); return { key: { id: "m" + sends.length } }; },
});

// ═══════════════════════════════════════════════════════════════
w("\n— engine: create/advance/end (pure) —");
freshStore();
{
  const s = createSession({ sender: SENDER, chat: CHAT, focusMs: 25 * 60000, breakMs: 5 * 60000 });
  check("create → fase focus, cycles 0", s.phase === "focus" && s.cycles === 0);
  check("persist: session kebaca ulang dari store", getSession(SENDER)?.phase === "focus");

  advancePhase(s);
  check("advance focus→break: cycles 1, totalFocus 25m", s.phase === "break" && s.cycles === 1 && s.totalFocusMs === 25 * 60000);
  advancePhase(s);
  check("advance break→focus: cycles tetap 1", s.phase === "focus" && s.cycles === 1);

  const res = endSession(SENDER);
  check("end mid-focus: totalFocus >= 25m (fokus berjalan kehitung)", res.cycles === 1 && res.totalFocusMs >= 25 * 60000 && res.totalFocusMs <= 50 * 60000);
  check("end → session lenyap", getSession(SENDER) === null);
  check("end sesi yang gak ada → null", endSession(SENDER) === null);
}

// ═══════════════════════════════════════════════════════════════
w("\n— recomputeIfMissed (fast-forward offline) —");
freshStore();
{
  const s = createSession({ sender: SENDER, chat: CHAT, focusMs: 2000, breakMs: 2000 });
  s.phaseStart = Date.now() - 9000; // kelewat 2+ fase pas "mati"
  const missed = recomputeIfMissed(s);
  check("kelewat 2 fase → fast-forward (4×4500ms ≈ 2 transisi)", missed >= 2, "missed=" + missed);
  check("setelah recompute: fase aktif (end di masa depan)", phaseEndTs(s) > Date.now());
}

// ═══════════════════════════════════════════════════════════════
w("\n— kartu (pure) —");
freshStore();
{
  const s = createSession({ sender: SENDER, chat: CHAT, focusMs: 10 * 60000, breakMs: 5 * 60000 });
  const tick = norm(buildTickCard(s));
  check("tick fokus: 🍅 SESSI FOKUS + 🕒 sisa", tick.includes("sesi fokus") && tick.includes("sisa"));
  s.phase = "break";
  const tickB = norm(buildTickCard(s));
  check("tick istirahat: ☕ WAKTU ISTIRAHAT", tickB.includes("istirahat"));
  s.phase = "focus"; advancePhase(s); // → break
  const tr = norm(buildTransitionCard(s));
  check("transisi: FOKUS SELESAI + istirahat", tr.includes("fokus selesai") && tr.includes("istirahat"));
  advancePhase(s); // → focus
  const tr2 = norm(buildTransitionCard(s));
  check("transisi balik: ISTIRAHAT SELESAI + fokus lagi", tr2.includes("istirahat selesai") && tr2.includes("fokus"));
  const st = norm(buildPhaseCard(s, "."));
  check("status card: cycle + stop hint", st.includes("cycle") && st.includes("stop"));
}

// ═══════════════════════════════════════════════════════════════
w("\n— ticker fase: sampai habis + batal pas di-stop —");
freshStore();
{
  // sampai habis (fokus 3 dtk)
  const s = createSession({ sender: SENDER, chat: CHAT, focusMs: 3000, breakMs: 2000 });
  const sends = [];
  const sock = mkSock(sends);
  firePhaseTicker(sock, s, ".");
  await sleep(4200);
  const last = norm(sends[sends.length - 1]?.payload?.text || "");
  check("ticker fokus selesai: kartu beku sisa 0:00", last.includes("0:00") && last.includes("fokus"), last.slice(0, 80));
  check("ticker ngedit kartu (bukan spam pesan baru)", sends.length >= 2 && sends.slice(1).every((x) => !!x.payload.edit));

  // batal: stop sesi → ticker break mati duluan
  endSession(SENDER);
  const s2 = createSession({ sender: SENDER, chat: CHAT, focusMs: 300000, breakMs: 300000 });
  const sends2 = [];
  const sock2 = mkSock(sends2);
  firePhaseTicker(sock2, s2, ".");
  await sleep(1500);
  const editsBefore = sends2.filter((x) => x.payload.edit).length;
  endSession(SENDER); // → isCancelled true
  await sleep(2500);
  const editsAfter = sends2.filter((x) => x.payload.edit).length;
  check("stop sesi → ticker berhenti ngedit (cancel aktif)", editsAfter - editsBefore <= 1, `before=${editsBefore} after=${editsAfter}`);
}

// ═══════════════════════════════════════════════════════════════
w("\n— scheduler pusat: ganti fase otomatis + transisi dikirim —");
freshStore();
{
  const s = createSession({ sender: SENDER, chat: CHAT, focusMs: 3000, breakMs: 100000 });
  const sends = [];
  const sock = mkSock(sends);
  ensurePomodoroScheduler(sock);
  const t0 = sends.length;
  await sleep(3500 + 32 * 1000); // fase habis → tunggu siklus scheduler 30 dtk
  const cur = getSession(SENDER);
  const tr = norm(sends.filter((x) => x.payload?.text && !x.payload.edit).map((x) => x.payload.text).join("\n"));
  check("scheduler: fase ganti ke istirahat otomatis", cur?.phase === "break", "phase=" + cur?.phase);
  check("scheduler: kartu transisi FOKUS SELESAI dikirim", tr.includes("fokus selesai"));
  check("scheduler: cycles jadi 1", cur?.cycles === 1);
  endSession(SENDER);
}

// ═══════════════════════════════════════════════════════════════
w("\n— restorePomodoro: tahan restart —");
{
  // simulasi sesi dari "proses lama" yang masih ada di store
  _resetPomodoroForTest();
  const s = createSession({ sender: SENDER, chat: CHAT, focusMs: 4000, breakMs: 3000 });
  s.phaseStart = Date.now() - 8000; // 2 fase kelewat pas bot mati
  const sends = [];
  const sock = mkSock(sends);
  restorePomodoro(sock);
  const kabar = norm(sends.map((x) => x.payload?.text || "").join("\n"));
  check("restore: kartu 'kelewat' dikirim", kabar.includes("kelewat") || kabar.includes("lanjut"), kabar.slice(0, 100));
  check("restore: fase di-fast-forward ke masa depan", phaseEndTs(getSession(SENDER)) > Date.now());
  await sleep(500);
  check("restore: ticker fase baru kefire", sends.some((x) => x.payload?.text && !x.payload.edit && norm(x.payload.text).includes("pomodoro")));
  endSession(SENDER);
}

// ═══════════════════════════════════════════════════════════════
w("\n— handler .pomodoro (db beneran) —");
{
  const replies = [];
  const sends = [];
  const sock = mkSock(sends);
  const m = {
    sender: SENDER, chat: CHAT, pushName: "Budi",
    reply: async (txt, opts) => { replies.push({ txt, opts }); return { key: { id: "r" } }; },
  };
  const ctx = { sock, args: [], config: { command: { prefix: "." } } };

  await handler(m, ctx); // tanpa sub → help
  check("help: perintah start/status/stop", norm(replies[0].txt).includes("start") && norm(replies[0].txt).includes("status"));

  await handler(m, { ...ctx, args: ["start"] });
  check("start: kartu FOKUS DIMULAI + default 25/5", norm(replies[1].txt).includes("dimulai") && norm(replies[1].txt).includes("25"));
  await sleep(300);
  check("start: ticker live kefire di bawahnya", sends.some((x) => norm(x.payload?.text || "").includes("sesi fokus")));
  const tSends = sends.length;
  await handler(m, { ...ctx, args: ["start"] }); // dobel start
  check("dobel start → ditolak 'sudah berjalan'", norm(replies[2].txt).includes("berjalan") && sends.length === tSends);

  await handler(m, { ...ctx, args: ["status"] });
  check("status: kartu fase + sisa", norm(replies[3].txt).includes("sisa") || norm(replies[3].txt).includes("cycle"));

  await handler(m, { ...ctx, args: ["stop"] });
  check("stop: kartu selesai + cycle", norm(replies[4].txt).includes("dihentikan"));
  await sleep(2100);
  const editsAfterStop = sends.filter((x) => x.payload.edit).length;
  await sleep(2200);
  const editsLater = sends.filter((x) => x.payload.edit).length;
  check("stop: ticker berhenti total setelahnya", editsLater === editsAfterStop, `${editsAfterStop} → ${editsLater}`);

  await handler(m, { ...ctx, args: ["status"] }); // status tanpa sesi
  check("status tanpa sesi → guide start", norm(replies[5].txt).includes("belum ada sesi"));
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
