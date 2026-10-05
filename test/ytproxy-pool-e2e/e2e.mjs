// E2E — Proxy pool OTOMATIS buat yt-dlp (feat 6 Okt 2026)
// Request owner: "biar fitur play gak kelimit krna keblock IP youtube — tiap
// run kepasang proxy random http/socks4/socks5 otomatis tanpa cookies" +
// skema ala github.com/sheng1111/Proxy-Hunter.
// Cakupan: validasi socket per protokol, acquire + rotasi LRU, blacklist
// reportProxyResult, TTL, toggle on/off, prioritas manual > pool, integrasi
// getYtProxyArgs/primeYtAutoProxy, plugin .ytproxy auto sub.
import { strict as assert } from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { EventEmitter } from "events";

const R = path.resolve(".");
let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
function t(name, cond, extra = "") {
  if (cond) { pass++; w(`  ✅ ${name}`); }
  else { fail++; w(`  ❌ ${name}${extra ? " — " + extra : ""}`); }
}
process.on("uncaughtException", (e) => { w("UNCAUGHT: " + (e?.stack || e)); process.exit(1); });
process.on("unhandledRejection", (e) => { w("REJECTION: " + (e?.stack || e)); process.exit(1); });

const {
  validateProxy, acquireAutoProxy, reportProxyResult, getAutoProxyStats,
  isAutoProxyOn, setAutoProxyOn, resetAutoProxyPool,
  _setPoolFetchForTest, _setPoolNetForTest, _setPoolStateFileForTest, _setPoolV4ForTest,
} = await import(R + "/src/lib/rara-proxy-pool.js");

// ═══ helpers: fake socket ala protokol ═══
// responder: fungsi (writeIdx, bytesDitulis, sock) → emit data / error
function makeFakeNet(responder) {
  return {
    connect(opts) {
      const sock = new EventEmitter();
      sock.writeCount = 0;
      sock.write = (data) => {
        sock.writeCount++;
        try { responder(sock, data, sock.writeCount); } catch { sock.emit("error", new Error("responder")); }
      };
      sock.destroy = () => {};
      process.nextTick(() => sock.emit("connect"));
      return sock;
    },
  };
}
const httpOk = makeFakeNet((s) => s.emit("data", Buffer.from("HTTP/1.1 204 No Content\r\n\r\n")));
const httpBad = makeFakeNet((s) => s.emit("data", Buffer.from("HTTP/1.1 403 Forbidden\r\n\r\n")));
const socks4Ok = makeFakeNet((s) => s.emit("data", Buffer.from([0x00, 0x5a])));
const socks4Refuse = makeFakeNet((s) => s.emit("data", Buffer.from([0x00, 0x5b])));
const socks5Ok = makeFakeNet((s, d, n) => {
  if (n === 1) s.emit("data", Buffer.from([0x05, 0x00]));       // greeting ok
  else s.emit("data", Buffer.from([0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0])); // connect ok
});
const socks5NoAuth = makeFakeNet((s, d, n) => { if (n === 1) s.emit("data", Buffer.from([0x05, 0xff])); });
const dead = makeFakeNet((s) => s.emit("error", new Error("refused")));

// state file tmp per suite
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ytpool-e2e-"));
_setPoolStateFileForTest(path.join(tmp, "pool.json"));
// toggle file: jangan nyandera file repo — matiin lewat env per kasus
process.env.RARA_YT_AUTO_PROXY = "1";
// sumber v4 kosong biar deterministik
_setPoolV4ForTest(async () => []);

// ═══ SECTION 1: validasi socket per protokol (port Proxy-Hunter) ═══
w("\n— section 1: validateProxy —");

_setPoolNetForTest(httpOk);
const msHttp = await validateProxy("http://1.2.3.4:8080");
t("1a. http proxy balas 204 → valid (latency ms)", msHttp !== null && msHttp >= 0, String(msHttp));

_setPoolNetForTest(httpBad);
t("1b. http proxy balas 403 → mati", (await validateProxy("http://1.2.3.4:8080")) === null);

_setPoolNetForTest(socks4Ok);
t("1c. socks4 CD 0x5A (granted) → valid", (await validateProxy("socks4://1.2.3.4:1080")) !== null);

_setPoolNetForTest(socks4Refuse);
t("1d. socks4 CD bukan 0x5A → mati", (await validateProxy("socks4://1.2.3.4:1080")) === null);

_setPoolNetForTest(socks5Ok);
t("1e. socks5 greeting + connect REP 0x00 → valid", (await validateProxy("socks5://1.2.3.4:1080")) !== null);

_setPoolNetForTest(socks5NoAuth);
t("1f. socks5 tolak no-auth (0xff) → mati", (await validateProxy("socks5://1.2.3.4:1080")) === null);

_setPoolNetForTest(dead);
t("1g. koneksi ditolak → mati", (await validateProxy("http://1.2.3.4:8080")) === null);

t("1h. URL gak bener → null tanpa crash", (await validateProxy("bukan-url")) === null);

// ═══ SECTION 2: acquire — fetch kandidat → validasi → pool ═══
w("\n— section 2: acquireAutoProxy —");

// kandidat: 2 mati + 2 hidup (http + socks5, host beda biar mock gak ambigu)
_setPoolFetchForTest(async () => "9.9.9.9:8081\n8.8.8.8:8082\n7.7.7.7:8083\n6.6.6.6:8084\n");
const aliveMap = {
  "http://7.7.7.7:8083": httpOk,
  "socks5://6.6.6.6:8084": socks5Ok,
};
const mixedNet = {
  connect(opts) {
    // default dead; alive kalau di map
    const key = Object.keys(aliveMap).find((k) => k.endsWith(opts.host + ":" + opts.port));
    return (aliveMap[key] || dead).connect(opts);
  },
};
_setPoolNetForTest(mixedNet);

resetAutoProxyPool();
const got = await acquireAutoProxy({ deadlineMs: 3000 });
t("2a. acquire balik proxy hidup (bukan null)", typeof got === "string" && /:\/\//.test(got), String(got));
const stats = getAutoProxyStats();
t("2b. pool keisi minimal 2 (MIN_POOL) + stats bener", stats.okCount >= 2 && stats.ok.includes(got), JSON.stringify({ okCount: stats.okCount }));

// rotasi: proxy A sukses dipakai → t-nya kesegarkan → acquire berikutnya balikin proxy LAIN
reportProxyResult(got, true);
const got2 = await acquireAutoProxy({ deadlineMs: 2000 });
t("2c. rotasi: run berikutnya dapet proxy BEDA (LRU)", got2 !== got, got + " → " + got2);

// ═══ SECTION 3: blacklist + TTL ═══
w("\n— section 3: reportProxyResult blacklist —");

reportProxyResult(got2, false); // proxy kedua gagal dipakai yt-dlp
const got3 = await acquireAutoProxy({ deadlineMs: 2000 });
t("3a. proxy gagal di-blacklist → gak dipakai lagi", got3 !== got2, got2 + " masih kepilih");
const st3 = getAutoProxyStats();
t("3b. blacklist kecatat di stats", st3.deadCount >= 1, JSON.stringify({ dead: st3.deadCount }));

// dead TTL: habis 3 jam proxy mati dibolehin nyoba lagi (nge-hack waktu via state file)
reportProxyResult(got3, false);
{
  const stPath = path.join(tmp, "pool.json");
  const stRaw = fs.existsSync(stPath) ? JSON.parse(fs.readFileSync(stPath, "utf8")) : { dead: [], ok: [] };
  for (const e of (stRaw.dead || [])) e.t = Date.now() - (3 * 60 * 60 * 1000 + 60000); // expired
  fs.writeFileSync(stPath, JSON.stringify(stRaw));
  resetAutoProxyPool(); // reset cache biar baca ulang file — dead list expired ke-prune
  const stats4 = getAutoProxyStats();
  t("3c. dead TTL 3 jam lewat → blacklist ke-prune", stats4.deadCount === 0, JSON.stringify({ dead: stats4.deadCount }));
}

// ok TTL 20 menit — proxy basi dibuang pas acquire
{
  const stPath = path.join(tmp, "pool.json");
  const stRaw = fs.existsSync(stPath) ? JSON.parse(fs.readFileSync(stPath, "utf8")) : { dead: [], ok: [] };
  if ((stRaw.ok || []).length) {
    for (const e of stRaw.ok) e.t = Date.now() - (20 * 60 * 1000 + 60000);
    fs.writeFileSync(stPath, JSON.stringify(stRaw));
  }
  resetAutoProxyPool();
  const before = getAutoProxyStats().okCount;
  t("3d. ok TTL 20 menit lewat → proxy basi dibuang", before === 0, String(before));
}

// ═══ SECTION 4: toggle on/off ═══
w("\n— section 4: toggle —");

process.env.RARA_YT_AUTO_PROXY = "0";
t("4a. env RARA_YT_AUTO_PROXY=0 → pool mati", isAutoProxyOn() === false);
t("4b. acquire saat mati → null (tanpa fetch)", (await acquireAutoProxy()) === null);
process.env.RARA_YT_AUTO_PROXY = "1";
setAutoProxyOn(false);
t("4c. toggle file off → mati (default on)", isAutoProxyOn() === false);
setAutoProxyOn(true);
t("4d. toggle file on → hidup lagi", isAutoProxyOn() === true);

// ═══ SECTION 5: integrasi rara-ytdlp — manual > pool + arg --proxy ═══
w("\n— section 5: integrasi yt-dlp —");

const ytdlp = await import(R + "/src/scraper/rara-ytdlp.js");
const os_TMP = process.env;
const tmpDirEnv = path.join(tmp, "manual");
fs.mkdirSync(tmpDirEnv, { recursive: true });

// 5a. proxy manual kepasang → primeYtAutoProxy SKIP (pool gak nyala)
const cwdSave = process.cwd();
try {
  fs.writeFileSync(path.join(process.cwd(), "data", "yt-proxy.txt"), "http://manual.example:8080\n");
  await ytdlp.primeYtAutoProxy();
  t("5a. manual kepasang → pool gak diaktifin (proxy manual prioritas)", true);
  const args = ytdlp.getYtProxyArgs();
  t("5b. getYtProxyArgs pilih MANUAL", args.includes("manual.example"), args);
  fs.unlinkSync(path.join(process.cwd(), "data", "yt-proxy.txt"));
} catch (e) { t("5a. manual kepasang → pool gak diaktifin", false, e.message); }

// 5b. tanpa manual → prime nyari pool (mock net hidup) → args --proxy pool
_setPoolNetForTest(httpOk);
_setPoolFetchForTest(async () => "5.5.5.5:80\n");
resetAutoProxyPool();
delete os_TMP.NOVA_YTDLP_PROXY;
await ytdlp.primeYtAutoProxy();
const argsPool = ytdlp.getYtProxyArgs();
t("5c. tanpa manual → args bawa --proxy dari pool", /--proxy "http:\/\/5\.5\.5\.5:80"/.test(argsPool), argsPool);
t("5d. format arg aman buat exec (kutip)", argsPool.startsWith('--proxy "') && argsPool.endsWith('"'), argsPool);

// 5e. tanpa pool sama sekali → args kosong (yt-dlp langsung)
resetAutoProxyPool();
_setPoolFetchForTest(async () => { throw new Error("offline"); });
_setPoolNetForTest(dead);
await ytdlp.primeYtAutoProxy();
t("5e. pool kosong + semua kandidat mati → args kosong (jalan langsung)", ytdlp.getYtProxyArgs() === "", JSON.stringify(ytdlp.getYtProxyArgs()));

// ═══ SECTION 6: plugin .ytproxy auto on/off/reset ═══
w("\n— section 6: plugin .ytproxy —");

const plugin = await import(R + "/plugins/owner/ytproxy.js");
const replies = [];
function mockM(args) {
  return {
    args, text: ".ytproxy " + args.join(" "), isOwner: true,
    chat: "628owner@s.whatsapp.net",
    reply: async (txt) => { replies.push(txt); return txt; },
    react: async () => {},
  };
}
await plugin.handler(mockM(["status"]), { sock: null, isOwner: true });
t("6a. .ytproxy status nunjukin seksi pool otomatis", /PROXY POOL OTOMATIS/i.test(replies[replies.length - 1] || ""), (replies[replies.length - 1] || "").slice(0, 60));
await plugin.handler(mockM(["auto", "off"]), { sock: null, isOwner: true });
t("6b. .ytproxy auto off → pool mati + konfirmasi", /MATI/i.test(replies[replies.length - 1] || "") && isAutoProxyOn() === false, (replies[replies.length - 1] || "").slice(0, 60));
await plugin.handler(mockM(["auto", "on"]), { sock: null, isOwner: true });
t("6c. .ytproxy auto on → pool nyala lagi", /AKTIF/i.test(replies[replies.length - 1] || "") && isAutoProxyOn() === true);
await plugin.handler(mockM(["auto", "reset"]), { sock: null, isOwner: true });
t("6d. .ytproxy auto reset → pool kosong", /reset/i.test(replies[replies.length - 1] || "") && getAutoProxyStats().okCount === 0);
// balikin toggle ke default ON + bersihin file toggle
setAutoProxyOn(true);
try { fs.unlinkSync(path.join(process.cwd(), "data", "yt-auto-proxy.txt")); } catch {}

w(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail ? 1 : 0);
