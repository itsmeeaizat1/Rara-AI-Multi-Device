// E2E Surah alquran.cloud + VoiceMaker Haidar/Google (12 Sep 2026)
import path from "node:path";
const R = path.resolve(".");
import fs from "node:fs";

let pass = 0, fail = 0;
const out = (s) => process.stdout.write(s + "\n");
const t = (label, cond, extra) => { if (cond) { pass++; out("✅ " + label); } else { fail++; out("❌ " + label + (extra ? " — " + extra : "")); } };

// ── 1. alquran.cloud live + mapping (logika sama persis plugin) ──
out("— surah: alquran.cloud —");
const no = 114;
const eq = await (await fetch(`https://api.alquran.cloud/v1/surah/${no}/editions/quran-uthmani,en.transliteration,id.indonesian`)).json();
t("1. API balik 3 edisi", eq.code === 200 && Array.isArray(eq.data) && eq.data.length === 3);
const [ar, lat, idn] = eq.data;
const data = ar.ayahs.map((a, i) => ({ no: a.numberInSurah, arab: a.text, latin: lat.ayahs[i]?.text || "", indo: idn.ayahs[i]?.text || "" }));
t("2. mapping {no, arab, latin, indo}", data.length === 6 && data[0].no === 1 && /[\u0600-\u06FF]/.test(data[0].arab) && data[0].latin.length > 3 && data[0].indo.length > 3);
const eqBad = await (await fetch("https://api.alquran.cloud/v1/surah/999/editions/quran-uthmani,en.transliteration,id.indonesian")).json();
t("3. surah gak valid ditolak API", eqBad.code === 404 || eqBad.status === 404);

// ── 2. handler islami surah live ──
out("\n— handler .surah 114 —");
const replies = [];
let reacted = "";
const mockM = {
  command: "surah", text: "114", prefix: ".", chat: "x@s.whatsapp.net",
  react: async (r) => { reacted = r; return { key: { id: "r" } }; },
  reply: async (txt) => { replies.push(String(txt)); return { key: { id: "r" } }; },
};
const islami = await import(R + "/plugins/islami/islami.js");
try {
  await islami.handler(mockM, { sock: {} });
  const rep = replies.at(-1) || "";
  t("4. handler render ayat 1-6", rep.includes("Ayat 1") && rep.includes("Ayat 6") && rep.includes("قُلْ"), rep.slice(0, 90));
  t("5. react selesai", reacted === "🐣", reacted);
} catch (e) { t("4. handler render", false, String(e).slice(0, 100)); t("5. react", false); }

// nomor invalid
replies.length = 0; reacted = "";
mockM.text = "999";
try {
  await islami.handler(mockM, { sock: {} });
  t("6. nomor invalid ditolak plugin", /1-114/.test(replies.at(-1) || ""), String(replies.at(-1)).slice(0, 60));
} catch (e) { t("6. nomor invalid", false, String(e).slice(0, 100)); }
t("7. islami.js gak nyamber siputzx lagi", !fs.readFileSync(R + "/plugins/islami/islami.js", "utf-8").includes("siputzx"));

// ── 3. voicemaker ──
out("\n— voicemaker: haidar + google fallback —");
const vmSrc = fs.readFileSync(R + "/plugins/tts/voicemaker.js", "utf-8");
t("8. semua VOICES punya mapping haidar", (vmSrc.match(/haidar: "/g) || []).length === 6);
t("9. haidarTTS dipanggil dulu, google fallback", vmSrc.indexOf("haidarTTS") < vmSrc.indexOf("translate_tts"));
t("10. route siputzx tts udah gak dipake", !/api\.siputzx/.test(vmSrc));
// google TTS fallback live (free)
const gtts = await fetch("https://translate.google.com/translate_tts?ie=UTF-8&tl=id&client=tw-ob&q=" + encodeURIComponent("tes suara"), { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15000) });
const gbuf = Buffer.from(await gtts.arrayBuffer());
t("11. google tts fallback hidup", gtts.ok && gbuf.length > 2000, `status=${gtts.status} size=${gbuf.length}`);

// live pipeline voicemaker (1x haidar TTS kecil — pola .suaraai)
const vm = await import(R + "/plugins/tts/voicemaker.js");
let sent = null;
const mockSock = { sendMessage: async (chat, content) => { sent = content; return { key: { id: "a" } }; } };
const vmM = {
  command: "voicemaker", text: "id-ID-GadisNeural tes", prefix: ".", chat: "x@s.whatsapp.net",
  react: async () => ({}), reply: async (txt) => { replies.push(String(txt)); return { key: { id: "r" } }; },
};
try {
  await vm.handler(vmM, { sock: mockSock });
  t("12. pipeline voicemaker kirim audio (live haidar/fallback)", !!sent?.audio && sent.audio.length > 2000 && sent.mimetype === "audio/mpeg", sent ? `size=${sent.audio.length}` : String(replies.at(-1)).slice(0, 80));
} catch (e) { t("12. pipeline voicemaker", false, String(e).slice(0, 100)); }

out(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
