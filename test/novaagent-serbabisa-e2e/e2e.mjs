// E2E .novaagent SERBA BISA (request owner 12 Sep 2026: "aku maunya dia bisa
// browsing, bsa download file dr web, bsa buatkan file kyk txt, doc, xls, ja,
// html dll, serba bisa layaknya superagent sungguhan"):
//   * tool download — unduh file dari URL + kirim dokumen
//   * tool createfile — bikin txt/doc/xls(xlsx asli exceljs)/js/html/dll
//   * localParse instan "download <url>" tanpa AI call
//   * pattern browsing diperluas (cari di web/google, harga barang)
// Semua network di-mock (globalThis.fetch stub).
import { initDatabase } from "../../src/lib/nova-database.js";
import { localParse, TOOLS, needsWebSearch, buildThinkSystemPrompt } from "../../src/lib/aiagent.js";
import { parseCsvContent, buildWorkbook, buildWordHtml } from "../../src/lib/nova-createfile.js";

await initDatabase("/tmp/novaagent-serbabisa-e2e-db.json");
let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra) => { w((ok ? "✅ " : "❌ ") + name + (ok ? "" : extra ? " — " + extra : "")); ok ? pass++ : fail++; };

// ═══ 1. localParse instan download ═══
w("\n— localParse download —");
t("1a. 'download file ini https://situs.com/app.apk' → instan tool download", localParse("download file ini https://situs.com/app.apk")?.tool === "download" && localParse("download file ini https://situs.com/app.apk")?.args?.url === "https://situs.com/app.apk");
t("1b. 'unduhin https://x.com/data.zip' → download", localParse("unduhin https://x.com/data.zip")?.tool === "download");
t("1c. 'download dong' TANPA url → null (lanjut ke AI)", localParse("download dong") === null);
t("1d. 'tutup grup' tetep closegc (regresi)", localParse("tutup grup")?.tool === "closegc");

// ═══ 2. pattern browsing diperluas ═══
w("\n— pattern browsing —");
t("2a. 'cari di google harga hp terbaik' → butuh search", needsWebSearch("cari di google harga hp terbaik"));
t("2b. 'cek di web kabar gempa' → butuh search", needsWebSearch("cek di web kabar gempa"));
t("2c. 'buatkan file txt daftar belanja' → false (bukan browsing)", !needsWebSearch("buatkan file txt daftar belanja"));
t("2d. 'download https://x.apk' → false (bukan browsing, jalur download)", !needsWebSearch("download https://x.apk"));

// ═══ 3. TOOLS ke-daftar + prompt ═══
w("\n— TOOLS & prompt —");
t("3a. TOOLS.download ada (perm user, args url)", !!TOOLS.download && TOOLS.download.perm === "user" && TOOLS.download.args.includes("url"));
t("3b. TOOLS.createfile ada (args name/ext/content)", !!TOOLS.createfile && TOOLS.createfile.args.includes("content"));
const prompt = buildThinkSystemPrompt({ botname: "Nova AI" });
t("3c. prompt ke-list download + createfile (dari TOOLS desc)", prompt.includes("UNDUH FILE") && prompt.includes("MEMBUAT FILE"));
t("3d. prompt ada contoh download + createfile + excel", prompt.includes("download apk dari") && prompt.includes("buatkan file txt") && prompt.includes("file Excel"));

// ═══ 4. tool.download run (fetch stub) ═══
w("\n— tool download —");
const realFetch = globalThis.fetch;
const sent = [];
const conn = { sendMessage: async (chat, msg) => { sent.push(msg); return { key: {} }; }, groupLeave: async () => {} };
const mockM = { chat: "pc@test", sender: "x@test" };

globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes("app.apk")) {
    return new Response(Buffer.from("APKDATA"), {
      status: 200,
      headers: { "content-type": "application/vnd.android.package-archive", "content-length": "7" },
    });
  }
  if (u.includes("halaman")) {
    return new Response("<html><body>halaman web biasa</body></html>", { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  }
  if (u.includes("gede.zip")) {
    return new Response("", { status: 200, headers: { "content-length": String(999 * 1024 * 1024) } });
  }
  if (u.includes("hasil.txt")) {
    return new Response("isi file txt", { status: 200, headers: { "content-type": "text/plain", "content-disposition": 'attachment; filename="hasil-custom.txt"' } });
  }
  return new Response("", { status: 404 });
};
globalThis.Response = realFetch.Response || globalThis.Response;

await TOOLS.download.run(conn, mockM, { url: "https://situs.com/app.apk" });
t("4a. download apk → dokumen terkirim + nama file dari URL + mime apk", sent.at(-1)?.document?.length > 0 && sent.at(-1)?.fileName === "app.apk" && sent.at(-1)?.mimetype === "application/vnd.android.package-archive", JSON.stringify(sent.at(-1)));

await TOOLS.download.run(conn, mockM, { url: "https://situs.com/hasil.txt" });
t("4b. nama file dari Content-Disposition", sent.at(-1)?.fileName === "hasil-custom.txt");

let errHtml = "";
try { await TOOLS.download.run(conn, mockM, { url: "https://situs.com/halaman" }); } catch (e) { errHtml = e.message; }
t("4c. halaman web tanpa ext → ditolak jelas", /halaman web/.test(errHtml), errHtml);

let errBig = "";
try { await TOOLS.download.run(conn, mockM, { url: "https://situs.com/gede.zip" }); } catch (e) { errBig = e.message; }
t("4d. file kegedean (content-length) → ditolak", /kegedean/.test(errBig), errBig);

let err404 = "";
try { await TOOLS.download.run(conn, mockM, { url: "https://situs.com/ngaco.xyz" }); } catch (e) { err404 = e.message; }
t("4e. HTTP 404 → error jelas", /HTTP 404/.test(err404), err404);

let errNoUrl = "";
try { await TOOLS.download.run(conn, mockM, { url: "bukan-url" }); } catch (e) { errNoUrl = e.message; }
t("4f. bukan URL → error jelas", /link langsung/.test(errNoUrl), errNoUrl);

globalThis.fetch = realFetch;

// ═══ 5. tool.createfile run ═══
w("\n— tool createfile —");
await TOOLS.createfile.run(conn, mockM, { name: "daftarbelanja", ext: "txt", content: "DAFTAR BELANJA\n1. Beras 5kg\n2. Gula 1kg" });
const fTxt = sent.at(-1);
t("5a. txt → dokumen nama+isi pas", fTxt?.fileName === "daftarbelanja.txt" && Buffer.from(fTxt.document).toString().includes("Beras 5kg") && fTxt.mimetype === "text/plain");

await TOOLS.createfile.run(conn, mockM, { name: "datasiswa", ext: "xlsx", content: "Nama,Kelas,Uang\nAndi,7A,\"1,000\"\nBudi,7B,500" });
const fXls = sent.at(-1);
const xlsBuf = Buffer.from(fXls.document);
t("5b. xlsx → workbook Excel ASLI (header PK zip + mimetype xlsx)", xlsBuf.slice(0, 2).toString() === "PK" && fXls.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" && fXls.fileName === "datasiswa.xlsx");

await TOOLS.createfile.run(conn, mockM, { name: "laporan", ext: "doc", content: "JUDUL LAPORAN\n\nIni isi paragraf **penting**." });
const fDoc = sent.at(-1);
const docStr = Buffer.from(fDoc.document).toString();
t("5c. doc → Word HTML compatible (namespace word + <b>)", fDoc.fileName === "laporan.doc" && fDoc.mimetype === "application/msword" && docStr.includes("urn:schemas-microsoft-com:office:word") && docStr.includes("<b>penting</b>"));

await TOOLS.createfile.run(conn, mockM, { name: "tokokue", ext: "html", content: "<!DOCTYPE html><html><body><h1>Toko Kue</h1></body></html>" });
const fHtml = sent.at(-1);
t("5d. html → dokumen text/html", fHtml?.fileName === "tokokue.html" && fHtml?.mimetype === "text/html");

await TOOLS.createfile.run(conn, mockM, { name: "script", ext: "javascript", content: "console.log('hai')" });
const fJs = sent.at(-1);
t("5e. ext 'javascript' dinormalisasi jadi js", fJs?.fileName === "script.js", fJs?.fileName);

await TOOLS.createfile.run(conn, mockM, { name: "kode", ext: "pdf", content: "var kode = 1; // kode program" });
const fFall = sent.at(-1);
t("5f. ext gak dikenal (pdf) + konten kode → fallback js", fFall?.fileName === "kode.js", fFall?.fileName);

await TOOLS.createfile.run(conn, mockM, { name: "catatan", ext: "pdf", content: "isi teks biasa aja" });
const fFall2 = sent.at(-1);
t("5g. ext gak dikenal + teks biasa → fallback txt", fFall2?.fileName === "catatan.txt", fFall2?.fileName);

let errEmpty = "";
try { await TOOLS.createfile.run(conn, mockM, { name: "x", ext: "txt", content: "" }); } catch (e) { errEmpty = e.message; }
t("5h. content kosong → error jelas", /content.*kosong|kosong.*content/i.test(errEmpty), errEmpty);

// ═══ 6. helper nova-createfile unit ═══
w("\n— helper createfile —");
const rows = parseCsvContent('Nama,Uang,Kota\n"Aizat, Jr","1.5",Jakarta\nBudi,2,Bandung');
t("6a. CSV kutip ganda + koma dalam kutip", JSON.stringify(rows[1][0]) === '"Aizat, Jr"' || rows[1][0] === "Aizat, Jr", JSON.stringify(rows));
t("6b. CSV jumlah kolom konsisten", rows.length === 3 && rows.every((r) => r.length === 3));
const wbBuf = await buildWorkbook(rows, "tes");
t("6c. buildWorkbook → buffer xlsx asli", Buffer.isBuffer(wbBuf) && wbBuf.length > 4000 && wbBuf.slice(0, 2).toString() === "PK");
t("6d. buildWordHtml plain text → <p> + **bold** jadi <b>", buildWordHtml("Judul\n\nparagraf **x**").includes("<b>x</b>"));
t("6e. buildWordHtml content HTML langsung → gak dibungkus <p>", buildWordHtml("<h1>Hi</h1>").includes("<h1>Hi</h1>"));

w(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
