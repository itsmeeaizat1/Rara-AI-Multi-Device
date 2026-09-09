// E2E CTX JADIBOT DI DISPATCHER ASLI — fix 9 Sep 2026:
// 1. .addowner/.delowner/.ownerlist di session jadibot → owner SESSION itu, BUKAN owner utama
// 2. .stopjadibot <nomor lain> dari user jadibot → DITOLAK (fromMe ≠ owner utama)
// 3. .stopjadibot <nomor lain> dari session utama → BOLEH
process.on("uncaughtException", (e) => { console.log("UNCAUGHT:", e.stack); process.exit(1); });
import { initDatabase, getDatabase } from "../../src/lib/nova-database.js";
import { loadPlugins } from "../../src/lib/nova-plugins.js";
import { startJadibot, isJadibotActive, stopJadibot } from "../../src/lib/nova-jadibot-manager.js";
import fs from "fs";

const DBP = "/tmp/jb/db-owner";
await initDatabase(DBP);
getDatabase().setting("jadibotAccess", { mode: "all", allowedUsers: [] });
await loadPlugins(process.cwd() + "/plugins");

const { messageHandler } = await import("../../src/handler.js");

const U1 = "6281234567890@s.whatsapp.net"; // jadibot #1
const U2 = "628999000111@s.whatsapp.net";  // jadibot #2 (korban stop lintas session)
const MAIN = "628174887770@s.whatsapp.net";
const TARGET = "628700000000@s.whatsapp.net";

let pass = 0, fail = 0;
const check = (name, ok, x) => { ok ? (pass++, console.log("PASS — " + name + (x ? " | " + String(x).slice(0, 60) : ""))) : (fail++, console.log("FAIL — " + name + " | " + String(x).slice(0, 120))); };

const mock = await import("./nova-mock.mjs");
const parent = new mock.MockSocket();
parent.user = { id: MAIN, name: "NovaMain" };

const mStub = (chat) => ({ chat, sender: chat, prefix: ".", args: [], reply: async () => {}, react: async () => {} });

// buat 2 session jadibot aktif
await startJadibot(parent, mStub(U1), U1, true);
await startJadibot(parent, mStub(U2), U2, true);
const sock1 = mock.instances.at(-2);
const sock2 = mock.instances.at(-1);
await new Promise((r) => setTimeout(r, 3500)); // tunggu blok pairing (delay 3 dtk di manager)
sock1.user = { id: U1, name: "JB1" };
sock2.user = { id: U2, name: "JB2" };
sock1.ev.emit("connection.update", { connection: "open" });
sock2.ev.emit("connection.update", { connection: "open" });
await new Promise((r) => setTimeout(r, 300));
check("setup: 2 session jadibot aktif", isJadibotActive(U1) && isJadibotActive(U2));

const mkMsg = (sock, text, id) => ({
  key: { remoteJid: sock.user.id, fromMe: true, id },
  message: { conversation: text },
  pushName: "Tester",
});
const deepTexts = (obj, out = []) => {
  if (!obj || typeof obj !== "object") return out;
  for (const [k, v] of Object.entries(obj)) {
    if (k === "react" || k === "quotedMessage") continue; // reaksi & pesan asli yang di-quote bukan reply
    if ((k === "text" || k === "conversation") && typeof v === "string" && v.trim()) out.push(v);
    else if (typeof v === "object") deepTexts(v, out);
  }
  return out;
};
const textsOf = (sock) => sock.sent.flatMap((s) => deepTexts(s.content));

// ─── 1. .addowner di session jadibot #1 → owner SESSION, bukan owner utama
await messageHandler(mkMsg(sock1, ".addowner 628700000000", "o1"), sock1, { isJadibot: true, jadibotId: U1 });
const jdb1 = JSON.parse(fs.readFileSync(process.cwd() + "/session/jadibot/6281234567890/data.json", "utf8"));
check("1a. .addowner jadibot → masuk owner list session itu", (jdb1.owners || []).some(o => String(o).includes("628700000000")), JSON.stringify(jdb1.owners));
const mainOwners = getDatabase().data.owner || [];
check("1b. TIDAK nyasar ke owner list bot utama", !mainOwners.some(o => String(o).includes("628700000000")), JSON.stringify(mainOwners));
const rep1 = textsOf(sock1).join(" ");
check("1c. reply konfirmasi add owner jadibot", /ʙᴇʀʜᴀꜱɪʟ|BERHASIL|Berhasil|menambahkan/i.test(rep1), rep1.slice(-100));

// ─── 2. .ownerlist di session jadibot → daftar owner session
await messageHandler(mkMsg(sock1, ".ownerlist", "o2"), sock1, { isJadibot: true, jadibotId: U1 });
const rep2 = textsOf(sock1).at(-1) || "";
check("2. .ownerlist jadibot nunjukin owner session", rep2.includes("628700000000") && /ᴊᴀᴅɪʙᴏᴛ/i.test(rep2), rep2.slice(0, 80));

// ─── 3. .delowner di session jadibot → hapus dari owner session
await messageHandler(mkMsg(sock1, ".delowner 628700000000", "o3"), sock1, { isJadibot: true, jadibotId: U1 });
const jdb1b = JSON.parse(fs.readFileSync(process.cwd() + "/session/jadibot/6281234567890/data.json", "utf8"));
check("3. .delowner jadibot → hilang dari owner list session", !(jdb1b.owners || []).some(o => String(o).includes("628700000000")), JSON.stringify(jdb1b.owners));

// ─── 4. .stopjadibot <nomor lain> dari user jadibot → DITOLAK
sock1.sent = [];
await messageHandler(mkMsg(sock1, ".stopjadibot 628999000111", "o4"), sock1, { isJadibot: true, jadibotId: U1 });
const rep4 = textsOf(sock1).join(" ");
check("4a. stop nomor lain dari jadibot → DITOLAK (khusus owner utama)", /ᴏᴡɴᴇʀ|owner/i.test(rep4), rep4.slice(0, 100));
check("4b. session korban tetap AKTIF", isJadibotActive(U2));

// ─── 5. .stopjadibot <nomor lain> dari session utama (owner utama) → BOLEH
parent.sent = [];
await messageHandler(mkMsg(parent, ".stopjadibot 628999000111", "o5"), parent, {});
check("5a. stop nomor lain dari session utama → BERHASIL", !isJadibotActive(U2));
check("5b. session #1 masih aman", isJadibotActive(U1));

// ─── 6. PREMIUM jadibot: .addprem → premium SESSION, bukan bot utama
await messageHandler(mkMsg(sock1, ".addprem 628700000001 30", "p1"), sock1, { isJadibot: true, jadibotId: U1 });
const jdb1p = JSON.parse(fs.readFileSync(process.cwd() + "/session/jadibot/6281234567890/data.json", "utf8"));
check("6a. .addprem jadibot → masuk premium list session itu", (jdb1p.premiums || []).some(p => String(p.jid || p).includes("628700000001")), JSON.stringify(jdb1p.premiums));
const mainPrem = getDatabase().data.premium || [];
check("6b. TIDAK nyasar ke premium list bot utama", !mainPrem.some(p => String(typeof p === "string" ? p : p.id).includes("628700000001")), JSON.stringify(mainPrem));

// ─── 7. .listprem di session jadibot
await messageHandler(mkMsg(sock1, ".listprem", "p2"), sock1, { isJadibot: true, jadibotId: U1 });
const rep7 = textsOf(sock1).at(-1) || "";
check("7. .listprem jadibot nunjukin premium session", rep7.includes("628700000001"), rep7.slice(0, 80));

// ─── 8. .delprem di session jadibot → hapus dari premium session
await messageHandler(mkMsg(sock1, ".delprem 628700000001", "p3"), sock1, { isJadibot: true, jadibotId: U1 });
const jdb1q = JSON.parse(fs.readFileSync(process.cwd() + "/session/jadibot/6281234567890/data.json", "utf8"));
check("8. .delprem jadibot → hilang dari premium list session", !(jdb1q.premiums || []).some(p => String(p.jid || p).includes("628700000001")), JSON.stringify(jdb1q.premiums));

// ─── 9. Route command: .delprem/.addpremium kini ke addprem (bukan delpremall/not-found)
await messageHandler(mkMsg(parent, ".addpremium 628700000002 7", "p4"), parent, {});
const premMain = getDatabase().data.premium || [];
check("9a. .addpremium (alias) dari session utama → premium utama", premMain.some(p => String(typeof p === "string" ? p : p.id).includes("628700000002")), JSON.stringify(premMain));
parent.sent = [];
await messageHandler(mkMsg(parent, ".delprem 628700000002", "p5"), parent, {});
const premMain2 = getDatabase().data.premium || [];
check("9b. .delprem satuan → terhapus dari premium utama (bukan delpremall)", !premMain2.some(p => String(typeof p === "string" ? p : p.id).includes("628700000002")), JSON.stringify(premMain2));
const rep9 = textsOf(parent).join(" ");
check("9c. reply konfirmasi hapus premium", /ʙᴇʀʜᴀꜱɪʟ|Berhasil|BERHASIL/i.test(rep9), rep9.slice(-80));

// cleanup
await stopJadibot(U1, false).catch(() => {});
fs.rmSync(DBP, { recursive: true, force: true });
fs.rmSync(process.cwd() + "/session/jadibot", { recursive: true, force: true });
console.log(`═══ ${pass} PASS, ${fail} FAIL ═══`);
process.exit(fail ? 1 : 0);
