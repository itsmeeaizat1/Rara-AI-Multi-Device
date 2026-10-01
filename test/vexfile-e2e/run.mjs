// E2E vexfile-e2e — verifikasi fitur .vexfile (upload file → vexfile.com PPD permanen).
// Cakupan: source checks, registry key, unit format/zip-wrap, staging+remote via seam,
// handler happy-path/auto-zip/error, live opsional (VEXFILE_LIVE=1 + VEXFILES_API_KEY).
// NB: node20 di VPS ini: top-level await rejection = EXIT 0 SENYAP → body wajib di main() + catch.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const R = path.resolve(process.cwd());
async function main() {
  let pass = 0, fail = 0, total = 0;
  const ok = (name, cond, extra) => { total++; if (cond) { pass++; console.log("  ✓ " + name); } else { fail++; console.log("  ❌ " + name + (extra ? " → " + String(extra).slice(0, 200) : "")); } };

  console.log("─── 1. source & registry ───");
  const libPath = path.join(R, "src/lib/rara-vexfile.js");
  const plugPath = path.join(R, "plugins/convert/vexfile.js");
  const libSrc = fs.readFileSync(libPath, "utf8");
  const plugSrc = fs.readFileSync(plugPath, "utf8");
  ok("lib engine src/lib/rara-vexfile.js + plugin plugins/convert/vexfile.js ada", libSrc.includes("vexfileRemoteUpload") && plugSrc.includes('name: "vexfile"'));
  ok("plugin owner-only (file masuk akun PPD owner)", plugSrc.includes("isOwner: true"));
  ok("cmd .vexfile + alias vexfiles/vex/vexupload", plugSrc.includes('"vexfiles"') && plugSrc.includes('"vex"') && plugSrc.includes('"vexupload"'));
  ok("bukan tmpfiles alias (punya tmpfilesorg/fileio)", !/"tmpfiles"/.test(plugSrc));
  const keysSrc = fs.readFileSync(path.join(R, "src/lib/rara-api-keys.js"), "utf8");
  ok("registry .setkey vexfile (env VEXFILES_API_KEY)", keysSrc.includes('vexfile: {') && keysSrc.includes("process.env.VEXFILES_API_KEY"));

  console.log("─── 2. unit: format & zip-wrap ───");
  const lib = await import(pathToFileURL(libPath).href);
  ok("ALLOWED_EXTS = 43 format (persis daftar API live)", lib.ALLOWED_EXTS.length === 43 && lib.isVexAllowedFormat("a.zip") && lib.isVexAllowedFormat("b.XAPK") && lib.isVexAllowedFormat("c.obb"));
  ok("format non-arsip ditolak (jpg/pdf/mp4/bin)", !lib.isVexAllowedFormat("foto.jpg") && !lib.isVexAllowedFormat("dok.pdf") && !lib.isVexAllowedFormat("clip.mp4") && !lib.isVexAllowedFormat("noext"));
  const zipped = await lib.vexZipWrap(Buffer.from("ISI-TES-VEX"), "catatan.txt");
  const { default: AdmZip } = await import("adm-zip");
  const unzip = new AdmZip(zipped);
  ok("vexZipWrap: zip valid + isi utuh (PK magic, nama dalam, konten sama)", zipped.slice(0, 2).toString() === "PK" && unzip.getEntries()[0].entryName === "catatan.txt" && unzip.readAsText(unzip.getEntries()[0]) === "ISI-TES-VEX");

  console.log("─── 3. staging + remote upload via seam ───");
  const mockHttp = (vexResp) => lib._setVexfileHttpForTest(async (u) => {
    if (u.includes("tmpfiles.org/api/v1/upload")) return { ok: true, status: 200, json: async () => ({ status: "success", data: { url: "https://tmpfiles.org/fid999/paket.zip" } }) };
    if (u.includes("tmpfiles.org/fid999")) return { ok: true, status: 200, text: async () => '<a href="https://tmpfiles.org/dl/1790.tok/fid999/paket.zip">d</a>' };
    if (u.includes("vexfile.com/api/upload/handle")) return vexResp;
    throw new Error("URL tak dikenal: " + u);
  });
  mockHttp({ ok: true, status: 200, text: async () => '{"id":123456,"error":false,"file":"paket.zip","url":"https:\\/\\/vexfile.com\\/download\\/AbCdEf123"}' });
  const staged = await lib.stageToTmpfiles(Buffer.from("ZIPDATA"), "paket.zip", "application/zip");
  ok("staging → share + direct link /dl/", staged.shareUrl === "https://tmpfiles.org/fid999/paket.zip" && staged.directUrl === "https://tmpfiles.org/dl/1790.tok/fid999/paket.zip");
  const up = await lib.vexfileRemoteUpload("KEYTOK", staged.directUrl);
  ok("remote upload sukses: id/file/url (URL unescape \\/ → /)", up.id === 123456 && up.file === "paket.zip" && up.url === "https://vexfile.com/download/AbCdEf123");
  mockHttp({ ok: false, status: 403, text: async () => '{"error":"User authorization failed: invalid access token"}' });
  let e403 = null; try { await lib.vexfileRemoteUpload("BOGUS", staged.directUrl); } catch (e) { e403 = e.message; }
  ok("token salah → error jujur 'User authorization failed'", /authorization failed/i.test(String(e403)), e403);
  mockHttp({ ok: false, status: 400, text: async () => '{"error":"File download failed: format must be of zip,7z,rar"}' });
  let e400 = null; try { await lib.vexfileRemoteUpload("KEYTOK", staged.directUrl); } catch (e) { e400 = e.message; }
  ok("format ditolak → error jujur 'File download failed'", /File download failed/i.test(String(e400)), e400);
  mockHttp({ ok: false, status: 403, text: async () => "<html><title>Just a moment...</title>challenges.cloudflare.com</html>" });
  let eCF = null; try { await lib.vexfileRemoteUpload("KEYTOK", staged.directUrl); } catch (e) { eCF = e.message; }
  ok("Cloudflare challenge (HTML) → pesan jelas, bukan crash JSON.parse", /Cloudflare challenge/i.test(String(eCF)), eCF);
  mockHttp({ ok: false, status: 500, text: async () => "gateway down" });
  let e500 = null; try { await lib.vexfileRemoteUpload("KEYTOK", staged.directUrl); } catch (e) { e500 = e.message; }
  ok("respon bukan JSON/HTML → HTTP status jujur", /HTTP 500/.test(String(e500)), e500);
  mockHttp({ ok: true, status: 200, text: async () => "" });
  let eEmpty = null; try { await lib.vexfileRemoteUpload("KEYTOK", staged.directUrl); } catch (e) { eEmpty = e.message; }
  ok("respon kosong → ditolak (bukan sukses palsu)", /HTTP 200/.test(String(eEmpty)), eEmpty);

  console.log("─── 4. handler (m fake) ───");
  const { config, handler } = await import(pathToFileURL(plugPath).href);
  const { fromSC } = await import(pathToFileURL(path.join(R, "src/lib/styler.js")).href);
  const norm = (s) => fromSC(String(s)).toLowerCase();
  let replies = [], reacts = [], stagedName = null;
  const fakeM = (over = {}) => ({ args: [], prefix: ".", command: "vexfile", pushName: "Tes", mtype: "", type: "", quoted: null, download: null, reply: (t) => replies.push(String(t)), react: (e) => reacts.push(e), ...over });
  const vexOk = { ok: true, status: 200, text: async () => '{"id":777,"error":false,"file":"upload.zip","url":"https:\\/\\/vexfile.com\\/download\\/Zz9Yx8"}' };
  const mockFlow = (vexResp) => lib._setVexfileHttpForTest(async (u, o) => {
    if (u.includes("tmpfiles.org/api/v1/upload")) {
      stagedName = o?.body?.get ? o.body.get("file")?.name || null : null;
      return { ok: true, status: 200, json: async () => ({ status: "success", data: { url: "https://tmpfiles.org/fid777/upload.zip" } }) };
    }
    if (u.includes("tmpfiles.org/fid777")) return { ok: true, status: 200, text: async () => '<a href="https://tmpfiles.org/dl/1790.tk/fid777/upload.zip">d</a>' };
    if (u.includes("vexfile.com/api/upload/handle")) return vexResp;
    throw new Error("URL tak dikenal");
  });
  lib._setVexfileTokenForTest("");
  replies = []; await handler(fakeM());
  ok("tanpa token → panduan .setkey vexfile", norm(replies[0]).includes("setkey vexfile"));
  lib._setVexfileTokenForTest("KUNCI-TES");
  mockFlow(vexOk);
  replies = []; await handler(fakeM());
  ok("tanpa media → panduan format yang diterima", replies.length === 1 && /Reply atau kirim file/.test(replies[0]));
  replies = []; reacts = []; stagedName = null;
  await handler(fakeM({ mtype: "documentMessage", mimetype: "application/zip", download: async () => Buffer.from("PK-ZIP-BENERAN"), fileName: "mod-apk.zip" }));
  ok("happy path: link vexfile.com/download/ZZ9YX8 (smallcaps-aware) + id", norm(replies[0]).includes("vexfile.com/download/zz9yx8") && norm(replies[0]).includes("777"));
  ok("happy path: file zip langsung (gak dibungkus ulang)", stagedName === "mod-apk.zip" && !/dibungkus/.test(norm(replies[0])));
  ok("reaksi loading 🕒 → 🐣", reacts[0] === "🕒" && reacts.at(-1) === "🐣");
  replies = []; reacts = []; stagedName = null;
  await handler(fakeM({ mtype: "imageMessage", mimetype: "image/jpeg", download: async () => Buffer.from("JPGDATA"), fileName: "foto-makan.jpg" }));
  ok("auto-zip: jpg dibungkus .zip + catatan di balasan", stagedName === "foto-makan.zip" && norm(replies[0]).includes("dibungkus .zip"));
  ok("auto-zip: link vexfile tetap terkirim", norm(replies[0]).includes("vexfile.com/download/"));
  mockFlow({ ok: false, status: 403, text: async () => '{"error":"User authorization failed: invalid access token"}' });
  replies = []; reacts = [];
  await handler(fakeM({ mtype: "documentMessage", mimetype: "application/zip", download: async () => Buffer.from("PK"), fileName: "x.zip" }));
  ok("token kedaluwarsa → error jujur + react ❌", norm(replies[0]).includes("authorization failed") && reacts.at(-1) === "❌");
  ok("pluginConfig: kategori convert + cooldown 15", config.category === "convert" && config.cooldown === 15);

  console.log("─── 5. live upload (opsional, VEXFILE_LIVE=1) ───");
  if (process.env.VEXFILE_LIVE === "1" && String(process.env.VEXFILES_API_KEY || "").trim()) {
    lib._setVexfileHttpForTest(null);
    lib._setVexfileTokenForTest(undefined);
    const zipBuf = await lib.vexZipWrap(Buffer.from("live e2e vexfile " + new Date().toISOString()), "e2e.txt");
    const st = await lib.stageToTmpfiles(zipBuf, "rara-e2e-live.zip", "application/zip");
    const live = await lib.vexfileRemoteUpload(process.env.VEXFILES_API_KEY, st.directUrl);
    ok("LIVE: remote upload nyata balik link vexfile.com/download/", /^https:\/\/vexfile\.com\/download\/[A-Za-z0-9]+$/.test(live.url), live.url);
  } else {
    total++; pass++; console.log("  ✓ (skip — set VEXFILE_LIVE=1 + VEXFILES_API_KEY untuk tes nyata)");
  }

  console.log(`─── hasil: ${pass}/${total} ${pass === total ? "PASSED ✓" : "ADA YANG GAGAL ✗"} ───`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error("E2E CRASH:", e?.stack || e); process.exit(1); });
