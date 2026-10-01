// E2E .ytcookies (1 Okt 2026) — LOGIN GOOGLE VIA WHATSAPP
// plugins/owner/ytcookies.js — kirim file cookies.txt di chat → bot simpan
// ke data/yt-cookies.txt → yt-dlp otomatis pakai --cookies (fix .play blokir
// bot-check YouTube di IP datacenter).
// Jalankan dari repo root: node test/ytcookies-e2e/e2e.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..");

const mod = await import(pathToFileURL(path.join(REPO, "plugins/owner/ytcookies.js")).href);
const { handler, validateCookies, COOKIES_PATH, cookiesStatus, config } = mod;

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const t = (name, ok, extra = "") => { w((ok ? "  ✅ " : "  ❌ ") + name + (ok ? "" : " — " + String(extra).slice(0, 160))); ok ? pass++ : fail++; };
const SC_MAP = { a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ' };
// UPDATE 1 Okt: teks bot kini plain — toSC lokal jadi passthrough
const toSC = (s) => String(s ?? "");
const hasSC = (reply, kw) => String(reply || "").includes(toSC(kw)) || String(reply || "").toLowerCase().includes(kw.toLowerCase());

// ── mock m ─────────────────────────────────────────────────────────
function mockM({ args = [], media = null, mediaExt = "txt", failDownload = false } = {}) {
  const replies = [];
  const m = {
    args,
    text: ".ytcookies " + args.join(" "),
    reply: async (t) => { replies.push(t); return { key: {} }; },
    react: async () => {},
    isMedia: !!media,
    quoted: media ? null : { isMedia: false },
    message: media ? { documentMessage: { fileName: "cookies." + mediaExt, mimetype: "text/plain" } } : {},
    download: async () => {
      if (failDownload) throw new Error("download gagal");
      return media;
    },
  };
  m.replies = replies;
  return m;
}

const GOOD_COOKIES = [
  "# Netscape HTTP Cookie File",
  "# This is a generated file! Do not edit.",
  "",
  ".youtube.com\tTRUE\t/\tTRUE\t" + Math.floor(Date.now() / 1000 + 999999) + "\tVISITOR_INFO1_LIVE\tabc123",
  ".youtube.com\tTRUE\t/\tTRUE\t" + Math.floor(Date.now() / 1000 + 999999) + "\tLOGIN_INFO\txyz789",
  ".google.com\tTRUE\t/\tTRUE\t" + Math.floor(Date.now() / 1000 + 999999) + "\tSID\tsid456",
  "",
].join("\n");

// ── backup & cleanup ────────────────────────────────────────────────
const hadExisting = fs.existsSync(COOKIES_PATH);
const backup = hadExisting ? fs.readFileSync(COOKIES_PATH) : null;
fs.rmSync(COOKIES_PATH, { recursive: true, force: true });

try {
  w("\n— unit: validateCookies —");
  const okRes = validateCookies(GOOD_COOKIES);
  t("cookies valid → ok + hitung baris", okRes.ok === true && okRes.cookieLines === 3 && okRes.ytLines === 3, JSON.stringify(okRes));
  t("string kosong → ditolak", validateCookies("").ok === false);
  t("teks random (bukan Netscape) → ditolak", validateCookies("hello world bukan cookies").ok === false);
  const nonYt = ".facebook.com\tTRUE\t/\tTRUE\t" + Math.floor(Date.now() / 1000 + 99999) + "\tc_user\t123";
  t("cookies domain non-youtube/google → ditolak", validateCookies(nonYt).ok === false);

  w("\n— handler: usage tanpa media —");
  let m = mockM();
  await handler(m, { sock: {} });
  t("tanpa media & tanpa file → guide", m.replies.length === 1 && hasSC(m.replies[0], "ytcookies") && hasSC(m.replies[0], "cookies.txt"), m.replies[0]?.slice(0, 80));

  w("\n— handler: simpan cookies —");
  m = mockM({ media: Buffer.from(GOOD_COOKIES, "utf-8") });
  await handler(m, { sock: {} });
  t("file valid → tersimpan di data/yt-cookies.txt", fs.existsSync(COOKIES_PATH));
  const saved = fs.readFileSync(COOKIES_PATH, "utf-8");
  t("isi file = buffer asli", saved === GOOD_COOKIES);
  t("reply sukses login", hasSC(m.replies[0], "berhasil"), (m.replies[0] || "").slice(0, 80));

  w("\n— handler: status —");
  m = mockM({ args: ["status"] });
  await handler(m, { sock: {} });
  t("status nunjukin cookies valid", hasSC(m.replies[0], "valid") && hasSC(m.replies[0], "cookies"), (m.replies[0] || "").slice(0, 100));
  const st = cookiesStatus();
  t("cookiesStatus() → valid + baris", st?.valid === true && st?.cookieLines === 3, JSON.stringify(st));

  w("\n— handler: ganti cookies baru (backup .bak) —");
  const NEW_COOKIES = GOOD_COOKIES.replace("abc123", "fresh999");
  m = mockM({ media: Buffer.from(NEW_COOKIES, "utf-8") });
  await handler(m, { sock: {} });
  t("cookies baru menimpa", fs.readFileSync(COOKIES_PATH, "utf-8").includes("fresh999"));
  t("file lama dibackup .bak", fs.readFileSync(COOKIES_PATH + ".bak", "utf-8").includes("abc123"));

  w("\n— handler: file ditolak —");
  const prevContent = fs.readFileSync(COOKIES_PATH, "utf-8");
  m = mockM({ media: Buffer.from(GOOD_COOKIES, "utf-8"), mediaExt: "zip" });
  await handler(m, { sock: {} });
  t("ekstensi bukan .txt → ditolak", hasSC(m.replies[0], "harus .txt"), (m.replies[0] || "").slice(0, 80));
  m = mockM({ media: Buffer.from(GOOD_COOKIES, "utf-8"), failDownload: true });
  await handler(m, { sock: {} });
  t("download gagal → error jujur", hasSC(m.replies[0], "gagal mengunduh"), (m.replies[0] || "").slice(0, 80));
  m = mockM({ media: Buffer.from("ini cuma teks biasa bukan cookies sama sekali, hanya catatan panjang bukan format netscape", "utf-8") });
  await handler(m, { sock: {} });
  t("file bukan format Netscape → DITOLAK + file lama gak ketimpa", hasSC(m.replies[0], "ditolak") && fs.readFileSync(COOKIES_PATH, "utf-8") === prevContent, (m.replies[0] || "").slice(0, 100));
  m = mockM({ media: Buffer.from("", "utf-8") });
  await handler(m, { sock: {} });
  t("file kosong → ditolak", hasSC(m.replies[0], "kosong atau rusak"), (m.replies[0] || "").slice(0, 80));

  w("\n— handler: clear —");
  m = mockM({ args: ["clear"] });
  await handler(m, { sock: {} });
  t(".ytcookies clear → file hilang", !fs.existsSync(COOKIES_PATH) && hasSC(m.replies[0], "dihapus"), (m.replies[0] || "").slice(0, 80));
  m = mockM({ args: ["status"] });
  await handler(m, { sock: {} });
  t("status habis clear → tidak ada cookies", hasSC(m.replies[0], "tidak ada"), (m.replies[0] || "").slice(0, 80));
  m = mockM({ args: ["clear"] });
  await handler(m, { sock: {} });
  t("clear saat gak ada file → jujur bersih", hasSC(m.replies[0], "bersih"), (m.replies[0] || "").slice(0, 80));

  w("\n— config —");
  t("owner-only", config.isOwner === true);
  t("kategori owner", config.category === "owner");
  t("alias ada (setytcookies/loginyt/ytlogin)", Array.isArray(config.alias) && config.alias.includes("setytcookies") && config.alias.includes("loginyt"));
} finally {
  // restore state
  fs.rmSync(COOKIES_PATH, { recursive: true, force: true });
  fs.rmSync(COOKIES_PATH + ".bak", { recursive: true, force: true });
  if (backup !== null) fs.writeFileSync(COOKIES_PATH, backup);
}

w("\n===== " + pass + " PASS, " + fail + " FAIL =====");
process.exit(fail ? 1 : 0);
