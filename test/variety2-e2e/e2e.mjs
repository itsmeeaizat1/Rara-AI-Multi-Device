// E2E — VARIASI FITUR POLOS BATCH 2 (13 Sep 2026)
// (1) 38 fitur .cek* animasi "mengukur" via nova-cek-anim.js
// (2) .countdown live (ironis: fitur countdown gak nge-tick)
// (3) .daily: cooldown live countdown + reward reveal ala gacha
process.env.NOVA_TICK_MAXEDITS = "2";
process.env.NOVACEK_FRAME_MS = "120";

import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
await initDatabase(mkdtempSync(path.join(tmpdir(), "var2-e2e-db-")) + "/nova.json");
const db = getDatabase();

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };
const norm = (s) => fromSC(String(s)).toLowerCase();

function mockSock() {
  const sent = [];
  return {
    sent,
    sendMessage: async (chat, payload, opts) => {
      sent.push({ chat, payload, opts });
      return { key: { id: "k" + sent.length, remoteJid: chat } };
    },
  };
}
function mkM(over = {}) {
  const m = {
    sender: "62866@row", chat: "t@g.us", text: "", command: "cekganteng", prefix: ".",
    mentionedJid: [], quoted: null,
    reply: async (text, opts) => { m.__sent.push({ payload: { text, ...(opts || {}) } }); return { key: { id: "r" } }; },
    __sent: [],
  };
  return Object.assign(m, over);
}

// ═══════════════════════════════════════════════════════════════
w("\n— keluarga .cek*: langsung hasil (animasi ▓░ dihapus 14 Sep) —");
for (const cmd of ["cekganteng", "cekbucin", "cekgabut"]) {
  const { config, handler } = await import(R + "/plugins/cek/" + cmd + ".js");
  const sock = mockSock();
  const m = mkM({ command: cmd, mentionedJid: ["62801@row"] });
  const t0 = Date.now();
  await handler(m, { sock });
  const dur = Date.now() - t0;
  check(cmd + ": langsung jalan (gak nunggu animasi)", dur < 800, dur + "ms");
  check(cmd + ": gak ada pesan animasi (sock kosong)", sock.sent.length === 0, sock.sent.length + " pesan");
  check(cmd + ": kartu hasil via reply", m.__sent.length === 1, m.__sent.length + " reply");
  const txt = norm(m.__sent[0].payload.text);
  check(cmd + ": hasil persen + mentions aman", /\d+%/.test(txt) && Array.isArray(m.__sent[0].payload.mentions), txt.slice(0, 70));
  check(cmd + ": gak ada bar animasi ▓", !/▓/.test(txt), txt.slice(0, 50));
}
{
  // edit gagal → fallback m.reply kartu hasil
  const { config, handler } = await import(R + "/plugins/cek/cekgila.js");
  const sock = mockSock();
  sock.sendMessage = async () => { throw new Error("gak bisa kirim"); };
  const m = mkM({ command: "cekgila", mentionedJid: [] });
  await handler(m, { sock });
  check("cekgila: kartu hasil via reply (tanpa animasi)", m.__sent.length === 1 && /\d+%/.test(norm(m.__sent[0].payload.text)), norm(m.__sent[0].payload.text).slice(0, 70));
}

// ═══════════════════════════════════════════════════════════════
w("\n— .countdown: live (ironis fix) —");
{
  const { config, handler } = await import(R + "/plugins/utility/countdown.js");
  const sock = mockSock();
  const m = mkM({ text: "01-12-2026", command: "countdown" });
  await handler(m, { sock, config: { command: { prefix: "." } } });
  const all = sock.sent.concat(m.__sent.map((x) => ({ payload: { text: x } })));
  check("kartu countdown muncul", all.length >= 1, all.length + " pesan");
  const hasLive = all.some((s) => norm(s.payload.text).includes("🕒"));
  check("baris live 🕒 ada", hasLive, norm(all[0]?.payload.text).slice(0, 100));
  const edits = sock.sent.filter((s) => !!s.payload.edit);
  check("countdown nge-tick via edit-in-place", edits.length >= 1, edits.length + " edit");
  const hasDays = all.some((s) => /hari/.test(norm(s.payload.text)));
  check("kartu nunjukin hari + jam:menit:detik", hasDays);
}
{
  // tanggal lewat → error sopan (tetep statis)
  const { config, handler } = await import(R + "/plugins/utility/countdown.js");
  const sock = mockSock();
  const m = mkM({ text: "01-01-2020", command: "countdown" });
  await handler(m, { sock, config: { command: { prefix: "." } } });
  check("tanggal lewat → pesan error", m.__sent.length === 1 && norm(m.__sent[0].payload.text).includes("lewat"), norm(m.__sent[0].payload.text).slice(0, 60));
}

// ═══════════════════════════════════════════════════════════════
w("\n— .daily: cooldown live + reward reveal gacha —");
{
  // cooldown aktif (klaim 1 jam lalu) → live countdown
  const { config, handler } = await import(R + "/plugins/user/daily.js");
  const u = db.getUser("62866@row") || {};
  u.cooldowns = u.cooldowns || {};
  u.cooldowns.daily = Date.now() - 3600000; // 1 jam lalu → sisa 23 jam
  db.setUser("62866@row", u);
  const sock = mockSock();
  const m = mkM({ command: "daily" });
  await handler(m, { sock });
  const all = sock.sent.concat(m.__sent.map((x) => ({ payload: { text: x } })));
  check("kartu cooldown muncul", all.some((s) => norm(s.payload.text).includes("cooldown")), all.map((s) => norm(s.payload.text).slice(0, 30)).join(" | "));
  const hasLive = all.some((s) => norm(s.payload.text).includes("🕒"));
  check("cooldown nge-tick (🕒 live)", hasLive, norm(all[0]?.payload.text).slice(0, 80));
  const edits = sock.sent.filter((s) => !!s.payload.edit);
  check("cooldown nge-tick via edit-in-place", edits.length >= 1, edits.length + " edit");
  check("format jam + h:m:s", all.some((s) => /jam/.test(norm(s.payload.text)) && /\d{2}:\d{2}/.test(norm(s.payload.text))), norm(all[0]?.payload.text).slice(0, 90));
}
{
  // klaim pertama → animasi reveal ala gacha
  const { config, handler } = await import(R + "/plugins/user/daily.js");
  const u = db.getUser("62867@row") || {};
  u.cooldowns = u.cooldowns || {};
  delete u.cooldowns.daily;
  db.setUser("62867@row", u);
  const sock = mockSock();
  const m = mkM({ sender: "62867@row", command: "daily" });
  await handler(m, { sock });
  check("animasi reveal jalan (opener + grup edit)", sock.sent.length >= 3, sock.sent.length + " pesan");
  check("frame pertama opener 🎁", norm(sock.sent[0].payload.text).includes("membuka hadiah"), norm(sock.sent[0].payload.text).slice(0, 40));
  const edits = sock.sent.filter((s) => !!s.payload.edit);
  check("reveal per grup via edit-in-place", edits.length >= 2, edits.length + " edit");
  const last = norm(sock.sent[sock.sent.length - 1].payload.text);
  check("kartu final lengkap (hadiah + streak)", last.includes("hadiah") && last.includes("streak"), last.slice(0, 90));
  check("final ada reward Exp/Koin", last.includes("exp") && last.includes("koin"), last.slice(0, 120));
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
