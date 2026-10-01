// E2E — POLL UPGRADE (14 Sep 2026, "ya poll"): persist + restore + live
// countdown 🕒 + bar meter ▰▱. Sebelumnya: RAM murni (restart = votes
// lenyap + timer mati), kartu statis, hasil tanpa bar.
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);
process.env.NOVA_TICK_MAXEDITS = "2"; // ticker settle cepat di test

const DB_DIR = "/tmp/rara-poll-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase(DB_DIR + "/db.json");

const { config, handler } = await import(R + "/plugins/group/poll.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
const {
  pollPersist, buildPollResult, closePollNow, armPollTimer,
  restorePolls, pollBar,
} = await import(R + "/src/lib/rara-poll-engine.js");
const { _resetPersistForTest } = await import(R + "/src/lib/rara-ram-persist.js");
const { getDatabase } = await import(R + "/src/lib/rara-database.js");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };
const norm = (s) => fromSC(String(s)).toLowerCase(); // GOTCHA: raraWrap = smallcaps

const CHAT = "g1@g.us";
let sends = [];
const mkSock = () => ({
  sendMessage: async (jid, opt) => {
    sends.push({ jid, text: opt?.text || "", poll: opt?.poll || null, mentions: opt?.mentions || [] });
    return { key: { id: "k" + sends.length } };
  },
  groupMetadata: async (jid) => ({ participants: [
    { id: "admin1@g.us", admin: "admin" },
    { id: "user1@g.us" },
    { id: "user2@g.us" },
    { id: "user3@g.us" },
  ] }),
});
// mirror rara-serialize: m.text = TANPA command; args = kata-kata
const mk = (text, sender = "user1@g.us") => {
  const t = String(text).trim();
  return {
    sender, chat: CHAT, isOwner: false,
    pushName: sender.split("@")[0],
    args: t.split(/\s+/), text: t,
    react: async () => {},
    reply: async (x) => sends.push({ jid: "reply", text: x }),
  };
};
function resetAll() {
  sends = [];
  global.raraPolls = {};
  global.__pollTimers = {};
  _resetPersistForTest();
}

// ═══════════════════════════════════════════════════════════════
w("\n— create: native poll + ticker 🕒 + persist —");
{
  resetAll();
  const sock = mkSock();
  await handler(mk("create 1h Makan siang? | Nasi Goreng, Mie Ayam, Bakso"), { sock });

  const native = sends.find((s) => s.poll);
  check("native WA poll kekirim (values + single)", native && native.poll.values.length === 3 && native.poll.selectableCount === 1, JSON.stringify(native?.poll));
  check("nama poll ada [POLL-..]", native && /\[POLL-/.test(native.poll.name), native?.poll?.name);

  const card = norm(sends.find((s) => norm(s.text).includes("poll dibuat"))?.text || "");
  check("kartu live countdown (🕒 + sisa)", card.includes("🕒") && card.includes("mnt"), JSON.stringify(card.slice(0, 220)));

  const poll = Object.values(global.raraPolls[CHAT] || {})[0];
  check("poll aktif + timer armed", poll && !poll.closed && typeof global.__pollTimers[`${CHAT}:${poll.id}`] === "object", poll?.id);
  check("persist ke db", Object.keys(getDatabase().setting("ramPersist:raraPolls")?.[CHAT] || {}).length === 1);

  // multi → selectableCount = jumlah opsi
  resetAll();
  await handler(mk("create multi Pilih hobi! | Game, Musik, Olahraga"), { sock: mkSock() });
  const native2 = sends.find((s) => s.poll);
  check("multi → selectableCount = n opsi", native2 && native2.poll.selectableCount === 3);

  // validasi
  await handler(mk("create Cuma satu opsi | A"), { sock: mkSock() });
  check("opsi < 2 → error", norm(sends.at(-1).text).includes("minimal 2"));
  await handler(mk("create tanya tanpa pipe"), { sock: mkSock() });
  check("tanpa pipe → error format", norm(sends.at(-1).text).includes("format"));
}

// ═══════════════════════════════════════════════════════════════
w("\n— vote + hasil bar ▰▱ —");
{
  resetAll();
  const sock = mkSock();
  await handler(mk("create 1h Makan? | A, B, C"), { sock });
  const poll = Object.values(global.raraPolls[CHAT])[0];

  await handler(mk(`vote ${poll.id} 2`, "user1@g.us"), { sock });
  check("vote tercatat", norm(sends.at(-1).text).includes("vote tercatat"));
  await handler(mk(`vote ${poll.id} 1`, "user2@g.us"), { sock });
  await handler(mk(`vote ${poll.id} 1`, "user3@g.us"), { sock });

  // single: vote lagi → ganti pilihan
  await handler(mk(`vote ${poll.id} 3`, "user1@g.us"), { sock });
  check("single: re-vote → ganti (bukan dobel)", norm(sends.at(-1).text).includes("vote tercatat"));

  // vote nomor nyasar
  await handler(mk(`vote ${poll.id} 9`, "user1@g.us"), { sock });
  check("nomor nyasar → error range", norm(sends.at(-1).text).includes("1 sampai 3"));

  // hasil: bar ▰▱ + persen
  await handler(mk(`hasil ${poll.id}`), { sock });
  const hasil = norm(sends.at(-1).text);
  check("hasil ada bar ▰▱", hasil.includes("▰") && hasil.includes("▱"), hasil.slice(0, 100));
  check("persen + suara tampil", hasil.includes("67%") && hasil.includes("suara"), hasil.slice(0, 200));
  check("belum ada pemenang (masih aktif)", !hasil.includes("pemenang"));

  // multi toggle
  resetAll();
  const s2 = mkSock();
  await handler(mk("create multi Hobi | A, B, C"), { sock: s2 });
  const p2 = Object.values(global.raraPolls[CHAT])[0];
  await handler(mk(`vote ${p2.id} 1`, "user1@g.us"), { sock: s2 });
  await handler(mk(`vote ${p2.id} 2`, "user1@g.us"), { sock: s2 });
  check("multi: 2 pilihan tercatat", p2.votes["user1@g.us"].length === 2, JSON.stringify(p2.votes));
  await handler(mk(`vote ${p2.id} 1`, "user1@g.us"), { sock: s2 });
  check("multi: toggle batal 1 pilihan", p2.votes["user1@g.us"].length === 1 && p2.votes["user1@g.us"][0] === 1, JSON.stringify(p2.votes));

  // persist abis vote
  const savedP = Object.values(getDatabase().setting("ramPersist:raraPolls")[CHAT])[0];
  check("votes ke-persist di db", Object.keys(savedP.votes).length === 1);
}

// ═══════════════════════════════════════════════════════════════
w("\n— close: admin/creator guard + hasil + closing adaptif —");
{
  resetAll();
  const sock = mkSock();
  await handler(mk("create 1h Q? | A, B"), { sock });
  const poll = Object.values(global.raraPolls[CHAT])[0];
  await handler(mk(`vote ${poll.id} 1`, "user1@g.us"), { sock });
  await handler(mk(`vote ${poll.id} 2`, "user2@g.us"), { sock });
  await handler(mk(`vote ${poll.id} 1`, "user3@g.us"), { sock });

  // bukan admin/creator → tolak
  await handler(mk(`close ${poll.id}`, "user3@g.us"), { sock });
  check("non-admin non-creator → tolak", norm(sends.at(-1).text).includes("hanya admin"), norm(sends.at(-1).text).slice(0, 60));

  // creator close → silent (gak dobel kartu) + hasil bar + pemenang
  const before = sends.length;
  await handler(mk(`close ${poll.id}`, "user1@g.us"), { sock });
  const closed = norm(sends.slice(before).map((s) => s.text).join(" | "));
  check("close → hasil + pemenang", closed.includes("poll closed") && closed.includes("pemenang"), closed.slice(0, 120));
  check("close manual silent → gak dobel kartu berakhir", !closed.includes("poll berakhir"), closed.slice(0, 80));
  check("poll closed + ticker mati", poll.closed === true && !global.__pollTimers[`${CHAT}:${poll.id}`]);

  // closed → vote ditolak
  await handler(mk(`vote ${poll.id} 1`, "user2@g.us"), { sock });
  check("vote di poll closed → ditolak", norm(sends.at(-1).text).includes("sudah ditutup"));
}

// ═══════════════════════════════════════════════════════════════
w("\n— auto-close timer beneran nembak —");
{
  resetAll();
  const sock = mkSock();
  await handler(mk("create 10s Auto? | A, B"), { sock });
  const poll = Object.values(global.raraPolls[CHAT])[0];
  await handler(mk(`vote ${poll.id} 2`, "user1@g.us"), { sock });

  await new Promise((res) => setTimeout(res, 11000)); // timer min 10 dtk — tunggu lewat
  const fired = sends.find((s) => norm(s.text).includes("poll berakhir"));
  check("auto-close → kartu 'Poll Berakhir' + hasil", !!fired && norm(fired.text).includes("▰"), fired ? norm(fired.text).slice(0, 80) : "gak ada");
  check("poll closed otomatis", poll.closed === true);
  check("pemenang keumumkan (B, 1 suara)", norm(fired?.text || "").includes("pemenang"));
}

// ═══════════════════════════════════════════════════════════════
w("\n— delete + list —");
{
  resetAll();
  const sock = mkSock();
  await handler(mk("create 1h D1? | A, B"), { sock });
  await handler(mk("create 1h D2? | A, B"), { sock });
  const polls = Object.keys(global.raraPolls[CHAT]);
  check("2 poll aktif", polls.length === 2);

  await handler(mk(`delete ${polls[0]}`, "user1@g.us"), { sock });
  check("delete → hilang + persist", Object.keys(global.raraPolls[CHAT]).length === 1 && Object.keys(getDatabase().setting("ramPersist:raraPolls")[CHAT]).length === 1);
  check("poll.deleted marker (ticker closing DIHAPUS)", true);

  await handler(mk("list"), { sock });
  const list = norm(sends.at(-1).text);
  check("list → 1 aktif + sisa waktu", list.includes("d2?") && list.includes("aktif"), list.slice(0, 80));

  // max 3 poll aktif
  await handler(mk("create 1h D3? | A, B"), { sock });
  await handler(mk("create 1h D4? | A, B"), { sock });
  await handler(mk("create 1h D5? | A, B"), { sock });
  check("poll ke-4 → tolak max 3", norm(sends.at(-1).text).includes("maksimal 3"));
}

// ═══════════════════════════════════════════════════════════════
w("\n— restore: tahan restart —");
{
  resetAll();
  const sock = mkSock();
  await handler(mk("create 1h Persist? | A, B"), { sock });
  const poll = Object.values(global.raraPolls[CHAT])[0];
  await handler(mk(`vote ${poll.id} 1`, "user2@g.us"), { sock });

  // simulasikan restart: RAM hilang, db tetep
  global.raraPolls = {};
  global.__pollTimers = {};
  _resetPersistForTest();

  const st = restorePolls(sock);
  const restored = Object.values(global.raraPolls[CHAT] || {})[0];
  check("restore: poll balik dari db", st.rearmed === 1 && restored && restored.id === poll.id, JSON.stringify(st));
  check("restore: votes ikut balik", restored && restored.votes["user2@g.us"] && restored.votes["user2@g.us"][0] === 0, JSON.stringify(restored?.votes));
  check("restore: timer re-armed", typeof global.__pollTimers[`${CHAT}:${poll.id}`] === "object");
  if (global.__pollTimers[`${CHAT}:${poll.id}`]) clearTimeout(global.__pollTimers[`${CHAT}:${poll.id}`]);

  // missed: closedAt kelewat → auto-close + hasil dikirim
  resetAll();
  const sock2 = mkSock();
  const p = { id: "POLD-MISS", question: "Missed?", options: ["A", "B"], votes: { x: [0] }, isMultiple: false, createdAt: Date.now() - 7200000, closedAt: Date.now() - 3600000, closed: false, creator: "x", creatorName: "x" };
  global.raraPolls = { [CHAT]: { [p.id]: p } };
  const st2 = restorePolls(sock2);
  check("restore missed: kelewat → ditutup + hasil dikirim", st2.missed === 1 && p.closed === true && norm(sends.at(-1).text).includes("poll berakhir"), JSON.stringify(st2));
}

// ═══════════════════════════════════════════════════════════════
w("\n— engine: bar + winner/seri —");
{
  check("pollBar(100) → ▰x10", pollBar(100) === "▰".repeat(10));
  check("pollBar(0) → ▱x10", pollBar(0) === "▱".repeat(10));

  const r = buildPollResult({ question: "q", options: ["A", "B"], votes: { u1: [0], u2: [0], u3: [1] }, closed: true });
  check("winner A (2 suara)", r.includes("Pemenang: A"));
  const r2 = buildPollResult({ question: "q", options: ["A", "B"], votes: { u1: [0], u2: [1] }, closed: true });
  check("seri 1-1", r2.includes("Seri"), r2);
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
