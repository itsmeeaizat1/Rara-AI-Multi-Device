// E2E tmpfilesorg-e2e — verifikasi fitur .tmpfilesorg (upload media → link tmpfiles.org).
// Cakupan: source checks, parseExpireSec, handler no-media/happy-path/limit, error API dihumanize,
// extractDirectLink, dan anti-bentrok alias dengan fileio (.tmpfiles milik file.io).
// Live upload (nyata ke tmpfiles.org) cuma jalan kalau env TMPFILES_LIVE=1.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// node20 di VPS ini: top-level await rejection = EXIT 0 SENYAP (guard unhandledRejection gak ke-trigger)
// → seluruh body wajib di dalam main() + catch eksplisit biar kegagalan KERAS.
const R = path.resolve(process.cwd());
async function main() {
  let pass = 0, fail = 0, total = 0;
  const ok = (name, cond, extra) => { total++; if (cond) { pass++; console.log("  ✓ " + name); } else { fail++; console.log("  ❌ " + name + (extra ? " → " + String(extra).slice(0, 200) : "")); } };

  console.log("─── 1. source: plugin & anti-bentrok ───");
  const pPath = path.join(R, "plugins/convert/tmpfilesorg.js");
  const src = fs.readFileSync(pPath, "utf8");
  ok("plugin file ada di plugins/convert/ (satu folder dengan fileio)", src.includes('name: "tmpfilesorg"') && src.includes('category: "convert"'));
  ok("alias: tmporg + tempfiles, TANPA tmpfiles (punya fileio.js)", src.includes('"tmporg"') && src.includes('"tempfiles"') && !/aliases:\s*\[[^\]]*"tmpfiles"/.test(src));
  const fileioSrc = fs.readFileSync(path.join(R, "plugins/convert/fileio.js"), "utf8");
  ok("fileio.js gak disentuh (alias tmpfiles-nya tetap file.io)", fileioSrc.includes("file.io"));
  ok("guard 100 MB lokal + batas expire server (60/172800)", src.includes("104857600") && src.includes("172800") && src.includes("TMPFILES_MIN_EXPIRE = 60"));
  ok("seam _setTmpfilesHttpForTest untuk e2e", src.includes("export function _setTmpfilesHttpForTest"));

  console.log("─── 2. parseExpireSec (durasi → detik) ───");
  const { config, handler, parseExpireSec, uploadToTmpfiles, extractDirectLink, _setTmpfilesHttpForTest } = await import(pathToFileURL(pPath).href);
  const { fromSC } = await import(pathToFileURL(path.join(R, "src/lib/styler.js")).href);
  const norm = (s) => fromSC(String(s)).toLowerCase();
  ok("angka polos = MENIT (30 → 1800s)", parseExpireSec("30") === 1800);
  ok("satuan s/m/h/d: 10m→600, 2h→7200, 1d→86400, 45s→45→clamp 60", parseExpireSec("10m") === 600 && parseExpireSec("2h") === 7200 && parseExpireSec("1d") === 86400 && parseExpireSec("45s") === 60);
  ok("clamp atas: 999999s → 172800 (48 jam maks server)", parseExpireSec("999999s") === 172800);
  ok("input ngaco → null (handler fallback default 1 jam)", parseExpireSec("abc") === null && parseExpireSec("-5m") === null && parseExpireSec("10x") === null);
  ok("indonesia: 30menit/2jam/1hari jalan", parseExpireSec("30menit") === 1800 && parseExpireSec("2jam") === 7200 && parseExpireSec("1hari") === 86400);

  console.log("─── 3. uploadToTmpfiles via seam ───");
  _setTmpfilesHttpForTest(async (u, o) => {
    if (u.includes("/api/v1/upload")) return { ok: true, status: 200, json: async () => ({ status: "success", data: { url: "https://tmpfiles.org/abc123/tes.jpg" } }) };
    return { ok: true, status: 200, text: async () => '<a href="https://tmpfiles.org/dl/1790.abc/abc123/tes.jpg">Download</a>' };
  });
  const up = await uploadToTmpfiles(Buffer.from("DATA"), "tes.jpg", "image/jpeg", 600);
  ok("upload sukses → url + expireSec", up.url === "https://tmpfiles.org/abc123/tes.jpg" && up.expireSec === 600);
  _setTmpfilesHttpForTest(async () => ({ ok: false, status: 500, json: async () => ({ status: "error", data: { message: "server busy" } }) }));
  let e500 = null; try { await uploadToTmpfiles(Buffer.from("X"), "a", "text/plain", 60); } catch (e) { e500 = e.message; }
  ok("HTTP 500 → error jujur (bukan silent success)", /HTTP 500/.test(String(e500)), e500);
  _setTmpfilesHttpForTest(async () => ({ ok: true, status: 200, json: async () => { throw new Error("not json"); } }));
  let eBad = null; try { await uploadToTmpfiles(Buffer.from("X"), "a", "text/plain", 60); } catch (e) { eBad = e.message; }
  ok("respons bukan JSON (HTML/teks) → 'respons tidak valid'", /tidak valid/.test(String(eBad)), eBad);
  _setTmpfilesHttpForTest(async () => ({ ok: true, status: 200, json: async () => ({ status: "success" }) }));
  let eNoUrl = null; try { await uploadToTmpfiles(Buffer.from("X"), "a", "text/plain", 60); } catch (e) { eNoUrl = e.message; }
  ok("status success tapi url hilang → ditolak (bukan link kosong)", /tidak valid/.test(String(eNoUrl)), eNoUrl);

  console.log("─── 4. extractDirectLink ───");
  _setTmpfilesHttpForTest(async () => ({ ok: true, status: 200, text: async () => '<html><a href="https://tmpfiles.org/dl/999.tok/fid/file.bin">Download (0.01 KB)</a></p>' }));
  ok("link /dl/<token>/ ke-ekstrak dari halaman share", (await extractDirectLink("https://tmpfiles.org/fid/file.bin")) === "https://tmpfiles.org/dl/999.tok/fid/file.bin");
  _setTmpfilesHttpForTest(async () => ({ ok: true, status: 200, text: async () => "<html>tanpa link</html>" }));
  ok("halaman tanpa /dl/ → null (bukan throw)", (await extractDirectLink("https://tmpfiles.org/x/y")) === null);
  _setTmpfilesHttpForTest(async () => { throw new Error("network down"); });
  let threwView = false; try { await extractDirectLink("https://tmpfiles.org/x/y"); } catch { threwView = true; }
  ok("halaman share gagal diambil → throw (handler nangkep, link share tetap dikirim)", threwView);

  console.log("─── 5. handler (m fake) ───");
  let replies = [], reacts = [];
  const fakeM = (over = {}) => ({ args: [], prefix: ".", command: "tmpfilesorg", pushName: "Tes", mtype: "", type: "", quoted: null, download: null, reply: (t) => replies.push(String(t)), react: (e) => reacts.push(e), ...over });
  _setTmpfilesHttpForTest(async (u, o) => {
    if (u.includes("/api/v1/upload")) return { ok: true, status: 200, json: async () => ({ status: "success", data: { url: "https://tmpfiles.org/fid123/nova-upload.jpg" } }) };
    return { ok: true, status: 200, text: async () => '<a href="https://tmpfiles.org/dl/177.tk/fid123/nova-upload.jpg">d</a>' };
  });
  replies = []; await handler(fakeM());
  ok("tanpa media → balasan panduan (bukan error senyap)", replies.length === 1 && /Reply atau kirim media/.test(replies[0]));
  replies = []; reacts = [];
  await handler(fakeM({ mtype: "imageMessage", mimetype: "image/jpeg", download: async () => Buffer.from("FAKEIMG"), args: ["10m"] }));
  ok("happy path: kartu sukses berisi link share + kadaluarsa (smallcaps)", norm(replies[0]).includes("tmpfiles.org/fid123/nova-upload.jpg") && norm(replies[0]).includes("terhapus otomatis"));
  ok("happy path: direct link /dl/ ikut dikirim", replies[0].includes("https://tmpfiles.org/dl/177.tk/fid123/nova-upload.jpg"));
  ok("reaksi loading 🕒 → 🐣 (sesuai aturan global)", reacts[0] === "🕒" && reacts.at(-1) === "🐣");
  let sentExpire = null;
  _setTmpfilesHttpForTest(async (u, o) => { if (o?.body?.get) sentExpire = o.body.get("expire"); return { ok: true, status: 200, json: async () => ({ status: "success", data: { url: "https://tmpfiles.org/fid123/x.jpg" } }) }; });
  replies = []; await handler(fakeM({ mtype: "documentMessage", mimetype: "application/pdf", download: async () => Buffer.from("PDF"), fileName: "laporan.pdf", args: ["2h"] }));
  ok("arg 2h → form expire=7200 + nama file asli dipertahankan (smallcaps)", sentExpire === "7200" && norm(replies[0]).includes("laporan.pdf"));
  replies = []; reacts = [];
  _setTmpfilesHttpForTest(async () => { throw new Error("connection refused"); });
  await handler(fakeM({ mtype: "imageMessage", mimetype: "image/jpeg", download: async () => Buffer.from("IMG"), args: [] }));
  ok("network down → error jujur + react ❌", replies.length === 1 && norm(replies[0]).includes("upload gagal") && norm(replies[0]).includes("connection refused") && reacts.at(-1) === "❌");

  console.log("─── 6. live upload (opsional, TMPFILES_LIVE=1) ───");
  if (process.env.TMPFILES_LIVE === "1") {
    _setTmpfilesHttpForTest(null);
    const lib = await import(pathToFileURL(pPath).href);
    // reset seam: null fallback ke fetch global — verify via unpatch
    const real = { uploadToTmpfiles: lib.uploadToTmpfiles, extractDirectLink: lib.extractDirectLink };
    const up2 = await real.uploadToTmpfiles(Buffer.from("live e2e tmpfiles.org"), "nova-live-e2e.txt", "text/plain", 60);
    ok("LIVE: upload nyata balik URL tmpfiles.org", /^https:\/\/tmpfiles\.org\/[A-Za-z0-9]+\/nova-live-e2e\.txt$/.test(up2.url), up2.url);
    const dl2 = await real.extractDirectLink(up2.url);
    ok("LIVE: halaman share nyata punya link /dl/", typeof dl2 === "string" && /\/dl\//.test(dl2), dl2);
  } else {
    total++; pass++; console.log("  ✓ (skip — set TMPFILES_LIVE=1 untuk tes upload nyata)");
  }

  console.log(`─── hasil: ${pass}/${total} ${pass === total ? "PASSED ✓" : "ADA YANG GAGAL ✗"} ───`);
  process.exit(fail ? 1 : 0);
  return;
}

main().catch((e) => { console.error("E2E CRASH:", e?.stack || e); process.exit(1); });

