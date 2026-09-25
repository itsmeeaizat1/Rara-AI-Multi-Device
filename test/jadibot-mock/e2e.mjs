process.on("uncaughtException", (e) => { console.log("UNCAUGHT:", e.stack); process.exit(1); });
const R = process.cwd();
const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase("/tmp/jb/db");

const db = getDatabase();
db.setting("jadibotAccess", { mode: "all", allowedUsers: [] });

const mock = await import("./nova-mock.mjs");
const stub = await import("./handler-stub.mjs");
const mgr = await import(R + "/src/lib/nova-jadibot-manager.js");
const jb = await import(R + "/plugins/main/becomebot.js");
const sb = await import(R + "/plugins/main/stopjadibot.js");

let pass = 0, fail = 0;
const check = (n, ok, x = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"} — ${n}${x ? " | " + String(x).slice(0, 120) : ""}`); };
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// ── mock parent sock & message ──
const parent = new mock.MockSocket();
parent.user = { id: "628174887770:s.whatsapp.net", name: "NovaParent" };
const mkM = (sender, args = [], isOwner = false) => ({
  chat: sender, sender, prefix: ".", args, isOwner,
  key: { id: "m" + Math.random().toString(16).slice(2), remoteJid: sender },
  reply: async (t) => { parent.replies.push(t); parent.sent.push({ jid: "reply", content: { text: t } }); },
  react: async () => {},
});
parent.replies = [];

const U1 = "6281234567890@s.whatsapp.net";
const U2NUM = "628999000111";
const U2 = U2NUM + "@s.whatsapp.net";

// ═══ 1. user jadi bot: .jadibot (pairing code) ═══
const n0 = mock.instances.length, ps0 = parent.sent.length;
await jb.handler(mkM(U1), { sock: parent });
const child = mock.instances[n0];
check("1. child socket dibuat untuk nomor user", !!child && child.pairingFor === "6281234567890", child?.pairingFor);
const pairCard = parent.sent.slice(ps0).map(s => s.content?.text || "").find(t => t.includes("Pairing Code"));
check("   pairing code dikirim ke chat user (1234-5678)", !!pairCard && pairCard.includes("1234-5678"), pairCard?.slice(0, 60));
const copyBtn = parent.sent.slice(ps0).flatMap(s => s.content?.interactiveButtons || []).find(b => b?.name === "cta_copy");
check("   tombol copy pairing code ada", !!copyBtn && JSON.parse(copyBtn.buttonParamsJson).copy_code === "12345678", copyBtn?.name);

// ═══ 2. connect: session aktif + notif ═══
const ps1 = parent.sent.length;
child.ev.emit("connection.update", { connection: "open" });
await wait(500);
check("2. session AKTIF setelah connect", mgr.isJadibotActive(U1) === true);
const connMsg = parent.sent.slice(ps1).map(s => s.content?.text || "").find(t => t.includes("Jadibot Terhubung"));
check("   notif 'Jadibot Terhubung' + nomor", !!connMsg && connMsg.includes("6281234567890"), connMsg?.slice(0, 70));
check("   status connected + uptime tercatat", mgr.getJadibotStatus(U1)?.status === "connected");

// ═══ 3. pesan masuk child bot → dirouting ke messageHandler ═══
const nc0 = stub.calls.length;
child.ev.emit("messages.upsert", {
  messages: [{ key: { id: "u1", remoteJid: "123@g.us", fromMe: false }, message: { conversation: ".menu" }, messageTimestamp: Math.floor(Date.now() / 1000) }],
  type: "notify",
});
await wait(300);
check("3. pesan user dirouting ke handler (isJadibot)", stub.calls.length === nc0 + 1 && stub.calls.at(-1)?.opts?.isJadibot === true && stub.calls.at(-1)?.sock === child, JSON.stringify(stub.calls.at(-1)?.opts));
// dedup: pesan yang sama gak dobel
child.ev.emit("messages.upsert", {
  messages: [{ key: { id: "u1", remoteJid: "123@g.us", fromMe: false }, message: { conversation: ".menu" }, messageTimestamp: Math.floor(Date.now() / 1000) }],
  type: "notify",
});
await wait(200);
check("   dedup: pesan sama gak dobel ke handler", stub.calls.length === nc0 + 1, `calls=${stub.calls.length}`);

// ═══ 4. guard: .jadibot lagi pas udah aktif ═══
parent.replies = [];
await jb.handler(mkM(U1), { sock: parent });
check("4. .jadibot dobel → ditolak 'sudah aktif'", parent.replies.some(t => t.toLowerCase().includes("sudah")), parent.replies[0]?.slice(0, 60));
check("   gak bikin socket baru", mock.instances.length === n0 + 1, `instances=${mock.instances.length}`);

// ═══ 5. .jadibot <nomor lain> ═══
const ps2 = parent.sent.length, n2 = mock.instances.length;
parent.replies = [];
await jb.handler(mkM(U1, [U2NUM]), { sock: parent });
const child2 = mock.instances[n2];
check("5. .jadibot <nomor> → child socket nomor LAIN", !!child2 && child2.pairingFor === U2NUM, child2?.pairingFor);
const card2 = parent.sent.slice(ps2).map(s => s.content?.text || "").find(t => t.includes("Pairing Code"));
check("   pairing code nomor lain dikirim ke chat requester", !!card2, card2?.slice(0, 50));
child2.ev.emit("connection.update", { connection: "open" });
await wait(500);
check("   2 session aktif sekaligus", mgr.getActiveJadibots().length === 2 && mgr.isJadibotActive(U2), `total=${mgr.getActiveJadibots().length}`);

// ═══ 6. .stopjadibot ═══
parent.replies = [];
await sb.handler(mkM(U1), { sock: parent });
check("6. .stopjadibot → session sendiri berhenti", mgr.isJadibotActive(U1) === false && child.ws.readyState === 3, `ws=${child.ws.readyState}`);
check("   masih 1 sisa (nomor lain)", mgr.getActiveJadibots().length === 1);
check("   session file TERSIMPAN (bisa restore)", mgr.getAllJadibotSessions().some(s => s.id === "6281234567890" && !s.isActive));

// ═══ 7. guard stop nomor lain: non-owner ditolak ═══
parent.replies = [];
await sb.handler(mkM("628700000000@s.whatsapp.net", [U2NUM], false), { sock: parent });
check("7. stop nomor lain oleh non-owner → DITOLAK", mgr.isJadibotActive(U2) === true && parent.replies.some(t => t.includes("owner") || t.includes("ᴏᴡɴᴇʀ")), parent.replies[0]?.slice(0, 60));
parent.replies = [];
await sb.handler(mkM("628174887770@s.whatsapp.net", [U2NUM], true), { sock: parent });
check("   oleh owner → session nomor lain berhenti", mgr.isJadibotActive(U2) === false);

// ═══ cleanup ═══
import fs from "node:fs";
for (const d of ["session/jadibot/6281234567890", "session/jadibot/" + U2NUM]) {
  try { fs.rmSync(R + "/" + d, { recursive: true, force: true }); } catch {}
}
console.log(`\n═══ ${pass} PASS, ${fail} FAIL ═══`);
process.exit(fail ? 1 : 0);
