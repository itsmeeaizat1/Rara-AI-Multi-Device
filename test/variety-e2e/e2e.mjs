// E2E — FITUR POLOS DI-VARIASI (13 Sep 2026)
// Request owner: "fitur yg polos dicek trus di variasi agar menarik".
// Dipilih owner: .birthday countdown + .langganan countdown + .rate animasi
// meter. Semua pakai nova-countdown runLiveTicker / morphing edit-in-place.
process.env.NOVA_TICK_MAXEDITS = "2";

import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
await initDatabase(mkdtempSync(path.join(tmpdir(), "var-e2e-db-")) + "/nova.json");
const db = getDatabase();

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };
const norm = (s) => fromSC(String(s)).toLowerCase();

function mockSock() {
  const sent = [];
  return {
    sent,
    sendMessage: async (chat, payload) => {
      sent.push({ chat, payload });
      return { key: { id: "k" + sent.length, remoteJid: chat } };
    },
  };
}
function mkM(over = {}) {
  const m = {
    sender: "62899@row", chat: "t@g.us", text: "", args: [], prefix: ".",
    mentionedJid: [], quoted: null,
    reply: async (text, opts) => { m.__sent.push({ chat: m.chat, payload: { text } }); return { key: { id: "r" } }; },
    __sent: [],
  };
  return Object.assign(m, over);
}

// ═══════════════════════════════════════════════════════════════
w("\n— .rate: langsung hasil (animasi ▓░ dihapus 14 Sep, loading react emoji cukup) —");
{
  const { config, handler } = await import(R + "/plugins/fun/rate.js");
  const sock = mockSock();
  const m = mkM({ text: "wajahku" });
  const t0 = Date.now();
  await handler(m, { sock });
  const dur = Date.now() - t0;
  check("langsung jalan (gak nunggu animasi)", dur < 800, dur + "ms");
  check("gak ada pesan animasi (sock kosong)", sock.sent.length === 0, sock.sent.length + " pesan");
  check("kartu hasil via reply", m.__sent.length === 1, m.__sent.length + " reply");
  const txt = norm(m.__sent[0].payload.text);
  check("hasil rating muncul (skor)", /\/10|∞/.test(txt), txt.slice(0, 60));
  check("meter standar ▰▱ + persen", /▰+▱*/.test(txt) && txt.includes("%"), txt.slice(0, 100));
  check("kartu ada komentar rating", txt.split("\n").length >= 4, txt.slice(0, 120));
}
{
  // gak ada subjek → tetep guide (gak nyamber animasi)
  const { config, handler } = await import(R + "/plugins/fun/rate.js");
  const sock = mockSock();
  const m = mkM({ text: "" });
  await handler(m, { sock });
  check("tanpa input → guide (gak animasi)", sock.sent.length === 0 && m.__sent.length === 1, sock.sent.length + "/" + m.__sent.length);
  check("guide nyebut format", norm(m.__sent[0].payload.text).includes("rate"), norm(m.__sent[0].payload.text).slice(0, 60));
}

// ═══════════════════════════════════════════════════════════════
w("\n— .birthday: countdown hidup ke ultah —");
{
  const { config, handler } = await import(R + "/plugins/user/birthday.js");
  // ultah 3 hari lagi
  const bday = new Date(Date.now() + 3 * 86400000 + 3600000);
  const dd = String(bday.getDate()).padStart(2, "0");
  const mm = String(bday.getMonth() + 1).padStart(2, "0");
  const u = db.getUser("62899@row") || {};
  u.birthday = dd + "-" + mm;
  db.setUser("62899@row", u);
  const sock = mockSock();
  const m = mkM({ text: "", mentionedJid: [] });
  await handler(m, { sock });
  const all = sock.sent.concat(m.__sent);
  const bCards = all.filter((s) => norm(s.payload.text).includes("birthday"));
  check("kartu birthday muncul", bCards.length >= 1, all.length + " pesan");
  const hasDays = all.some((s) => /hari/.test(norm(s.payload.text)));
  check("kartu nunjukin hari + jam:menit:detik", hasDays, norm(all[0]?.payload.text).slice(0, 100));
  const edits = sock.sent.filter((s) => !!s.payload.edit);
  check("countdown nge-tick via edit-in-place", edits.length >= 1, edits.length + " edit");
  const hasLive = all.some((s) => norm(s.payload.text).includes("🕒"));
  check("baris live 🕒 ada", hasLive, norm(all[0]?.payload.text).slice(0, 120));
}
{
  // ultah HARI INI → kartu ucapan statis, gak ticker
  const { config, handler } = await import(R + "/plugins/user/birthday.js");
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const u = db.getUser("62888@row") || {};
  u.birthday = dd + "-" + mm;
  db.setUser("62888@row", u);
  const sock = mockSock();
  const m = mkM({ sender: "62888@row", text: "" });
  await handler(m, { sock });
  const txt = norm(m.__sent[0]?.payload.text);
  check("hari ini ultah → kartu ucapan langsung", m.__sent.length === 1 && txt.includes("ultah"), txt.slice(0, 80));
  check("gak ada ticker (statis)", sock.sent.length === 0, sock.sent.length + " edit");
}

// ═══════════════════════════════════════════════════════════════
w("\n— .langganan info: countdown hidup ke jatuh tempo —");
{
  const { config, handler } = await import(R + "/plugins/utility/langganan.js");
  // sub monthly dengan jatuh tempo 3 hari lagi (base 27 hari lalu)
  db.setting("subscriptions", {
    "62899@row": [{
      id: "SUBTEST", name: "Netflix", price: 186000, cycle: "monthly",
      baseDate: Date.now() - 27 * 86400000, paid: false,
      createdAt: Date.now(), history: [],
    }],
  });
  const sock = mockSock();
  const m = mkM({ text: "info SUBTEST", args: ["info", "SUBTEST"] });
  await handler(m, { sock, config: { command: { prefix: "." } } });
  const all = sock.sent.concat(m.__sent);
  check("kartu info langganan muncul", all.some((s) => norm(s.payload.text).includes("netflix")), all.map((s) => norm(s.payload.text).slice(0, 40)).join(" | "));
  check("ada baris countdown jatuh tempo", all.some((s) => norm(s.payload.text).includes("menuju jatuh tempo")), norm(all[0]?.payload.text).slice(0, 140));
  const edits = sock.sent.filter((s) => !!s.payload.edit);
  check("countdown nge-tick via edit-in-place", edits.length >= 1, edits.length + " edit");
  check("kartu tetep ada harga & ID", all.some((s) => norm(s.payload.text).includes("rp186.000")), norm(all[0]?.payload.text).slice(0, 140));
}
{
  // sub LUNAS → kartu statis (paid), gak ticker
  const { config, handler } = await import(R + "/plugins/utility/langganan.js");
  db.setting("subscriptions", {
    "62877@row": [{
      id: "SUBDUE", name: "Spotify", price: 27000, cycle: "monthly",
      baseDate: Date.now() - 27 * 86400000, paid: true,
      createdAt: Date.now(), history: [],
    }],
  });
  const sock = mockSock();
  const m = mkM({ sender: "62877@row", text: "info SUBDUE", args: ["info", "SUBDUE"] });
  await handler(m, { sock, config: { command: { prefix: "." } } });
  const txt = norm(m.__sent[0]?.payload.text);
  check("sub lunas → kartu statis", m.__sent.length === 1 && txt.includes("lunas"), txt.slice(0, 90));
  check("gak ada ticker (statis)", sock.sent.length === 0, sock.sent.length + " edit");
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
