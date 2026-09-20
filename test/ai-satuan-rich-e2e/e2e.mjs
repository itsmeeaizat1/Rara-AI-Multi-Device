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
function mkM(args, { quotedImage = false, quoted = null } = {}) {
  const m = {
    args: [...args], text: args.join(" "), sender: "62x@s.whatsapp.net", chat: "62grup@g.us",
    react: async () => {},
    quoted: quotedImage
      ? { isImage: true, body: "", download: async () => Buffer.from("jpegdata") }
      : quoted,
  };
  return m;
}

// mock store Baileys (in-memory sejak boot)
const mkStore = (rows) => ({ messages: { get: (chat) => ({ values: () => rows }) } });

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

// ═══ SECTION 3.5: konteks reply lama + jejak histori ═══
console.log("— section 3.5: reply context + history —");
{
  rich._setRichVisionForTest(async () => ({ status: true, text: "foto kucing oren tidur di kasur" }));

  // reply pesan TEKS lama → isi pesan di-inject
  const mT = mkM(["apa", "maksud", "pesan", "ini?"], { quoted: { body: "besok rapat jam 8 di kantor", isMedia: false } });
  const rT = await enrichAiSatuan(mT, pluginGita, {});
  const jT = mT.args.join(" ");
  t("3.5a. reply pesan teks lama → isi ke-inject", rT !== null && jT.includes("besok rapat jam 8 di kantor"), jT.slice(0, 90));
  t("3.5b. label 'pesan sebelumnya' ada", /reply pesan sebelumnya/i.test(jT), jT.slice(0, 130));

  // reply STICKER → vision + label sticker
  const mS = mkM(["sticker", "apa", "ini"], { quoted: { isSticker: true, body: "", download: async () => Buffer.from("webpdata") } });
  const rS = await enrichAiSatuan(mS, pluginGita, {});
  t("3.5c. reply sticker → vision jalan", rS?.vision === true && mS.args.join(" ").includes("sticker"), mS.args.join(" ").slice(0, 80));

  // reply VIDEO + caption → jenis media + caption di-inject (tanpa vision)
  const mV2 = mkM(["video", "apa", "ini"], { quoted: { isVideo: true, isMedia: true, body: "liburan di bali" } });
  const rV2 = await enrichAiSatuan(mV2, pluginGita, {});
  const jV2 = mV2.args.join(" ");
  t("3.5d. reply video → jenis + caption di-inject", rV2 !== null && /video/.test(jV2) && jV2.includes("liburan di bali"), jV2.slice(0, 110));

  // reply foto + caption → caption ikut bareng deskripsi vision
  const mFC = mkM(["gambar", "apa", "ini"], { quoted: { isImage: true, body: "kucing kesayangan", download: async () => Buffer.from("jpegdata") } });
  await enrichAiSatuan(mFC, pluginGita, {});
  t("3.5e. reply foto + caption → caption ikut ke-inject", mFC.args.join(" ").includes("kucing kesayangan"), mFC.args.join(" ").slice(0, 130));

  // jejak histori: keyword "tadi/sebelumnya" + sock.store → pesan terakhir masuk
  const rows = [
    { key: { participant: "628111111111@s.whatsapp.net" }, message: { conversation: "halo semua" } },
    { key: { participant: "628222222222@s.whatsapp.net" }, message: { extendedTextMessage: { text: "besok jadi ikut acara?" } } },
    { key: { participant: "628111111111@s.whatsapp.net" }, message: { conversation: "jadi dong jam 7 ya" } },
  ];
  const mH = mkM(["apa", "yang", "dibicarakan", "tadi?"]);
  const rH = await enrichAiSatuan(mH, pluginGita, { sock: { store: mkStore(rows) } });
  const jH = mH.args.join(" ");
  t("3.5f. keyword tadi + store → jejak chat masuk", rH !== null && /Jejak pesan terakhir/.test(jH) && jH.includes("besok jadi ikut acara?"), jH.slice(0, 120));

  // tanpa keyword → histori GAK di-inject (gak bikin bloat)
  const mN = mkM(["apa", "kabar", "semuanya"]);
  const rN = await enrichAiSatuan(mN, pluginGita, { sock: { store: mkStore(rows) } });
  t("3.5g. tanpa keyword tadi → gak ada jejak", rN === null, rN);

  // keyword tapi store kosong → senyap
  const mE = mkM(["ringkas", "pembicaraan", "sebelumnya"]);
  const rE = await enrichAiSatuan(mE, pluginGita, { sock: {} });
  t("3.5h. store gak ada → senyap", rE === null, rE);
}

// ═══ SECTION 3.6: jejak histori PERSISTEN — tetep ada saat restart ═══
console.log("— section 3.6: chat history persisten —");
{
  const chatlog = await import(R + "/src/lib/nova-chat-log.js"); console.log("MK1");
  const cfg = { command: { prefix: "." } };
  const CHAT = "62grup@g.us";
  const mkRaw = (body, sender, type = "conversation", fromMe = false) => ({
    key: { remoteJid: CHAT, participant: sender + "@s.whatsapp.net", fromMe },
    message: type === "conversation" ? { conversation: body } : { [type]: { caption: body } },
    messageTimestamp: Math.floor(Date.now() / 1000),
  });

  // pesan biasa → tercatat
  t("3.6a. pesan teks user → tercatat", chatlog.recordChatMessage(mkRaw("halo semua", "62811"), cfg) === true);
  chatlog.recordChatMessage(mkRaw("besok jadi ikut acara?", "62822", "extendedTextMessage"), cfg);
  chatlog.recordChatMessage(mkRaw("jadi dong jam 7 ya", "62811"), cfg);
  // foto + caption → tercatat sebagai foto
  chatlog.recordChatMessage(mkRaw("liburan di bali", "62833", "imageMessage"), cfg);
  // command → GAK dicatat
  t("3.6b. command .menu → gak dicatat", chatlog.recordChatMessage(mkRaw(".menu", "62811"), cfg) === false);
  // pesan bot (fromMe) → gak dicatat
  t("3.6c. pesan bot fromMe → gak dicatat", chatlog.recordChatMessage(mkRaw("jawaban bot", "bot", "conversation", true), cfg) === false);
  // status → gak dicatat
  t("3.6d. status broadcast → gak dicatat", chatlog.recordChatMessage({ key: { remoteJid: "status@broadcast" }, message: { conversation: "x" } }, cfg) === false);

  const hist = chatlog.getChatHistory(CHAT, 10);
  t("3.6e. isi histori 4 baris", hist.length === 4, hist.length);
  t("3.6f. jenis media ikut (foto)", hist.some((r) => r.k === "foto" && r.b === "liburan di bali"), hist[3]);
  const rend = chatlog.renderChatHistory(CHAT, 8, 900);
  t("3.6g. render blok konteks", /Jejak pesan terakhir/.test(rend) && rend.includes("besok jadi ikut acara?"), rend?.slice(0, 100));

  // ── SIMULASI RESTART: flush ke disk → baca file chathistory.json langsung
  //    (bukti histori nyimpen di FILE, bukan cuma memori — ilang cuma kalau
  //    file databasenya dihapus)
  getDatabase().flushAll?.();
  await new Promise((r) => setTimeout(r, 700));
  const histFile = path.join(dbDir, "db", "chathistory.json");
  const onDisk = JSON.parse(fs.readFileSync(histFile, "utf8"));
  const diskRows = onDisk?.[CHAT] || onDisk?.data?.[CHAT] || [];
  t("3.6h. histori NYIMPEN di file chathistory.json", Array.isArray(diskRows) && diskRows.length === 4 && diskRows[0]?.b === "halo semua", { file: histFile, rows: diskRows.length });

  // keyword tadi → blok histori persisten ke-inject ke prompt satuan
  rich._setRichVisionForTest(async () => ({ status: true, text: "foto kucing" }));
  const mP = mkM(["ringkas", "pembicaraan", "tadi"]);
  const rP = await enrichAiSatuan(mP, pluginGita, {});
  const jP = mP.args.join(" ");
  t("3.6i. keyword tadi → histori persisten masuk prompt", rP !== null && jP.includes("halo semua") && /Jejak pesan terakhir/.test(jP), jP.slice(0, 120));

  // clear → jejak hilang (owner hapus)
  chatlog.clearChatHistory(CHAT);
  t("3.6j. clearChatHistory → kosong", chatlog.getChatHistory(CHAT, 10).length === 0, chatlog.getChatHistory(CHAT, 10).length);

  // rotating cap 120
  for (let i = 0; i < 130; i++) chatlog.recordChatMessage(mkRaw("msg " + i, "62899"), cfg);
  t("3.6k. rotating cap 120 per chat", chatlog.getChatHistory(CHAT, 200).length === 120, chatlog.getChatHistory(CHAT, 200).length);
  chatlog.clearChatHistory(CHAT);
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
