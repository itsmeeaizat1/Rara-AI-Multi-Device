// e2e — nova-ai-satuan-rich: enrich vision + browsing buat AI satuan
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
const R = "/app/conversations/6a8e916412b12b330016328e/nova-repo";
let pass = 0, fail = 0;
function t(name, ok, extra) {
  if (ok) { pass++; }
  else { fail++; console.error("  ❌ " + name + (extra !== undefined ? " " + JSON.stringify(extra).slice(0, 200) : "")); }
}
const cap = (s, n) => String(s || "").length > n ? String(s).slice(0, n - 1) + "…" : String(s || "");

// ── init db (GOTCHA: getDatabase tanpa initDatabase THROW) ──
const { getDatabase, initDatabase } = await import(R + "/src/lib/nova-database.js");
const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "rich-e2e-db-"));
await initDatabase(path.join(dbDir, "db"));

const rich = await import(R + "/src/lib/nova-ai-satuan-rich.js");
const { enrichAiSatuan, isExcluded, AUTO_BROWSE_RE } = rich;

// seams
rich._setRichVisionForTest(async () => ({ status: true, text: "foto kucing oren tidur di kasur", engine: "test" }));
rich._setRichSearchForTest(async (q) => ({ items: [
  { title: "Berita hari ini", url: "https://a.com", snippet: "isu terbaru tentang " + q },
  { title: "Sumber kedua", url: "https://b.com", snippet: "detail lanjutan" },
] }));

const pluginGita = { config: { name: "gita", category: "ai", isOwner: false, _usesQuotedMedia: false } };
function mkM(args, { quotedImage = false } = {}) {
  const m = {
    args: [...args], text: args.join(" "), sender: "62x@s.whatsapp.net",
    react: async () => {},
    quoted: quotedImage
      ? { isImage: true, download: async () => Buffer.from("jpegdata") }
      : null,
  };
  return m;
}

// ═══ SECTION 1: vision enrich ═══
console.log("— section 1: vision —");
{
  const m = mkM(["apa", "di", "foto", "ini", "?"], { quotedImage: true });
  const r = await enrichAiSatuan(m, pluginGita);
  t("1a. reply foto → enrich jalan", r?.vision === true, r);
  t("1b. deskripsi foto masuk prompt", /foto kucing oren tidur di kasur/.test(m.args.join(" ")), m.args.join(" ").slice(0, 80));
  t("1c. pertanyaan asli tetep ada", /apa di foto ini \?/.test(m.args.join(" ")) || m.args.join(" ").includes("apa di foto ini"), m.args.slice(-8));
  t("1d. m.text ikut di-enrich", /foto kucing oren/.test(m.text || ""), (m.text || "").slice(0, 60));

  // tanpa foto → gak ada perubahan
  const m2 = mkM(["apa", "kabar"]);
  const r2 = await enrichAiSatuan(m2, pluginGita);
  t("1e. tanpa foto & tanpa flag → gak diubah", r2 === null && m2.args.join(" ") === "apa kabar", r2);
}

// ═══ SECTION 2: browsing flag + auto ═══
console.log("— section 2: browsing —");
{
  // flag --search di-strip + konteks masuk
  const m = mkM(["--search", "siapa", "presiden", "prancis"]);
  const r = await enrichAiSatuan(m, pluginGita);
  t("2a. flag --search → enrich jalan", r?.search === true, r);
  const joined = m.args.join(" ");
  t("2b. flag ke-strip dari prompt", !joined.includes("--search"), joined.slice(0, 80));
  t("2c. konteks web masuk", /Hasil pencarian web/.test(joined) && /Berita hari ini/.test(joined), joined.slice(0, 120));
  t("2d. pertanyaan asli tetep", joined.includes("siapa presiden prancis"), joined.slice(-60));

  // flag --cari juga
  const m2 = mkM(["--cari", "jadwal", "bola"]);
  const r2 = await enrichAiSatuan(m2, pluginGita);
  t("2e. flag --cari ikut kebaca", r2?.search === true && !m2.args.join(" ").includes("--cari"), m2.args.slice(0, 6));

  // auto-keyword (default ON)
  const m3 = mkM(["berita", "terbaru", "gempa"]);
  const r3 = await enrichAiSatuan(m3, pluginGita);
  t("2f. auto-keyword berita → auto browsing", r3?.search === true, r3);

  // kalimat biasa → gak auto
  const m4 = mkM(["apa", "itu", "nodejs"]);
  const r4 = await enrichAiSatuan(m4, pluginGita);
  t("2g. pertanyaan biasa → gak browsing", r4 === null, r4);

  // .math "hasil dari 2+2" → SENGAJA gak auto (kata umum gak ikut)
  const m5 = mkM(["hasil", "dari", "2+2"]);
  const r5 = await enrichAiSatuan(m5, pluginGita);
  t("2h. kata umum (hasil) gak false-positive", r5 === null, r5);

  // auto dimatikan via db → flag tetap jalan
  getDatabase().setting("aiSatuanBrowse", false);
  const m6 = mkM(["berita", "terbaru", "gempa"]);
  const r6 = await enrichAiSatuan(m6, pluginGita);
  t("2i. .ai-set browsing off → auto mati", r6 === null, r6);
  const m7 = mkM(["--search", "gempa", "hari", "ini"]);
  const r7 = await enrichAiSatuan(m7, pluginGita);
  t("2j. flag --search tetap jalan walau auto off", r7?.search === true, r7);
  getDatabase().setting("aiSatuanBrowse", true);
}

// ═══ SECTION 3: exclusion & safety ═══
console.log("— section 3: exclusion & safety —");
{
  // plugin yang ngurus media sendiri → dikecualikan (gak dobel proses)
  const mEx = mkM(["apa", "di", "foto"], { quotedImage: true });
  const rEx = await enrichAiSatuan(mEx, { config: { name: "vision", category: "ai", isOwner: false, _usesQuotedMedia: true } });
  t("3a. plugin media native → dikecualikan", rEx === null && mEx.args.join(" ") === "apa di foto", rEx);

  // owner-only (panel/setelan) → dikecualikan
  const mOw = mkM(["berita", "terbaru"], { quotedImage: true });
  const rOw = await enrichAiSatuan(mOw, { config: { name: "ai-set", category: "ai", isOwner: true } });
  t("3b. plugin owner-only → dikecualikan", rOw === null, rOw);

  // kategori bukan ai → dikecualikan
  const rCat = await enrichAiSatuan(mkM(["berita", "terbaru"]), { config: { name: "play", category: "downloader", isOwner: false } });
  t("3c. kategori non-ai → dikecualikan", rCat === null, rCat);

  // vision gagal (status false) → senyap, prompt gak diubah (tanpa search)
  rich._setRichVisionForTest(async () => ({ status: false }));
  const mV = mkM(["apa", "ini"], { quotedImage: true });
  const rV = await enrichAiSatuan(mV, pluginGita);
  t("3d. vision gagal → senyap tanpa ngerusak prompt", rV === null && mV.args.join(" ") === "apa ini", rV);
  rich._setRichVisionForTest(async () => ({ status: true, text: "foto kucing oren tidur di kasur" }));

  // search error → senyap
  rich._setRichSearchForTest(async () => { throw new Error("sibuk"); });
  const mS = mkM(["--search", "tes"]);
  const rS = await enrichAiSatuan(mS, pluginGita);
  t("3e. search error → senyap, prompt gak rusak", rS === null, rS);
  rich._setRichSearchForTest(async (q) => ({ items: [{ title: "Berita hari ini", snippet: "isu terbaru tentang " + q }] }));

  // cap total prompt
  rich._setRichVisionForTest(async () => ({ status: true, text: "x".repeat(900) }));
  const mBig = mkM(["--search", ...("kata ".repeat(600).trim().split(" "))], { quotedImage: true });
  const rBig = await enrichAiSatuan(mBig, pluginGita);
  t("3f. prompt kecap 2600 char", (mBig.text || "").length <= 2600, (mBig.text || "").length);
}

// ═══ SECTION 4: loader flag _usesQuotedMedia beneran ═══
console.log("— section 4: loader flag —");
{
  const { loadPlugin } = await import(R + "/src/lib/nova-plugins.js");
  const gita = await loadPlugin(R + "/plugins/ai/gita.js");
  t("4a. gita (satuan teks) → _usesQuotedMedia false", gita?.config?._usesQuotedMedia === false, gita?.config?._usesQuotedMedia);
  const vision = await loadPlugin(R + "/plugins/ai/vision.js");
  t("4b. vision (native image) → _usesQuotedMedia true", vision?.config?._usesQuotedMedia === true, vision?.config?._usesQuotedMedia);
  const aiset = await loadPlugin(R + "/plugins/ai/ai-set.js");
  t("4c. ai-set tetap kebaca loader", !!aiset?.config && aiset.config.name === "ai-set", aiset?.config?.name);
}

// ═══ SECTION 5: .ai-set browsing on/off ═══
console.log("— section 5: ai-set browsing —");
{
  const plugin = await import(R + "/plugins/ai/ai-set.js");
  const replies = [];
  const mkSetM = (txt) => ({
    text: txt, args: txt.split(" "), isOwner: true, chat: "x@s.whatsapp.net", pushName: "Tes",
    react: async () => {},
    reply: async (x) => { replies.push(String(x)); return x; },
  });
  await plugin.handler(mkSetM(".ai-set browsing off"), { sock: { sendMessage: async () => {} }, config: { command: { prefix: "." } } });
  t("5a. .ai-set browsing off → konfirmasi", /OFF/i.test(replies.join("\n")), replies[0]?.slice(0, 60));
  t("5b. db aiSatuanBrowse = false", getDatabase().setting("aiSatuanBrowse") === false, getDatabase().setting("aiSatuanBrowse"));
  await plugin.handler(mkSetM(".ai-set browsing on"), { sock: { sendMessage: async () => {} }, config: { command: { prefix: "." } } });
  t("5c. .ai-set browsing on → nyala lagi", getDatabase().setting("aiSatuanBrowse") === true, getDatabase().setting("aiSatuanBrowse"));
  // nilai sampah → salah
  await plugin.handler(mkSetM(".ai-set browsing mungkin"), { sock: { sendMessage: async () => {} }, config: { command: { prefix: "." } } });
  // GOTCHA: reply ke-smallcaps — asersi pakai kata "ꜱᴀʟᴀʜ" kecil atau lowercase
  const salah = (replies[replies.length - 1] || "").toLowerCase();
  t("5d. nilai selain on/off → novaSalah", /salah|ᴄᴀʀᴀ ᴘᴇᴍᴀᴋᴀɪᴀɴ/.test(salah), replies[replies.length - 1]?.slice(0, 60));
}

rich._resetRichForTest();
console.log("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exitCode = fail > 0 ? 1 : 0;
