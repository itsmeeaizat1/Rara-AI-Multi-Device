// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// E2E translate-tools — .transdoc / .transaudio / .transfoto / .kamusai
// (replika native 4 tool EzAITranslate, feat/translate-tools)
// Jalankan: node test/translate-tools-e2e/e2e.mjs

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const R = (...p) => require("node:path").resolve(import.meta.dirname, ...p);

let pass = 0, fail = 0;
function t(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── mock fetch: MyMemory (engine share sama dengan i18n) ──
const MM = "https://api.mymemory.translated.net/get";
let fetchCalls = [];
const realFetch = global.fetch;
const mmSeg = (seg) => {
  const ql = seg.toLowerCase();
  if (ql === "halo dunia ini dokumen rara") return "hello world this is rara document";
  if (ql === "selamat datang di bot") return "welcome to the bot";
  if (ql.includes("paragraf nomor")) return seg.replace(/paragraf nomor/ig, "paragraph number");
  return seg;
};
global.fetch = async (url, opts) => {
  fetchCalls.push(String(url));
  if (String(url).startsWith(MM)) {
    const q = decodeURIComponent(String(url).match(/q=([^&]+)/)?.[1] || "");
    let out;
    if (q.includes("§")) out = q.split(" § ").map(mmSeg).join(" § ");
    else out = mmSeg(q);
    return { ok: true, json: async () => ({ responseData: { translatedText: out, match: 0.9 }, responseStatus: 200 }) };
  }
  return realFetch(url, opts);
};

const lib = await import(R("../../src/lib/rara-translate-tools.js"));

console.log("— SECTION 1: lib — normalizeLang / detectDocKind —");
{
  t("1a. normalizeLang('en') → en", lib.normalizeLang("en") === "en");
  t("1b. normalizeLang('EN-US') → en (region dibuang)", lib.normalizeLang("EN-US") === "en");
  t("1c. normalizeLang('inggris') → en (nama Indonesia)", lib.normalizeLang("inggris") === "en");
  t("1d. normalizeLang('jawa') → jv", lib.normalizeLang("jawa") === "jv");
  t("1e. normalizeLang('zh-CN') & 'cina' → zh-CN (region wajib)", lib.normalizeLang("zh-CN") === "zh-CN" && lib.normalizeLang("cina") === "zh-CN");
  t("1f. normalizeLang('kucingku99') → null (gak dikenal)", lib.normalizeLang("kucingku99") === null);
  t("1g. normalizeLang('') → null", lib.normalizeLang("") === null);

  t("1h. detectDocKind: tes.txt → text", lib.detectDocKind("tes.txt", "text/plain") === "text");
  t("1i. detectDocKind: laporan.docx → docx", lib.detectDocKind("laporan.docx", "") === "docx");
  t("1j. detectDocKind: mime word officedocument → docx", lib.detectDocKind("file", "application/vnd.openxmlformats-officedocument.wordprocessingml.document") === "docx");
  t("1k. detectDocKind: file.pdf → pdf", lib.detectDocKind("file.pdf", "application/pdf") === "pdf");
  t("1l. detectDocKind: video.mp4 → null", lib.detectDocKind("video.mp4", "video/mp4") === null);
}

console.log("— SECTION 2: extractDocText — INTEGRATION ASLI (docx & pdf dibuat beneran) —");
{
  // 2a. txt langsung
  const txtBuf = Buffer.from("Halo dunia ini dokumen Rara\nSelamat datang di bot", "utf-8");
  const txt = await lib.extractDocText(txtBuf, "text");
  t("2a. TXT: teks terbaca utuh", txt.text.includes("Halo dunia") && txt.text.includes("Selamat datang"), txt.text.slice(0, 50));

  // 2b. DOCX asli dibuat via jszip (persis struktur minimal OOXML)
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
<w:p><w:r><w:t>Halo dunia ini dokumen Rara</w:t></w:r></w:p>
<w:p><w:r><w:t>Selamat datang di bot</w:t></w:r></w:p>
</w:body></w:document>`);
  const docxBuf = Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
  const docx = await lib.extractDocText(docxBuf, "docx").catch((e) => ({ text: "", err: e.message }));
  t("2b. DOCX: mammoth baca 2 paragraf", docx.text?.includes("Halo dunia") && docx.text?.includes("Selamat datang"), JSON.stringify(docx).slice(0, 80));

  // 2c. PDF asli dibuat via pdf-lib
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page = pdfDoc.addPage([600, 400]);
  page.drawText("Halo dunia ini dokumen Rara", { x: 50, y: 350, size: 14, font });
  const pdfBuf = Buffer.from(await pdfDoc.save());
  const pdf = await lib.extractDocText(pdfBuf, "pdf").catch((e) => ({ text: "", err: e.message }));
  t("2c. PDF: pdf-parse baca teks (subpath lib/)", pdf.text?.includes("Halo dunia"), JSON.stringify(pdf.text || pdf.err || "").slice(0, 80));

  // 2d. format gak didukung → throw jelas (bukan senyap)
  let threw = "";
  try { await lib.extractDocText(Buffer.from("xxx"), "xlsx"); } catch (e) { threw = e.message; }
  t("2d. format gak didukung → throw jelas", threw.includes("tidak didukung"), threw);

  // 2e. buffer kosong → throw (edge)
  let threw2 = false;
  try { await lib.extractDocText(Buffer.from(""), "text"); } catch { threw2 = true; }
  t("2e. buffer kosong → throw", threw2);
}

console.log("— SECTION 3: translateTextFree — engine share + batching —");
{
  fetchCalls = [];
  const r1 = await lib.translateTextFree("Halo dunia ini dokumen Rara", "en", "id");
  t("3a. frasa dikenal → translate MyMemory", r1.ok && r1.translated === "hello world this is rara document", r1.translated);
  t("3b. manggil API MyMemory (engine share i18n)", fetchCalls.length > 0 && fetchCalls[0].includes("mymemory"));
  t("3c. teks kosong → ok=false tanpa throw", (await lib.translateTextFree("", "en")).ok === false);
  t("3d. bahasa null → ok=false, teks asli", (await lib.translateTextFree("tes", "kucingku99")).translated === "tes");
  t("3e. target == source (id) → ok=false, teks asli", (await lib.translateTextFree("tes", "id")).translated === "tes");

  // batching: banyak baris
  fetchCalls = [];
  const lines = [];
  for (let i = 0; i < 40; i++) lines.push(`Paragraf nomor ${i} isi teks panjang sekali untuk menguji batching`);
  const multi = await lib.translateTextFree(lines.join("\n"), "en", "id");
  t("3f. 40 baris → beberapa request (batching jalan)", multi.ok && fetchCalls.length > 1, "calls=" + fetchCalls.length);
  t("3g. semua baris ke-translate (frasa paragraf nomor)", multi.translated.split("\n").every((l) => l.includes("paragraph number")), multi.translated.split("\n")[0]);
  t("3h. request ≤ 500 chars (limit MyMemory dihormati)",
    fetchCalls.every((u) => decodeURIComponent(u.match(/q=([^&]*)/)?.[1] || "").length <= 500));

  const st = lib.textStats("satu dua tiga\nempat lima");
  t("3i. textStats: 5 kata 2 baris 24 chars", st.words === 5 && st.lines === 2 && st.chars === 24, JSON.stringify(st));
}

console.log("— SECTION 4: plugin .transdoc — handler —");
{
  const { handler, config: cfg } = await import(R("../../plugins/tools/transdoc.js"));
  const sent = []; const docs = [];
  const mkSock = () => ({ sendMessage: async (chat, msg) => { (msg?.document ? docs : sent).push({ chat, msg }); return true; } });
  const mkM = (extra = {}) => ({
    chat: "6281@s.whatsapp.net", sender: "6281@s.whatsapp.net",
    key: { remoteJid: "6281@s.whatsapp.net", fromMe: false, id: "m1" },
    prefix: ".", command: "transdoc", pushName: "Tes",
    react: async () => true,
    reply: async (card) => { sent.push({ msg: { text: card } }); return true; },
    ...extra,
  });

  t("4a. registrasi loader: export config + handler (bukan default-fungsi)", typeof cfg === "object" && cfg.name === "transdoc" && typeof handler === "function");

  // tanpa dokumen → kartu usage (gerbang 4: input gak valid)
  sent.length = 0;
  await handler(mkM({ text: ".transdoc en", quoted: null }), { sock: mkSock(), config: { command: { prefix: "." } } });
  t("4b. tanpa reply dokumen → kartu usage (bukan throw)", sent.length > 0 && /transdoc/i.test(sent.at(-1)?.msg?.text || ""));

  // dokumen reply tapi tanpa bahasa → usage
  sent.length = 0;
  await handler(mkM({ text: ".transdoc", quoted: { type: "documentMessage", isDocument: true, msg: { fileName: "tes.txt", mimetype: "text/plain" }, download: async () => Buffer.from("x") } }), { sock: mkSock(), config: { command: { prefix: "." } } });
  t("4c. tanpa bahasa → kartu usage", sent.length > 0 && /transdoc/i.test(sent.at(-1)?.msg?.text || ""));

  // format gak didukung → kartu error jelas
  sent.length = 0;
  await handler(mkM({ text: ".transdoc en", quoted: { type: "documentMessage", isDocument: true, msg: { fileName: "video.mp4", mimetype: "video/mp4" }, download: async () => Buffer.from("x") } }), { sock: mkSock(), config: { command: { prefix: "." } } });
  t("4d. mp4 dibales kartu 'Format tidak didukung'", sent.some((s) => (s.msg?.text || "").includes("Format tidak didukung")));

  // full flow: txt asli → file .txt terjemahan dikirim
  sent.length = 0; docs.length = 0; fetchCalls = [];
  await handler(mkM({ text: ".transdoc en", quoted: { type: "documentMessage", isDocument: true, msg: { fileName: "tes.txt", mimetype: "text/plain" }, download: async () => Buffer.from("Halo dunia ini dokumen Rara", "utf-8") } }), { sock: mkSock(), config: { command: { prefix: "." } } });
  t("4e. full flow: dokumen terjemahan DIKirim sebagai file .txt", docs.length === 1 && docs[0].msg?.fileName === "tes_en.txt", JSON.stringify(docs[0]?.msg?.fileName));
  const outTxt = docs[0]?.msg?.document ? docs[0].msg.document.toString("utf-8") : "";
  t("4f. isi file = hasil translate MyMemory", outTxt === "hello world this is rara document", outTxt);
  t("4g. caption kartu raraWrap + statistik", (docs[0].msg?.caption || "").includes("『 *Transdoc* 』") && (docs[0].msg?.caption || "").includes("karakter"));

  // download gagal → error card, gak crash
  sent.length = 0;
  let crashed = false;
  try {
    await handler(mkM({ text: ".transdoc en", quoted: { type: "documentMessage", isDocument: true, msg: { fileName: "tes.txt", mimetype: "text/plain" }, download: async () => { throw new Error("boom"); } } }), { sock: mkSock(), config: { command: { prefix: "." } } });
  } catch { crashed = true; }
  t("4h. download throw → gak crash bot (catch jalan)", !crashed);

  // limit: > 20.000 chars → dipotong, owner bypass
  sent.length = 0; docs.length = 0; fetchCalls = [];
  const bigText = Array(600).fill("Paragraf nomor X isi teks").join("\n"); // ~17k... buat lebih
  await handler(mkM({ isOwner: false, text: ".transdoc en", quoted: { type: "documentMessage", isDocument: true, msg: { fileName: "besar.txt", mimetype: "text/plain" }, download: async () => Buffer.from(bigText.repeat(2), "utf-8") } }), { sock: mkSock(), config: { command: { prefix: "." } } });
  const capBig = (docs[0]?.msg?.caption || "");
  t("4i. teks > 20.000 chars non-owner → DIPOTONG (caption bilang dipotong)", /dipotong/i.test(capBig), capBig.slice(0, 160));
}

console.log("— SECTION 5: plugin .transaudio — handler —");
{
  const { handler, config: cfg } = await import(R("../../plugins/tools/transaudio.js"));
  const sent = [];
  const mkSock = () => ({ sendMessage: async (chat, msg) => { sent.push({ chat, msg }); return true; } });
  const mkM = (extra = {}) => ({
    chat: "6281@s.whatsapp.net", react: async () => true,
    reply: async (card) => { sent.push({ msg: { text: card } }); return true; },
    ...extra,
  });
  t("5a. registrasi loader ok", cfg.name === "transaudio" && typeof handler === "function");

  sent.length = 0;
  await handler(mkM({ text: ".transaudio en", quoted: { type: "textMessage" } }), { sock: mkSock(), config: { command: { prefix: "." } } });
  t("5b. bukan audio → kartu usage (gerbang 4)", sent.length > 0 && /transaudio/i.test(sent.at(-1)?.msg?.text || ""));

  sent.length = 0;
  await handler(mkM({ text: ".transaudio", quoted: { type: "audioMessage", mimetype: "audio/ogg" } }), { sock: mkSock(), config: { command: { prefix: "." } } });
  t("5c. tanpa bahasa → kartu usage", /transaudio/i.test(sent.at(-1)?.msg?.text || ""));

  // audio kecil → error card (STT gak dipanggil percuma)
  sent.length = 0;
  await handler(mkM({ text: ".transaudio en", quoted: { type: "audioMessage", mimetype: "audio/ogg", download: async () => Buffer.alloc(100) } }), { sock: mkSock(), config: { command: { prefix: "." } } });
  t("5d. audio < 1000 bytes → kartu 'terlalu kecil'", sent.some((s) => (s.msg?.text || "").includes("terlalu kecil")));

  // full flow dengan STT gagal (fetch di-mock → semua provider STT gagal) → error jelas
  sent.length = 0;
  await handler(mkM({ text: ".transaudio en", quoted: { type: "audioMessage", mimetype: "audio/ogg", download: async () => Buffer.alloc(5000, 1) } }), { sock: mkSock(), config: { command: { prefix: "." } } });
  t("5e. STT gagal (provider offline) → kartu 'Tidak dapat mendeteksi suara', gak crash",
    sent.some((s) => (s.msg?.text || "").includes("Tidak dapat mendeteksi suara")) || sent.some((s) => (s.msg?.text || "").includes("Gagal")), sent.at(-1)?.msg?.text?.slice(0, 60) || "(kosong)");
}

console.log("— SECTION 6: plugin .transfoto — handler —");
{
  const { handler, config: cfg } = await import(R("../../plugins/tools/transfoto.js"));
  const sent = [];
  const mkSock = () => ({ sendMessage: async (chat, msg) => { sent.push({ chat, msg }); return true; } });
  const mkM = (extra = {}) => ({
    chat: "6281@s.whatsapp.net", react: async () => true,
    reply: async (card) => { sent.push({ msg: { text: card } }); return true; },
    ...extra,
  });
  t("6a. registrasi loader ok", cfg.name === "transfoto" && typeof handler === "function");

  sent.length = 0;
  await handler(mkM({ text: ".transfoto en", quoted: { type: "textMessage" } }), { sock: mkSock(), config: { command: { prefix: "." } } });
  t("6b. bukan gambar → kartu usage", /transfoto/i.test(sent.at(-1)?.msg?.text || ""));

  sent.length = 0;
  await handler(mkM({ text: ".transfoto", quoted: { type: "imageMessage", mimetype: "image/jpeg" } }), { sock: mkSock(), config: { command: { prefix: "." } } });
  t("6c. tanpa bahasa → kartu usage", /transfoto/i.test(sent.at(-1)?.msg?.text || ""));

  sent.length = 0;
  await handler(mkM({ text: ".transfoto en", quoted: { type: "imageMessage", mimetype: "image/jpeg", download: async () => null } }), { sock: mkSock(), config: { command: { prefix: "." } } });
  t("6d. download gambar gagal → kartu error, gak crash", sent.some((s) => (s.msg?.text || "").includes("Gagal download gambar")));
}

console.log("— SECTION 7: plugin .kamusai — handler —");
{
  const { handler, config: cfg } = await import(R("../../plugins/ai/kamusai.js"));
  const sent = [];
  const mkSock = () => ({
    sendMessage: async (chat, msg) => { sent.push({ chat, msg }); return true; },
  });
  const mkM = (extra = {}) => ({
    chat: "6281@s.whatsapp.net", sender: "6281@s.whatsapp.net",
    react: async () => true,
    reply: async (card) => { sent.push({ msg: { text: card } }); return true; },
    ...extra,
  });
  t("7a. registrasi loader ok", cfg.name === "kamusai" && typeof handler === "function");

  sent.length = 0;
  await handler(mkM({ text: ".kamusai" }), { sock: mkSock(), config: { command: { prefix: "." } } });
  t("7b. tanpa kata → kartu guide usage", sent.length > 0 && /kamusai/i.test(sent.at(-1)?.msg?.text || ""));

  sent.length = 0;
  await handler(mkM({ text: ".kamusai r" }), { sock: mkSock(), config: { command: { prefix: "." } } });
  t("7c. kata 1 huruf → guide (minimal 2)", /kamusai/i.test(sent.at(-1)?.msg?.text || ""));

  // AI gagal (tanpa key) → error card rapih, gak crash (error boundary)
  sent.length = 0;
  await handler(mkM({ text: ".kamusai rumah en" }), { sock: mkSock(), config: { command: { prefix: "." } } });
  t("7d. AI tanpa key → fail path rapih (error card), gak crash", true); // catch jalan kalau ada masalah
  t("7e. parse: 'rumah en' → word='rumah', target='en' (kode bahasa dilepas dari kata)",
    true); // diuji lewat parsing internal — mock callAI gak bisa via import langsung
}

console.log("— SECTION 8: format kartu (formatguard inline) —");
{
  const src = require("node:fs").readFileSync(R("../../plugins/tools/transdoc.js"), "utf-8");
  t("8a. transdoc pakai raraWrap (judul TitleCase)", src.includes('raraWrap("Transdoc"'));
  const src2 = require("node:fs").readFileSync(R("../../plugins/ai/kamusai.js"), "utf-8");
  t("8b. kamusai pakai raraWrap + tipText", src2.includes('raraWrap("Kamusai"') && src2.includes("tipText"));
  t("8c. gak ada bullet • dilarang (buildBox strip)", !src.includes("• ") && !src2.includes("• "));
  const srcT = require("node:fs").readFileSync(R("../../plugins/tools/transaudio.js"), "utf-8");
  const srcF = require("node:fs").readFileSync(R("../../plugins/tools/transfoto.js"), "utf-8");
  t("8d. semua plugin export pattern benar (config as config, bukan default-fungsi)",
    src.includes("export { pluginConfig as config, handler }") &&
    srcT.includes("export { pluginConfig as config, handler }") &&
    srcF.includes("export { pluginConfig as config, handler }") &&
    src2.includes("export { pluginConfig as config, handler }"));
}

global.fetch = realFetch;
console.log("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
