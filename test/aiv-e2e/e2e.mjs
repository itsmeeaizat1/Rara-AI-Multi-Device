// E2E AIV — bicara dengan AI (rara agent) via voice note / teks,
// AI balas pakai suara (VN) atau teks (upgrade 18 Sep 2026).
// Otak: runAgent rara-agent.js (seam _setAivBrainForTest).
// STT: rara-stt.js (seam _setAivSttForTest). TTS: edge-tts (seam _setAivTtsForTest).
// Jalankan: node test/aiv-e2e/e2e.mjs
import fs from "fs";
import os from "os";
import path from "path";

process.on("uncaughtException", (e) => { console.error("[UNCAUGHT]", e); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error("[UNHANDLED]", e); process.exit(1); });

// fake ffmpeg di PATH — sandbox gak stabil buat encode ogg asli; cp input→output
import fs2 from "fs";
const fakeBin = fs2.mkdtempSync(path.join(os.tmpdir(), "fakebin-"));
fs2.writeFileSync(path.join(fakeBin, "ffmpeg"), "#!/bin/bash\ncp \"$3\" \"${@: -1}\"\n");
fs2.chmodSync(path.join(fakeBin, "ffmpeg"), 0o755);
process.env.PATH = fakeBin + ":" + (process.env.PATH || "");

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log(`[   OK ] ${name}`); }
  else { fail++; console.log(`[ FAIL ] ${name}${extra ? " — " + extra : ""}`); }
}

// db fresh di tmp dir (getDatabase pakai process.cwd())
const ORIG_CWD = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aiv-e2e-"));
process.chdir(tmp);

// init db fresh di tmp cwd (getDatabase butuh initDatabase dulu)
const { initDatabase } = await import("../../src/lib/rara-database.js");
await initDatabase(path.join(tmp, "database", "main"));

const mod = await import("../../plugins/owner/aiautointeractionvn.js");
const { handler, handleAiAutoVnInteraction, isAiAutoVnEnabled,
  _setAivSttForTest, _setAivBrainForTest, _setAivTtsForTest,
  _aivSentIdsForTest } = mod;

// ── mock ──
const GID = "628123456789@s.whatsapp.net";
const replies = [];
const reactions = [];
const messages = []; // sock.sendMessage calls
const m = {
  key: { remoteJid: GID, id: "usermsg1", fromMe: false },
  text: "",
  reply: (txt) => { replies.push(txt); return { key: { id: "botreply_" + replies.length, remoteJid: GID } }; },
  react: async () => {},
  prefix: ".",
};
const sock = {
  sendReaction: (gid, react, key) => { reactions.push(react); return true; },
  sendPresenceUpdate: async () => true,
  downloadMediaMessage: async () => Buffer.alloc(2000, 1),
  sendMessage: (gid, content, opts) => {
    messages.push({ gid, content });
    return { key: { id: "botsent_" + messages.length, remoteJid: gid } };
  },
};
const botConfig = { command: { prefix: "." } };

console.log("— section 1: default OFF, toggle handler —");
ok("default: gak aktif", isAiAutoVnEnabled(m, sock) === false);

m.text = "on";
await handler(m, { sock, config: botConfig });
ok("on → konfirmasi terkirim", replies.length === 1 && replies[0].includes("ᴀɪᴠ"), replies[0]?.slice(0, 40));
ok("sekarang aktif", isAiAutoVnEnabled(m, sock) === true);
ok("pesan konfirmasi di-track (reply bisa lanjut obrolan)", (_aivSentIdsForTest(GID) || new Set()).has("botreply_1"));

console.log("— section 2: mode balas vn|teks —");
m.text = "balas teks";
await handler(m, { sock, config: botConfig });
ok("balas teks diterima", replies[replies.length - 1].includes("ᴛᴇᴋꜱ"), replies[replies.length - 1]?.slice(0, 50));
m.text = "balas vn";
await handler(m, { sock, config: botConfig });
ok("balas vn diterima", replies[replies.length - 1].includes("ᴠᴏɪᴄᴇ ɴᴏᴛᴇ"), replies[replies.length - 1]?.slice(0, 50));
m.text = "balas xxx";
await handler(m, { sock, config: botConfig });
ok("mode invalid ditolak", replies[replies.length - 1].includes("ᴛɪᴅᴀᴋ ᴠᴀʟɪᴅ"), replies[replies.length - 1]?.slice(0, 50));

console.log("— section 3: VN → STT → agent → balasan VN —");
_setAivSttForTest(async () => "Halo, apa kabar hari ini?");
_setAivBrainForTest(async () => ({ answer: "Kabar saya baik, terima kasih sudah bertanya. Ada yang bisa saya bantu hari ini?", sources: [], mode: "persona" }));
// TTS mock — ogg valid (edge-tts asli gak jalan di sandbox tanpa internet Microsoft)
const fakeMp3 = Buffer.alloc(3000, 1);
_setAivTtsForTest(async () => fakeMp3);

// VN masuk
const vnMsg = {
  key: { remoteJid: GID, id: "usermsg2", fromMe: false },
  message: { audioMessage: { seconds: 5, mimetype: "audio/ogg; codecs=opus" } },
  text: "",
  fromMe: false,
  isCommand: false,
  pushName: "Owner",
};
messages.length = 0;
const handled = await handleAiAutoVnInteraction(vnMsg, sock);
ok("VN diproses (handled true)", handled === true);
ok("balasan VN terkirim (ptt)", messages.some(x => x.content?.ptt === true && x.content?.audio), JSON.stringify(messages.map(x => Object.keys(x.content))));
ok("id balasan di-track buat lanjut obrolan", (_aivSentIdsForTest(GID) || new Set()).has("botsent_1"));

console.log("— section 4: VN kepanjangan ditolak —");
const vnLong = {
  key: { remoteJid: GID, id: "usermsg3", fromMe: false },
  message: { audioMessage: { seconds: 200, mimetype: "audio/ogg; codecs=opus" } },
  text: "", fromMe: false, isCommand: false, pushName: "Owner",
};
messages.length = 0;
const handled2 = await handleAiAutoVnInteraction(vnLong, sock);
ok("VN > 120 dtk ditolak sopan", handled2 === true && messages.length === 1 && (messages[0].content?.text || "").includes("200") && (messages[0].content?.text || "").includes("ᴅᴇᴛɪᴋ"), (messages[0]?.content?.text || "").slice(0, 60));

console.log("— section 5: VN gak jelas → minta rekam ulang —");
_setAivSttForTest(null); // STT gagal
messages.length = 0;
const vnUnclear = {
  key: { remoteJid: GID, id: "usermsg4", fromMe: false },
  message: { audioMessage: { seconds: 4, mimetype: "audio/ogg; codecs=opus" } },
  text: "", fromMe: false, isCommand: false, pushName: "Owner",
};
const handled3 = await handleAiAutoVnInteraction(vnUnclear, sock);
ok("STT gagal → pesan rekam ulang", handled3 === true && (messages[messages.length - 1]?.content?.text || "").includes("ʙᴇʟᴜᴍ ᴊᴇʟᴀꜱ"), (messages[messages.length - 1]?.content?.text || "").slice(0, 60));

console.log("— section 6: lanjut obrolan via TEKS (reply pesan AI) —");
_setAivSttForTest(async () => "unused");
_setAivBrainForTest(async (task) => ({ answer: "Baik, saya ingat konteks obrolan kita sebelumnya tentang kabar.", sources: [], mode: "persona" }));
const textMsg = {
  key: { remoteJid: GID, id: "usermsg5", fromMe: false },
  message: { extendedTextMessage: { text: "besok libur nggak?", contextInfo: { stanzaId: "botsent_1", participant: "bot" } } },
  text: "besok libur nggak?",
  fromMe: false,
  isCommand: false,
  pushName: "Owner",
};
messages.length = 0;
const handled4 = await handleAiAutoVnInteraction(textMsg, sock);
ok("reply pesan AI → obrolan lanjut (mode vn → balasan ptt)", handled4 === true && messages.some(x => x.content?.ptt === true), JSON.stringify(messages.map(x => Object.keys(x.content))));

// reply ke pesan BUKAN AI → diabaikan
messages.length = 0;
const textMsgStranger = {
  key: { remoteJid: GID, id: "usermsg6", fromMe: false },
  message: { extendedTextMessage: { text: "halo", contextInfo: { stanzaId: "pesan-lain", participant: "orang" } } },
  text: "halo",
  fromMe: false,
  isCommand: false,
};
const handled5 = await handleAiAutoVnInteraction(textMsgStranger, sock);
ok("reply pesan bukan AI → diabaikan (false)", handled5 === false && messages.length === 0);

console.log("— section 7: agent error → pesan maaf —");
_setAivBrainForTest(null); // brain down
messages.length = 0;
const vn2 = {
  key: { remoteJid: GID, id: "usermsg7", fromMe: false },
  message: { audioMessage: { seconds: 3, mimetype: "audio/ogg; codecs=opus" } },
  text: "", fromMe: false, isCommand: false, pushName: "Owner",
};
const handled6 = await handleAiAutoVnInteraction(vn2, sock);
ok("brain down → pesan gagal proses", handled6 === true && (messages[messages.length - 1]?.content?.text || "").includes("ɢᴀɢᴀʟ"), (messages[messages.length - 1]?.content?.text || "").slice(0, 60));

console.log("— section 8: mode balas TEKS —");
// set replyMode teks via handler
m.text = "balas teks";
await handler(m, { sock, config: botConfig });
_setAivBrainForTest(async () => ({ answer: "Ini jawaban teks singkat.", sources: [], mode: "persona" }));
messages.length = 0;
const vn3 = {
  key: { remoteJid: GID, id: "usermsg8", fromMe: false },
  message: { audioMessage: { seconds: 3, mimetype: "audio/ogg; codecs=opus" } },
  text: "", fromMe: false, isCommand: false, pushName: "Owner",
};
const handled7 = await handleAiAutoVnInteraction(vn3, sock);
ok("mode teks → balasan text (bukan ptt)", handled7 === true && messages.some(x => typeof x.content?.text === "string") && !messages.some(x => x.content?.ptt), JSON.stringify(messages.map(x => Object.keys(x.content))));

console.log("— section 9: sumber research dikirim sebagai teks —");
m.text = "balas vn";
await handler(m, { sock, config: botConfig });
_setAivBrainForTest(async () => ({
  answer: "Menurut berita hari ini cuaca Serang cerah berawan sekitar 29 derajat.",
  sources: [{ tag: "berita", domain: "contoh.com", url: "https://contoh.com/cuaca" }],
  mode: "research",
}));
messages.length = 0;
const vn4 = {
  key: { remoteJid: GID, id: "usermsg9", fromMe: false },
  message: { audioMessage: { seconds: 4, mimetype: "audio/ogg; codecs=opus" } },
  text: "", fromMe: false, isCommand: false, pushName: "Owner",
};
const handled8 = await handleAiAutoVnInteraction(vn4, sock);
const srcMsg = messages.find(x => (x.content?.text || "").includes("ꜱᴜᴍʙᴇʀ"));
ok("sumber web dikirim sebagai teks", handled8 === true && !!srcMsg && srcMsg.content.text.includes("https://contoh.com/cuaca"), srcMsg?.content?.text?.slice(0, 60));

console.log("— section 10: off —");
m.text = "off";
await handler(m, { sock, config: botConfig });
ok("off → gak aktif", isAiAutoVnEnabled(m, sock) === false);

// ── cleanup ──
mod._resetAivSeamsForTest();
process.chdir(ORIG_CWD);
fs.rmSync(tmp, { recursive: true, force: true });

console.log("");
console.log(`===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
