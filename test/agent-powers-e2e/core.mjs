// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// e2e inti rara-agent-powers: pengaman file tool + screenshot
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as P from "../../src/lib/rara-agent-powers.js";

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log("  ✓", n); } else { fail++; console.log("  ✗", n); } };
const throws = (fn, re, n) => { try { fn(); ok(false, n + " (harusnya throw)"); } catch (e) { ok(re.test(e.message), n + " → " + e.message.slice(0, 60)); } };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "powers-"));
P._setRootForTest(tmp);
fs.mkdirSync(path.join(tmp, "plugins"), { recursive: true });
fs.mkdirSync(path.join(tmp, "node_modules/x"), { recursive: true });
fs.mkdirSync(path.join(tmp, ".git"), { recursive: true });
fs.writeFileSync(path.join(tmp, ".env"), "SECRET=1");
fs.writeFileSync(path.join(tmp, "apikeys.json"), "{}");
fs.writeFileSync(path.join(tmp, "plugins/a.js"), "export const x = 1;\nexport const y = 2;\nexport const z = 1;\n");
fs.writeFileSync(path.join(tmp, "notes.md"), "halo dunia\nhalo dunia\n");

console.log("[1] safeRepoPath — pengaman");
throws(() => P.safeRepoPath("../etc/passwd"), /luar folder/, "traversal ../");
throws(() => P.safeRepoPath("/etc/passwd", { mustExist: true }), /luar folder|gak ada/, "absolut /etc/passwd");
throws(() => P.safeRepoPath("plugins/../../x"), /luar folder/, "traversal tengah");
throws(() => P.safeRepoPath(".env"), /diproteksi/, ".env");
throws(() => P.safeRepoPath(".env.production"), /diproteksi/, ".env.production");
throws(() => P.safeRepoPath("apikeys.json"), /diproteksi/, "apikeys.json");
throws(() => P.safeRepoPath("node_modules/x/index.js"), /diproteksi/, "node_modules");
throws(() => P.safeRepoPath(".git/config"), /diproteksi/, ".git");
throws(() => P.safeRepoPath("data/session/creds.json"), /diproteksi/, "session/creds");
throws(() => P.safeRepoPath(""), /kosong/, "path kosong");
ok(P.safeRepoPath("plugins/a.js").rel === "plugins/a.js", "path normal lolos");

console.log("[2] readRepoFile / listRepoFiles");
{
  const r = P.readRepoFile("plugins/a.js");
  ok(r.totalLines >= 3 && /1\| export const x/.test(r.text), "baca dengan nomor baris");
  const r2 = P.readRepoFile("plugins/a.js", { from: 2, lines: 1 });
  ok(/^2\| export const y/.test(r2.text), "baca rentang baris");
  throws(() => P.readRepoFile("plugins/nope.js"), /gak ada/, "file gak ada");
  throws(() => P.readRepoFile(".env"), /diproteksi/, "baca .env ditolak");
  const l = P.listRepoFiles(".");
  ok(l.items.includes("plugins/") && l.items.includes("notes.md"), "list root");
  ok(!l.items.includes(".env") && !l.items.includes("node_modules/") && !l.items.includes(".git/") && !l.items.includes("apikeys.json"), "list menyembunyikan terlarang");
  ok(P.listRepoFiles("plugins").items.includes("a.js"), "list subfolder");
  throws(() => P.listRepoFiles("../"), /luar folder/, "list luar repo");
}

console.log("[3] editRepoFile");
{
  const r = P.editRepoFile("plugins/a.js", "export const y = 2;", "export const y = 99;");
  ok(r.replaced === 1 && /y = 99/.test(fs.readFileSync(path.join(tmp, "plugins/a.js"), "utf8")), "edit sukses");
  ok(fs.existsSync(path.join(tmp, "plugins/a.js.bak")) && /y = 2/.test(fs.readFileSync(path.join(tmp, "plugins/a.js.bak"), "utf8")), "backup .bak berisi versi lama");
  throws(() => P.editRepoFile("plugins/a.js", "const", "let"), /ketemu 3x/, "ambigu ditolak");
  const ra = P.editRepoFile("notes.md", "halo", "hai", { all: true });
  ok(ra.replaced === 2 && fs.readFileSync(path.join(tmp, "notes.md"), "utf8") === "hai dunia\nhai dunia\n", "replace all");
  throws(() => P.editRepoFile("plugins/a.js", "GAK ADA", "x"), /gak ketemu/, "find gak ketemu");
  throws(() => P.editRepoFile("plugins/a.js", "", "x"), /kosong/, "find kosong");
  const before = fs.readFileSync(path.join(tmp, "plugins/a.js"), "utf8");
  throws(() => P.editRepoFile("plugins/a.js", "export const z = 1;", "export const z = {{{;"), /syntax error.*DIBATALKAN/, "syntax rusak → ditolak");
  ok(fs.readFileSync(path.join(tmp, "plugins/a.js"), "utf8") === before, "ROLLBACK: file utuh setelah syntax error");
  throws(() => P.editRepoFile(".env", "SECRET", "X"), /diproteksi/, "edit .env ditolak");
  ok(fs.readFileSync(path.join(tmp, ".env"), "utf8") === "SECRET=1", ".env tak berubah");
}

console.log("[4] writeRepoFile");
{
  const r = P.writeRepoFile("plugins/baru.js", "export const ok = true;\n");
  ok(r.created && fs.existsSync(path.join(tmp, "plugins/baru.js")), "file baru dibuat");
  P.writeRepoFile("docs/sub/catatan.md", "# hai");
  ok(fs.existsSync(path.join(tmp, "docs/sub/catatan.md")), "folder bersarang otomatis");
  throws(() => P.writeRepoFile("plugins/baru.js", "export const b = 1;"), /sudah ada/, "timpa tanpa izin ditolak");
  const o = P.writeRepoFile("plugins/baru.js", "export const b = 2;\n", { overwrite: true });
  ok(!o.created && o.backup === "plugins/baru.js.bak", "timpa eksplisit + backup");
  throws(() => P.writeRepoFile("plugins/rusak.js", "export const = ;"), /syntax error/, "js rusak ditolak");
  ok(!fs.existsSync(path.join(tmp, "plugins/rusak.js")), "ROLLBACK: file baru rusak dihapus");
  const keep = fs.readFileSync(path.join(tmp, "plugins/baru.js"), "utf8");
  throws(() => P.writeRepoFile("plugins/baru.js", "export const = ;", { overwrite: true }), /syntax error/, "timpa dengan js rusak ditolak");
  ok(fs.readFileSync(path.join(tmp, "plugins/baru.js"), "utf8") === keep, "ROLLBACK: file lama dikembalikan");
  throws(() => P.writeRepoFile(".env", "X=1", { overwrite: true }), /diproteksi/, "tulis .env ditolak");
  throws(() => P.writeRepoFile("../luar.txt", "x"), /luar folder/, "tulis luar repo ditolak");
  throws(() => P.writeRepoFile("a.txt", "   "), /kosong/, "isi kosong ditolak");
  throws(() => P.writeRepoFile("besar.txt", "x".repeat(400 * 1024 + 1)), /terlalu besar/, "isi >400KB ditolak");
}

console.log("[5] assertPublicUrl (anti-SSRF) + screenshot");
{
  for (const u of ["http://localhost:3000", "http://127.0.0.1/", "http://192.168.1.1/", "http://10.0.0.5", "http://169.254.169.254/latest/meta-data", "http://172.16.0.1", "file:///etc/passwd", "ftp://x.com", "http://foo.internal/"]) {
    throws(() => P.assertPublicUrl(u), /diblokir|cuma http|gak valid/, "blokir " + u);
  }
  ok(P.assertPublicUrl("https://example.com/a?b=1").startsWith("https://example.com"), "URL publik lolos");
  P._setScreenshotForTest(async (u, o) => ({ title: "T", description: "D", text: "isi " + u, screenshot: Buffer.alloc(5000, 1), fullPage: o.fullPage }));
  const s = await P.screenshotPage("https://example.com", { fullPage: true });
  ok(s.title === "T" && Buffer.isBuffer(s.screenshot) && s.fullPage === true, "screenshotPage (seam) + fullPage");
  let threw = false; try { await P.screenshotPage("http://localhost/"); } catch { threw = true; }
  ok(threw, "screenshotPage menolak localhost");
  P._clearScreenshotForTest();
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nTOTAL: ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
