// E2E VOICE QUALITY + DIAGNOSE (owner 19 Sep 2026: ".novaagent voice udh on,
// .novaagent hai malah dibalas teks bkn vn; disuruh balas pakai suara VN-nya
// pecah kayak tts android, bkn suara neural"). 2 fix:
//   (1) kualitas: msedge-tts 48kbps → 96kbps + opus 32k → 64k
//   (2) kegagalan VN gak senyap: mode ON + TTS gagal → jawaban tetep dikirim
//       teks + catatan penyebab (diagnosa msedge-tts/ffmpeg/jaringan).
// Jalankan: node test/voice-quality-diagnose-e2e/e2e.mjs
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

// fake ffmpeg di PATH — cp input→output (deterministik, tanpa ffmpeg asli)
const fakeBin = fs.mkdtempSync(path.join(os.tmpdir(), "fakebin-"));
fs.writeFileSync(path.join(fakeBin, "ffmpeg"), "#!/bin/bash\n[ \"$1\" = \"-version\" ] \&\& exit 0\ncp \"$3\" \"${@: -1}\"\n");
fs.chmodSync(path.join(fakeBin, "ffmpeg"), 0o755);
process.env.PATH = fakeBin + ":" + (process.env.PATH || "");

const lib = await import("../../src/lib/nova-voice-reply.js");
const { speakVoiceNote, diagnoseVoiceTts, voiceFailHint, _setVoiceTtsForTest, _setVoiceDiagForTest, _setVoiceDiagForTest: diagSeam } = lib;
const CHAT = "6281234567890@s.whatsapp.net";

console.log("— section 1: kualitas — source wajib bitrate baru —");
const libSrc = fs.readFileSync("src/lib/nova-voice-reply.js", "utf8");
ok("lib: msedge 96kbps (naik dari 48)", libSrc.includes("AUDIO_24KHZ_96KBITRATE_MONO_MP3") && !libSrc.includes("AUDIO_24KHZ_48KBITRATE_MONO_MP3"));
ok("lib: opus 64k (naik dari 32k)", /-b:a 64k/.test(libSrc) && !/-b:a 32k/.test(libSrc));
const aivSrc = fs.readFileSync("plugins/owner/aiautointeractionvn.js", "utf8");
ok(".aiv: msedge 96kbps + opus 64k", aivSrc.includes("AUDIO_24KHZ_96KBITRATE_MONO_MP3") && /-b:a 64k/.test(aivSrc) && !/-b:a 32k/.test(aivSrc));

console.log("— section 2: diagnoseVoiceTts — sehat & seam —");
const issuesHealthy = await diagnoseVoiceTts();
ok("sandbox sehat → gak ada masalah", Array.isArray(issuesHealthy) && issuesHealthy.length === 0, JSON.stringify(issuesHealthy));
_setVoiceDiagForTest(async () => ["package msedge-tts gak kebaca — jalankan npm install di folder bot lalu pm2 restart", "ffmpeg gak ketemu — apt-get install ffmpeg"]);
const issuesMock = await diagnoseVoiceTts();
ok("seam: 2 masalah keliatan (npm install + ffmpeg)", issuesMock.length === 2 && issuesMock[0].includes("npm install") && issuesMock[1].includes("ffmpeg"));
_setVoiceDiagForTest(undefined); // balikin asli

console.log("— section 3: voiceFailHint — kegagalan gak senyap —");
const hintIssues = voiceFailHint(issuesMock);
ok("hint nyebut mode aktif tapi gagal", hintIssues.includes("Mode suara aktif") && hintIssues.includes("gak bisa dibacakan"));
ok("hint nyebut kedua penyebab", hintIssues.includes("npm install") && hintIssues.includes("ffmpeg"));
const hintNoIssue = voiceFailHint([]);
ok("hint tanpa issue → TTS upstream/jaringan", hintNoIssue.includes("Penyebab:") && hintNoIssue.includes("Microsoft TTS"), hintNoIssue);

console.log("— section 4: voiceAnswer pakai hint (source guard novaai) —");
const novaaiSrc = fs.readFileSync("plugins/ai/novaai.js", "utf8");
ok("novaai voiceAnswer manggil diagnoseVoiceTts saat VN gagal", /diagnoseVoiceTts\(\)/.test(novaaiSrc));
ok("novaai voiceAnswer pakai voiceFailHint (gak hardcode)", novaaiSrc.includes("voiceFailHint(issues)"));
ok("gak ada lagi 'return false' senyap saat spoke gagal", !/if \(!spoke\) return false/.test(novaaiSrc));

console.log("— section 5: VN tetep jalan end-to-end (TTS mock + ogg) —");
_setVoiceTtsForTest(async () => Buffer.alloc(3000, 1));
const sent = [];
const sock = { sendMessage: (jid, content, opts) => { sent.push({ jid, content, opts }); return { key: { id: "s" + sent.length } }; } };
const spoke = await speakVoiceNote(sock, CHAT, "Halo! Tes suara neural kualitas baru.", "gadis", { quoted: { id: "q1" } });
ok("VN PTT terkirim", spoke === true && sent.length === 1 && sent[0].content.ptt === true && String(sent[0].content.mimetype).includes("ogg"));
_setVoiceTtsForTest(null); // TTS mati
sent.length = 0;
ok("TTS gagal → speakVoiceNote false (pemanggil kirim teks + hint)", (await speakVoiceNote(sock, CHAT, "tes", "gadis")) === false && sent.length === 0);

console.log("— section 6: INWORLD TTS-2 suara utama + fallback voice pertama (owner 29 Sep) —");
_setVoiceTtsForTest(async () => Buffer.alloc(3000, 1)); // edge mock aktif — kalau routing salah, byte=1 & test gagal
lib._setInworldVoiceTtsForTest(async (t) => Buffer.alloc(3000, 7)); // inworld sukses, byte 7 biar beda
sent.length = 0;
const spokeInw = await speakVoiceNote(sock, CHAT, "Tes suara inworld neural", "gadis");
ok("Inworld sukses → VN dari buffer Inworld (bukan edge)", spokeInw === true && sent.length === 1 && sent[0].content.audio[0] === 7, "byte pertama: " + (sent[0]?.content?.audio?.[0]));

lib._setInworldVoiceTtsForTest(null); // simulate Inworld DOWN
_setVoiceTtsForTest(async () => Buffer.alloc(3000, 1)); // edge fallback
sent.length = 0;
const spokeFb = await speakVoiceNote(sock, CHAT, "Tes fallback", "gadis");
ok("Inworld down → fallback voice pertama (edge) tetep kirim VN", spokeFb === true && sent.length === 1 && sent[0].content.audio[0] === 1, "byte pertama: " + (sent[0]?.content?.audio?.[0]));

lib._setInworldVoiceTtsForTest(null);
_setVoiceTtsForTest(null); // edge juga mati
sent.length = 0;
ok("Inworld down + edge down → false (pemanggil fallback teks)", (await speakVoiceNote(sock, CHAT, "tes", "gadis")) === false && sent.length === 0);
lib._setInworldVoiceTtsForTest(undefined); // balikin asli
_setVoiceTtsForTest(undefined);

console.log("— section 7: INWORLD STT pipeline utama + fallback lama (nova-stt) —");
const stt = await import("../../src/lib/nova-stt.js");
stt._setInworldSttForTest((buf, mime) => "halo ini transkrip inworld");
const t1 = await stt.transcribeAudio(Buffer.alloc(2000, 1), "audio/ogg; codecs=opus");
ok("STT Inworld sukses → transkrip dari Inworld", t1 === "halo ini transkrip inworld", "got: " + JSON.stringify(t1));
stt._setInworldSttForTest(null); // simulate Inworld STT down
const t2 = await stt.transcribeAudio(Buffer.alloc(2000, 1), "audio/ogg; codecs=opus");
ok("Inworld STT down → fallback pipeline lama (tanpa key → null, gak throw)", t2 === null, "got: " + JSON.stringify(t2));
stt._setInworldSttForTest(undefined); // balikin asli
const srcStt = fs.readFileSync("src/lib/nova-stt.js", "utf8");
ok("source: Inworld STT di urutan pertama pipeline", srcStt.indexOf("0) INWORLD STT") < srcStt.indexOf("1) Gemini multimodal"));
const srcVr = fs.readFileSync("src/lib/nova-voice-reply.js", "utf8");
ok("source: Inworld TTS dicoba SEBELUM edge fallback", srcVr.indexOf("inworldTTSBuffer(spoken)") < srcVr.indexOf("edgeTTSBuffer(spoken, voice.lang)"));

console.log("");
console.log(`===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
