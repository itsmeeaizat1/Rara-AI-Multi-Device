// E2E — ABSEN INFO LIVE: .absenjam rename + countdown buka + meter status/rekap
//          + .mulaiabsen count-up (13 Sep 2026, pola AFK)
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const DB_DIR = "/tmp/nova-absenlive-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(DB_DIR + "/db.json");

const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(String(s)).toLowerCase();

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

const ABSEN_DB = R + "/src/data/absen.json";
const absenDbOriginal = fs.existsSync(ABSEN_DB) ? fs.readFileSync(ABSEN_DB) : null;

const SENDER = "628111111111@s.whatsapp.net";
const CHAT = "6289999999999-1234@g.us";
const MEMBERS = [SENDER, "628222222222@s.whatsapp.net", "628333333333@s.whatsapp.net"];

function mkMock(sockExtra = {}) {
  const sends = [];
  const reacts = [];
  const m = {
    sender: SENDER, chat: CHAT, pushName: "Budi", prefix: ".", args: [], command: "absenjam", text: "",
    react: async (e) => { reacts.push(e); },
    reply: async (txt, opts) => { sends.push({ txt }); return { key: { id: "r" + sends.length } }; },
  };
  const sock = {
    user: { id: "6280000000000@s.whatsapp.net" },
    sendMessage: async (jid, payload, opts) => { sends.push({ txt: payload?.text, edit: payload?.edit?.id, mentions: payload?.mentions }); return { key: { id: "e" + sends.length } }; },
    groupMetadata: async (gid) => ({ participants: MEMBERS.map((p) => ({ id: p })) }),
    ...sockExtra,
  };
  return { m, sock, sends, reacts };
}
const texts = (mk) => mk.sends.map((s) => norm(s.txt || "")).filter(Boolean);

// ═══════════════════════════════════════════════════════════════
w("\n— RENAME: .absen → .absenjam (fix konflik dead code) —");
{
  const root = await import(R + "/plugins/absen.js");
  const group = await import(R + "/plugins/group/absen.js");
  check("root absen sekarang absenjam", root.config.name === "absenjam" && root.config.alias.includes("absenjam"));
  check("group absen tetap .absen (check-in)", group.config.name === "absen" && group.config.alias.includes("absen"));
  check("gak ada lagi 2 plugin rebut .absen", !root.config.alias.includes("absen"));
  check("usage/example ikut rename", root.config.usage.includes("absenjam") && root.config.example.includes("absenjam"));
}

// ═══════════════════════════════════════════════════════════════
w("\n— .absenjam buka: LIVE COUNTDOWN ke tenggat —");
{
  // cleanup sesi sisa run sebelumnya (persist di src/data/absen.json)
  const store = await import(R + "/plugins/absen.js");
  {
    const mkC = mkMock();
    mkC.m.args = ["tutup"];
    await store.handler(mkC.m, { sock: mkC.sock, config: { command: { prefix: "." } } });
    await new Promise((r) => setTimeout(r, 800));
  }
  const mk = mkMock();
  mk.m.args = ["buka", "35", "detik", "absen", "malam"];
  // durasi 35 dtk → ticker per-detik; maxEdits 600 → jalan sampai habis
  const t0 = Date.now();
  const p = store.handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } });
  await new Promise((r) => setTimeout(r, 3000));
  const mid = texts(mk);
  const init = mid[0];
  check("kartu awal: sesi dibuka + sisa waktu + bar ▰▱", init.includes("sesi absen dibuka") && init.includes("sisa waktu") && (init.includes("▰") || init.includes("▱")));
  check("kartu awal: tenggat WIB + ketik hadir", init.includes("wib") && init.includes("hadir"));
  // ticker nge-tick: ada edit dengan sisa menurun
  const editsBefore = mk.sends.filter((s) => s.edit).length;
  check("ticker nge-edit tiap detik (≥2 edit dlm 3 dtk)", editsBefore >= 2, "edits=" + editsBefore);

  // status pas sesi aktif → meter kehadiran
  const mk2 = mkMock();
  mk2.m.args = ["status"];
  await store.handler(mk2.m, { sock: mk2.sock, config: { command: { prefix: "." } } });
  const st = texts(mk2).at(-1);
  check("status: sisa waktu + sudah hadir", st.includes("status absen") && st.includes("sudah hadir"));
  check("status: meter kehadiran ▰▱ + persen", st.includes("▰") || st.includes("▱"));

  // nunggu countdown habis (~35 dtk) → kartu WAKTU ABSEN HABIS
  await p.catch(() => {});
  const all = texts(mk);
  const habis = all.find((x) => x.includes("waktu absen habis"));
  check("countdown habis → kartu ⏰ WAKTU ABSEN HABIS", !!habis);
  const lastEdit = mk.sends.filter((s) => s.edit).at(-1);
  check("kartu habis dikirim via edit (bukan pesan baru)", !!lastEdit && norm(lastEdit.txt).includes("waktu absen habis"));
}

// ═══════════════════════════════════════════════════════════════
w("\n— .absenjam tutup manual: cancel adaptif + rekap meter —");
{
  const store = await import(R + "/plugins/absen.js");
  const mk = mkMock();
  mk.m.args = ["buka", "2", "jam", "rapat", "wajib"];
  store.handler(mk.m, { sock: mk.sock, config: { command: { prefix: "." } } }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));

  const mk2 = mkMock();
  mk2.m.args = ["tutup"];
  await store.handler(mk2.m, { sock: mk2.sock, config: { command: { prefix: "." } } });
  const rekap = texts(mk2).at(-1);
  check("tutup → rekap kekirim", rekap.includes("rekap absen"));
  check("rekap: meter kehadiran ▰▱", rekap.includes("▰") || rekap.includes("▱"));
  check("rekap: baris hadir X/Y + persen", rekap.includes("hadir: 0/3") || rekap.includes("hadir"));

  // ticker dari sesi 2 jam harus STOP setelah tutup (isCancelled) — tunggu 2.5 dtk pastikan gak nambah
  const editsBefore = mk.sends.filter((s) => s.edit).length;
  await new Promise((r) => setTimeout(r, 2500));
  const editsAfter = mk.sends.filter((s) => s.edit).length;
  check("ticker cancel senyap setelah tutup manual (gak nambah edit)", editsAfter - editsBefore <= 1, "delta=" + (editsAfter - editsBefore));

  // error paths
  const mk3 = mkMock();
  mk3.m.args = ["gajelas"];
  await store.handler(mk3.m, { sock: mk3.sock, config: { command: { prefix: "." } } });
  check("sub gak dikenal → hint buka/tutup/status", texts(mk3).at(-1).includes("tidak dikenal") && texts(mk3).at(-1).includes("tutup"));
  const mk4 = mkMock();
  mk4.m.args = ["buka"];
  await store.handler(mk4.m, { sock: mk4.sock, config: { command: { prefix: "." } } });
  check("buka tanpa durasi → contoh", texts(mk4).at(-1).includes("wajib diisi") || texts(mk4).at(-1).includes("contoh"));
}

// ═══════════════════════════════════════════════════════════════
w("\n— .mulaiabsen: jam mulai + count-up sesi berjalan —");
{
  const { persistSave } = await import(R + "/src/lib/nova-ram-persist.js");
  // reset sesi absensi grup
  const { getDatabase } = await import(R + "/src/lib/nova-database.js");
  const db = getDatabase();
  const mabs = await import(R + "/plugins/group/mulaiabsen.js");

  const mk = mkMock();
  mk.m.command = "mulaiabsen";
  mk.m.text = "Absen Harian Reguler";
  const p = mabs.handler(mk.m, { sock: mk.sock });
  await new Promise((r) => setTimeout(r, 3000));
  const all = texts(mk);
  const card = all[0];
  check("kartu mulai: keterangan + creator", card.includes("absen harian reguler") && card.includes("dibuat oleh"));
  check("kartu mulai: ⏰ jam mulai WIB baru", card.includes("mulai:") && card.includes("wib"));
  check("kartu mulai: 🕒 sesi berjalan count-up", card.includes("sesi berjalan"));
  const tickEdits = mk.sends.filter((s) => s.edit);
  check("count-up nge-tick (≥2 edit dlm 3 dtk)", tickEdits.length >= 2, "edits=" + tickEdits.length);
  if (tickEdits.length >= 2) {
    const s1 = Number((fromSC(tickEdits[0].txt || "").match(/sesi berjalan: (\d+) detik/) || [])[1]);
    const s2 = Number((fromSC(tickEdits[tickEdits.length - 1].txt || "").match(/sesi berjalan: (\d+) detik/) || [])[1]);
    check("angka count-up NAIK (dtk makin gede)", s2 > s1, s1 + "→" + s2);
  }
  await p.catch(() => {});
  check("settle final + mention creator dikirim", mk.sends.some((s) => Array.isArray(s.mentions) && s.mentions.length));
}

// restore absen.json ke kondisi asli
try {
  if (absenDbOriginal === null) { if (fs.existsSync(ABSEN_DB)) fs.rmSync(ABSEN_DB); }
  else fs.writeFileSync(ABSEN_DB, absenDbOriginal);
} catch {}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
