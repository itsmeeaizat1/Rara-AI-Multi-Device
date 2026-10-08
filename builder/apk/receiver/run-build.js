// RARA AI - MULTI DEVICE — run-build.js (subprocess build, dipanggil server.js)
// Menjalankan runBuild di proses terpisah biar HTTP /status tetap responsif.
// Arg: <projectBase> <resultFile>   log ke stdout (di-pipe ke builder.log oleh server).
process.on("uncaughtException", (e) => {
  console.error("[builder] FATAL " + (e && e.message));
  try { require("node:fs").writeFileSync(process.argv[3], JSON.stringify({ ok: false, error: String(e.message).slice(-1500) })); } catch {}
  process.exit(1);
});
const { runBuild } = require("./builder.js");
try {
  runBuild(process.argv[2], process.argv[3]);
} catch (e) {
  console.error("[builder] ERROR " + String(e.message || e).slice(-1500));
  try { require("node:fs").writeFileSync(process.argv[3], JSON.stringify({ ok: false, error: String(e.message || e).slice(-1500) })); } catch {}
  process.exit(1);
}
