// E2E hiai-abort-resilience — fix bug "ABORTED" (.hiaiagent macet total setelah 1x koneksi putus)
// Root cause: error Node internal murni "Error: aborted" (TLSSocket.socketCloseListener, premature
// socket close) gak dikenal sama sekali oleh classifier (classifyApiError/isDownstreamApiError), jadi
// (1) mcpLoopOnce/mcpLoopWithFallback gak retry model/key lain — langsung throw ke atas, dan
// (2) handleError nganggep ini "bug kode" lalu manggil AI self-heal (runAgent) buat write_file edit
//     OTOMATIS tanpa konfirmasi manual — padahal stack trace-nya 100% internal Node (gak ada 1 pun
//     file project kesebut), jadi AI healer nebak sembarangan dan bisa ngerusak kode yang sehat.
// Jalankan dari ROOT repo: node test/hiai-abort-resilience-e2e/run.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const HEAL_LOG_PATH = path.join(ROOT, "data", "auto-heal-log.json");

let pass = 0, total = 0;
function ok(name, cond, detail = "") {
  total++;
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else console.log(`  ✗ ${name} ${detail}`);
}
console.log("─── HIAI abort-resilience e2e ───");

// Backup auto-heal-log.json kalau sudah ada (jangan ganggu state asli)
const hadHealLog = fs.existsSync(HEAL_LOG_PATH);
const healLogBackup = hadHealLog ? fs.readFileSync(HEAL_LOG_PATH, "utf-8") : null;

const mcp = await import("../../src/lib/hiai/mcp.js");

// 1. classifyApiError (via isTransientApiError) sekarang kenal "aborted" sebagai network error,
//    bukan error misterius yang bikin mcpLoopOnce/mcpLoopWithFallback langsung nyerah.
ok(
  "isTransientApiError('aborted') = true (dikenal sebagai network blip)",
  mcp.isTransientApiError(new Error("aborted")) === true
);
ok(
  "isTransientApiError('socket hang up') = true",
  mcp.isTransientApiError(new Error("socket hang up")) === true
);
ok(
  "isTransientApiError(ECONNABORTED) = true",
  mcp.isTransientApiError(new Error("connect ECONNABORTED 1.2.3.4:443")) === true
);
// Sanity — gak jadi false-positive buat error gak-relevan yang kebetulan punya substring beda
ok(
  "isTransientApiError(SyntaxError biasa) = false (bukan network error)",
  mcp.isTransientApiError(new Error("Unexpected token } in JSON")) === false
);

// Helper bikin fake conn buat nangkep semua teks yang dikirim handleError
function makeFakeConn() {
  const sent = [];
  return {
    sent,
    sendMessage: async (jid, payload) => { sent.push({ jid, payload }); return { key: {} }; },
  };
}
const fakeM = { key: { remoteJid: "628111@s.whatsapp.net" }, sender: "628111@s.whatsapp.net", chat: "628111@s.whatsapp.net" };
// Simulasikan sender = OWNER (persis skenario nyata user: ".hiaiagent" dipanggil dari chat
// "Kirim pesan ke diri sendiri" di WA, yaitu owner sendiri) biar balasan detail/teknis
// (bukan versi generik non-owner) yang ketes.
const prevOwner = global.settings?.owner;
global.settings = { ...(global.settings || {}), owner: [["628111", "Owner Test"]] };

// 2. Error "aborted" dengan stack 100% internal Node (persis kasus nyata user) — HARUS kena
//    isDownstreamApiError duluan (friendly message), BUKAN masuk ke jalur auto-heal/self-fix sama sekali.
{
  const conn = makeFakeConn();
  const err = new Error("aborted");
  err.stack = [
    "Error: aborted",
    "    at TLSSocket.socketCloseListener (node:_http_client:464:19)",
    "    at TLSSocket.emit (node:events:536:35)",
    "    at node:net:343:12",
    "    at TCP.done (node:tls_wrap:669:7)",
    "    at TCP.callbackTrampoline (node:internal/async_hooks:130:17)",
  ].join("\n");
  await mcp.handleError(conn, fakeM, err, "unknown");
  const texts = conn.sent.map(s => s.payload?.text || "").join(" | ");
  ok(
    "error 'aborted' internal-Node → balasan friendly, BUKAN kartu 'SOMETHING WENT WRONG, FIXING IT'",
    conn.sent.length > 0 && !/fixing it|Auto-fix in progress/i.test(texts),
    texts.slice(0, 160)
  );
  ok(
    "error 'aborted' internal-Node → TIDAK ada 'gak ada file project yang teridentifikasi' juga (sudah ke-cut di langkah sebelumnya, isDownstreamApiError duluan)",
    !/gak ada file project/i.test(texts)
  );
}

// 3. Error LAIN yang gak match classifier sama sekali, TAPI stack-nya juga 100% internal Node
//    (gak ada 1 pun file project) — harus kena guard baru: SKIP auto-heal, kasih tau manual,
//    JANGAN coba manggil self-heal (runAgent) buta tanpa konteks file.
{
  const conn = makeFakeConn();
  const err = new Error("Mysterious internal glitch xyz123");
  err.stack = [
    "Error: Mysterious internal glitch xyz123",
    "    at Object.onceWrapper (node:events:632:28)",
    "    at WriteStream.emit (node:events:536:35)",
    "    at node:internal/streams/writable:573:12",
  ].join("\n");
  await mcp.handleError(conn, fakeM, err, "unknown");
  const texts = conn.sent.map(s => s.payload?.text || "").join(" | ");
  ok(
    "error tanpa file project teridentifikasi → di-skip, kasih tau manual, bukan auto-fix buta",
    /gak ada file project yang teridentifikasi/i.test(texts),
    texts.slice(0, 200)
  );
  ok(
    "error tanpa file project teridentifikasi → BUKAN kartu auto-heal 'Auto-fix in progress'",
    !/Auto-fix in progress|SOMETHING WENT WRONG, FIXING IT/i.test(texts)
  );
}

// 4. Error dengan file project YANG teridentifikasi di stack — guard baru TIDAK ngeblok ini,
//    tetap lanjut ke jalur auto-heal normal (defense baru cuma buat yang bener2 gak ada konteks).
{
  const conn = makeFakeConn();
  const dummyFile = path.join(ROOT, "src", "lib", "hiai", "mcp.js");
  const err = new Error("TypeError: cannot read property of undefined (dummy test)");
  err.stack = `TypeError: cannot read property of undefined (dummy test)\n    at run (${dummyFile}:9999:1)`;
  await mcp.handleError(conn, fakeM, err, "unknown-with-file-test");
  const texts = conn.sent.map(s => s.payload?.text || "").join(" | ");
  ok(
    "error DENGAN file project teridentifikasi → TIDAK kena guard 'gak ada file project'",
    !/gak ada file project yang teridentifikasi/i.test(texts),
    texts.slice(0, 200)
  );
}

if (global.settings) global.settings.owner = prevOwner;

// Beberin lagi auto-heal-log.json ke state semula (jangan ninggalin bekas test di repo)
if (hadHealLog) {
  fs.writeFileSync(HEAL_LOG_PATH, healLogBackup);
} else if (fs.existsSync(HEAL_LOG_PATH)) {
  fs.unlinkSync(HEAL_LOG_PATH);
}

console.log(`─── hasil: ${pass}/${total} PASSED ${pass === total ? "✓" : "✗"} ───`);
process.exit(pass === total ? 0 : 1);
