// E2E — PROGRES LEVEL AKTIVITAS (13 Sep 2026)
// Request owner: "setiap user ada aktivitas ketik cmd / bermain game, klo
// level naik dikasih pesan selamat level naik 1 - 2 + penghargaan".
// - grantActivityExp: +15 cmd biasa / +40 game-rpg, level-up → notif + award
// - checkAndNotifyLevelUp: penghargaan koin (level baru × 500) masuk dompet
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(R);

const DB_DIR = "/tmp/nova-act-db-" + Date.now();
fs.mkdirSync(DB_DIR, { recursive: true });
const { initDatabase } = await import(R + "/src/lib/nova-database.js");
const db = await initDatabase(DB_DIR + "/db.json");

const { _setLevelCardLoadImageForTest, checkAndNotifyLevelUp } = await import(R + "/src/lib/nova-level.js");
const { grantActivityExp, BASE_CMD_EXP, GAME_CMD_EXP } = await import(R + "/src/lib/nova-activity-progress.js");

// fake image biar kartu level-up gak nyamber jaringan
_setLevelCardLoadImageForTest(async () => ({ width: 4, height: 4 }));

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok || !extra ? "" : " — " + extra)); ok ? pass++ : fail++; };

function mockSock() {
  const media = [];
  const replies = [];
  return {
    media, replies,
    profilePictureUrl: async () => { throw new Error("no pp"); },
    sendMedia: async (chat, buf, txt, m, opts) => { media.push({ chat, buf, txt, m, opts }); return { key: { id: "m1" } }; },
  };
}
// m.reply mock — tangkap kartu preview (externalAdReply) biar bisa dites
function mockReply(sock, m) {
  m.reply = async (txt, options = {}) => {
    sock.replies.push({ txt, ext: options?.contextInfo?.externalAdReply });
    return { key: { id: "r" + sock.replies.length } };
  };
  return m;
}

// ═══════════════════════════════════════════════════════════════
w("\n— award penghargaan koin saat level-up (1 → 2) —");
{
  const jid = "u1@s.whatsapp.net";
  const u = db.setUser(jid);
  u.exp = 9985; // 15 EXP lagi → nyebrang level 2
  const sock = mockSock();
  const m = mockReply(sock, { sender: jid, chat: "c@g.us", pushName: "Budi", prefix: "." });
  const res = await checkAndNotifyLevelUp(sock, m, db, u, 9985, 10000);
  check("level-up ke-2 terdeteksi", res.leveledUp && res.newLevel === 2, JSON.stringify(res));
  check("penghargaan koin = level 2 × 500 = 1000", res.awardKoin === 1000, "award=" + res.awardKoin);
  check("koin masuk dompet", (db.getUser(jid).koin ?? 0) >= 1000, "koin=" + db.getUser(jid).koin);
  check("kartu SELAMAT dikirim via PREVIEW (reply)", sock.replies.length === 1 && sock.media.length === 0, `reply=${sock.replies.length} media=${sock.media.length}`);
  check("canvas ditanam di preview (externalAdReply thumbnail)", sock.replies.length === 1 && !!sock.replies[0].ext?.thumbnail, "thumbnail kosong");
  check("gak kirim media langsung (gak bisa disimpan ke galeri)", sock.media.length === 0, sock.media.length + " media");
  check("pesan ada penghargaan", sock.replies.length === 1 && /PENGHARGAAN/i.test(sock.replies[0].txt) && sock.replies[0].txt.includes("1000"), sock.replies[0]?.txt?.slice(0, 60));
  check("pesan ada SELAMAT + level baru", sock.replies.length === 1 && /SELAMAT/i.test(sock.replies[0].txt) && sock.replies[0].txt.includes("*2*"));
}
{
  const jid = "u2@s.whatsapp.net";
  const u = db.setUser(jid);
  u.exp = 5000;
  const sock = mockSock();
  const m = mockReply(sock, { sender: jid, chat: "c@g.us", pushName: "B", prefix: "." });
  const res = await checkAndNotifyLevelUp(sock, m, db, u, 5000, 5015);
  check("belum nyambang batas → gak ada notif/award", !res.leveledUp && res.awardKoin === 0 && sock.media.length === 0 && sock.replies.length === 0);
}
{
  // user matiin notif (levelupNotif false) → award koin TETAP masuk
  const jid = "u3@s.whatsapp.net";
  const u = db.setUser(jid);
  u.exp = 9990;
  if (!u.settings) u.settings = {}; // ala plugins/user/levelup.js — setUser gak nyimpen settings
  u.settings.levelupNotif = false;
  const sock = mockSock();
  const m = mockReply(sock, { sender: jid, chat: "c@g.us", pushName: "C", prefix: "." });
  const res = await checkAndNotifyLevelUp(sock, m, db, u, 9990, 10005);
  const koin = db.getUser(jid).koin ?? 0;
  check("notif off → award tetap masuk, kartu gak dikirim", res.leveledUp && !res.notified && koin >= 1000 && sock.media.length === 0 && sock.replies.length === 0, `koin=${koin} media=${sock.media.length}`);
}

// ═══════════════════════════════════════════════════════════════
w("\n— grantActivityExp: EXP per aktivitas (db beneran, isolated) —");
{
  const jid = "6281234567890@s.whatsapp.net";
  db.setUser(jid);
  const sock = mockSock();
  const m = { sender: jid, chat: "c@g.us", pushName: "D", prefix: "." };
  const expBefore = db.getUser(jid).exp || 0;
  await grantActivityExp(sock, m, { category: "downloader" });
  const expAfterCmd = db.getUser(jid).exp;
  check("cmd biasa: +" + BASE_CMD_EXP + " EXP", expAfterCmd - expBefore === BASE_CMD_EXP, `${expBefore}→${expAfterCmd}`);
  await grantActivityExp(sock, m, { category: "rpg" });
  await grantActivityExp(sock, m, { category: "game" });
  const expAfterGame = db.getUser(jid).exp;
  check("game/rpg: +" + GAME_CMD_EXP + " EXP per command", expAfterGame - expAfterCmd === GAME_CMD_EXP * 2, `${expAfterCmd}→${expAfterGame}`);
  check("gak ada notif level-up prematur (EXP masih kecil)", sock.media.length === 0);
  check("user auto-dibuat + EXP kecatat", expAfterGame > 0);
}
{
  // safety: sock null / newsletter → senyap
  const r1 = await grantActivityExp(null, { sender: "a@s.whatsapp.net" }, {});
  const r2 = await grantActivityExp({ sendMedia: async () => {} }, { sender: "a@s.whatsapp.net", isNewsletter: true }, {});
  check("sock null / newsletter → null senyap", r1 === null && r2 === null);
}
{
  // level-up LIVE lewat grantActivityExp: user EXP nyaris penuh,
  // 1 command biasa → kartu selamat + award masuk
  const jid = "6289876543210@s.whatsapp.net";
  db.setUser(jid);
  db.updateExp(jid, 10000 - BASE_CMD_EXP);
  const koinBefore = db.getUser(jid).koin ?? 0;
  const sock = mockSock();
  const m = mockReply(sock, { sender: jid, chat: "c@g.us", pushName: "E", prefix: "." });
  const res = await grantActivityExp(sock, m, { category: "fun" });
  const koinAfter = db.getUser(jid).koin ?? 0;
  check("1 aktivitas nyebrang ke level 2 → leveledUp", res?.leveledUp === true && res?.newLevel === 2, JSON.stringify(res));
  check("award koin masuk (+1000)", koinAfter - koinBefore >= 1000, `${koinBefore}→${koinAfter}`);
  check("kartu selamat terkirim via PREVIEW (bukan media)", sock.replies.length === 1 && /SELAMAT/i.test(sock.replies[0].txt) && sock.media.length === 0, `reply=${sock.replies.length} media=${sock.media.length}`);
}

w(`\n— summary —\nPASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
