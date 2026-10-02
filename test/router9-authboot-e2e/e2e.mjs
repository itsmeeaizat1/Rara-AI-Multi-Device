// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// e2e bootstrap file auth 9router: machine-id + auth/cli-secret dibuat sendiri
// bila hilang (report owner 2 Okt: "machine-id HILANG, cli-secret HILANG" → 401).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "r9auth-"));
process.env.ROUTER9_DATA_DIR = dir;       // sebelum import: dibaca lewat getter, aman
process.env.ROUTER9_NO_SPAWN = "1";
const M = await import("../../src/lib/rara-9router-local.js");

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log("  ✓", n); } else { fail++; console.log("  ✗", n); } };
const mid = () => path.join(dir, "machine-id");
const sec = () => path.join(dir, "auth", "cli-secret");
const expectToken = (a, b) => crypto.createHash("sha256").update(a + "9r-cli-auth" + b).digest("hex").slice(0, 16);

console.log("[1] kondisi awal persis seperti report: kedua file hilang");
{
  ok(!fs.existsSync(mid()) && !fs.existsSync(sec()), "folder data kosong");
  ok(M.router9AuthDiag().tokenReady === false, "diag: tokenReady=false");
  ok(!fs.existsSync(mid()) && !fs.existsSync(sec()), "diag TIDAK membuat file (hanya baca)");
}

console.log("[2] ensureRouter9AuthFiles membuat keduanya");
{
  fs.rmSync(mid(), { force: true }); fs.rmSync(path.join(dir, "auth"), { recursive: true, force: true });
  ok(typeof M.ensureRouter9AuthFiles === "function", "fungsi diekspor");
  const r = M.ensureRouter9AuthFiles();
  ok(r.created.includes("machine-id") && r.created.includes("cli-secret"), "melaporkan kedua file dibuat: " + r.created.join(","));
  ok(fs.existsSync(mid()) && fs.existsSync(sec()), "kedua file ada di disk");
  const m = fs.readFileSync(mid(), "utf8").trim(), s = fs.readFileSync(sec(), "utf8").trim();
  ok(/^[0-9a-f-]{16,}$/i.test(m), "machine-id berisi id valid");
  ok(/^[0-9a-f]{64}$/.test(s), "cli-secret = 32 byte hex (format sama dgn server 9router)");
  ok((fs.statSync(mid()).mode & 0o777) === 0o600 && (fs.statSync(sec()).mode & 0o777) === 0o600, "izin file 0600 (sama dgn server)");
  ok(M.router9AuthDiag().tokenReady === true, "diag: tokenReady=true");
  ok(M.getRouter9CliToken() === expectToken(m, s), "token = sha256(mid+'9r-cli-auth'+secret)[0:16] (identik dgn rumus server)");
}

console.log("[2b] getRouter9CliToken (jalur mgmtApi) menyembuhkan sendiri");
{
  fs.rmSync(mid(), { force: true }); fs.rmSync(path.join(dir, "auth"), { recursive: true, force: true });
  const tok = M.getRouter9CliToken();
  ok(/^[0-9a-f]{16}$/.test(tok), "token valid walau file hilang (dulu: string kosong → 401)");
  ok(fs.existsSync(mid()) && fs.existsSync(sec()), "file dibuat otomatis oleh pemanggil token");
  ok(tok === expectToken(fs.readFileSync(mid(), "utf8").trim(), fs.readFileSync(sec(), "utf8").trim()), "token konsisten dgn isi file");
  ok(M.getRouter9CliToken() === tok, "token stabil antar panggilan");
}

console.log("[3] idempoten & tidak menimpa file yang sudah ada");
{
  const m1 = fs.readFileSync(mid(), "utf8"), s1 = fs.readFileSync(sec(), "utf8");
  const r = M.ensureRouter9AuthFiles();
  ok(r.created.length === 0, "panggilan kedua: tidak membuat apa-apa");
  ok(fs.readFileSync(mid(), "utf8") === m1 && fs.readFileSync(sec(), "utf8") === s1, "isi file TIDAK berubah (penting: jangan putus sync dgn server hidup)");
}

console.log("[4] pulih sebagian: hanya satu file hilang");
{
  const m1 = fs.readFileSync(mid(), "utf8");
  fs.rmSync(sec());
  const r = M.ensureRouter9AuthFiles();
  ok(r.created.join(",") === "cli-secret", "hanya cli-secret dibuat ulang");
  ok(fs.readFileSync(mid(), "utf8") === m1, "machine-id yang ada tidak disentuh");
  fs.rmSync(mid());
  const r2 = M.ensureRouter9AuthFiles();
  ok(r2.created.join(",") === "machine-id", "hanya machine-id dibuat ulang");
}

console.log("[5] file kosong/rusak dianggap hilang");
{
  fs.writeFileSync(sec(), "   \n");
  const r = M.ensureRouter9AuthFiles();
  ok(r.created.includes("cli-secret"), "cli-secret kosong → dibuat ulang");
  ok(/^[0-9a-f]{64}$/.test(fs.readFileSync(sec(), "utf8").trim()), "isi baru valid");
}

console.log("[6] gagal tulis → tidak melempar, lapor jujur");
{
  const ro = fs.mkdtempSync(path.join(os.tmpdir(), "r9ro-"));
  const blocker = path.join(ro, "file"); fs.writeFileSync(blocker, "x");
  process.env.ROUTER9_DATA_DIR = path.join(blocker, "sub"); // induk = file biasa → mkdir gagal
  let threw = false, r;
  try { r = M.ensureRouter9AuthFiles(); } catch { threw = true; }
  ok(!threw, "tidak melempar exception");
  ok(r && r.errors.length > 0 && r.created.length === 0, "error dilaporkan jujur: " + (r?.errors[0] || "").slice(0, 50));
  process.env.ROUTER9_DATA_DIR = dir;
  fs.rmSync(ro, { recursive: true, force: true });
}

console.log("[7] ROUTER9_CLI_TOKEN override tetap menang");
{
  process.env.ROUTER9_CLI_TOKEN = "abc123";
  ok(M.getRouter9CliToken() === "abc123", "override env dihormati");
  delete process.env.ROUTER9_CLI_TOKEN;
}

fs.rmSync(dir, { recursive: true, force: true });
console.log(`\nTOTAL: ${pass}/${pass + fail}`);
process.exit(fail ? 1 : 0);
