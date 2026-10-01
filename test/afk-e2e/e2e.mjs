// E2E NOVA AFK v2 — status AFK interaktif (13 Sep 2026)
// Lib + plugin + hook pakai db ASLI di path tmp (pola beritanotify-e2e).
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
await initDatabase(mkdtempSync(path.join(tmpdir(), "afk-e2e-db-")) + "/nova.json");
const db = getDatabase();

const afk = await import(R + "/src/lib/nova-afk.js");
const {
  getAfkUser, setAfkUser, removeAfkUser, isUserAfk, loadAfkMap,
  formatWib, formatDuration, handleAfkHooks, resetAfkThrottle,
} = afk;
const plugin = await import(R + "/plugins/group/afk.js");

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };
const norm = (s) => fromSC(String(s)).toLowerCase();

function mkM(over = {}) {
  const sent = [];
  return {
    sender: over.sender || "6281234567890@s.whatsapp.net",
    chat: over.chat || "62898@g.us",
    pushName: over.pushName || "Rizky",
    isGroup: over.isGroup !== undefined ? over.isGroup : true,
    isCommand: !!over.isCommand,
    command: over.command || "",
    args: over.args || [],
    text: over.text || "",
    mentionedJid: over.mentionedJid || [],
    quoted: over.quoted || null,
    reply: async (text, opts) => { sent.push({ text: norm(text), mentions: (opts && opts.mentions) || null }); },
    __sent: sent,
  };
}

// ── 1. util format ──
w("\n— format waktu & durasi —");
check("1a. formatWib nunjukin WIB + tanggal", formatWib(1700000000000).includes("WIB") && /\d{2}\/\d{2}/.test(formatWib(1700000000000)), formatWib(1700000000000));
check("1b. formatDurasi 90 dtk = 1 menit 30 detik", formatDuration(90000) === "1 menit 30 detik", formatDuration(90000));
check("1c. formatDurasi 2.25 jam", formatDuration((2 * 3600 + 15 * 60) * 1000) === "2 jam 15 menit", formatDuration((2 * 3600 + 15 * 60) * 1000));

// ── 2. store + persist ──
w("\n— store + persist —");
const JID = "6281111111111@s.whatsapp.net";
const res1 = setAfkUser(JID, { reason: "lagi makan", name: "Budi", chat: "grup@g.us" });
check("2a. setAfkUser nyatet reason", res1.entry.reason === "lagi makan");
check("2b. setAfkUser nyatet since (timestamp)", typeof res1.entry.since === "number" && res1.entry.since > 0);
check("2c. setAfkUser prev null (belum pernah AFK)", res1.prev === null);
check("2d. isUserAfk true", isUserAfk(JID) === true);
check("2e. persist di db.setting novaAfkUsers", !!db.setting("novaAfkUsers")[JID]);
const upd = setAfkUser(JID, { reason: "kerja", name: "Budi" });
check("2f. update AFK → prev bawa alasan lama", upd.prev && upd.prev.reason === "lagi makan");
removeAfkUser(JID);
check("2g. removeAfkUser → gak AFK lagi", isUserAfk(JID) === false);
check("2h. loadAfkMap kosong setelah dihapus", Object.keys(loadAfkMap()).length === 0, JSON.stringify(loadAfkMap()));

// ── 3. hook: balakang dari AFK ──
w("\n— hook: user balakang dari AFK —");
setAfkUser(JID, { reason: "tidur", name: "Budi", chat: "grup@g.us" });
const m3 = mkM({ sender: JID, pushName: "Budi", isCommand: false });
await handleAfkHooks(m3, null, db);
check("3a. hook kirim kartu AFK Berakhir", m3.__sent.length === 1 && m3.__sent[0].text.includes("afk berakhir"), JSON.stringify(m3.__sent.map(s => s.text.slice(0, 60))));
check("3b. kartu ada jam mulai (mulai :)", m3.__sent[0] && m3.__sent[0].text.includes("mulai :"));
check("3c. kartu ada durasi", m3.__sent[0] && m3.__sent[0].text.includes("durasi :"));
check("3d. kartu ada alasan tidur", m3.__sent[0] && m3.__sent[0].text.includes("tidur"));
check("3e. AFK kehapus setelah balakang", isUserAfk(JID) === false);

// ── 4. hook: .afk command gak bikin AFK abis ──
setAfkUser(JID, { reason: "rapat", name: "Budi" });
const m4 = mkM({ sender: JID, isCommand: true, command: "afk" });
await handleAfkHooks(m4, null, db);
check("4a. .afk ulang gak nyabut AFK (masih AFK)", isUserAfk(JID) === true);
check("4b. hook gak ngirim apa pun buat .afk", m4.__sent.length === 0);

// ── 5. hook: mention user AFK + throttle ──
w("\n— hook: mention user AFK —");
resetAfkThrottle();
const OTHER = "6282222222222@s.whatsapp.net";
const m5 = mkM({ sender: OTHER, mentionedJid: [JID] });
await handleAfkHooks(m5, null, db);
check("5a. mention → kartu User AFK kekirim", m5.__sent.length === 1 && m5.__sent[0].text.includes("user afk"), JSON.stringify(m5.__sent.map(s => s.text.slice(0, 40))));
check("5b. kartu ada jam mulai", m5.__sent[0] && m5.__sent[0].text.includes("mulai :"));
check("5c. kartu ada alasan rapat", m5.__sent[0] && m5.__sent[0].text.includes("rapat"));
check("5d. kartu ada nama Budi", m5.__sent[0] && m5.__sent[0].text.includes("budi"));
check("5e. mention ada di opsi reply", m5.__sent[0] && Array.isArray(m5.__sent[0].mentions) && m5.__sent[0].mentions.includes(JID));
const m5b = mkM({ sender: OTHER, mentionedJid: [JID] });
await handleAfkHooks(m5b, null, db);
check("5f. throttle: mention ke-2 dalem 1 mnt gak kejawab lagi", m5b.__sent.length === 0);
const m5c = mkM({ sender: OTHER, mentionedJid: [OTHER] });
await handleAfkHooks(m5c, null, db);
check("5g. mention user non-AFK gak dibales", m5c.__sent.length === 0);

// ── 6. plugin handler ──
w("\n— plugin .afk —");
const mp = mkM({ pushName: "Sinta", args: ["lagi", "belanja"], text: "lagi belanja" });
await plugin.handler(mp, { sock: null });
check("6a. .afk <alasan> → kartu AFK Aktif", mp.__sent.length === 1 && mp.__sent[0].text.includes("afk aktif"), JSON.stringify(mp.__sent.map(s => s.text.slice(0, 60))));
check("6b. kartu awal ada nama", mp.__sent[0] && mp.__sent[0].text.includes("sinta"));
check("6c. kartu awal ada alasan belanja", mp.__sent[0] && mp.__sent[0].text.includes("belanja"));
check("6d. kartu awal ada jam mulai", mp.__sent[0] && mp.__sent[0].text.includes("mulai :"));
check("6e. user kecatat AFK", isUserAfk(mp.sender) === true);

const mp2 = mkM({ pushName: "Sinta", args: ["ganti", "alasan"], text: "ganti alasan" });
await plugin.handler(mp2, { sock: null });
check("6f. .afk ulang → AFK Diperbarui + alasan lama", mp2.__sent.length === 1 && mp2.__sent[0].text.includes("afk diperbarui") && mp2.__sent[0].text.includes("lagi belanja"));

const mc = mkM({ args: ["cek"], mentionedJid: [mp.sender] });
await plugin.handler(mc, { sock: null });
check("6g. .afk cek @user → status + durasi", mc.__sent.length === 1 && mc.__sent[0].text.includes("cek afk") && mc.__sent[0].text.includes("durasi :"));

const mc2 = mkM({ args: ["cek"], mentionedJid: [OTHER] });
await plugin.handler(mc2, { sock: null });
check("6h. .afk cek user non-AFK → gak AFK", mc2.__sent.length === 1 && mc2.__sent[0].text.includes("gak lagi afk"));

const ml = mkM({ args: ["list"] });
await plugin.handler(ml, { sock: null });
check("6i. .afk list nunjukin yang AFK", ml.__sent.length === 1 && ml.__sent[0].text.includes("daftar afk") && ml.__sent[0].text.includes("sinta"));

const mo = mkM({ sender: mp.sender, pushName: "Sinta", args: ["off"] });
await plugin.handler(mo, { sock: null });
check("6j. .afk off → dibatalkan + gak AFK lagi", mo.__sent.length === 1 && mo.__sent[0].text.includes("afk dibatalkan") && isUserAfk(mp.sender) === false);

const mo2 = mkM({ sender: mp.sender, args: ["off"] });
await plugin.handler(mo2, { sock: null });
check("6k. .afk off pas gak AFK → info santai", mo2.__sent.length === 1 && mo2.__sent[0].text.includes("gak lagi afk"));

// ═══════════════════════════════════════════════════════════════
w("\n— thumbnail serialize-thumb & m.reply fault-tolerant (fix 1 Okt) —");
// Akar bug owner ".afk gak berhenti": serialize-thumb.jpg sempat jadi JPEG
// 1x1 malformed (commit a7a229e4) → sharp THROW → SEMUA m.reply V1
// (default) mati senyap → kartu "AFK Berakhir" gak pernah keluar.
{
  const sharpMod = (await import("sharp")).default;
  const thumbPath = path.join(R, "assets", "image", "serialize", "serialize-thumb.jpg");
  const thumbBackup = fs.readFileSync(thumbPath);

  // 7a. asset yang di-commit HARUS valid & bisa di-resize (persis alur m.reply)
  try {
    const t = await sharpMod(thumbBackup).resize(640, 360).toBuffer();
    check("7a. serialize-thumb.jpg valid (sharp resize jalan)", t.length > 1000, "size: " + t.length);
  } catch (e) {
    check("7a. serialize-thumb.jpg valid (sharp resize jalan)", false, String(e.message).split("\n")[0]);
  }

  // 7b. m.reply V1 GAK BOLEH mati walau thumbnail korup (fault-tolerant)
  let relayed = 0;
  const fakeSock = {
    user: { id: "bot@s.whatsapp.net", jid: "bot@s.whatsapp.net" },
    sendMessage: async () => ({ key: { id: "S" } }),
    relayMessage: async () => { relayed++; return true; },
    groupMetadata: async () => ({ participants: [] }),
    sendPresenceUpdate: async () => {},
  };
  // poison dulu file-nya (JPEG kepala doang, gak ada data gambar) —
  // assetCache masih kosong buat key serialize-thumb di suite ini.
  fs.writeFileSync(thumbPath, thumbBackup.subarray(0, 12));
  let replyOk = false;
  try {
    const { serialize } = await import(R + "/src/lib/nova-serialize.js");
    const msg = { key: { remoteJid: "6281234567890@s.whatsapp.net", fromMe: false, id: "T1" }, message: { conversation: "tes" }, pushName: "Rizky" };
    const m = await serialize(fakeSock, msg, {});
    await m.reply("halo dunia"); // V1 default (db tmp fresh → replyVariant 1)
    replyOk = relayed >= 1;
  } catch (e) {
    replyOk = false;
  } finally {
    fs.writeFileSync(thumbPath, thumbBackup); // WAJIB restore
  }
  check("7b. m.reply V1 tetap jalan (relayMessage) walau thumbnail korup", replyOk, "relay: " + relayed);

  // 7c. file ke-restore bener
  check("7c. serialize-thumb.jpg ke-restore setelah tes", fs.readFileSync(thumbPath).length === thumbBackup.length);
}

// ═══════════════════════════════════════════════════════════════
w("\n— guard: posisi hook di handler.js (fix 14 Sep) —");
{
  const h = fs.readFileSync(R + "/src/handler.js", "utf8");
  const afk = h.indexOf("handleAfkHooks");
  const nimbrung = h.indexOf("handleAiGrup");
  const translate = h.indexOf("handleAutoTranslateMessage");
  const cmdGate = h.indexOf("if (!m.isCommand) return");
  check("hook AFK duluan sebelum AI-grup nimbrung (yang bisa return duluan)", afk > -1 && nimbrung > -1 && afk < nimbrung, `afk@${afk} vs aigrup@${nimbrung}`);
  check("hook AFK duluan sebelum autotranslate", afk > -1 && (translate === -1 || afk < translate), `afk@${afk} vs translate@${translate}`);
  check("hook AFK duluan sebelum gate command-return", afk > -1 && cmdGate > -1 && afk < cmdGate, `afk@${afk} vs gate@${cmdGate}`);
  // hanya SEKALI kepasang (gak dobel)
  const count = (h.match(/handleAfkHooks\(m/g) || []).length; // panggilan doang, bukan destructure
  check("cuma 1 panggilan handleAfkHooks di handler", count === 1, "found " + count);
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
