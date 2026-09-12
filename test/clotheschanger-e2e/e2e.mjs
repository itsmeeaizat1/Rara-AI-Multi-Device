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

const { config, handler, buildEditPrompt, parseClothesDesc, _setClothesDepsForTest } = await import(R + "/plugins/ai/clotheschanger.js");
const { fromSC } = await import(R + "/src/lib/styler.js");
const norm = (s) => fromSC(String(s || ""));

t("1a. plugin name aiclotheschanger + kategori ai image", config.name === "aiclotheschanger" && config.category === "ai image");
t("1b. alias cmd utama doang (pola owner)", JSON.stringify(config.alias) === JSON.stringify(["aiclotheschanger"]));

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
    command: "aiclotheschanger", args: opts.args || [], text: opts.text || "",
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

// ═══ 5. referensi path import bebas memory leak ═══
out("\n— summary —");
out(`PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
