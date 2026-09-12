// E2E .aiclotheschanger (12 Sep 2026): ganti baju via AI — mode PROMPT (reply foto + teks)
// + mode GAMBAR (reply foto orang + kirim gambar baju). Engine + vision di-inject via seam.
import path from "node:path";

const out = (s) => process.stdout.write(s + "\n");
let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) { pass++; out("✅ " + label); }
  else { fail++; out("❌ " + label + (extra ? " — " + extra : "")); }
}

const R = path.resolve(".");
const { initDatabase, getDatabase } = await import(R + "/src/lib/nova-database.js");
await initDatabase("/tmp/clothes-e2e-db/nova.json");
const db = getDatabase();

const { config, handler, buildEditPrompt, parseClothesDesc, expandPreset, parseHdFlag, PRESET_STYLES, HAIR_PRESETS, buildAgePrompt, buildHairPrompt, buildGenderPrompt, buildBgPrompt, buildRemovePrompt, buildFaceSwapPrompt, parseFaceDesc, _setClothesDepsForTest } = await import(R + "/plugins/ai/clotheschanger.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(String(s || ""));

t("1a. plugin name aiclotheschanger + kategori ai image", config.name === "aiclotheschanger" && config.category === "ai image");
t("1b. alias keluarga fitur (revisi owner: tambah kata di akhir)", JSON.stringify(config.alias) === JSON.stringify(["aiclotheschanger", "aiclotheschangerfaceswap", "aiclotheschangerage", "aiclotheschangerhair", "aiclotheschangergender", "aiclotheschangerbg", "aiclotheschangerhapus"]));

// ═══ 2. buildEditPrompt ═══
out("\n— buildEditPrompt —");
const p1 = buildEditPrompt("change the shirt to red", null);
t("2a. mode prompt: target + jaga wajah/pose/background", p1.includes("Change the person's outfit to: change the shirt to red") && /face, identity/.test(p1) && /background must stay EXACTLY the same/.test(p1));
const p2 = buildEditPrompt("", "navy blue business suit, wool, slim fit");
t("2b. mode gambar: pakai deskripsi referensi", p2.includes("match this reference: navy blue business suit") && !p2.includes("Additional detail"));
const p3 = buildEditPrompt("make it short sleeve", "floral summer dress, cotton");
t("2c. mode gambar + prompt tambahan", p3.includes("match this reference") && p3.includes("Additional detail from user: make it short sleeve"));
t("2d. photorealistic always", p1.includes("Photorealistic") && p2.includes("Photorealistic"));

// ═══ 3. parseClothesDesc ═══
out("\n— parseClothesDesc —");
t("3a. deskripsi valid", parseClothesDesc("A red hoodie with white drawstrings, cotton fabric, oversized fit.") === "A red hoodie with white drawstrings, cotton fabric, oversized fit.");
t("3b. BUKAN_BAJU → null", parseClothesDesc("BUKAN_BAJU") === null);
t("3c. BUKAN_BAJU di tengah teks → null", parseClothesDesc("Sorry, BUKAN_BAJU is what I reply") === null);
t("3d. terlalu pendek → null", parseClothesDesc("baju") === null);
t("3e. strip code fence + quote", parseClothesDesc('```text\n"denim jacket"\n```') === "denim jacket");
t("3f. teks kosong → null", parseClothesDesc("") === null);
t("3g. cap 600 char", parseClothesDesc("x".repeat(800)).length === 600);

// ═══ 4. handler — mock infra ═══
out("\n— handler flow —");
const replies = [];
const sent = [];
const reactions = [];
const IMG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Buffer.alloc(1500, 7)]);
function mockM(opts = {}) {
  return {
    command: opts.command || "aiclotheschanger", args: opts.args || [], text: opts.text || "",
    prefix: ".", chat: "62812@s.whatsapp.net", sender: "62812@s.whatsapp.net", pushName: "T",
    isGroup: false, isOwner: false,
    isImage: !!opts.isImage, isMedia: !!opts.isImage,
    quoted: opts.quoted || null,
    download: async () => opts.downloadBuf || IMG,
    react: async (r) => { reactions.push(r); },
    reply: async (txt) => { replies.push(norm(txt)); return { key: { id: "r" } }; },
  };
}
function quotedMock() {
  return { isMedia: true, isImage: true, type: "imageMessage", download: async () => IMG };
}
const sockMock = {
  sendMedia: async (chat, buf, q, m, o) => { sent.push({ chat, buf, opts: o }); },
  sendMessage: async () => {},
};

// ── 4a. tanpa foto → guide ──
await handler(mockM({ args: ["change", "the", "shirt"], text: "change the shirt to red" }), { sock: sockMock });
const g1 = replies.at(-1) || "";
t("4a. tanpa foto → guide cara pakai", g1.includes("reply foto orang") && g1.includes(".aiclotheschanger") && g1.includes("change the shirt to red"));

// ── 4b. foto + prompt → engine dipanggil + hasil dikirim ──
let engineCalls = [];
_setClothesDepsForTest({
  vision: async () => ({ status: false }),
  live3d: async (buf, prompt) => { engineCalls.push({ engine: "live3d", prompt }); return { image: Buffer.from("editedimg-data-123") }; },
});
await handler(mockM({ isImage: true, args: ["change", "shirt"], text: "change the shirt to red" }), { sock: sockMock });
t("4b1. engine live3d dipanggil dengan prompt engineering", engineCalls.length === 1 && engineCalls[0].engine === "live3d" && /Change the person's outfit to: change the shirt to red/.test(engineCalls[0].prompt));
t("4b2. hasil dikirim via sendMedia + caption engine", sent.length === 1 && !!sent[0].opts.caption && sent[0].opts.caption.includes("nano-banana"));
t("4b3. caption sumber prompt", norm(sent[0].opts.caption).includes("prompt"));
t("4b4. react 🐣 sukses", reactions.at(-1) === "🐣");

// ── 4c. fallback chain: live3d gagal → kuroneko ──
engineCalls = [];
_setClothesDepsForTest({
  vision: async () => ({ status: false }),
  live3d: async () => { throw new Error("live3d down"); },
  uguu: async () => "https://uguu.test/x.jpg",
  nanoBanana: async (url, prompt) => { engineCalls.push({ engine: "kuroneko", url, prompt }); return "https://kuroneko.test/edited.jpg"; },
});
const axiosMod = (await import("axios")).default;
// intercept axios download di dalam kuronekoEdit via axios mock gampang: pakai data: URL gak bisa — pakai URL http ke lokal mock? → cukup pastikan img2img gak kepanggil & kuroneko kepanggil; axios.get bakal gagal download → jatuh ke img2img.
const origGet = axiosMod.get;
axiosMod.get = async () => ({ data: Buffer.alloc(10000, 9) });
await handler(mockM({ isImage: true, text: "jas hitam" }), { sock: sockMock });
axiosMod.get = origGet;
t("4c1. live3d gagal → kuroneko jalan", engineCalls.some((c) => c.engine === "kuroneko"));
t("4c2. caption engine kuronoko", (sent.at(-1)?.opts?.caption || "").includes("kuronoko"));

// ── 4d. semua engine gagal → error sopan ──
_setClothesDepsForTest({
  vision: async () => ({ status: false }),
  live3d: async () => { throw new Error("down"); },
  uguu: async () => { throw new Error("down"); },
  img2img: async () => { throw new Error("down"); },
});
await handler(mockM({ isImage: true, text: "kaos putih" }), { sock: sockMock });
t("4d. semua engine down → pesan error + react ❌", (replies.at(-1) || "").includes("down") && reactions.at(-1) === "❌");

// ── 4e. mode gambar: reply foto orang + attachment gambar baju ──
let visionCalls = [];
engineCalls = [];
_setClothesDepsForTest({
  vision: async (o) => { visionCalls.push(o); return { status: true, text: "Navy blue business suit, wool, slim fit, white shirt inside." }; },
  live3d: async (buf, prompt) => { engineCalls.push({ prompt }); return { image: Buffer.from("ok") }; },
});
await handler(mockM({
  isImage: true, text: "", args: [],
  quoted: quotedMock(),
  downloadBuf: Buffer.alloc(600, 3),
}), { sock: sockMock });
t("4e1. vision dipanggil buat gambar baju", visionCalls.length === 1 && !!visionCalls[0].imageBuffer);
t("4e2. engine prompt pakai deskripsi referensi", engineCalls.length === 1 && /match this reference: Navy blue business suit/.test(engineCalls[0].prompt));
t("4e3. caption sumber gambar baju", norm(sent.at(-1)?.opts?.caption || "").includes("gambar baju"));
t("4e4. tanpa prompt pun jalan (mode gambar)", reactions.at(-1) === "🐣");

// ── 4f. gambar baju BUKAN baju → error sopan ──
_setClothesDepsForTest({
  vision: async () => ({ status: true, text: "BUKAN_BAJU" }),
  live3d: async () => { throw new Error("gak boleh kepanggil"); },
});
await handler(mockM({ isImage: true, text: "", quoted: quotedMock() }), { sock: sockMock });
t("4f. gambar bukan baju → error + engine gak dipanggil", (replies.at(-1) || "").includes("baju") && reactions.at(-1) === "❌");

// ── 4g. vision down + ada gambar baju → saran pakai prompt ──
_setClothesDepsForTest({
  vision: async () => ({ status: false, error: "timeout" }),
  live3d: async () => { throw new Error("gak boleh kepanggil"); },
});
await handler(mockM({ isImage: true, text: "", quoted: quotedMock() }), { sock: sockMock });
t("4g. vision down → saran pakai prompt", (replies.at(-1) || "").includes("prompt") && reactions.at(-1) === "❌");

// ── 4h. foto orang tanpa prompt & tanpa gambar baju → guide ──
_setClothesDepsForTest({ vision: async () => ({ status: true, text: "x" }) });
await handler(mockM({ isImage: true, text: "" }), { sock: sockMock });
const gh = replies.at(-1) || "";
t("4h. foto tanpa prompt/tanpa gambar baju → guide dua mode", gh.includes("prompt") && gh.includes("gambar") && reactions.at(-1) === "❌");

// ── 4i. react loading 🧠 (start) ──
t("4i. react loading 🧠 pernah muncul", reactions.includes("🧠"));


// ═══ 6. preset gaya + flag HD ═══
out("\n— preset gaya —");
const e1 = expandPreset("formal");
t("6a. preset formal → outfit lengkap + tag suit", e1.preset === "formal" && e1.expanded.includes("tailored dark suit"));
const e2 = expandPreset("formal warna biru");
t("6b. preset + detail tambahan nempel", e2.expanded.includes("tailored dark suit") && e2.expanded.includes("warna biru"));
const e3 = expandPreset("resmi");
t("6c. alias indonesia resmi → formal", e3.preset === "resmi" && e3.expanded.includes("suit"));
const e4 = expandPreset("change the shirt to red");
t("6d. bukan preset → teks utuh", e4.preset === "" && e4.expanded === "change the shirt to red");
t("6e. 20+ preset terdaftar (ID+EN)", Object.keys(PRESET_STYLES).length >= 20);
t("6f. preset kosong aman", expandPreset("").expanded === "");

out("\n— flag hd —");
t("6g. hd → polish + prompt bersih", parseHdFlag("hd change shirt to red").hd === "polish" && parseHdFlag("hd change shirt to red").prompt === "change shirt to red");
t("6h. hd2 → 2x", parseHdFlag("hd2 formal").hd === "2x" && parseHdFlag("hd2 formal").prompt === "formal");
t("6k. 2k → 2x, 4k → 2x", parseHdFlag("formal 2k").hd === "2x" && parseHdFlag("4k formal").hd === "2x");
t("6i. tanpa flag → hd kosong", parseHdFlag("formal").hd === "");
t("6j. flag case-insensitive", parseHdFlag("HD Formal").hd === "polish");

out("\n— handler preset + hd —");
// preset formal tanpa hd → engine prompt pakai outfit formal
let engineCalls2 = [];
_setClothesDepsForTest({
  vision: async () => ({ status: false }),
  live3d: async (buf, prompt) => { engineCalls2.push({ prompt }); return { image: Buffer.alloc(2000, 5) }; },
});
await handler(mockM({ isImage: true, text: "formal" }), { sock: sockMock });
t("6k. preset formal → engine prompt outfit suit", engineCalls2.length === 1 && /tailored dark suit/.test(engineCalls2[0].prompt));

// hd flag → polish dipanggil, caption ada HD
let hdCalls = [];
_setClothesDepsForTest({
  vision: async () => ({ status: false }),
  live3d: async (buf, prompt) => { engineCalls2.push({ prompt }); return { image: Buffer.alloc(2000, 5) }; },
  polish: async (buf) => { hdCalls.push("polish"); return Buffer.alloc(3000, 6); },
  upscale: async (buf, f) => { hdCalls.push("upscale" + f); return Buffer.alloc(4000, 7); },
});
await handler(mockM({ isImage: true, text: "hd casual" }), { sock: sockMock });
t("6l. hd → polish kepanggil + caption HD", hdCalls.includes("polish") && norm(sent.at(-1)?.opts?.caption || "").includes("hd"));
t("6m. hd + preset → prompt casual + polish", engineCalls2.at(-1) && /casual everyday outfit/.test(engineCalls2.at(-1).prompt));

// hd2 → upscale 2x
hdCalls = [];
await handler(mockM({ isImage: true, text: "hd2 formal" }), { sock: sockMock });
t("6n. hd2 → upscale 2x kepanggil", hdCalls.includes("upscale2"));

// hd gagal → fail-safe kirim hasil asli
hdCalls = [];
_setClothesDepsForTest({
  vision: async () => ({ status: false }),
  live3d: async () => ({ image: Buffer.alloc(2000, 5) }),
  polish: async () => { throw new Error("ffmpeg hilang"); },
});
await handler(mockM({ isImage: true, text: "hd formal" }), { sock: sockMock });
t("6o. hd gagal → hasil asli tetap terkirim", sent.length > 0 && !!sent.at(-1)?.buf);

// mode gambar: preset diabaikan (desc yang ngatur)
engineCalls2 = [];
_setClothesDepsForTest({
  vision: async () => ({ status: true, text: "Red summer dress, cotton, midi length." }),
  live3d: async (buf, prompt) => { engineCalls2.push({ prompt }); return { image: Buffer.alloc(2000, 5) }; },
});
await handler(mockM({ isImage: true, text: "formal", quoted: quotedMock(), downloadBuf: Buffer.alloc(600, 3) }), { sock: sockMock });
t("6p. mode gambar: desc menang, preset gak di-expand", engineCalls2.length === 1 && /match this reference: Red summer dress/.test(engineCalls2[0].prompt) && !/tailored dark suit/.test(engineCalls2[0].prompt));

// usage guide kasih daftar preset + hd
_setClothesDepsForTest({ vision: async () => ({ status: false }) });
await handler(mockM({ args: ["formal"], text: "formal" }), { sock: sockMock });
const gU = replies.at(-1) || "";
t("6q. usage tampilin preset + opsi hd", gU.includes("formal") && gU.includes("hd"));



// ═══ 7. preset baru + subcommand list preset ═══
out("\n— preset baru + list —");
const b1 = expandPreset("batik");
t("7a. preset batik → outfit batik parang", b1.preset === "batik" && /batik shirt/.test(b1.expanded) && /parang/.test(b1.expanded));
const b2 = expandPreset("kebaya");
t("7b. preset kebaya → kebaya + kain", b2.preset === "kebaya" && /kebaya/.test(b2.expanded) && /kain/.test(b2.expanded));
const b3 = expandPreset("beskap");
t("7c. preset beskap → beskap + blangkon", b3.preset === "beskap" && /blangkon/.test(b3.expanded));
const b4 = expandPreset("hd gamis");
t("7d. hd gamis → flag kepisah, gamis expandable", parseHdFlag("hd gamis").prompt === "gamis" && expandPreset("gamis").preset === "gamis");
t("7e. alias muslim = koko, muslimah = gamis", PRESET_STYLES.muslim === PRESET_STYLES.koko && PRESET_STYLES.muslimah === PRESET_STYLES.gamis);
t("7f. 30+ preset terdaftar", Object.keys(PRESET_STYLES).length >= 30);

// list preset: tanpa foto pun jalan
replies.length = 0;
await handler(mockM({ args: ["list", "preset"], text: "list preset" }), { sock: sockMock });
const gl = replies.at(-1) || "";
t("7g. .aiclotheschanger list preset → daftar muncul (tanpa foto)", gl.includes("batik") && gl.includes("formal") && gl.includes("kebaya"));
t("7h. list ada grup + contoh hd", gl.includes("tradisional") && gl.includes("hd batik"));
// alias list
replies.length = 0;
await handler(mockM({ args: ["daftar"], text: "daftar" }), { sock: sockMock });
t("7i. .aiclotheschanger daftar → list juga", (replies.at(-1) || "").includes("batik"));
replies.length = 0;
await handler(mockM({ args: ["preset", "list"], text: "preset list" }), { sock: sockMock });
t("7j. .aiclotheschanger preset list → list juga", (replies.at(-1) || "").includes("batik"));
// list gak manggil engine
let listEngine = 0;
_setClothesDepsForTest({ vision: async () => { listEngine++; return { status: false }; }, live3d: async () => { listEngine += 10; return {}; } });
replies.length = 0;
await handler(mockM({ args: ["list"], text: "list", isImage: true }), { sock: sockMock });
t("7k. list gak manggil engine walau ada foto", (replies.at(-1) || "").includes("batik") && listEngine === 0);



// ═══ 8. preset batch 3: seragam, kostum, era, budaya ═══
out("\n— preset batch 3 —");
t("8a. sekolah → seragam putih + dasi merah", expandPreset("sekolah").expanded.includes("white short-sleeve shirt"));
t("8b. pramuka → seragam coklat + scarf", expandPreset("pramuka").expanded.includes("Pramuka"));
t("8c. pengantin → wedding + veil", expandPreset("pengantin").expanded.includes("wedding outfit"));
t("8d. wedding = alias pengantin", PRESET_STYLES.wedding === PRESET_STYLES.pengantin);
t("8e. kimono/hanbok beda outfit", expandPreset("kimono").expanded.includes("kimono") && expandPreset("hanbok").expanded.includes("hanbok"));
t("8f. ninja → shinobi", expandPreset("ninja").expanded.includes("shinobi"));
t("8g. preset 90s & y2k ke-expand", expandPreset("90s").preset === "90s" && expandPreset("y2k").expanded.includes("Y2K"));
t("8h. militer = alias army", PRESET_STYLES.militer === PRESET_STYLES.army);
t("8i. 45+ preset terdaftar", Object.keys(PRESET_STYLES).length >= 45);
replies.length = 0;
await handler(mockM({ args: ["list", "preset"], text: "list preset" }), { sock: sockMock });
const gl3 = replies.at(-1) || "";
t("8j. list kasih grup baru", gl3.includes("seragam") && gl3.includes("era") && gl3.includes("sekolah") && gl3.includes("kimono"));
t("8k. alias baris ter-update", gl3.includes("militer") && gl3.includes("wedding"));



// ═══ 9. fitur keluarga .aiclotheschanger<fitur> ═══
out("\n— fitur keluarga (suffix command) —");

t("9a. buildAgePrompt tua/muda/angka", buildAgePrompt("tua").includes("70-year-old") && buildAgePrompt("muda").includes("20-year-old") && buildAgePrompt("60").includes("60-year-old"));
t("9b. buildAgePrompt anak/bayi/invalid", buildAgePrompt("anak").includes("8-year-old") && buildAgePrompt("bayi").includes("baby") && buildAgePrompt("") === null && buildAgePrompt("xyz") === null && buildAgePrompt("200") === null);
t("9c. buildHairPrompt preset pakis", buildHairPrompt("pakis").includes("two-block mullet"));
t("9d. buildHairPrompt bebas + detail nempel", buildHairPrompt("rambut merah miring").includes("rambut merah miring") && buildHairPrompt("botak ala artis").includes("bald head") && buildHairPrompt("botak ala artis").includes("ala artis"));
t("9e. buildGenderPrompt cewek/cowok/invalid", buildGenderPrompt("cewek").includes("a woman") && buildGenderPrompt("cowok").includes("a man") && buildGenderPrompt("kursi") === null);
t("9f. buildBgPrompt + buildRemovePrompt", buildBgPrompt("pantai bali").includes("pantai bali") && buildBgPrompt("") === null && buildRemovePrompt("kursi").includes("Remove the following") && buildRemovePrompt("") === null);
t("9g. buildFaceSwapPrompt + detail user", buildFaceSwapPrompt("young man, oval face, sharp eyes").includes("Replace the person's face") && buildFaceSwapPrompt("oval face", "jaga kacamata").includes("jaga kacamata"));
t("9h. parseFaceDesc BUKAN_WAJAH → null", parseFaceDesc("BUKAN_WAJAH") === null && parseFaceDesc("Young man, oval face shape, sharp brown eyes") !== null && parseFaceDesc("") === null);
t("9i. HAIR_PRESETS 10 preset rambut", Object.keys(HAIR_PRESETS).length === 10);

// handler dispatch — age
let ageCalls = [];
_setClothesDepsForTest({ vision: async () => ({ status: false }), live3d: async (buf, prompt) => { ageCalls.push({ prompt }); return { image: Buffer.alloc(2000, 5) }; } });
await handler(mockM({ command: "aiclotheschangerage", isImage: true, text: "tua" }), { sock: sockMock });
t("9j. .aiclotheschangerage tua → prompt umur 70", ageCalls.length === 1 && /70-year-old/.test(ageCalls[0].prompt));

// age invalid → guide
replies.length = 0;
await handler(mockM({ command: "aiclotheschangerage", isImage: true, text: "xyz" }), { sock: sockMock });
t("9k. age invalid → guide pilihan umur", (replies.at(-1) || "").includes("tua") && /1-100/.test(replies.at(-1) || ""));

// age tanpa foto → guide
replies.length = 0;
await handler(mockM({ command: "aiclotheschangerage", text: "tua" }), { sock: sockMock });
t("9l. age tanpa foto → guide kirim foto", (replies.at(-1) || "").toLowerCase().includes("foto"));

// hair preset via command
let hairCalls = [];
_setClothesDepsForTest({ vision: async () => ({ status: false }), live3d: async (buf, prompt) => { hairCalls.push({ prompt }); return { image: Buffer.alloc(2000, 5) }; } });
await handler(mockM({ command: "aiclotheschangerhair", isImage: true, text: "hd pakis" }), { sock: sockMock });
t("9m. .ai...changerhair hd pakis → prompt rambut + hd flag", hairCalls.length === 1 && /two-block mullet/.test(hairCalls[0].prompt));

// gender
let genCalls = [];
_setClothesDepsForTest({ vision: async () => ({ status: false }), live3d: async (buf, prompt) => { genCalls.push({ prompt }); return { image: Buffer.alloc(2000, 5) }; } });
await handler(mockM({ command: "aiclotheschangergender", isImage: true, text: "cewek" }), { sock: sockMock });
t("9n. .aiclotheschangergender cewek → prompt woman", genCalls.length === 1 && /a woman/.test(genCalls[0].prompt));

// bg + hapus
let bgCalls = [];
_setClothesDepsForTest({ vision: async () => ({ status: false }), live3d: async (buf, prompt) => { bgCalls.push({ prompt }); return { image: Buffer.alloc(2000, 5) }; } });
await handler(mockM({ command: "aiclotheschangerbg", isImage: true, text: "pantai bali" }), { sock: sockMock });
await handler(mockM({ command: "aiclotheschangerhapus", isImage: true, text: "kursi di belakang" }), { sock: sockMock });
t("9o. bg + hapus → prompt background & remove", bgCalls.length === 2 && /Replace the background/.test(bgCalls[0].prompt) && /Remove the following/.test(bgCalls[1].prompt));

// faceswap flow: reply target + kirim foto wajah → vision → edit target
let fsVision = [], fsEdit = [];
_setClothesDepsForTest({
  vision: async (a) => { fsVision.push(a.question); return { status: true, text: "Young man, 25, oval face, sharp brown eyes, thick eyebrows, tan skin" }; },
  live3d: async (buf, prompt) => { fsEdit.push({ buf, prompt }); return { image: Buffer.alloc(2000, 5) }; },
});
await handler(mockM({ command: "aiclotheschangerfaceswap", isImage: true, text: "", quoted: quotedMock(), downloadBuf: Buffer.alloc(600, 3) }), { sock: sockMock });
t("9p. faceswap → vision wajah (FACE_Q) + edit foto target", fsVision.length === 1 && /human face/i.test(fsVision[0]) && fsEdit.length === 1 && /Young man, 25/.test(fsEdit[0].prompt));
t("9q. faceswap caption + hasil terkirim", norm(sent.at(-1)?.opts?.caption || "").includes("face swap"));

// faceswap 1 foto doang → guide 2 foto
replies.length = 0;
await handler(mockM({ command: "aiclotheschangerfaceswap", isImage: true, text: "" }), { sock: sockMock });
t("9r. faceswap 1 foto → guide butuh 2 foto", (replies.at(-1) || "").includes("2") && (replies.at(-1) || "").toLowerCase().includes("foto"));

// faceswap foto bukan wajah → error sopan
replies.length = 0;
_setClothesDepsForTest({ vision: async () => ({ status: true, text: "BUKAN_WAJAH" }), live3d: async () => ({ image: Buffer.alloc(2000, 5) }) });
await handler(mockM({ command: "aiclotheschangerfaceswap", isImage: true, text: "", quoted: quotedMock(), downloadBuf: Buffer.alloc(600, 3) }), { sock: sockMock });
t("9s. faceswap BUKAN_WAJAH → tolak sopan", (replies.at(-1) || "").length > 10 && fsEdit.length === 1);

// engine down → pesan sopan semua fitur
replies.length = 0;
_setClothesDepsForTest({ vision: async () => ({ status: false }), live3d: async () => { throw new Error("down"); }, uguu: async () => { throw new Error("down"); }, img2img: async () => { throw new Error("down"); } });
await handler(mockM({ command: "aiclotheschangerage", isImage: true, text: "tua" }), { sock: sockMock });
t("9t. engine down semua → pesan engine down", (replies.at(-1) || "").toLowerCase().includes("down"));


// ═══ 5. referensi path import bebas memory leak ═══
out("\n— summary —");
out(`PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
