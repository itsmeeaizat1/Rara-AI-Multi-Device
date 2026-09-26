// NOVA AI — autojoin e2e: jadwalkan bot join/leave grup & channel otomatis
// (owner 26 Sep 2026: ".autojoin group <link> 12:00 → otomatis bot join dijam 12:00").
// Yang dites: parser waktu (relatif/jam absolut/besok/tanggal), validasi link,
// eksekusi timer via fake sock (groupAcceptInvite/newsletterFollow/groupLeave/
// newsletterUnfollow + DM owner jujur), cancel, restore boot (re-arm & terlewat),
// dispatch plugin (usage card, link gak valid, waktu gak valid, sukses, list, cancel).
import path from "path";
import { fileURLToPath } from "url";
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

process.on("uncaughtException", (e) => { console.log("UNCAUGHT:", e.stack); process.exit(1); });
process.on("unhandledRejection", (e) => { console.log("UNHANDLED:", e && e.stack || e); process.exit(1); });

let pass = 0, fail = 0;
const w = (s) => console.log(s);
const t = (name, ok, extra) => { ok ? pass++ : fail++; w((ok ? "✅ " : "❌ ") + name + (ok ? "" : extra ? " — " + extra : "")); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// DB init dulu (pola absen-meter) biar persistAutojoin gak senyap mati
import fs from "fs";
const DB_DIR = R + "/test/autojoin-e2e/tmp-db";
fs.rmSync(DB_DIR, { recursive: true, force: true });
fs.mkdirSync(DB_DIR, { recursive: true });
const dbm = await import(R + "/src/lib/nova-database.js");
await dbm.initDatabase(DB_DIR + "/db.json");

const mod = await import(R + "/src/lib/nova-autojoin.js");
const {
  extractGroupCode, isChannelLink, parseWaktuAutojoin, formatWaktuAutojoin,
  addAutojoinTask, cancelAutojoinTask, listAutojoinTasks,
  initAutoJoinScheduler, fireAutojoinTask, armAutojoinTask,
  _autojoinForTest,
} = mod;
const seam = _autojoinForTest();
seam.reset();

const OWNER = "6281111111111@s.whatsapp.net";
const GLINK = "https://chat.whatsapp.com/AbCdEf12345";
const CLINK = "https://whatsapp.com/channel/0029VaXyz123";

// ─── 1. parser link ───
t("1a extractGroupCode link valid", extractGroupCode(GLINK) === "AbCdEf12345", String(extractGroupCode(GLINK)));
t("1b extractGroupCode link rusak → null", extractGroupCode("https://youtu.be/xxx") === null);
t("1c isChannelLink wa.me/channel", isChannelLink("https://wa.me/channel/0029VaXyz123") === true);
t("1d isChannelLink link grup → false", isChannelLink(GLINK) === false);

// ─── 2. parser waktu ───
const now0 = Date.now();
seam.setNow(() => now0);
t("2a relatif 30m → +30mnt", parseWaktuAutojoin("30m") === now0 + 1800000);
t("2b relatif 2j → +2jam", parseWaktuAutojoin("2j") === now0 + 7200000);
t("2c relatif 1d → +1hari", parseWaktuAutojoin("1d") === now0 + 86400000);
t("2d relatif 1w → +7hari", parseWaktuAutojoin("1w") === now0 + 604800000);
const v2e = parseWaktuAutojoin("23:59");
t("2e jam absolut 23:59 hari ini (WIB)", v2e && v2e > now0 && v2e - now0 <= 86400000 && formatWaktuAutojoin(v2e).includes("23:59"), String(v2e && formatWaktuAutojoin(v2e)));
t("2f 5dtk (min 10dtk) → null", parseWaktuAutojoin("5s") === null);
t("2g 40 hari (max 30) → null", parseWaktuAutojoin("40d") === null);
t("2h sampah → null", parseWaktuAutojoin("kapan-kapan") === null);
t("2i besok 08:00 → besok jam 08:00 WIB", (() => { const v = parseWaktuAutojoin("besok 08:00"); return v && v - now0 > 18 * 3600000 && v - now0 < 30 * 3600000 && formatWaktuAutojoin(v).includes("08:00"); })());
t("2j DD-MM HH:mm valid (10-10, ~14 hari)", (() => { const v = parseWaktuAutojoin("10-10 20:00"); return v && formatWaktuAutojoin(v).includes("20:00"); })());
t("2k format WIB ada jam & tanggal", /WIB$/.test(formatWaktuAutojoin(now0)) && /\d{2}:\d{2}/.test(formatWaktuAutojoin(now0)));
seam.resetNow();

// ─── 3. validasi addAutojoinTask ───
let r = addAutojoinTask(null, { action: "join", target: "grup", link: GLINK, at: Date.now() + 60000, owner: OWNER });
t("3a target ngasal ditolak", r.ok === false, JSON.stringify(r));
r = addAutojoinTask(null, { action: "join", target: "group", link: "https://youtube.com", at: Date.now() + 60000, owner: OWNER });
t("3b link grup gak valid ditolak", r.ok === false && r.reason.includes("grup"), JSON.stringify(r));
r = addAutojoinTask(null, { action: "join", target: "channel", link: GLINK, at: Date.now() + 60000, owner: OWNER });
t("3c link channel gak valid ditolak", r.ok === false && r.reason.includes("channel"), JSON.stringify(r));

// ─── 4. eksekusi timer via fake sock ───
const calls = { joinGroup: [], followChannel: [], leaveGroup: [], unfollowChannel: [], dm: [] };
const fakeSock = {
  groupAcceptInvite: async (code) => { calls.joinGroup.push(code); },
  newsletterFollow: async (jid) => { calls.followChannel.push(jid); },
  groupGetInviteInfo: async (code) => ({ id: "120363012345678901@g.us" }),
  groupLeave: async (jid) => { calls.leaveGroup.push(jid); },
  cekIDSaluran: async (url) => ({ id: "0029VaXyz123@newsletter", name: "Nova Update" }),
  newsletterUnfollow: async (jid) => { calls.unfollowChannel.push(jid); },
  sendMessage: async (jid, payload) => { calls.dm.push({ jid, text: payload.text }); },
};

// tugas 1: join grup (timer dekat biar cepat — pakai arm manual)
const t1 = { id: "AJ-TEST1", action: "join", target: "group", link: GLINK, code: "AbCdEf12345", at: Date.now() + 250, createdAt: Date.now(), owner: OWNER, status: "pending" };
global.novaAutojoinTasks.push(t1);
armAutojoinTask(fakeSock, t1);
// tugas 2: out channel
const t2 = { id: "AJ-TEST2", action: "out", target: "channel", link: CLINK, code: null, at: Date.now() + 450, createdAt: Date.now(), owner: OWNER, status: "pending" };
global.novaAutojoinTasks.push(t2);
armAutojoinTask(fakeSock, t2);
// tugas 3: join channel (dieksekusi langsung buat tes sync)
const ok3 = await fireAutojoinTask(fakeSock, { id: "AJ-TEST3", action: "join", target: "channel", link: CLINK, at: Date.now(), owner: OWNER });
t("4a join channel via cekIDSaluran+newsletterFollow", ok3 === true && calls.followChannel[0] === "0029VaXyz123@newsletter", JSON.stringify(calls.followChannel));

await sleep(900);
t("4b timer join grup jalan → groupAcceptInvite(code)", calls.joinGroup.length === 1 && calls.joinGroup[0] === "AbCdEf12345", JSON.stringify(calls.joinGroup));
t("4c timer out channel jalan → newsletterUnfollow(jid)", calls.unfollowChannel.length === 1 && calls.unfollowChannel[0] === "0029VaXyz123@newsletter", JSON.stringify(calls.unfollowChannel));
t("4d DM hasil dikirim ke owner", calls.dm.length >= 3 && calls.dm.every((d) => d.jid === OWNER), JSON.stringify(calls.dm.map((d) => d.jid)));
t("4e DM join grup bilang BERHASIL (smallcaps)", calls.dm.some((d) => d.text.includes("ʙᴇʀʜᴀꜱɪʟ") && d.text.includes("ᴊᴏɪɴ")), (calls.dm[0] || {}).text?.slice(0, 120));
t("4f status fired setelah eksekusi", global.novaAutojoinTasks.find((x) => x.id === "AJ-TEST1")?.status === "fired");

// ─── 5. eksekusi GAGAL jujur ───
const badSock = {
  groupAcceptInvite: async () => { throw new Error("kicked from group"); },
  sendMessage: async (jid, p) => { calls.dm.push({ jid, text: p.text }); },
};
const okBad = await fireAutojoinTask(badSock, { id: "AJ-BAD", action: "join", target: "group", link: GLINK, code: "AbCdEf12345", at: Date.now(), owner: OWNER });
t("5a join gagal → ok=false jujur", okBad === false);
t("5b DM gagal bilang GAGAL (smallcaps) + alasan", calls.dm.some((d) => d.text.includes("ɢᴀɢᴀʟ") && d.text.includes("ᴋɪᴄᴋᴇᴅ")), calls.dm.map((d) => d.text.includes("ɢᴀɢᴀʟ")).join(","));

// ─── 6. cancel & list ───
const rc = addAutojoinTask(fakeSock, { action: "join", target: "group", link: GLINK, at: Date.now() + 3600000, owner: OWNER });
t("6a tugas baru pending", rc.ok === true && rc.task.status === "pending");
t("6b listAutojoinTasks(OWNER) cuma pending dia", listAutojoinTasks(OWNER).some((x) => x.id === rc.task.id));
const canceled = cancelAutojoinTask(rc.task.id, OWNER);
t("6c cancel sukses", canceled && canceled.status === "cancelled");
t("6d udah dibatalin → gak di list", !listAutojoinTasks(OWNER).some((x) => x.id === rc.task.id));
t("6e cancel id ngasal → null", cancelAutojoinTask("AJ-NOL", OWNER) === null);

// ─── 7. restore boot (scheduler) ───
seam.reset();
const db = dbm.getDatabase();
const saved = [
  { id: "AJ-R1", action: "join", target: "group", link: GLINK, code: "AbCdEf12345", at: Date.now() + 7200000, createdAt: Date.now(), owner: OWNER, status: "pending" },
  { id: "AJ-R2", action: "out", target: "channel", link: CLINK, code: null, at: Date.now() - 60000, createdAt: Date.now(), owner: OWNER, status: "pending" },
];
db.setting("autojoinTasks", saved);
const res7 = initAutoJoinScheduler(fakeSock);
t("7a restore: 1 re-arm + 1 terlewat", res7.rearmed === 1 && res7.missed === 1, JSON.stringify(res7));
t("7b tugas terlewat status fired", saved[1].status === "fired");
t("7c tugas future masih pending", saved[0].status === "pending");
await sleep(3500); // missed dieksekusi setelah 3 dtk
t("7d terlewat dieksekusi → unfollow dipanggil lagi", calls.unfollowChannel.length >= 2, JSON.stringify(calls.unfollowChannel));
t("7e DM terlewat ada penanda (smallcaps)", calls.dm.some((d) => d.text.includes("ᴛᴇʀʟᴇᴡᴀᴛ")), calls.dm.map((d) => d.text.includes("ᴛᴇʀʟᴇᴡᴀᴛ")).join(","));

// ─── 8. dispatch plugin ───
const plugin = await import(R + "/plugins/bot/autojoin.js");
const replyTag = [];
function mkM(args, cmdName) {
  return {
    command: cmdName || "autojoin",
    args,
    text: args.join(" "),
    sender: OWNER,
    chat: OWNER,
    reply: async (text, tag) => { replyTag.push({ text, tag }); return { key: { remoteJid: OWNER } }; },
    react: async () => {},
  };
}
async function run(args, cmdName) {
  replyTag.length = 0;
  await plugin.handler(mkM(args, cmdName), { sock: fakeSock, config: { command: { prefix: "." } } });
  return replyTag[0]?.text || "";
}

const usage = await run([]);
t("8a usage card tanpa arg", usage.includes("ᴄᴀʀᴀ ᴘᴀᴋᴀɪ") || /12:00|18:30/.test(usage), usage.slice(0, 100));
const badTarget = await run(["ngasal"]);
t("8b target asal → kartu salah", badTarget.includes("ʏᴀʜ ᴋᴀᴋ") || badTarget.includes("ɢᴀᴋ ᴅɪᴋᴇɴᴀʟ"), badTarget.slice(0, 100));
const badLink = await run(["group", "https://youtube.com/x", "18:30"]);
t("8c link grup gak valid → kartu tolak", badLink.includes("ɢᴀᴋ ᴠᴀʟɪᴅ"), badLink.slice(0, 100));
const noWaktu = await run(["group", GLINK]);
t("8d waktu kosong → minta waktu", noWaktu.includes("ᴡᴀᴋᴛᴜ"), noWaktu.slice(0, 100));
const badWaktu = await run(["group", GLINK, "kapan"]);
t("8e waktu sampah → kartu tolak", badWaktu.includes("ɢᴀᴋ ᴠᴀʟɪᴅ") || badWaktu.includes("ᴡᴀᴋᴛᴜ"), badWaktu.slice(0, 100));
seam.resetNow();
const okNew = await run(["group", GLINK, "2h"]);
t("8f pasang join grup 2h sukses", okNew.includes("ᴛᴇʀᴘᴀꜱᴀɴɢ") && okNew.includes("2"), okNew.slice(0, 120));
const listCard = await run(["list"]);
t("8g list nunjukin tugas baru", listCard.includes("ᴘᴇɴᴅɪɴɢ") || listCard.includes("ᴛᴜɢᴀꜱ"), listCard.slice(0, 120));
const cancelCard = await run(["cancel", "ngasal"]);
t("8h cancel id ngasal → gak ketemu", cancelCard.includes("ɢᴀᴋ ᴋᴇᴛᴇᴍᴜ"), cancelCard.slice(0, 100));
const outCmd = await run(["channel", CLINK, "besok 08:00"], "autooutchannel");
t("8i cmd .autoout channel → aksi OUT terpasang", outCmd.includes("ᴛᴇʀᴘᴀꜱᴀɴɢ"), outCmd.slice(0, 120));
t("8j tugas out channel pending", listAutojoinTasks(OWNER).some((x) => x.action === "out" && x.target === "channel" && x.status === "pending"));

// ─── 9. alias gc/ch + aturan countdown (tanpa ':') vs jam pasti (pakai ':') ───
seam.reset();
const before9 = listAutojoinTasks(OWNER).length;
const gcTxt = await run(["gc", GLINK, "7d"]);
const gcTask = listAutojoinTasks(OWNER).find((x) => !["AJ-R1"].includes(x.id) && x.link === GLINK && x.target === "group" && x.action === "join" && x.id.startsWith("AJ-"));
t("9a alias gc → terpasang sebagai GROUP join", gcTxt.includes("ᴛᴇʀᴘᴀꜱᴀɴɢ") && gcTask && gcTask.at - Date.now() > 6 * 86400000, gcTxt.slice(0, 120));
t("9b countdown 7d → +7 hari (bukan jam pasti)", gcTask && gcTask.at - Date.now() <= 7 * 86400000 + 60000);
const chTxt = await run(["ch", CLINK, "30m"]);
t("9c alias ch → terpasang sebagai CHANNEL join", chTxt.includes("ᴛᴇʀᴘᴀꜱᴀɴɢ") && listAutojoinTasks(OWNER).some((x) => x.target === "channel" && x.at - Date.now() < 31 * 60000), chTxt.slice(0, 120));
const jamPasti = parseWaktuAutojoin("12:00");
t("9d pakai ':' → jam pasti 12:00 WIB (bukan countdown)", jamPasti && formatWaktuAutojoin(jamPasti).includes("12:00"), jamPasti && formatWaktuAutojoin(jamPasti));
t("9e tanpa ':' → relatif countdown", parseWaktuAutojoin("45m") === Date.now() + 2700000);

seam.reset();
w("");
w(`===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail > 0 ? 1 : 0);
