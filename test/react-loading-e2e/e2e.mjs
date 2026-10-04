// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// E2E REAKSI LOADING/SUKSES (3 Okt 2026, owner: "knp react emoji loading pas fitur dimuat dan suksesnya ga muncul").
// Dua akar yang DIBUKTIKAN:
//  ROLLBACK 4 Okt 2026: m.react kembali memakai msg.key ternormalisasi + tujuan m.chat (perilaku pra-rawKey
//      tidak sama dgn yang diterima dari WhatsApp, reaksi bisa tak menempel (akun LID, tanpa error).
//  (2) handler membaca procNotif/autoRead/autoTyping dari `sock.db || m.db` yang TIDAK PERNAH diisi -> selalu default;
//      `.procnotif off` tak pernah berpengaruh.
// GOTCHA repo: error top-level ESM = exit 0 SENYAP -> seluruh suite dibungkus main().catch(exit 1). DB = file sementara.
import fs from "fs";
import os from "os";
import path from "path";

const R = new URL("../../", import.meta.url).pathname.replace(/\/$/, "");
process.chdir(R);
let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (n, ok, x) => { w((ok ? "  ✅" : "  ❌") + " " + n + (ok ? "" : x !== undefined ? ` — ${String(x).slice(0, 220)}` : "")); ok ? pass++ : fail++; };
const quiet = () => { const o = [console.log, console.warn, console.error]; console.log = console.warn = console.error = () => {}; return () => { [console.log, console.warn, console.error] = o; }; };

const LID = "12345678901234@lid", PN = "628555000111@s.whatsapp.net", GRUP = "120363000000000001@g.us";
const OWNER = "628174887770@s.whatsapp.net";

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "react-e2e-"));
  const restore = quiet();
  const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
  await initDatabase(tmp + "/db.json");
  const { serialize } = await import(R + "/src/lib/rara-serialize.js");
  restore();

  const mkSock = (rec) => ({
    user: { id: "628999999999:1@s.whatsapp.net" },
    sendMessage: async (jid, c) => { rec.push({ jid, c }); return { key: { id: "x" } }; },
    relayMessage: async () => true,
    groupMetadata: async () => ({ id: GRUP, subject: "G", participants: [{ id: LID, jid: PN, phoneNumber: PN, admin: null }] }),
  });
  const ser = async (rec, key, text = ".ping") => { const r = quiet(); try { return await serialize(mkSock(rec), { key, message: { conversation: text }, pushName: "A" }, {}); } finally { r(); } };

  w("\n— [1] ROLLBACK 4 Okt 2026: m.react memakai msg.key ternormalisasi (perilaku lama, terbukti jalan di produksi dgn fork hiura) —");
  {
    const rec = [];
    const original = { remoteJid: GRUP, fromMe: false, id: "ZZ1", participant: LID };
    const m = await ser(rec, { ...original });
    check("precondition: serialize MEMANG memutasi msg.key.participant (lid -> nomor)", m.key.participant === PN && m.sender === PN, `${m.key.participant}|${m.sender}`);
    await m.react("🕒");
    const k = rec[0].c.react.key;
    check("reaksi grup akun LID: key.participant = nomor ternormalisasi (rollback 4 Okt)", rec[0].c.react.key.participant === PN, rec[0].c.react.key.participant);
    check("reaksi: key = key ternormalisasi msg.key (rollback 4 Okt: key reaksi = m.key)", rec[0].c.react.key === m.key);
    check("reaksi dikirim ke chat yang benar (m.chat)", rec[0].jid === GRUP);
    check("emoji terkirim apa adanya", rec[0].c.react.text === "🕒");
    check("fitur LAIN tak berubah: m.sender tetap nomor telepon", m.sender === PN);
    check("fitur LAIN tak berubah: m.key.participant tetap nomor (295 pemakai m.key)", m.key.participant === PN);
    check("key reaksi = referensi msg.key/m.key (perilaku lama terbukti jalan di produksi)", k === m.key);
    m.key.participant = "mutasi-lanjutan@s.whatsapp.net"; await m.react("🐣");
    check("rollback 4 Okt: m.key adalah objek bersama — mutasi lanjutan ikut terlihat (diterima apa adanya, perilaku lama)", rec[1].c.react.key.participant === "mutasi-lanjutan@s.whatsapp.net");
  }
  {
    const rec = []; const original = { remoteJid: "628555000111@s.whatsapp.net", fromMe: false, id: "DM1" };
    const m = await ser(rec, { ...original });
    await m.react("🐣");
    check("DM biasa: key reaksi identik dgn asli", JSON.stringify(rec[0].c.react.key) === JSON.stringify(original), JSON.stringify(rec[0].c.react.key));
  }
  {
    const rec = []; const original = { remoteJid: GRUP, fromMe: false, id: "G2", participant: PN };
    const m = await ser(rec, { ...original }); await m.react("✅");
    check("grup, peserta sudah berupa nomor: key identik dgn asli", JSON.stringify(rec[0].c.react.key) === JSON.stringify(original));
  }
  {
    const rec = []; const m = await ser(rec, { remoteJid: GRUP, fromMe: false, id: "G3", participant: LID });
    check("semantik __customReact tetap: 🕒 TIDAK menandai custom", (await m.react("🕒"), m.__customReact === false));
    check("semantik __customReact tetap: 🕐 TIDAK menandai custom", (await m.react("🕐"), m.__customReact === false));
    check("semantik __customReact tetap: emoji lain menandai custom (handler lewati 🐣)", (await m.react("🎨"), m.__customReact === true));
    const bad = { user: {}, sendMessage: async () => { throw new Error("ws closed"); }, relayMessage: async () => true, groupMetadata: async () => ({ participants: [] }) };
    const r = quiet(); let mm; try { mm = await serialize(bad, { key: { remoteJid: GRUP, fromMe: false, id: "G4", participant: LID }, message: { conversation: ".x" }, pushName: "A" }, {}); } finally { r(); }
    check("sendMessage error -> m.react tetap TIDAK melempar (null)", (await mm.react("🕒")) === null);
  }

  w("\n— [2] handler produksi: urutan reaksi 🕒 -> 🐣 dengan plugin & handler ASLI —");
  const restore2 = quiet();
  const { loadPlugins, getPluginCount } = await import(R + "/src/lib/rara-plugins.js");
  await loadPlugins(R + "/plugins");
  const { messageHandler } = await import(R + "/src/handler.js");
  restore2();
  const run = async (cmd, { chat = OWNER, sender = OWNER } = {}) => {
    const out = [];
    const sock = { ...mkSock([]), sendMessage: async (jid, c) => { out.push(c.react ? "R:" + c.react.text : "M"); return { key: { id: "S" } }; }, relayMessage: async () => { out.push("M"); return true; },
      readMessages: async () => {}, sendPresenceUpdate: async () => {}, presenceSubscribe: async () => {}, waUploadToServer: async () => ({ url: "x", directPath: "y" }), onWhatsApp: async () => [], profilePictureUrl: async () => null, query: async () => ({}), ev: { on() {}, emit() {} }, ws: {},
      groupMetadata: async () => ({ id: chat, subject: "G", participants: [{ id: sender, admin: "admin" }] }) };
    const r = quiet();
    try { await messageHandler({ key: { remoteJid: chat, fromMe: false, id: "H" + Math.random().toString(36).slice(2, 8), ...(chat.endsWith("@g.us") ? { participant: sender } : {}) }, message: { conversation: cmd }, pushName: "Aizat", messageTimestamp: Math.floor(Date.now() / 1000) }, sock); await new Promise((r2) => setTimeout(r2, 400)); }
    finally { r(); }
    return out;
  };
  check("plugin termuat (>2000)", getPluginCount() > 2000, getPluginCount());
  const db = getDatabase();
  db.setting("procNotif", true);
  for (const cmd of [".ping", ".menu", ".info", ".owner", ".hd", ".remini"]) {
    const o = await run(cmd); const re = o.filter((x) => x.startsWith("R:")).map((x) => x.slice(2));
    check(`${cmd} (DM, procNotif ON): 🕒 di awal & 🐣 TERAKHIR`, re[0] === "🕒" && re.at(-1) === "🐣", re.join(" "));
  }
  { const o = await run(".ping", { chat: GRUP }); const re = o.filter((x) => x.startsWith("R:")).map((x) => x.slice(2));
    check(".ping di GRUP (owner): 🕒 lalu 🐣", re[0] === "🕒" && re.at(-1) === "🐣", re.join(" ")); }
  { const o = await run(".ping"); const iR = o.indexOf("R:🕒"), iM = o.indexOf("M"), iD = o.lastIndexOf("R:🐣");
    check(".ping: urutan 🕒 -> balasan -> 🐣 (loading sebelum, sukses sesudah)", iR >= 0 && iM > iR && iD > iM, o.join(",")); }

  w("\n— [3] .procnotif off/on SEKARANG berpengaruh (dulu dibaca dari sock.db yang kosong) —");
  {
    db.setting("procNotif", false);
    const off = await run(".ping"); const reOff = off.filter((x) => x.startsWith("R:"));
    check("procNotif=false -> TIDAK ada reaksi 🕒/🐣 sama sekali", reOff.length === 0, reOff.join(" "));
    check("procNotif=false -> balasan fitur TETAP terkirim (fitur tidak ikut mati)", off.includes("M"), off.join(","));
    db.setting("procNotif", true);
    const on = await run(".ping"); const reOn = on.filter((x) => x.startsWith("R:")).map((x) => x.slice(2));
    check("procNotif=true lagi -> 🕒 dan 🐣 kembali", reOn[0] === "🕒" && reOn.at(-1) === "🐣", reOn.join(" "));
    db.setting("procNotif", undefined);
    const dflt = await run(".ping"); const reD = dflt.filter((x) => x.startsWith("R:")).map((x) => x.slice(2));
    check("procNotif belum pernah diset -> default AKTIF (perilaku lama terjaga)", reD[0] === "🕒" && reD.at(-1) === "🐣", reD.join(" "));
  }

  w("\n— [4] kode: tidak ada lagi pembacaan setting dari sumber yang kosong —");
  {
    const h = fs.readFileSync(R + "/src/handler.js", "utf8");
    check("handler: dbInstance fallback ke getDatabase()", /const dbInstance = sock\.db \|\| m\.db \|\| getDatabase\(\);/.test(h));
    const s = fs.readFileSync(R + "/src/lib/rara-serialize.js", "utf8");
    check("serialize: rawKey SUDAH TIDAK ADA (rollback 4 Okt)", s.indexOf("const rawKey") === -1);
    check("serialize: m.react memakai msg.key ternormalisasi (rollback 4 Okt)", /react: \{\s*text: emoji,[\s\S]{0,400}?key: msg\.key,/.test(s) && s.indexOf("key: rawKey") === -1);
    check("serialize: m.key tetap referensi msg.key (kompatibel 295 pemakai)", /m\.key = msg\.key;/.test(s));
  }

  w(`\n${pass} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error("SUITE CRASH:", e && e.stack || e); process.exit(1); });
