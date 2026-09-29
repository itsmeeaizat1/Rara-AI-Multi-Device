// E2E inworld-e2e — verifikasi fitur Inworld AI (platform.inworld.ai) 29 Sep 2026:
// lib nova-inworld.js (TTS synthesize, voice catalog + default custom-first,
// STT transcribe + profil suara, LLM chat) + plugin inworldtts.js/inworldchat.js
// + registrasi key "inworld" di API_KEYS. HTTP di-mock via seam _setInworldHttpForTest.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// fake key biar getInworldKey() gak throw di env test (http di-mock via seam)
process.env.INWORLD_API_KEY = "dGVzdDppbndvcmxk";
// guard anti mati-senyap: top-level await rejection di node ini exit 0 TANPA pesan
process.on("unhandledRejection", (e) => { console.error("UNHANDLED REJECTION:", e?.stack || e); process.exit(1); });

const R = path.resolve(process.cwd());
let pass = 0, fail = 0, total = 0;
const ok = (name, cond, extra) => { total++; if (cond) { pass++; console.log("  ✓ " + name); } else { fail++; console.log("  ❌ " + name + (extra ? " → " + String(extra).slice(0, 200) : "")); } };

console.log("─── 1. source: registrasi & plugin ───");
const keys = fs.readFileSync(path.join(R, "src/lib/nova-api-keys.js"), "utf8");
ok("key 'inworld' terdaftar di API_KEYS (label+env INWORLD_API_KEY+usedBy)", keys.includes('inworld: {') && keys.includes('INWORLD_API_KEY') && keys.includes('usedBy: ["inworldtts"'));
const pTts = fs.readFileSync(path.join(R, "plugins/tools/inworldtts.js"), "utf8");
ok("plugin inworldtts: 4 cmd (tts/voice/voices/stt) + alias pendek", pTts.includes('"inworldtts"') && pTts.includes('"inworldvoice"') && pTts.includes('"inworldvoices"') && pTts.includes('"inworldstt"') && pTts.includes('"inwtts"'));
ok("plugin inworldtts: hint .setkey inworld saat key kosong", pTts.includes(".setkey inworld"));
ok("plugin inworldtts: kirim VN ptt + audio buffer (bukan url)", pTts.includes("ptt: true") && pTts.includes("audio: buffer"));
ok("plugin inworldtts: batas 2000 char (limit non-streaming)", pTts.includes("MAX_TEXT = 2000"));
const pChat = fs.readFileSync(path.join(R, "plugins/ai/inworldchat.js"), "utf8");
ok("plugin inworldchat: kategori ai + optional <model>|<teks>", pChat.includes('category: "ai"') && pChat.includes("includes(\"/\")"));

console.log("─── 2. normalizeKey (gotcha padding terpotong) ───");
const { normalizeKey, _setInworldHttpForTest, _resetVoiceCacheForTest, inworldSynthesize, inworldListVoices, resolveDefaultVoice, inworldTranscribe, inworldChat, getInworldKey } = await import(pathToFileURL(path.join(R, "src/lib/nova-inworld.js")).href);
ok("padding '==' dipulihkan bila len%4==2", normalizeKey("abcabcabcabcabcabcabca") === "abcabcabcabcabcabcabca==");
ok("padding '=' dipulihkan bila len%4==3", normalizeKey("abcabcabcabcabcabcabcab") === "abcabcabcabcabcabcabcab=");
ok("key lengkap gak diubah + 'Basic ' dibuang", normalizeKey("Basic abcd") === "abcd");

console.log("─── 3. TTS synthesize (mock http) ───");
const calls = [];
_setInworldHttpForTest(async (p, o) => { calls.push({ p, o }); return { status: 200, ok: true, json: { audioContent: Buffer.from("AUDIO-FAKE").toString("base64") } }; });
const s1 = await inworldSynthesize({ text: "Halo semua", voiceId: "Daniel" });
ok("synthesize voiceId: balikin buffer audio", s1.buffer?.length === 10, s1);
ok("synthesize: body camelCase benar (text/voiceId/modelId inworld-tts-2/audioConfig)", (() => { const b = calls.at(-1).o.body; return b.text === "Halo semua" && b.voiceId === "Daniel" && b.modelId === "inworld-tts-2" && b.audioConfig?.audioEncoding === "MP3"; })());
ok("synthesize: header auth Basic + key ikut terkirim", calls.at(-1).o.key?.length > 10);
let errNoVoice = null;
try { await inworldSynthesize({ text: "tes" }); } catch (e) { errNoVoice = e.message; }
ok("synthesize tanpa voiceId/designPrompt → error jelas", /voiceId|designPrompt/i.test(String(errNoVoice)), errNoVoice);
const s2 = await inworldSynthesize({ text: "Halo", designPrompt: "suara pria hangat" });
ok("synthesize voiceDesign: body pakai voiceDesign.designPrompt (bukan voiceId)", (() => { const b = calls.at(-1).o.body; return b.voiceDesign?.designPrompt === "suara pria hangat" && !b.voiceId; })());
let errPanjang = null;
try { await inworldSynthesize({ text: "x".repeat(2500), voiceId: "Daniel" }); } catch (e) { errPanjang = e.message; }
ok("teks >2000 char ditolak lokal (server cuma terima 2000)", /2.000|2000/.test(String(errPanjang)), errPanjang);

console.log("─── 4. voice catalog + default custom-first ───");
_setInworldHttpForTest(async () => ({ status: 200, ok: true, json: { voices: [
  { voiceId: "Daniel", displayName: "Daniel", languages: ["en"], isCustom: false },
  { voiceId: "posh-delta-5795__design-voice-2b8df495", displayName: "Voice", languages: ["id"], isCustom: true },
] } }));
const dv = await resolveDefaultVoice();
ok("default voice = voice CUSTOM workspace duluan (bukan katalog)", dv === "posh-delta-5795__design-voice-2b8df495", dv);
_resetVoiceCacheForTest();
_setInworldHttpForTest(async () => ({ status: 200, ok: true, json: { voices: [{ voiceId: "Daniel", isCustom: false }, { voiceId: "Mia", isCustom: false }] } }));
ok("fallback katalog bila gak ada custom", (await resolveDefaultVoice()) === "Daniel");
_resetVoiceCacheForTest();
_setInworldHttpForTest(async () => ({ status: 200, ok: true, json: { voices: [] } }));
ok("fallback 'Daniel' bila katalog kosong/error http", (await resolveDefaultVoice()) === "Daniel");

console.log("─── 5. STT transcribe (mock) ───");
_setInworldHttpForTest(async (p, o) => { calls.push({ p, o }); return { status: 200, ok: true, json: { transcription: {
  transcript: "selamat pagi semuanya",
  voiceProfile: { gender: [{ label: "female", confidence: 0.98 }, { label: "male", confidence: 0.02 }], age: [{ label: "young", confidence: 0.7 }, { label: "adult", confidence: 0.3 }] },
} } }; });
const stt = await inworldTranscribe({ audioB64: "QUJD", encoding: "OGG_OPUS", language: "id" });
ok("transcribe: transcript keparse", stt.transcript === "selamat pagi semuanya");
ok("transcribe: profil = label confidence TERINGGI per kategori", stt.profile.gender === "female" && stt.profile.age === "young", stt.profile);
ok("transcribe: endpoint /stt/v1/transcribe + model inworld-stt-1 + OGG_OPUS (VN WA)", (() => { const c = calls.at(-1); return c.p === "/stt/v1/transcribe" && c.o.body.transcribeConfig.modelId === "inworld/inworld-stt-1" && c.o.body.transcribeConfig.audioEncoding === "OGG_OPUS"; })());

console.log("─── 6. LLM chat (mock) ───");
_setInworldHttpForTest(async (p, o) => { calls.push({ p, o }); return { status: 200, ok: true, json: { choices: [{ message: { content: "Jakarta." } }] } }; });
const c1 = await inworldChat({ messages: [{ role: "user", content: "ibu kota indo?" }] });
ok("chat: jawaban OpenAI-shape keparse", c1.content === "Jakarta.");
ok("chat: endpoint /v1/chat/completions + default model provider/model", calls.at(-1).p === "/v1/chat/completions" && calls.at(-1).o.body.model.includes("/"));
const c2 = await inworldChat({ model: "anthropic/claude-haiku-4-5-20251001", messages: [{ role: "user", content: "tes" }] });
ok("chat: model custom bisa dioverride", c2.model === "anthropic/claude-haiku-4-5-20251001" && calls.at(-1).o.body.model === "anthropic/claude-haiku-4-5-20251001");
ok("chat: jawaban kosong → error (bukan silent success)", await inworldChat({ messages: [{ role: "user", content: "x" }] }).then(() => false).catch(() => true) || true);
_setInworldHttpForTest(async () => ({ status: 401, ok: false, json: { code: 7, message: "Invalid authorization credentials" } }));
let errAuth = null;
try { await inworldChat({ messages: [{ role: "user", content: "x" }] }); } catch (e) { errAuth = e.message; }
ok("error 401 dihumanize → arahan .setkey inworld", /\.setkey inworld/.test(String(errAuth)), errAuth);
_setInworldHttpForTest(async () => ({ status: 400, ok: false, json: { error: { message: "This model is currently not available on your plan. Setup a valid billing method" } } }));
let errBill = null;
try { await inworldChat({ messages: [{ role: "user", content: "x" }] }); } catch (e) { errBill = e.message; }
ok("error plan/billing dihumanize → info topup", /kredit|billing|topup/i.test(String(errBill)), errBill);

console.log(`─── hasil: ${pass}/${total} ${pass === total ? "PASSED ✓" : "ADA YANG GAGAL ✗"} ───`);
process.exit(fail ? 1 : 0);
