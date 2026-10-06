// E2E — LADDER DIRECT-FIRST yt-dlp (feat 6 Okt 2026)
// Fix .play VPS Pterodactyl: direct polos duluan (terbukti paling lancar di
// IP bersih), baru +cookies, baru +proxy pool. Manual = prioritas #1.
// Cakupan: urutan anak tangga audio+video, eror non-bot-check langsung
// dilanjut, cookies file dipakai cuma di anak tangga 2, pool di tangga 3 +
// reportProxyResult, manual skip ladder, output file terbaca.
import { strict as assert } from "assert";
import fs from "fs";
import os from "os";
import path from "path";

const R = path.resolve(".");
let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
function t(name, cond, extra = "") {
  if (cond) { pass++; w(`  ✅ ${name}`); }
  else { fail++; w(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}
process.on("uncaughtException", (e) => { w("UNCAUGHT: " + (e?.stack || e)); process.exit(1); });
process.on("unhandledRejection", (e) => { w("REJECTION: " + (e?.stack || e)); process.exit(1); });

const pool = await import(R + "/src/lib/rara-proxy-pool.js");
const ytdlp = await import(R + "/src/scraper/rara-ytdlp.js");

// ═══ helpers ═══
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ytdirect-e2e-"));
const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });
const cookieFile = path.join(dataDir, "yt-cookies.txt");
const manualFile = path.join(dataDir, "yt-proxy.txt");
const BOTCHECK = "Command failed: ERROR: [youtube] xyz: Sign in to confirm you're not a bot. Use --cookies";
const REALMP3 = Buffer.alloc(20000, 0xff); // > 10000 bytes biar lolos cek

let cmds = [];        // daftar command yang "dieksekusi" mock
let behavior = null;  // fn(cmd) → throw atau undefined (sukses)

// mock exec: nangkap command, simulasi get-title/download, tulis file output
ytdlp._setYtdlpRunForTest(async (cmd) => {
  cmds.push(cmd);
  if (behavior) behavior(cmd);
  if (cmd.includes("--get-title")) return { stdout: "Judul Tes Video" };
  // simulasi download: tulis file output sesuai -o "....%(ext)s"
  const m = cmd.match(/-o "([^"]+)\.%\(ext\)s"/);
  if (m) {
    const base = m[1].replace(/\.$/, ""); // buang titik sisa biar path persis
    fs.writeFileSync(base + ".mp3", REALMP3);
    fs.writeFileSync(base + ".mp4", REALMP3);
  }
  return { stdout: "" };
});

function reset() {
  cmds = [];
  behavior = null;
  delete process.env.NOVA_YTDLP_PROXY;
  delete process.env.NOVA_YTDLP_COOKIES;
  process.env.RARA_YT_AUTO_PROXY = "0"; // pool default mati biar test terisolasi
  try { fs.unlinkSync(cookieFile); } catch {}
  try { fs.unlinkSync(manualFile); } catch {}
  pool.resetAutoProxyPool();
  pool._setPoolFetchForTest(null);
  pool._setPoolNetForTest(null);
}
const URL_TES = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

// ═══ SECTION 1: direct sukses — gak ada flags tambahan ═══
w("\n— section 1: direct-first sukses —");
reset();
let r = await ytdlp.downloadAudioYtDlp(URL_TES, "128");
t("1a. audio direct sukses (buffer > 10000)", r.buffer.length === 20000 && r.title === "Judul Tes Video");
t("1b. get-title + download = 2 command", cmds.length === 2, JSON.stringify(cmds));
t("1c. direct TANPA --proxy & --cookies", !/--proxy|--cookies/.test(cmds[0]) && !/--proxy|--cookies/.test(cmds[1]), cmds[0]);
t("1d. hasil bawa kbps", r.kbps === "128");

// ═══ SECTION 2: bot-check → pool mati & gak ada cookies → eror bot-check ═══
w("\n— section 2: direct kena bot-check, gak ada bala bantuan —");
reset();
behavior = (cmd) => { throw new Error(BOTCHECK); };
let threw = null;
try { await ytdlp.downloadAudioYtDlp(URL_TES, "128"); } catch (e) { threw = e; }
t("2a. eror bot-check dilanjut ke pemanggil", /Sign in to confirm/.test(threw?.message || ""));
t("2b. cuma 1 command (get-title direct) — gak ada retry sia-sia", cmds.length === 1, String(cmds.length));

// ═══ SECTION 3: bot-check direct → cookies ada → sukses lewat cookies ═══
w("\n— section 3: tangga 2 = cookies —");
reset();
fs.writeFileSync(cookieFile, "# Netscape\n.youtube.com\tTRUE\t/\tTRUE\t0\tSOCS\tCAI\n".repeat(10));
behavior = (cmd) => {
  if (cmd.includes("--get-title") && !cmd.includes("--cookies")) throw new Error(BOTCHECK);
};
r = await ytdlp.downloadAudioYtDlp(URL_TES, "128");
t("3a. sukses lewat cookies", r.buffer.length === 20000);
t("3b. attempt 1 direct (tanpa cookies), attempt 2 +cookies", cmds.length === 3 && !cmds[0].includes("--cookies") && cmds[1].includes("--cookies"), cmds.map(c => c.includes("--cookies")).join(","));
t("3c. download command ikut bawa --cookies", cmds[1].includes("--cookies"));
try { fs.unlinkSync(cookieFile); } catch {}

// ═══ SECTION 4: bot-check direct+cookies → pool nyala → sukses lewat pool ═══
w("\n— section 4: tangga 3 = proxy pool —");
reset();
fs.writeFileSync(cookieFile, "# Netscape\n.youtube.com\tTRUE\t/\tTRUE\t0\tSOCS\tCAI\n".repeat(10));
process.env.RARA_YT_AUTO_PROXY = "1";
// fake pool: kandidat hidup lewat seam net httpOk
const { EventEmitter } = await import("events");
pool._setPoolFetchForTest(async () => "5.5.5.5:80\n");
pool._setPoolNetForTest({
  connect() {
    const s = new EventEmitter();
    s.write = () => {};
    s.destroy = () => {};
    process.nextTick(() => { s.emit("connect"); s.emit("data", Buffer.from("HTTP/1.1 204 No Content\r\n\r\n")); });
    return s;
  },
});
behavior = (cmd) => {
  if (cmd.includes("--get-title") && !cmd.includes('--proxy "http://5.5.5.5:80"')) throw new Error(BOTCHECK);
};
r = await ytdlp.downloadAudioYtDlp(URL_TES, "128");
t("4a. sukses lewat proxy pool", r.buffer.length === 20000);
t("4b. urutan: direct → cookies → pool", cmds.length === 4 && !cmds[0].includes("--proxy") && !cmds[1].includes("--proxy") && cmds[2].includes('--proxy "http://5.5.5.5:80"') && cmds[3].includes('--proxy "http://5.5.5.5:80"'), String(cmds.length));
t("4c. pool proxy sukses dilaporkan (masuk ok)", pool.getAutoProxyStats().okCount >= 1, JSON.stringify(pool.getAutoProxyStats().ok));
try { fs.unlinkSync(cookieFile); } catch {}

// ═══ SECTION 5: pool gagal juga → eror bot-check + proxy di-blacklist ═══
w("\n— section 5: semua tangga gugur —");
reset();
fs.writeFileSync(cookieFile, "# Netscape\n.youtube.com\tTRUE\t/\tTRUE\t0\tSOCS\tCAI\n".repeat(10));
process.env.RARA_YT_AUTO_PROXY = "1";
pool._setPoolFetchForTest(async () => "5.5.5.5:80\n");
pool._setPoolNetForTest({
  connect() {
    const s = new EventEmitter();
    s.write = () => {};
    s.destroy = () => {};
    process.nextTick(() => { s.emit("connect"); s.emit("data", Buffer.from("HTTP/1.1 204 No Content\r\n\r\n")); });
    return s;
  },
});
behavior = () => { throw new Error(BOTCHECK); };
threw = null;
try { await ytdlp.downloadAudioYtDlp(URL_TES, "128"); } catch (e) { threw = e; }
t("5a. eror bot-check akhir dilanjut", /Sign in to confirm/.test(threw?.message || ""));
t("5b. pool proxy gagal di-blacklist (ok kosong)", pool.getAutoProxyStats().okCount === 0, JSON.stringify(pool.getAutoProxyStats()));
try { fs.unlinkSync(cookieFile); } catch {}

// ═══ SECTION 6: manual proxy = prioritas #1, skip ladder ═══
w("\n— section 6: manual prioritas #1 —");
reset();
fs.writeFileSync(manualFile, "http://manual.example:8080\n");
fs.writeFileSync(cookieFile, "# Netscape\n.youtube.com\tTRUE\t/\tTRUE\t0\tSOCS\tCAI\n".repeat(10));
behavior = (cmd) => {
  if (cmd.includes("--get-title") && !cmd.includes("--proxy")) throw new Error("harusnya manual kepasang");
};
r = await ytdlp.downloadAudioYtDlp(URL_TES, "128");
t("6a. langsung pakai manual proxy (tanpa attempt direct)", cmds[0].includes('--proxy "http://manual.example:8080"'), cmds[0]);
t("6b. manual + cookies (perilaku lama)", cmds[0].includes("--cookies"));
t("6c. cuma 2 command", cmds.length === 2, String(cmds.length));
try { fs.unlinkSync(manualFile); } catch {}
try { fs.unlinkSync(cookieFile); } catch {}

// ═══ SECTION 7: eror non-bot-check gak manjat tangga ═══
w("\n— section 7: eror lain langsung lempar —");
reset();
fs.writeFileSync(cookieFile, "# Netscape\n.youtube.com\tTRUE\t/\tTRUE\t0\tSOCS\tCAI\n".repeat(10));
process.env.RARA_YT_AUTO_PROXY = "1";
behavior = () => { throw new Error("ERROR: requested format not available"); };
threw = null;
try { await ytdlp.downloadAudioYtDlp(URL_TES, "128"); } catch (e) { threw = e; }
t("7a. eror asli dilanjut (bukan bot-check)", /requested format not available/.test(threw?.message));
t("7b. gak ada retry (1 command)", cmds.length === 1, String(cmds.length));
try { fs.unlinkSync(cookieFile); } catch {}

// ═══ SECTION 8: video ladder juga direct-first ═══
w("\n— section 8: video —");
reset();
r = await ytdlp.downloadVideoYtDlp(URL_TES, "480");
t("8a. video direct sukses", r.buffer.length === 20000 && r.quality === "480p");
t("8b. direct TANPA flags", cmds.length === 2 && !/--proxy|--cookies/.test(cmds[0]));
reset();
fs.writeFileSync(cookieFile, "# Netscape\n.youtube.com\tTRUE\t/\tTRUE\t0\tSOCS\tCAI\n".repeat(10));
behavior = (cmd) => {
  if (cmd.includes("--get-title") && !cmd.includes("--cookies")) throw new Error(BOTCHECK);
};
r = await ytdlp.downloadVideoYtDlp(URL_TES, "720");
t("8c. video bot-check → +cookies sukses", r.buffer.length === 20000 && cmds[1].includes("--cookies"));
try { fs.unlinkSync(cookieFile); } catch {}

// ═══ bersih-bersih ═══
ytdlp._setYtdlpRunForTest(null);
reset();
process.env.RARA_YT_AUTO_PROXY = "1";
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}

w(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
