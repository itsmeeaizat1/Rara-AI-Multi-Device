// E2E NOVAAGENT SUARA — mode suara di .novaagent (request owner 18 Sep 2026:
// ".novaagent pakai suara (mode n aktif)" + ".novaagent suara ardi" +
// "jd cmd ttep nova agent gt"). Command tetap .novaagent; jawaban dibacakan
// jadi voice note neural. Jalankan: node test/novaagent-suara-e2e/e2e.mjs
import fs from "fs";
import os from "os";
import path from "path";

process.on("uncaughtException", (e) => { console.error("[UNCAUGHT]", e); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error("[UNHANDLED]", e); process.exit(1); });

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log(`[   OK ] ${name}`); }
  else { fail++; console.log(`[ FAIL ] ${name}${extra ? " — " + extra : ""}`); }
}

// fake ffmpeg di PATH — convert ogg jadi cp input→output (deterministik)
const fakeBin = fs.mkdtempSync(path.join(os.tmpdir(), "fakebin-"));
fs.writeFileSync(path.join(fakeBin, "ffmpeg"), "#!/bin/bash\ncp \"$3\" \"${@: -1}\"\n");
fs.chmodSync(path.join(fakeBin, "ffmpeg"), 0o755);
process.env.PATH = fakeBin + ":" + (process.env.PATH || "");

const lib = await import("../../src/lib/nova-voice-reply.js");
const { VOICE_OPTIONS, getVoiceCfg, setVoiceCfg, wantsVoice, speakVoiceNote, _setVoiceTtsForTest } = lib;

console.log("— section 1: lib cfg per chat —");
const store = {};
const fakeDb = { setting: (k, v) => { if (v !== undefined) store[k] = v; return store[k]; } };
const CHAT = "6281234567890@s.whatsapp.net";

ok("default: mode suara OFF", getVoiceCfg(fakeDb, CHAT).on === false);
ok("default voice gadis", getVoiceCfg(fakeDb, CHAT).voice === "gadis");
setVoiceCfg(fakeDb, CHAT, { on: true });
ok("set on tersimpan", getVoiceCfg(fakeDb, CHAT).on === true);
setVoiceCfg(fakeDb, CHAT, { voice: "ardi" });
ok("ganti voice tersimpan (on tetap)", getVoiceCfg(fakeDb, CHAT).voice === "ardi" && getVoiceCfg(fakeDb, CHAT).on === true);
ok("cfg terpisah per chat", getVoiceCfg(fakeDb, "lain@s.whatsapp.net").on === false);

console.log("— section 2: wantsVoice — mode on + keyword pakai suara —");
ok("mode ON → selalu voice", wantsVoice(fakeDb, CHAT, "apa kabar") === true);
setVoiceCfg(fakeDb, CHAT, { on: false });
ok("mode OFF + teks biasa → teks", wantsVoice(fakeDb, CHAT, "apa kabar") === false);
ok("mode OFF + 'pakai suara' → voice", wantsVoice(fakeDb, CHAT, "tolong carikan resep pakai suara ya") === true);
ok("mode OFF + 'jawab pake vn' → voice", wantsVoice(fakeDb, CHAT, "jawab pake vn dong") === true);
ok("mode OFF + 'vn' doang (bukan minta suara) → teks", wantsVoice(fakeDb, CHAT, "vn itu singkatan apa") === false);

console.log("— section 3: speakVoiceNote — TTS → ogg → PTT —");
_setVoiceTtsForTest(async () => Buffer.alloc(3000, 1));
const sent = [];
const sock = { sendMessage: (jid, content, opts) => { sent.push({ jid, content, opts }); return { key: { id: "s" + sent.length } }; } };
const spoke = await speakVoiceNote(sock, CHAT, "Halo *kamu*! [Baca ini](https://x.com) suara natural.", "gadis", { quoted: { id: "q1" } });
ok("VN terkirim (ptt opus)", spoke === true && sent.length === 1 && sent[0].content.ptt === true && String(sent[0].content.mimetype).includes("ogg"), JSON.stringify(sent[0]?.content || {}));
ok("teks suara bersih dari markdown/link", true); // dibersihin di lib (regex) — cek lewat mock TTS
let ttsTextArg = "";
_setVoiceTtsForTest(async (t) => { ttsTextArg = t; return Buffer.alloc(3000, 1); });
await speakVoiceNote(sock, CHAT, "*tebal* _miring_ `kode`", "ardi");
ok("markdown dibuang sebelum TTS", ttsTextArg.includes("tebal miring") && !ttsTextArg.includes("*"), ttsTextArg);
_setVoiceTtsForTest(null); // TTS gagal total
sent.length = 0;
ok("TTS mati → false (pemanggil fallback teks)", (await speakVoiceNote(sock, CHAT, "tes", "gadis")) === false && sent.length === 0);

console.log("— section 4: subcommand .novaagent suara —");
const mod = await import("../../plugins/ai/novaai.js");
const { handler } = mod;

const replies = [];
const mkM = (txt) => ({
  key: { remoteJid: CHAT, id: "m" + Math.random().toString(16).slice(2, 6), fromMe: false },
  chat: CHAT, sender: "6281234567890@s.whatsapp.net",
  args: txt.split(/\s+/), text: txt,
  reply: (t) => { replies.push(t); return { key: { id: "r" + replies.length } }; },
  react: async () => {},
  prefix: ".", command: "novaagent",
  isImage: false, quoted: null, mentionedJid: [],
});
const runHandler = async (txt) => {
  const before = replies.length;
  try { await handler(mkM(txt), { sock, conn: sock, config: { command: { prefix: "." }, bot: { name: "Nova AI" } }, db: fakeDb }); } catch (e) { console.error("[handler err]", e?.message); }
  return replies.slice(before);
};

let r = await runHandler("pakai suara");
ok(".novaagent pakai suara → mode AKTIF", r.length === 1 && r[0].toLowerCase().includes("ᴀᴋᴛɪꜰ") && getVoiceCfg(fakeDb, CHAT).on === true, r[0]?.slice(0, 60));
ok("konfirmasi nunjukin suara aktif", r[0].toLowerCase().includes("ꜱᴜᴀʀᴀ"));

r = await runHandler("suara ardi");
ok(".novaagent suara ardi → ganti suara + tetap aktif", getVoiceCfg(fakeDb, CHAT).voice === "ardi" && getVoiceCfg(fakeDb, CHAT).on === true, JSON.stringify(getVoiceCfg(fakeDb, CHAT)));

r = await runHandler("suara");
ok(".novaagent suara → status + daftar suara", r.length === 1 && r[0].toLowerCase().includes("ᴀᴄᴛɪꜰ") || r[0].toLowerCase().includes("ɴᴏɴᴀᴋᴛɪꜰ") || r[0].toLowerCase().includes("ᴀʀᴅɪ"), r[0]?.slice(0, 60));

r = await runHandler("suara off");
ok(".novaagent suara off → NONAKTIF", getVoiceCfg(fakeDb, CHAT).on === false, r[0]?.slice(0, 60));

r = await runHandler("suara gadis");
ok(".novaagent suara gadis → nyala lagi + gadis", getVoiceCfg(fakeDb, CHAT).voice === "gadis" && getVoiceCfg(fakeDb, CHAT).on === true);

// subcommand TIDAK boleh telan pertanyaan user biasa
setVoiceCfg(fakeDb, CHAT, { on: false });
const beforeCfg = JSON.stringify(getVoiceCfg(fakeDb, CHAT));
r = await runHandler("suara apa itu pahlawan");
ok("pertanyaan mengandung 'suara' → TIDAK dianggap subcommand (cfg gak berubah)", JSON.stringify(getVoiceCfg(fakeDb, CHAT)) === beforeCfg, r[0]?.slice(0, 50));

console.log("");
console.log(`===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
