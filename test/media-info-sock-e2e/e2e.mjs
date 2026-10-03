// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// E2E: rara-media-info-sock.js — kartu field otomatis untuk SEMUA fitur pengirim media (3 Okt 2026).
import fs from "node:fs";
import os from "node:os";
import { execFileSync } from "node:child_process";
import * as S from "../../src/lib/rara-media-info-sock.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (n, ok, x) => { w((ok ? "  ✅" : "  ❌") + " " + n + (ok ? "" : x !== undefined ? ` — ${String(x).slice(0, 220)}` : "")); ok ? pass++ : fail++; };

// media nyata
const T = "/tmp/rara-mis-e2e"; fs.mkdirSync(T, { recursive: true });
const ff = (a) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...a], { stdio: "ignore" });
ff(["-f", "lavfi", "-i", "color=c=blue:s=640x360", "-frames:v", "1", `${T}/a.jpg`]);
ff(["-f", "lavfi", "-i", "color=c=red:s=320x240", "-frames:v", "1", `${T}/a.png`]);
ff(["-f", "lavfi", "-i", "sine=frequency=440:duration=3", "-c:a", "libmp3lame", `${T}/a.mp3`]);
ff(["-f", "lavfi", "-i", "testsrc=duration=2:size=320x240:rate=15", "-pix_fmt", "yuv420p", "-c:v", "libx264", `${T}/a.mp4`]);
const JPG = fs.readFileSync(`${T}/a.jpg`), PNG = fs.readFileSync(`${T}/a.png`), MP3 = fs.readFileSync(`${T}/a.mp3`), MP4 = fs.readFileSync(`${T}/a.mp4`);

// mkDeferred: flush MANUAL (meniru handler: flush sesudah plugin.handler selesai)
function mkDeferred(ctx0, deps, baseImpl) {
  const sent = [];
  const ctx = { ...ctx0 };
  const base = { sendMessage: baseImpl || (async (jid, p, o) => { sent.push({ jid, p, o }); return { key: { id: "ok" } }; }), marker: "dari-base" };
  const sock = S.makeMediaInfoSock(base, ctx, deps);
  return { sent, sock, base, ctx, flush: async () => (ctx.flush ? ctx.flush() : false) };
}
// mk: tiap sendMessage otomatis di-flush setelahnya (untuk tes yang menilai satu kiriman); flush idempoten (1 kartu/command)
function mk(ctx0, deps, baseImpl) {
  const r = mkDeferred(ctx0, deps, baseImpl);
  const raw = r.sock.sendMessage;
  if (r.ctx.flush) {
    const auto = async (...a) => { const res = await raw(...a); await r.flush(); return res; };
    const proxy = Object.create(r.sock); proxy.sendMessage = auto; r.sock = proxy;
  }
  return r;
}
const ctx = { chat: "c@g.us", category: "tools", header: "Pixelate", command: "pixelate" };
const texts = (sent) => sent.filter((s) => s.p.text).map((s) => s.p.text);

w("\n— helper murni —");
check("sniffFormat: jpg/png/mp3/mp4", S.sniffFormat(JPG) === "image/jpeg" && S.sniffFormat(PNG) === "image/png" && S.sniffFormat(MP3) === "audio/mpeg" && S.sniffFormat(MP4) === "video/mp4", [S.sniffFormat(JPG), S.sniffFormat(PNG), S.sniffFormat(MP3), S.sniffFormat(MP4)]);
check("sniffFormat: sampah/kecil/bukan buffer → ''", S.sniffFormat(Buffer.from("halo")) === "" && S.sniffFormat(null) === "" && S.sniffFormat("x") === "");
check("imageSize: jpg 640x360, png 320x240", JSON.stringify(S.imageSize(JPG)) === '{"height":360,"width":640}' || (S.imageSize(JPG).width === 640 && S.imageSize(JPG).height === 360), JSON.stringify(S.imageSize(JPG)));
check("imageSize: png", S.imageSize(PNG).width === 320 && S.imageSize(PNG).height === 240);
check("imageSize: bukan gambar → null", S.imageSize(MP3) === null && S.imageSize(Buffer.alloc(30)) === null);
check("looksLikeOwnCard: 「 ✦ → true; caption biasa → false; bullet+Ukuran → true", S.looksLikeOwnCard("「 ✦ X ✦ 」") && !S.looksLikeOwnCard("hasil gambar kamu") && S.looksLikeOwnCard("• Ukuran : 1 KB"));
check("pickMedia: image/video/audio/document/sticker; teks → null", S.pickMedia({ image: 1 }).kind === "image" && S.pickMedia({ sticker: Buffer.alloc(1) }).kind === "sticker" && S.pickMedia({ text: "x" }) === null && S.pickMedia(null) === null);
check("isEnabled: default on; off mematikan", S.isEnabled({}) && S.isEnabled({ RARA_MEDIA_INFO: "on" }) && !S.isEnabled({ RARA_MEDIA_INFO: "off" }) && !S.isEnabled({ RARA_MEDIA_INFO: "OFF" }));

w("\n— probeBuffer (ffprobe nyata) —");
{
  const a = await S.probeBuffer(MP3); const v = await S.probeBuffer(MP4);
  check("mp3: durasi ~3 dtk + bitrate", a.duration > 2.5 && a.duration < 3.6 && a.bitrate > 0, JSON.stringify(a));
  check("mp4: durasi ~2 dtk + dimensi 320x240", v.duration > 1.5 && v.duration < 2.6 && v.width === 320 && v.height === 240, JSON.stringify(v));
  check("buffer sampah → {} (tanpa throw)", JSON.stringify(await S.probeBuffer(Buffer.from("bukan media sama sekali"))) === "{}");
  check("buffer kosong/bukan buffer → {}", JSON.stringify(await S.probeBuffer(Buffer.alloc(0))) === "{}" && JSON.stringify(await S.probeBuffer("x")) === "{}");
  const t0 = Date.now();
  const slow = await S.probeBuffer(MP3, { timeoutMs: 100, execFn: () => new Promise(() => {}) });
  check("ffprobe menggantung → timeout dihormati, {}", JSON.stringify(slow) === "{}" && Date.now() - t0 < 2000, Date.now() - t0);
  const leak = () => fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith("rara-mi-")).length;
  const before = leak();
  await S.probeBuffer(MP3); await S.probeBuffer(MP4); await S.probeBuffer(Buffer.from("sampah"));
  await S.probeBuffer(MP3, { timeoutMs: 50, execFn: () => new Promise(() => {}) });
  check("file sementara ffprobe dibersihkan (sukses, gagal, timeout) — tidak bocor", leak() === before, `${before} -> ${leak()}`);
}

w("\n— kartu terkirim SETELAH media —");
{
  const r = mk(ctx); await r.sock.sendMessage("c@g.us", { image: JPG, caption: "hasil" });
  check("2 pesan: media dulu, kartu kedua", r.sent.length === 2 && r.sent[0].p.image && r.sent[1].p.text, r.sent.length);
  const c = texts(r.sent)[0];
  check("judul = nama fitur, 「 ✦ PIXELATE ✦ 」", c.startsWith("「 ✦ PIXELATE ✦ 」"), c.split("\n")[0]);
  check("foto: Jenis foto, Format JPEG, Dimensi 640 x 360, Ukuran", /Jenis\s+: foto/.test(c) && /Format\s+: JPEG/.test(c) && /Dimensi\s+: 640 x 360/.test(c) && /Ukuran\s+: /.test(c), c);
  check("tanpa Durasi untuk foto", !/Durasi/.test(c));
  const a = mk(ctx); await a.sock.sendMessage("c@g.us", { audio: MP3, mimetype: "audio/mpeg" });
  const ca = texts(a.sent)[0];
  check("audio: Durasi + Bitrate + Format MP3", /Durasi\s+: 00:0[23]/.test(ca) && /Bitrate\s+: \d+ kbps/.test(ca) && /Format\s+: MP3/.test(ca), ca);
  const v = mk(ctx); await v.sock.sendMessage("c@g.us", { video: MP4 });
  const cv = texts(v.sent)[0];
  check("video: Durasi + Dimensi 320 x 240 + Format MP4", /Durasi\s+: 00:0[12]/.test(cv) && /Dimensi\s+: 320 x 240/.test(cv) && /Format\s+: MP4/.test(cv), cv);
  const d = mk(ctx); await d.sock.sendMessage("c@g.us", { document: Buffer.from("%PDF-1.4 isi dokumen"), fileName: "laporan.pdf", mimetype: "application/pdf" });
  const cd = texts(d.sent)[0];
  check("dokumen pdf: Format PDF + judul dari nama file", /Format\s+: PDF/.test(cd) && cd.includes("laporan"), cd);
  const g = mk(ctx); await g.sock.sendMessage("c@g.us", { video: MP4, gifPlayback: true });
  check("gifPlayback → Jenis gif", /Jenis\s+: gif/.test(texts(g.sent)[0]), texts(g.sent)[0]);
  const q = mk(ctx); await q.sock.sendMessage("c@g.us", { image: PNG }, { quoted: { key: { id: "Q" } } });
  check("kartu ikut membalas (quoted) pesan pemanggil", q.sent[1].o && q.sent[1].o.quoted && q.sent[1].o.quoted.key.id === "Q", JSON.stringify(q.sent[1].o));
}

w("\n— URL (seam probe, tanpa jaringan) —");
{
  let calls = 0;
  const r = mk(ctx, { probeMedia: async (u) => { calls++; return { size: 788493, mime: "video/mp4", lastModified: "Fri, 02 Oct 2026 11:13:04 GMT" }; } });
  await r.sock.sendMessage("c@g.us", { video: { url: "https://x/a.mp4" } });
  const c = texts(r.sent)[0];
  check("URL: HEAD dipanggil 1x; ukuran+format+tanggal server", calls === 1 && /Ukuran\s+: 770 KB/.test(c) && /Format\s+: MP4/.test(c) && /Dimodifikasi\s+: 02 Okt 2026/.test(c), c);
  const bad = mk(ctx, { probeMedia: async () => { throw new Error("boom"); } });
  await bad.sock.sendMessage("c@g.us", { image: { url: "https://x/a.jpg" } });
  check("probe URL error → media TETAP terkirim, tidak melempar", bad.sent.length >= 1 && bad.sent[0].p.image);
}

w("\n— PENGECUALIAN (jangan kirim kartu) —");
{
  const own = mk(ctx); await own.sock.sendMessage("c@g.us", { image: JPG, caption: "「 ✦ TO GIF ✦ 」\n\n• Ukuran : 1 KB" });
  check("caption sudah berkartu sendiri → TIDAK dobel", own.sent.length === 1);
  for (const cat of ["nsfw", "owner", "ai-agent", "panel", "jpm", "store"]) {
    const r = mk({ ...ctx, category: cat }); await r.sock.sendMessage("c@g.us", { image: JPG });
    check(`kategori '${cat}' di-skip: tak ada kartu DAN sock dikembalikan tanpa pembungkus`, r.sent.length === 1 && r.sock === r.base && S.SKIP_CATEGORIES.has(cat), `sent=${r.sent.length} sameSock=${r.sock === r.base}`);
  }
  const other = mk(ctx); await other.sock.sendMessage("lain@g.us", { image: JPG });
  check("media ke chat LAIN (broadcast/forward) → tanpa kartu", other.sent.length === 1);
  const txt = mk(ctx); await txt.sock.sendMessage("c@g.us", { text: "halo" }); await txt.sock.sendMessage("c@g.us", { react: { text: "👍" } });
  check("teks & reaksi → tanpa kartu", txt.sent.length === 2 && txt.sent.every((s) => !s.p.text || s.p.text === "halo"));
  const off = S.makeMediaInfoSock({ sendMessage: async () => ({}) }, ctx, { env: { RARA_MEDIA_INFO: "off" } });
  check("RARA_MEDIA_INFO=off → sock dikembalikan apa adanya (tanpa pembungkus)", off.marker === undefined && typeof off.sendMessage === "function");
  const base = { sendMessage: async () => ({}) };
  check("off: identitas objek sama persis", S.makeMediaInfoSock(base, ctx, { env: { RARA_MEDIA_INFO: "off" } }) === base);
  check("sock tanpa sendMessage → dikembalikan apa adanya", S.makeMediaInfoSock(null, ctx) === null && S.makeMediaInfoSock({}, ctx) !== undefined);
}

w("\n— KETAHANAN —");
{
  const multi = mk(ctx); await multi.sock.sendMessage("c@g.us", { image: JPG }); await multi.sock.sendMessage("c@g.us", { image: PNG }); await multi.sock.sendMessage("c@g.us", { video: MP4 });
  check("plugin kirim 3 media → cuma 1 kartu (tidak spam)", texts(multi.sent).length === 1 && multi.sent.length === 4, multi.sent.length);
  const par = mk(ctx); await Promise.all([par.sock.sendMessage("c@g.us", { image: JPG }), par.sock.sendMessage("c@g.us", { image: PNG })]);
  check("pengiriman paralel → tetap 1 kartu", texts(par.sent).length === 1, texts(par.sent).length);
  let n = 0;
  const flaky = mk(ctx, {}, async (jid, p) => { n++; if (p.text) throw new Error("kartu gagal kirim"); return { key: { id: "ok" } }; });
  let threw = false, res; try { res = await flaky.sock.sendMessage("c@g.us", { image: JPG }); } catch { threw = true; }
  check("kartu gagal terkirim → TIDAK melempar, hasil media dikembalikan", !threw && res && res.key.id === "ok", threw);
  const fail = mk(ctx, {}, async () => { throw new Error("media gagal"); });
  let err = ""; try { await fail.sock.sendMessage("c@g.us", { image: JPG }); } catch (e) { err = e.message; }
  check("MEDIA gagal → error asli dilempar (perilaku lama), tak ada kartu", err === "media gagal");
  const ret = mk(ctx); const rr = await ret.sock.sendMessage("c@g.us", { image: JPG });
  check("nilai balik sendMessage = hasil kirim media asli", rr && rr.key && rr.key.id === "ok");
  check("properti lain sock tetap terbaca (Object.create)", ret.sock.marker === "dari-base");
  const big = mk(ctx); await big.sock.sendMessage("c@g.us", { video: Buffer.alloc(61 * 1024 * 1024, 1) });
  check("buffer >60MB: tanpa ffprobe tapi tetap ada ukuran", /Ukuran\s+: 61\.0 MB/.test(texts(big.sent)[0] || ""), texts(big.sent)[0]);
  const nul = mk(ctx); await nul.sock.sendMessage("c@g.us", {}); await nul.sock.sendMessage("c@g.us", undefined);
  check("params kosong/undefined tidak crash", nul.sent.length === 2);
}

w("\n— plugin ASLI lewat pembungkus persis seperti handler.js —");
{
  const R = process.cwd();
  // axios di-stub lewat jaringan? qr.js memanggil api.qrserver.com -> pakai fetch tiruan via globalThis? axios tak memakai fetch,
  // jadi pakai seam: ganti adapter axios default dengan buffer PNG nyata.
  const axios = (await import("axios")).default;
  const realAdapter = axios.defaults.adapter;
  axios.defaults.adapter = async (config) => ({ data: PNG, status: 200, statusText: "OK", headers: {}, config, request: {} });
  const qr = await import(R + "/plugins/tools/qr.js");
  const mkM = (sent) => ({ chat: "c@g.us", sender: "u@s.whatsapp.net", prefix: ".", command: "qr", args: ["halo", "dunia"], text: "halo dunia", pushName: "T", key: { remoteJid: "c@g.us", id: "k" }, quoted: null, message: {}, reply: async (t) => { sent.push({ p: { text: String(t) } }); }, react: async () => true });
  // sama persis dengan src/handler.js: makeMediaInfoSock(sock, { category: plugin.config.category, header: plugin.config.name, chat: m.chat })
  const run = async (plugin, category) => {
    const sent = [];
    const base = { sendMessage: async (jid, p, o) => { sent.push({ jid, p, o }); return { key: { id: "ok" } }; } };
    const mctx = { command: plugin.config.name, category, header: plugin.config.name, chat: "c@g.us" };
    const mm = mkM(sent);
    const restore = S.watchReplyCards(mm, mctx);
    const sock = S.makeMediaInfoSock(base, mctx);
    try { await plugin.handler(mm, { sock, conn: sock, config: {} }); } finally { restore(); }
    await (mctx.flush ? mctx.flush() : false); // handler.js memanggil ini SESUDAH plugin.handler selesai
    return sent;
  };
  const sent = await run(qr, qr.config.category);
  const card = sent.filter((x) => x.p.text).map((x) => x.p.text).find((t) => t.includes("「 ✦ QR ✦ 」"));
  check("qr.js ASLI: media terkirim + kartu field 「 ✦ QR ✦ 」", sent.some((x) => x.p.image) && !!card, JSON.stringify(sent.map((x) => Object.keys(x.p))));
  check("qr.js ASLI: kartu memuat Jenis foto + Format PNG + Dimensi 320 x 240", !!card && /Jenis\s+: foto/.test(card) && /Format\s+: PNG/.test(card) && /Dimensi\s+: 320 x 240/.test(card), card);
  const sentNsfw = await run(qr, "nsfw");
  check("plugin yang sama diberi kategori nsfw → TANPA kartu (hanya media)", sentNsfw.filter((x) => x.p.text && x.p.text.includes("「 ✦")).length === 0 && sentNsfw.some((x) => x.p.image));
  axios.defaults.adapter = realAdapter;

  const h = fs.readFileSync(R + "/src/handler.js", "utf8");
  check("handler.js: impor makeMediaInfoSock + watchReplyCards", h.includes('import { makeMediaInfoSock, watchReplyCards } from "./lib/rara-media-info-sock.js"'));
  check("handler.js: makeMediaInfoSock dipanggil TEPAT 1x, kategori dari plugin.config", (h.match(/makeMediaInfoSock\(sock,/g) || []).length === 1 && h.includes("category: plugin.config?.category"));
  const iMedia = h.indexOf("makeMediaInfoSock(sock,"), iLang = h.indexOf("makeLangAwareSock(makeMediaInfoSock("), iHand = h.indexOf("await plugin.handler(m, { sock: dispatchSock"), iFlush = h.indexOf("mediaCtx.flush?.()"), iRestore = h.indexOf("restoreReply(); } catch");
  check("handler.js: pembungkus media DI DALAM pembungkus bahasa (kartu ikut ter-translate)", iLang > -1 && iMedia > iLang, `lang@${iLang} media@${iMedia}`);
  check("handler.js: dipasang SEBELUM plugin.handler dieksekusi", iMedia > -1 && iHand > iMedia, `media@${iMedia} handler@${iHand}`);
  check("handler.js: flush SESUDAH plugin.handler (tunda keputusan)", iFlush > iHand && iHand > -1, `handler@${iHand} flush@${iFlush}`);
  check("handler.js: m.reply dilepas lewat finally (tak bocor saat plugin error)", /finally \{ try \{ restoreReply\(\); \} catch/.test(h) && iRestore > iHand, `restore@${iRestore}`);
  check("handler.js: flush DI LUAR try plugin.handler (tak jalan saat plugin error)", h.slice(iHand, iFlush).includes("finally"), "flush harus setelah blok finally");
  check("handler.js: TIDAK memakai plugin.category (undefined pada bentuk {config})", !/makeMediaInfoSock\([^)]*plugin\.category/.test(h));
}

w("\n— TUNDA keputusan: plugin yang balas kartu field via m.reply TIDAK dobel —");
{
  check("replyLooksLikeFieldCard: judul + Ukuran → true", S.replyLooksLikeFieldCard("「 ✦ STICKER ✦ 」\n• Ukuran : 1 KB"));
  check("replyLooksLikeFieldCard: 2 baris berlabel → true", S.replyLooksLikeFieldCard("Format: MP3\nUkuran: 3 MB"));
  check("replyLooksLikeFieldCard: 1 baris / teks biasa / kosong → false", !S.replyLooksLikeFieldCard("Ukuran: 3 MB") && !S.replyLooksLikeFieldCard("Berhasil kak") && !S.replyLooksLikeFieldCard("") && !S.replyLooksLikeFieldCard(null));
  check("replyLooksLikeFieldCard: kartu usage tanpa label media → false", !S.replyLooksLikeFieldCard("「 ✦ CONVERT ✦ 」\nCara pakai: .convert mp3"));

  const sim = async (replyText, { withMedia = true, category = "tools" } = {}) => {
    const sent = [];
    const r = mkDeferred({ chat: "c@g.us", category, header: "Fitur", command: "fitur" }, {}, async (jid, p) => { sent.push({ jid, p }); return { key: { id: "ok" } }; });
    const m = { chat: "c@g.us", reply: async (t) => { sent.push({ jid: "c@g.us", p: { text: t }, viaReply: true }); } };
    const restore = S.watchReplyCards(m, r.ctx);
    try {
      if (withMedia) await r.sock.sendMessage("c@g.us", { image: JPG });
      if (replyText) await m.reply(replyText);
    } finally { restore(); }
    const flushed = await r.flush();
    return { sent, flushed };
  };
  let o = await sim("「 ✦ STICKER ✦ 」\n\n• Format : WEBP\n• Ukuran : 2 KB");
  const tx = (x) => x.sent.filter((e) => e.p.text);
  check("media LALU m.reply kartu field → kartu otomatis TIDAK dikirim", o.flushed === false && tx(o).length === 1 && tx(o)[0].viaReply, JSON.stringify(o.sent.map((e) => [Object.keys(e.p), !!e.viaReply])));
  o = await sim("Berhasil 🥳");
  check("media LALU m.reply biasa → kartu otomatis TETAP dikirim (1)", o.flushed === true && tx(o).filter((e) => e.p.text.includes("「 ✦")).length === 1);
  o = await sim(null);
  check("media saja tanpa reply → kartu otomatis dikirim", o.flushed === true);
  o = await sim("teks saja", { withMedia: false });
  check("tanpa media → flush() tak mengirim apa pun", o.flushed === false && o.sent.length === 1);
  o = await sim("「 ✦ X ✦ 」\n• Ukuran : 1 KB\n• Format : PNG", { category: "nsfw" });
  check("kategori nsfw → tak ada kartu otomatis", o.flushed === false);
  check("restore(): m.reply kembali ke fungsi ASLI", (() => { const orig = async () => "asli"; const m = { reply: orig }; const rs = S.watchReplyCards(m, { chat: "x" }); const w2 = m.reply !== orig; rs(); return w2 && m.reply === orig; })());
  check("watchReplyCards aman untuk m tanpa reply / ctx null", (() => { try { S.watchReplyCards({}, {}); S.watchReplyCards(null, null); S.watchReplyCards({ reply: 1 }, {}); return true; } catch { return false; } })());
  const m2 = { reply: async (t, opts) => ({ t, opts }) }; S.watchReplyCards(m2, { chat: "x" });
  const rv = await m2.reply("halo", { raw: true });
  check("m.reply terbungkus: argumen & nilai balik utuh", rv.t === "halo" && rv.opts.raw === true);
  const r2 = mkDeferred({ chat: "c@g.us", category: "tools", header: "F" }); await r2.sock.sendMessage("c@g.us", { image: JPG });
  const f1 = await r2.flush(), f2 = await r2.flush();
  check("flush() idempoten: kali kedua tak kirim kartu lagi", f1 === true && f2 === false && r2.sent.filter((e) => e.p.text).length === 1);
  const r3 = mkDeferred({ chat: "c@g.us", category: "tools", header: "F" }, {}, async () => { throw new Error("gagal"); });
  try { await r3.sock.sendMessage("c@g.us", { image: JPG }); } catch { /* diharapkan */ }
  check("media GAGAL terkirim → flush() tak mengirim kartu", (await r3.flush()) === false);
}

w("\n— kelompok PERMINTAAN + penyaring rahasia —");
{
  const F = (o) => S.buildRequestFields(o);
  check("Perintah dengan titik di depan", JSON.stringify(F({ command: "hd" })) === '[["Perintah",".hd"]]', JSON.stringify(F({ command: "hd" })));
  check("Input dari argumen, dirapikan spasi", JSON.stringify(F({ command: "x", input: "  kucing   lucu \n topi " })) === '[["Perintah",".x"],["Input","kucing lucu topi"]]');
  check("Input dipotong 80 karakter dengan ...", F({ command: "x", input: "a b ".repeat(60) }).find((r) => r[0] === "Input")[1].length <= 80 && F({ command: "x", input: "kata ".repeat(40) }).find((r) => r[0] === "Input")[1].endsWith("..."));
  check("Dari balasan tampil bila ada", JSON.stringify(F({ command: "x", quotedKind: "image" })).includes("balasan image"));
  check("tanpa input/quoted → hanya Perintah", F({ command: "x" }).length === 1 && F({}).length === 0);

  const M = S.maskSecrets;
  check("teks biasa utuh", M("kucing lucu pakai topi") === "kucing lucu pakai topi" && M("hd 2x") === "hd 2x" && M("angka 12345") === "angka 12345");
  check("kunci sk-/AIza/ghp_ disamarkan", M("sk-abcdefghijklmnop1234567890") === "[disamarkan]" && M("AIzaSyA1234567890abcdefghijk") === "[disamarkan]" && M("ghp_abcdefghijklmnopqrstu") === "[disamarkan]");
  check("token di query URL disamarkan, parameter lain utuh", M("https://x.com/a.mp4?token=abcd1234secret&id=5") === "https://x.com/a.mp4?token=[disamarkan]&id=5", M("https://x.com/a.mp4?token=abcd1234secret&id=5"));
  check("api_key/signature/access_token di URL disamarkan", M("u?api_key=zzz&a=1").includes("api_key=[disamarkan]") && M("u?signature=abc").includes("signature=[disamarkan]") && M("u?access_token=abc").includes("access_token=[disamarkan]"));
  check("string acak >=32 karakter disamarkan", M("a".repeat(40)) === "[disamarkan]");
  check("nomor 13+ digit (telepon/kartu) disamarkan; angka pendek utuh", M("6281234567890") === "[disamarkan]" && M("0812 3456 7890 1234") === "[disamarkan]" && M("tahun 2026 tgl 03") === "tahun 2026 tgl 03");
  check("null/undefined → ''", M(null) === "" && M(undefined) === "");

  for (const cmd of ["setkey", "apikey", "token", "cookies", "ytcookies", "login", "password", "9router", "jadibot", "session"]) {
    const r = F({ command: cmd, input: "rahasia-penting-123" });
    check(`perintah '${cmd}' → Input TIDAK dipantulkan`, !r.some((x) => x[0] === "Input") && !JSON.stringify(r).includes("rahasia-penting"), JSON.stringify(r));
  }
  check("header fitur 'Api Key' (command biasa) juga menyembunyikan Input", !F({ command: "zz", header: "apikey", input: "abc" }).some((x) => x[0] === "Input"));
  // perintah biasa TIDAK boleh ikut tersapu hanya karena mengandung potongan kata
  for (const cmd of ["hd", "removebg", "toimg", "brat", "meme", "qr", "sticker", "ssweb", "pinterest", "tourl"]) {
    check(`perintah biasa '${cmd}' → Input tetap tampil`, F({ command: cmd, input: "kucing lucu" }).some((x) => x[0] === "Input"), JSON.stringify(F({ command: cmd, input: "kucing lucu" })));
  }

  // ujung ke ujung: kartu memuat Permintaan dan tidak membocorkan
  const o1 = []; const c1 = { chat: "c@g.us", category: "tools", header: "Hd", command: "hd", input: "2x tajam", quotedKind: "image" };
  const b1 = { sendMessage: async (j, p) => { o1.push(p); return {}; } };
  const sk = S.makeMediaInfoSock(b1, c1); await sk.sendMessage("c@g.us", { image: JPG }); await c1.flush();
  const card = o1.find((x) => x.text)?.text || "";
  check("kartu ujung-ke-ujung: kelompok Permintaan + Perintah + Input + Dari", card.includes("「 ✦ Permintaan ✦ 」") && /Perintah\s+: \.hd/.test(card) && /Input\s+: 2x tajam/.test(card) && /Dari\s+: balasan image/.test(card), card);
  check("kartu: Permintaan tampil SEBELUM Detail Media", card.indexOf("Permintaan") > -1 && card.indexOf("Permintaan") < card.indexOf("Detail Media"));
  const o2 = []; const c2 = { chat: "c@g.us", category: "tools", header: "Setkey", command: "setkey", input: "AIzaSyA1234567890abcdefghijk" };
  const sk2 = S.makeMediaInfoSock({ sendMessage: async (j, p) => { o2.push(p); return {}; } }, c2); await sk2.sendMessage("c@g.us", { image: JPG }); await c2.flush();
  check("kartu perintah rahasia: kunci TIDAK bocor di seluruh keluaran", !JSON.stringify(o2).includes("AIzaSy"), JSON.stringify(o2).slice(0, 200));
}

w("\n— sendMedia (99 plugin) ikut melewati pembungkus —");
{
  const { extendSocket } = await import(process.cwd() + "/src/lib/rara-socket.js");
  const mkSock = () => { const sent = []; const sock = { sendMessage: async (j, p) => { sent.push(Object.keys(p).join("+")); return { key: { id: "x" } }; }, user: { id: "1@s.whatsapp.net" }, ev: { on() {} }, ws: {}, authState: {}, profilePictureUrl: async () => null, groupMetadata: async () => ({}), updateMediaMessage: async () => ({}), relayMessage: async () => ({}), waUploadToServer: async () => ({}) }; return { sent, sock }; };
  {
    const { sent, sock } = mkSock(); await extendSocket(sock);
    const ctx = { chat: "c@g.us", category: "ai-image", header: "txt2img", command: "txt2img", input: "sunset" };
    const w = S.makeMediaInfoSock(sock, ctx);
    await w.sendMedia("c@g.us", JPG, null, null, { type: "image" });
    const f = await ctx.flush();
    check("sendMedia(buffer gambar) lewat pembungkus → media lalu kartu", sent.join(" | ") === "image | text" && f === true, sent.join(" | "));
  }
  {
    const { sent, sock } = mkSock(); await extendSocket(sock);
    await sock.sendMedia("c@g.us", JPG, "cap", null, { type: "image" });
    check("sock ASLI (tanpa pembungkus): perilaku lama identik, tanpa kartu", sent.join(" | ") === "image+caption", sent.join(" | "));
  }
  {
    const { sent, sock } = mkSock(); await extendSocket(sock);
    const { sendMedia } = sock; let ok = true;
    try { await sendMedia("c@g.us", JPG, null, null, { type: "image" }); } catch { ok = false; }
    check("destructuring `const { sendMedia } = sock` tidak crash (this undefined → closure)", ok && sent.join("|") === "image", sent.join("|"));
  }
  {
    const { sent, sock } = mkSock(); await extendSocket(sock);
    const ctx = { chat: "c@g.us", category: "nsfw", header: "x", command: "x" };
    const w = S.makeMediaInfoSock(sock, ctx);
    await w.sendMedia("c@g.us", JPG, null, null, { type: "image" }); const f = await (ctx.flush?.() ?? false); // handler.js memakai flush?.() karena kategori skip tak membuat flush
    check("sendMedia di kategori nsfw → tanpa kartu, pembungkus tak dipasang (w === sock, tanpa flush)", sent.join("|") === "image" && f === false && w === sock && ctx.flush === undefined, sent.join("|"));
  }
  {
    const { sent, sock } = mkSock(); await extendSocket(sock);
    const ctx = { chat: "c@g.us", category: "tools", header: "x", command: "x" };
    const w = S.makeMediaInfoSock(sock, ctx);
    await w.sendMedia("c@g.us", JPG, "Caption biasa", null, { type: "image" }); const f = await ctx.flush();
    check("sendMedia dengan caption biasa → kartu tetap ikut (1)", sent.join("|") === "image+caption|text" && f === true, sent.join("|"));
  }
  const src = fs.readFileSync(process.cwd() + "/src/lib/rara-socket.js", "utf8");
  check("rara-socket.js: sendMedia memakai this.sendMessage (bukan closure murni)", /\(this && typeof this\.sendMessage === "function" \? this : sock\)\.sendMessage\(jid, payload, \{ quoted \}\)/.test(src));
}

w(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
