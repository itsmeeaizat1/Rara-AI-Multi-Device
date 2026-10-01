// E2E .ytproxy (1 Okt 2026) — PROXY YOUTUBE VIA WHATSAPP
// plugins/owner/ytproxy.js — ketik URL proxy di chat → bot simpan ke
// data/yt-proxy.txt → yt-dlp otomatis pakai --proxy (fallback kedua .play
// pas bot-check, selain cookies).
// Jalankan dari repo root: node test/ytproxy-e2e/e2e.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..");

const mod = await import(pathToFileURL(path.join(REPO, "plugins/owner/ytproxy.js")).href);
const { handler, validateProxy, maskProxy, PROXY_PATH, proxyStatus, config } = mod;
const ytdlp = await import(pathToFileURL(path.join(REPO, "src/scraper/nova-ytdlp.js")).href);

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra = "") => { w((ok ? "  ✅ " : "  ❌ ") + name + (ok ? "" : " — " + String(extra).slice(0, 160))); ok ? pass++ : fail++; };
const SC_MAP = { a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ' };
const toSC = (s) => String(s || "").replace(/[a-zA-Z]/g, c => SC_MAP[c.toLowerCase()] || c);
const hasSC = (reply, kw) => String(reply || "").includes(toSC(kw)) || String(reply || "").toLowerCase().includes(kw.toLowerCase());

function mockM({ args = [] } = {}) {
  const replies = [];
  const m = {
    args,
    text: ".ytproxy " + args.join(" "),
    reply: async (t) => { replies.push(t); return { key: {} }; },
    react: async () => {},
  };
  m.replies = replies;
  return m;
}

// ── backup & cleanup ────────────────────────────────────────────────
const hadExisting = fs.existsSync(PROXY_PATH);
const backup = hadExisting ? fs.readFileSync(PROXY_PATH, "utf8") : null;
const hadEnv = process.env.NOVA_YTDLP_PROXY || null;
delete process.env.NOVA_YTDLP_PROXY;
fs.rmSync(PROXY_PATH, { force: true });

try {
  w("\n— unit: validateProxy —");
  const okHttp = validateProxy("http://user:pass@proxy.example.com:8080");
  t("1a. http dengan user:pass valid", okHttp.ok === true, JSON.stringify(okHttp));
  const okHttps = validateProxy("https://proxy.example.com:3128");
  t("1b. https polos valid", okHttps.ok === true);
  const okSocks = validateProxy("socks5://127.0.0.1:9050");
  t("1c. socks5 valid", okSocks.ok === true);
  t("1d. tanpa schema ditolak", validateProxy("proxy.example.com:8080").ok === false);
  t("1e. ftp schema ditolak (http/https/socks5 doang)", validateProxy("ftp://proxy.example.com").ok === false);
  t("1f. ada spasi ditolak", validateProxy("http://a.com:80 hallo").ok === false);
  t("1g. kosong ditolak", validateProxy("").ok === false);

  w("\n— unit: maskProxy —");
  t("2a. password dimasker", maskProxy("http://user:rahasia@host:8080") === "http://user:***@host:8080");
  t("2b. tanpa password tetap utuh", maskProxy("http://host:8080") === "http://host:8080");
  t("2c. socks5 password dimasker", maskProxy("socks5://u:p@h:1080") === "socks5://u:***@h:1080");

  w("\n— handler: simpan proxy —");
  let m1 = mockM({ args: ["http://user:rahasia@proxy.example.com:8080"] });
  await handler(m1, {});
  t("3a. URL valid → tersimpan ke data/yt-proxy.txt", fs.existsSync(PROXY_PATH) && fs.readFileSync(PROXY_PATH, "utf8").trim() === "http://user:rahasia@proxy.example.com:8080");
  t("3b. balasan sukses (kecil: TERPASANG)", hasSC(m1.replies[0], "ᴛᴇʀᴘᴀꜱᴀɴɢ") || m1.replies[0]?.includes("ᴛᴇʀᴘᴀꜱᴀɴɢ"), (m1.replies[0] || "").slice(0, 100));
  t("3c. balasan nunjukin flag yt-dlp aktif (kecil)", hasSC(m1.replies[0], "aktif"), (m1.replies[0] || "").slice(0, 100));
  t("3d. password GAK bocor di balasan", !m1.replies[0]?.includes("rahasia"));

  // flag beneran kebaca engine yt-dlp
  t("3e. getYtProxyArgs kebaca dari file data/yt-proxy.txt", ytdlp.getYtProxyArgs().trim() === '--proxy "http://user:rahasia@proxy.example.com:8080"', ytdlp.getYtProxyArgs());

  w("\n— handler: ganti proxy —");
  m1 = mockM({ args: ["socks5://127.0.0.1:9050"] });
  await handler(m1, {});
  t("4a. ganti proxy → file keganti", fs.readFileSync(PROXY_PATH, "utf8").trim() === "socks5://127.0.0.1:9050");
  t("4b. backup .bak dibikin dari proxy lama", fs.existsSync(PROXY_PATH + ".bak") && fs.readFileSync(PROXY_PATH + ".bak", "utf8").includes("proxy.example.com"));
  t("4c. flag ikut proxy baru", ytdlp.getYtProxyArgs().trim() === '--proxy "socks5://127.0.0.1:9050"');

  w("\n— handler: URL aneh ditolak —");
  m1 = mockM({ args: ["bukan-url"] });
  await handler(m1, {});
  t("5a. URL gak valid → DITOLAK jelas (kecil)", m1.replies[0]?.includes("\u1d05\u026a\u1d1b\u027f\u1d00\u1d0b") || hasSC(m1.replies[0], "ditolak"), (m1.replies[0] || "").slice(0, 120));
  t("5b. file proxy lama GAK ketimpa", fs.readFileSync(PROXY_PATH, "utf8").trim() === "socks5://127.0.0.1:9050");

  w("\n— handler: tanpa argumen → panduan —");
  m1 = mockM({ args: [] });
  await handler(m1, {});
  t("6a. panduan muncul (kecil: contoh)", (m1.replies[0] || "").toLowerCase().includes("ytproxy") && (m1.replies[0] || "").includes(".ytproxy"));

  w("\n— handler: status —");
  m1 = mockM({ args: ["status"] });
  await handler(m1, {});
  t("7a. status: proxy aktif nongol", m1.replies[0]?.includes("PROXY") || m1.replies[0]?.includes("ᴘʀᴏxʏ"), (m1.replies[0] || "").slice(0, 80));
  t("7b. status: alamat dimasker", m1.replies[0]?.includes("127.0.0.1:9050"));
  t("7c. status: sumber file disebut (kecil)", hasSC(m1.replies[0], "yt-pro"), (m1.replies[0] || "").slice(0, 120));

  w("\n— handler: env menang dari file —");
  process.env.NOVA_YTDLP_PROXY = "http://env-wins.example.com:3128";
  m1 = mockM({ args: ["status"] });
  await handler(m1, {});
  t("8a. status nunjukin sumber env (kecil)", m1.replies[0]?.toLowerCase().includes("env") || m1.replies[0]?.includes("\u1d07\u1d20\u1d20"), (m1.replies[0] || "").slice(0, 120));
  t("8b. getYtProxyArgs env menang atas file", ytdlp.getYtProxyArgs().includes("env-wins.example.com"));
  m1 = mockM({ args: ["clear"] });
  await handler(m1, {});
  t("8c. clear dengan env aktif → jujur gak bisa hapus env (kecil)", hasSC(m1.replies[0], "gak bisa") && hasSC(m1.replies[0], "env"), (m1.replies[0] || "").slice(0, 140));
  delete process.env.NOVA_YTDLP_PROXY;

  w("\n— handler: clear —");
  m1 = mockM({ args: ["clear"] });
  await handler(m1, {});
  t("9a. clear → file proxy kehapus", !fs.existsSync(PROXY_PATH));
  t("9b. balasan jelas dihapus", (m1.replies[0] || "").includes("ᴅɪʜᴀᴘᴜꜱ") || (m1.replies[0] || "").toLowerCase().includes("hapus"));
  m1 = mockM({ args: ["clear"] });
  await handler(m1, {});
  t("9c. clear ulang → jujur udah bersih (kecil)", hasSC(m1.replies[0], "bersih") || (m1.replies[0] || "").toLowerCase().includes("bersih"));
  m1 = mockM({ args: ["status"] });
  await handler(m1, {});
  t("9d. status tanpa proxy → tidak ada proxy terpasang", hasSC(m1.replies[0], "ᴛɪᴅᴀᴋ ᴀᴅᴀ ᴘʀᴏxʏ") || (m1.replies[0] || "").includes("ᴛɪᴅᴀᴋ ᴀᴅᴀ ᴘʀᴏxʏ"), (m1.replies[0] || "").slice(0, 100));

  w("\n— config —");
  t("10a. owner-only", config.isOwner === true);
  t("10b. alias ada (.proxyyt/.setproxyyt/.ytdlproxy)", Array.isArray(config.alias) && config.alias.length >= 3);
  t("11. data/yt-proxy.txt di-gitignore", fs.readFileSync(path.join(REPO, ".gitignore"), "utf8").includes("yt-proxy.txt"));
} finally {
  // restore state
  if (backup != null) fs.writeFileSync(PROXY_PATH, backup);
  else fs.rmSync(PROXY_PATH, { force: true });
  fs.rmSync(PROXY_PATH + ".bak", { force: true });
  if (hadEnv) process.env.NOVA_YTDLP_PROXY = hadEnv;
}

w(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
