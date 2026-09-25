// E2E — METER KEHADIRAN ABSEN (13 Sep 2026, batch 4 variasi polos)
// ".absen list doang gak ada progress" — kartu .absen & .cekabsen
// sekarang: bar ▰▱ + persen (peserta/anggota grup) + perayaan 100%.
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const { buildAbsenMeter, countGroupMembers } = await import(R + "/src/lib/nova-absen-meter.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(String(s)).toLowerCase();

const DB_DIR = "/tmp/nova-absen-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase(DB_DIR + "/db.json");

const { handler: absenHandler } = await import(R + "/plugins/group/absen.js");
const { handler: cekHandler } = await import(R + "/plugins/group/checkattendance.js");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

// ═══════════════════════════════════════════════════════════════
w("\n— buildAbsenMeter (pure) —");
{
  const m3 = buildAbsenMeter(3, 10);
  check("3/10 → bar 3 isi + 30%", m3.pct === 30 && m3.bar === "▰▰▰▱▱▱▱▱▱▱" && !m3.allDone);
  check("line 'Kehadiran: 3/10 anggota'", m3.lines[0].includes("3/10") && m3.lines[0].toLowerCase().includes("anggota"));
  const mFull = buildAbsenMeter(10, 10);
  check("10/10 → 100% + SEMUA ANGGOTA HADIR", mFull.allDone && mFull.pct === 100 && mFull.lines.some((l) => norm(l).includes("semua anggota sudah hadir")));
  check("over-count 12/10 → clamp 100%", buildAbsenMeter(12, 10).pct === 100);
  check("total 0 / NaN → null senyap", buildAbsenMeter(3, 0) === null && buildAbsenMeter(null, NaN) === null);
}

// ═══════════════════════════════════════════════════════════════
w("\n— countGroupMembers (fail-safe) —");
{
  const sockOk = { groupMetadata: async () => ({ participants: Array.from({ length: 45 }) }) };
  check("metadata ok → 45", (await countGroupMembers(sockOk, "g@us")) === 45);
  const sockEmpty = { groupMetadata: async () => ({ participants: [] }) };
  check("participants kosong → null (meter skip)", (await countGroupMembers(sockEmpty, "g@us")) === null);
  const sockThrow = { groupMetadata: async () => { throw new Error("down"); } };
  check("metadata throw → null (gak crash)", (await countGroupMembers(sockThrow, "g@us")) === null);
}

// ═══════════════════════════════════════════════════════════════
w("\n— handler .absen + .cekabsen (db beneran, mock grup) —");
{
  const chatId = "12345@g.us";
  const members = Array.from({ length: 10 }, (_, i) => `${62800000000 + i}@s.whatsapp.net`);
  const sock = { groupMetadata: async () => ({ participants: members.map((id) => ({ id })) }) };
  global.absensi = {};
  global.absensi[chatId] = {
    keterangan: "Rapat Mingguan",
    createdBy: "6289999999999@s.whatsapp.net",
    createdAt: new Date().toISOString(),
    peserta: [members[0], members[1], members[2]],
  };
  const replies = [];
  const m = {
    sender: members[4], chat: chatId, prefix: ".", pushName: "Eka",
    reply: async (txt) => { replies.push(txt); return { key: { id: "a" } }; },
  };
  await absenHandler(m, { sock });
  const card1 = norm(replies[0] || "");
  check("check-in: kartu MANTAP + meter 4/10 (40%)", card1.includes("hadir") && card1.includes("4/10") && /▰▰▰▰▱{6} 40%/.test(replies[0]), card1.slice(0, 120));
  check("check-in: daftar hadir tetep nongol", card1.includes("daftar hadir") && card1.includes("4. @62800000004"));

  replies.length = 0;
  await cekHandler({ ...m, sender: members[0] }, { sock });
  const card2 = norm(replies[0] || "");
  check("cekabsen: meter 4/10 + keterangan", card2.includes("4/10") && /▰▰▰▰▱{6} 40%/.test(replies[0]));
  check("cekabsen: judul + peserta count tetep", card2.includes("daftar yang udah absen") || card2.includes("peserta (4)"));
}
{
  // semua anggota udah absen → perayaan 100%
  const chatId = "67890@g.us";
  const members = Array.from({ length: 3 }, (_, i) => `${62811111111 + i}@s.whatsapp.net`);
  const sock = { groupMetadata: async () => ({ participants: members.map((id) => ({ id })) }) };
  global.absensi = {};
  global.absensi[chatId] = { keterangan: "Absen Harian", createdBy: members[0], createdAt: new Date().toISOString(), peserta: members.slice() };
  const replies = [];
  const m = { sender: members[1], chat: chatId, prefix: ".", reply: async (t) => { replies.push(t); return { key: { id: "b" } }; } };
  await cekHandler(m, { sock });
  check("cekabsen 3/3 → SEMUA ANGGOTA SUDAH HADIR", norm(replies[0]).includes("semua anggota sudah hadir"));
}
{
  // gak ada metadata (sock polos) → kartu tetep jalan tanpa meter, gak crash
  const chatId = "11111@g.us";
  global.absensi = {};
  global.absensi[chatId] = { keterangan: "Absen", createdBy: "x@s.whatsapp.net", createdAt: new Date().toISOString(), peserta: ["a@s.whatsapp.net"] };
  const replies = [];
  const m = { sender: "b@s.whatsapp.net", chat: chatId, prefix: ".", reply: async (t) => { replies.push(t); return { key: { id: "c" } }; } };
  const sockBroken = {};
  await cekHandler(m, { sock: sockBroken });
  check("sock polos → fallback tanpa meter (gak crash)", typeof replies[0] === "string" && replies[0].length > 30 && !replies[0].includes("Kehadiran:"));

  // gak ada sesi → guide tetep jalan
  replies.length = 0;
  await absenHandler({ ...m, chat: "99999@g.us" }, { sock: sockBroken });
  check("tanpa sesi → guide mulaiabsen tetep", norm(replies[0]).includes("belum ada sesi absen"));
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
