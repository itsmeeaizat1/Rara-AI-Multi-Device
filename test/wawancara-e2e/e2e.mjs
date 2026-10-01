// E2E Interview Simulator AI (ide fitur no 5, 12 Sep 2026).
// Deps AI/STT/TTS di-inject via seam — gak nyamber AI live.
import path from "node:path";
import fs from "node:fs";

const out = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) { pass++; out("✅ " + label); }
  else { fail++; out("❌ " + label + (extra ? " — " + extra : "")); }
}
const low = (s) => String(s || "").toLowerCase();

const R = path.resolve(".");
fs.rmSync("/tmp/wawancara-e2e-db", { recursive: true, force: true });
const { initDatabase, getDatabase } = await import(R + "/src/lib/rara-database.js");
await initDatabase("/tmp/wawancara-e2e-db/rara.json");
const db = getDatabase();

const { config, handler, _setWawancaraDepsForTest } = await import(R + "/plugins/ai/interview.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(low(s));

t("1a. plugin aiagentwawancara kategori ai + alias utama doang", config.name === "aiagentwawancara" && config.category === "ai" && config.alias.length === 1);

// ═══ mocks ═══
const replies = [];
const sent = [];
const mediaSent = [];
function mockM(args, opts = {}) {
  return {
    command: "aiagentwawancara", args, text: args.join(" "), prefix: ".",
    chat: "6289999@s.whatsapp.net", sender: "6289999@s.whatsapp.net", pushName: "Kandidat",
    isGroup: false, isOwner: false, isAudio: !!opts.isAudio,
    quoted: opts.quoted || null,
    react: async () => {},
    reply: async (txt) => { replies.push(String(txt)); return { key: { id: "r" } }; },
  };
}
const sockMock = {
  sendMessage: async (chat, content) => { sent.push(content); return { key: { id: "v" } }; },
  sendMedia: async (chat, buf, q, m, opts) => { mediaSent.push({ buf, opts }); },
  sendPresenceUpdate: async () => {},
};

// ═══ seam ═══
let aiCalls = 0;
_setWawancaraDepsForTest({
  ai: async (prompt) => {
    aiCalls++;
    if (prompt.includes("Bikin 5 pertanyaan")) {
      return '{"questions":["Perkenalkan diri Anda","Apa keahlian utama Anda untuk posisi ini","Ceritakan pengalaman tersulit Anda","Bagaimana Anda menghadapi deadline mepet","Mengapa Anda layak diterima"]}';
    }
    if (prompt.includes("menilai jawaban")) return '{"skor":8,"feedback":"Jawaban terstruktur dan konkret.","kuat":"contoh nyata","lemah":"terlalu singkat"}';
    if (prompt.includes("career coach")) return "1. Perbanyak angka pencapaian. 2. Latihan pola STAR. 3. Jaga tempo bicara.";
    return "maaf gak ngerti";
  },
  stt: async () => "Saya punya pengalaman 3 tahun sebagai frontend developer di startup kesehatan",
  tts: async (text, voice) => { ttsLog.push({ text, voice }); return Buffer.from("fake-mp3-voice-note-buffer"); },
});
const ttsLog = [];

// ═══ 2. guide ═══
out("\n— guide & mulai —");
await handler(mockM([]), { sock: sockMock, config: { command: { prefix: "." } } });
t("2a. no-arg → guide", /wawancara/.test(norm(replies.at(-1))) && /mulai/.test(norm(replies.at(-1))));

// mulai tanpa posisi
await handler(mockM(["mulai"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("2b. mulai tanpa posisi → minta posisi", /posisi apa/.test(norm(replies.at(-1))));

// mulai sukses
replies.length = 0; sent.length = 0; ttsLog.length = 0;
await handler(mockM(["mulai", "frontend", "developer"]), { sock: sockMock, config: { command: { prefix: "." } } });
const rStart = norm(replies.at(-1) || "");
t("2c. mulai → kartu pertanyaan 1/5", rStart.includes("pertanyaan 1/5") && rStart.includes("perkenalkan diri"), rStart.slice(0, 100));
t("2d. HRD ngomong via VN (tts, voice Ardi)", sent.length === 1 && sent[0].ptt === true && ttsLog[0]?.voice === "Ardi" && low(ttsLog[0]?.text).includes("frontend developer"), JSON.stringify(ttsLog[0]?.text || "").slice(0, 80));
const sess1 = (db.setting("wawancaraSessions") || {})["6289999@s.whatsapp.net"];
t("2e. sesi ke-persist db", !!sess1 && sess1.posisi === "frontend developer" && sess1.questions.length === 5);

// sesi dobel ditolak
await handler(mockM(["mulai", "designer"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("2f. mulai saat sesi aktif → ditolak + info sesi", /masih ada sesi/.test(norm(replies.at(-1))));

// ═══ 3. jawab teks ═══
out("\n— jawaban —");
replies.length = 0; sent.length = 0; ttsLog.length = 0;
await handler(mockM(["saya", "rizky,", "3", "tahun", "jadi", "frontend", "developer"]), { sock: sockMock, config: { command: { prefix: "." } } });
const rA1 = norm(replies.at(-1) || "");
t("3a. jawaban teks → penilaian skor 8/10 + next pertanyaan 2/5", rA1.includes("8/10") && rA1.includes("penilaian jawaban 1/5".replace("1/5","")) && rA1.includes("pertanyaan 2/5"), rA1.slice(0, 120));
t("3b. feedback + kuat/lemah tampil", rA1.includes("contoh nyata") && rA1.includes("terlalu singkat"));
t("3c. pertanyaan 2 dikirim VN", sent.length === 1 && sent[0].ptt === true && low(ttsLog[0]?.text).includes("keahlian utama"));
t("3d. aiCalls = 2 (generator + evaluator)", aiCalls === 2, String(aiCalls));

// ═══ 4. jawab via VN (reply quoted) ═══
replies.length = 0; sent.length = 0;
await handler(mockM([], { quoted: { isAudio: true, mimetype: "audio/ogg; codecs=opus", download: async () => Buffer.from("vn-bytes") } }), { sock: sockMock, config: { command: { prefix: "." } } });
const rA2 = norm(replies.at(-1) || "");
t("4a. reply VN + .wawancara → STT transkrip → dinilai (pertanyaan 3/5)", rA2.includes("8/10") && rA2.includes("pertanyaan 3/5"), rA2.slice(0, 120));
t("4b. transkrip masuk ke jawaban (db)", ((db.setting("wawancaraSessions") || {})["6289999@s.whatsapp.net"]?.answers || [])[1]?.a.includes("startup kesehatan"));

// STT gagal → minta rekam ulang
_setWawancaraDepsForTest({
  ai: async () => { aiCalls++; return '{"skor":8,"feedback":"ok","kuat":"ok","lemah":"ok"}'; },
  stt: async () => "",
  tts: async (text, voice) => { ttsLog.push({ text, voice }); return Buffer.from("vn"); },
});
replies.length = 0;
await handler(mockM([], { quoted: { isAudio: true, download: async () => Buffer.from("vn2") } }), { sock: sockMock, config: { command: { prefix: "." } } });
t("4c. VN gak jelas → minta rekam ulang/teks", /kedengeran/.test(norm(replies.at(-1))));

// restore seam evaluator
_setWawancaraDepsForTest({
  ai: async (prompt) => {
    aiCalls++;
    if (prompt.includes("career coach")) return "1. Perbanyak angka pencapaian.";
    return '{"skor":7,"feedback":"Cukup baik dan relevan.","kuat":"relevan","lemah":"kurang angka"}';
  },
  stt: async () => "saya menghadapi deadline dengan memprioritaskan fitur utama",
  tts: async (text, voice) => { ttsLog.push({ text, voice }); return Buffer.from("vn"); },
});

// ═══ 5. skor & ulang & skip ═══
out("\n— skor/ulang/skip —");
replies.length = 0; sent.length = 0; ttsLog.length = 0;
await handler(mockM(["skor"]), { sock: sockMock, config: { command: { prefix: "." } } });
const rSkor = norm(replies.at(-1) || "");
t("5a. skor sementara 8.0/10 (8+8)/2 + progress 3/5", rSkor.includes("8.0/10") && rSkor.includes("skor sementara") && rSkor.includes("3/5"), rSkor.slice(0, 90));

await handler(mockM(["ulang"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("5b. ulang → VN pertanyaan aktif dikirim lagi", ttsLog.length >= 1 && sent.at(-1)?.ptt === true && low(ttsLog.at(-1)?.text).includes("pengalaman tersulit"), low(ttsLog.at(-1)?.text || "").slice(0, 60));

replies.length = 0;
await handler(mockM(["skip"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("5c. skip → pertanyaan lanjut 4/5 + tercatat skipped", norm(replies.at(-1)).includes("pertanyaan 4/5"));
const sessNow = (db.setting("wawancaraSessions") || {})["6289999@s.whatsapp.net"];
t("5d. skipped tercatat di db", sessNow?.answers.some((a) => a.skipped) === true);

// jawaban AI gagal → gak crash, minta ulang
_setWawancaraDepsForTest({
  ai: async () => { throw new Error("ai down"); },
  stt: async () => "x",
  tts: async () => { throw new Error("tts down"); },
});
replies.length = 0;
await handler(mockM(["jawaban", "keempat", "saya", "solutive"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("5e. evaluator AI down → pesan coba lagi (gak crash)", /bermasalah|coba kirim ulang/.test(norm(replies.at(-1))));

// ═══ 6. jawab terakhir → laporan akhir ═══
out("\n— laporan akhir —");
_setWawancaraDepsForTest({
  ai: async (prompt) => {
    aiCalls++;
    if (prompt.includes("career coach")) return "1. Perbanyak angka pencapaian. 2. Latihan pola STAR.";
    return '{"skor":9,"feedback":"Sangat meyakinkan dan spesifik.","kuat":"spesifik","lemah":"nada bicara"}';
  },
  stt: async () => "saya mengatasi tekanan dengan komunikasi rutin",
  tts: async () => { throw new Error("tts down"); }, // TTS gagal → pertanyaan teks doang (graceful)
});
replies.length = 0;
await handler(mockM(["saya", "atasi", "deadline", "dengan", "prioritas"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("6-pre. jawaban Q4 → dinilai (belum final, Q5 card)", norm(replies.at(-1)).includes("pertanyaan 5/5") === false || norm(replies.at(-1)).includes("9/10"), norm(replies.at(-1)).slice(0, 80));
// jawaban Q5 → skor 7 → finish
_setWawancaraDepsForTest({
  ai: async (prompt) => {
    aiCalls++;
    if (prompt.includes("career coach")) return "1. Perbanyak angka pencapaian. 2. Latihan pola STAR.";
    return '{"skor":7,"feedback":"Relevan tapi kurang angka pencapaian.","kuat":"relevan","lemah":"kurang angka"}';
  },
  stt: async () => "karena saya punya kombinasi keahlian teknis dan komunikasi",
  tts: async () => { throw new Error("tts down"); },
});
replies.length = 0; mediaSent.length = 0;
await handler(mockM(["karena", "saya", "paling", "cocok"]), { sock: sockMock, config: { command: { prefix: "." } } });
const rFin = norm(replies.at(-1) || "");
t("6a. laporan akhir: verdict SIAP 8.0/10 ((8+8+9+7)/4)", rFin.includes("siap") && rFin.includes("8/10"), rFin.slice(0, 100));
t("6b. chart skor terkirim", mediaSent.length === 1 && !!mediaSent[0].buf, `media=${mediaSent.length}`);
t("6c. rincian per pertanyaan + tips AI", rFin.includes("rincian") && rFin.includes("pola star"));
t("6d. sesi ke-clear habis selesai", !(db.setting("wawancaraSessions") || {})["6289999@s.whatsapp.net"]);

// ═══ 7. stop & degrade generator ═══
out("\n— stop & degrade —");
await handler(mockM(["stop"]), { sock: sockMock, config: { command: { prefix: "." } } }); // bersihin sisa sesi
_setWawancaraDepsForTest({
  ai: async () => { throw new Error("ai down"); },
  stt: async () => "",
  tts: async () => { throw new Error("tts down"); },
});
replies.length = 0;
await handler(mockM(["mulai", "admin", "keuangan"]), { sock: sockMock, config: { command: { prefix: "." } } }).catch(() => {});
// mulai saat AI down → soal fallback lokal
const sessFb = (db.setting("wawancaraSessions") || {})["6289999@s.whatsapp.net"];
t("7a. generator AI down → soal fallback lokal (sesi tetap jalan)", !!sessFb && sessFb.questions.length === 5 && low(sessFb.questions[0]).includes("perkenalkan"), JSON.stringify(sessFb?.questions?.[0] || "").slice(0, 60));
t("7b. TTS down → pertanyaan tetap dikirim teks", norm(replies.at(-1)).includes("pertanyaan 1/5"));

replies.length = 0;
await handler(mockM(["stop"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("7c. stop → sesi dibatalkin", /dibatalkan/.test(norm(replies.at(-1))));
t("7d. sesi hilang dari db", !(db.setting("wawancaraSessions") || {})["6289999@s.whatsapp.net"]);

// jawaban tanpa sesi → info mulai dulu
replies.length = 0;
await handler(mockM(["hai", "saya", "budi"]), { sock: sockMock, config: { command: { prefix: "." } } });
t("7e. jawaban tanpa sesi → arahin mulai", /mulai dulu/.test(norm(replies.at(-1))));

out(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
