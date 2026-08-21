// plugins/group/checklink.js
// AI Phishing & Scam Link Shield - Local URL analysis, no third-party API
// Commands: .checklink <url>, .checklinkon, .checklinkoff, .checklinkdelon, .checklinkdeloff, .checklinkstatus
// Auto-Shield mode: auto-scan links sent in group

import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { URL } from "url";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const DB_FILE = path.join(process.cwd(), "database", "checklink.json");

// ─── Database helpers ───
function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    }
  } catch (e) {}
  return { groups: {} };
}

function saveDB(db) {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {}
}

function isShieldOn(groupId) {
  const db = loadDB();
  return db.groups[groupId]?.autoShield === true;
}

function isDeleteOn(groupId) {
  const db = loadDB();
  return db.groups[groupId]?.autoDelete === true;
}

// ─── Suspicious TLDs ───
const SUSPICIOUS_TLDS = new Set([
  "tk", "ml", "ga", "cf", "gq", "xyz", "top", "click", "loan",
  "work", "country", "kim", "review", "men", "pw", "bid",
  "date", "trade", "download", "stream", "racing", "online",
  "science", "party", "cricket", "win", "accountant", "faith",
  "zip", "rest", "bar", "best",
]);

// ─── URL shorteners (suspicious because they hide destination) ───
const SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly", "is.gd",
  "buff.ly", "rebrand.ly", "cutt.ly", "shorturl.at", "tiny.cc",
  "rb.gy", "shorte.st", "soo.gd", "s.id", "linktr.ee",
  "wa.me", "api.whatsapp.com", "shp.ee", "vt.tiktok.com",
  "surgashort.com", "lesshort.com",
]);

// ─── Phishing/scam keywords in URL path ───
const SCAM_KEYWORDS = [
  "hadiah", "undian", "giveaway", "prize", "winner", "menang",
  "gratis", "free", "klaim", "claim", "reward", "bonus",
  "verifikasi", "verify", "login", "signin", "auth", "secure",
  "update", "konfirmasi", "confirm", "aktivasi", "activate",
  "pin", "otp", "token", "password-reset", "account-update",
  "dana-gratis", "saldo-gratis", "kuota-gratis", "pulsa-gratis",
  "asuransi", "bansos", "ppkm", "rt-rw", "voucher",
];

// ─── Legitimate domains for typo detection ───
const LEGIT_DOMAINS = {
  "google.com": "Google",
  "facebook.com": "Facebook",
  "instagram.com": "Instagram",
  "whatsapp.com": "WhatsApp",
  "youtube.com": "YouTube",
  "twitter.com": "Twitter",
  "tiktok.com": "TikTok",
  "telegram.org": "Telegram",
  "paypal.com": "PayPal",
  "bankmandiri.co.id": "Bank Mandiri",
  "bca.co.id": "BCA",
  "bni.co.id": "BNI",
  "bri.co.id": "BRI",
  "dana.id": "DANA",
  "gojek.com": "Gojek",
  "grab.com": "Grab",
  "tokopedia.com": "Tokopedia",
  "shopee.co.id": "Shopee",
  "lazada.co.id": "Lazada",
  "ovo.id": "OVO",
  "linkaja.id": "LinkAja",
  "bsi.co.id": "BSI",
  "permata.com": "Permata Bank",
  "cimbniaga.co.id": "CIMB Niaga",
  "shopeepay.co.id": "ShopeePay",
};

// ─── Levenshtein distance for typo detection ───
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = new Array(m + 1);
  for (let i = 0; i <= m; i++) d[i] = new Array(n + 1);
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }
  return d[m][n];
}

// ─── Extract URLs from text ───
function extractUrls(text) {
  if (!text) return [];
  const regex = /https?:\/\/[^\s<>"']+/gi;
  const matches = text.match(regex) || [];
  // Clean trailing punctuation
  return matches.map(u => u.replace(/[.,;:!?)]+$/, ""));
}

// ─── Analyze a URL locally ───
function analyzeUrl(urlStr) {
  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch (e) {
    return { score: 100, level: "BERBAHAYA", reasons: ["URL tidak valid / format rusak"] };
  }

  const reasons = [];
  let score = 0;
  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();
  const fullLower = urlStr.toLowerCase();

  // 1. HTTP (not HTTPS) = suspicious
  if (parsed.protocol === "http:") {
    score += 20;
    reasons.push("Tidak pakai HTTPS (enkripsi) - koneksi tidak aman");
  }

  // 2. IP address as hostname
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipPattern.test(hostname)) {
    score += 35;
    reasons.push("URL pakai alamat IP langsung, bukan domain - sangat mencurigakan");
  }

  // 3. Suspicious TLD
  const tld = hostname.split(".").pop();
  if (SUSPICIOUS_TLDS.has(tld)) {
    score += 25;
    reasons.push(`TLD .${tld} sering dipakai untuk scam/phishing`);
  }

  // 4. URL shortener
  if (SHORTENERS.has(hostname) || hostname.includes("bit.ly") || hostname.includes("tinyurl")) {
    score += 15;
    reasons.push("URL pendek (shortener) - tujuan asli tersembunyi");
  }

  // 5. Excessive subdomains (more than 3)
  const subdomainParts = hostname.split(".");
  if (subdomainParts.length > 4) {
    score += 20;
    reasons.push(`Subdomain berlebihan (${subdomainParts.length} level) - pola phishing umum`);
  }

  // 6. Scam keywords in path
  let scamMatches = [];
  for (const kw of SCAM_KEYWORDS) {
    if (fullLower.includes(kw)) {
      scamMatches.push(kw);
    }
  }
  if (scamMatches.length >= 3) {
    score += 30;
    reasons.push(`Kata kunci scam terdeteksi: ${scamMatches.slice(0, 4).join(", ")}`);
  } else if (scamMatches.length >= 1) {
    score += 15;
    reasons.push(`Kata kunci mencurigakan: ${scamMatches.join(", ")}`);
  }

  // 7. Typosquatting / lookalike domain detection
  for (const [domain, brand] of Object.entries(LEGIT_DOMAINS)) {
    const dist = levenshtein(hostname, domain);
    const similarity = 1 - dist / Math.max(hostname.length, domain.length);
    // Only flag if very similar but NOT exact match
    if (similarity >= 0.8 && hostname !== domain && hostname !== "www." + domain) {
      // Check if it's a subdomain of the legit domain
      if (!hostname.endsWith("." + domain)) {
        score += 30;
        reasons.push(`Domain mirip dengan ${brand} (${domain}) - kemungkinan typosquatting`);
        break;
      }
    }
  }

  // 8. Multiple redirects indicators (long query string with redirect params)
  const redirectParams = ["redirect", "url", "next", "target", "dest", "goto", "return", "continue"];
  for (const param of redirectParams) {
    if (parsed.searchParams.has(param)) {
      const val = parsed.searchParams.get(param);
      if (val.startsWith("http") || val.includes("//")) {
        score += 25;
        reasons.push(`Parameter redirect mencurigakan (${param}=) - bisa arahkan ke situs lain`);
        break;
      }
    }
  }

  // 9. Excessive URL length (potential obfuscation)
  if (urlStr.length > 200) {
    score += 10;
    reasons.push("URL sangat panjang - teknik obfuscation umum");
  }

  // 10. @ symbol in URL (user@host trick)
  if (parsed.href.includes("@") && !parsed.href.startsWith("https://") && !parsed.href.startsWith("http://")) {
    // Already caught by URL parser, but check raw
  }
  const atIndex = urlStr.indexOf("@");
  const protocolEnd = urlStr.indexOf("://");
  if (atIndex > protocolEnd + 3 && protocolEnd > -1) {
    const beforeAt = urlStr.substring(protocolEnd + 3, atIndex);
    if (beforeAt.includes(".") || beforeAt.includes("/")) {
      score += 20;
      reasons.push("URL pakai simbol @ untuk menyembunyikan tujuan asli");
    }
  }

  // 11. Non-standard port
  if (parsed.port && parsed.port !== "80" && parsed.port !== "443") {
    score += 15;
    reasons.push(`Port non-standar (:${parsed.port}) - tidak biasa untuk situs legit`);
  }

  // 12. Dash in domain (e.g., secure-login-google.com)
  const dashCount = (hostname.match(/-/g) || []).length;
  if (dashCount >= 2) {
    score += 15;
    reasons.push("Banyak tanda hubung di domain - pola phishing umum");
  }

  // Determine level
  let level, emoji;
  score = Math.min(score, 100);
  if (score >= 60) {
    level = "BERBAHAYA";
    emoji = "🔴";
  } else if (score >= 30) {
    level = "WASPADA";
    emoji = "🟡";
  } else {
    level = "AMAN";
    emoji = "🟢";
  }

  return { score, level, emoji, reasons };
}

// ─── HTTP HEAD request to check redirect chain (with timeout) ───
function checkRedirect(urlStr, timeoutMs = 5000) {
  return new Promise((resolve) => {
    let redirectCount = 0;
    let finalUrl = urlStr;
    let timedOut = false;
    let dnsOk = false;

    const doRequest = (currentUrl, depth = 0) => {
      if (depth > 5 || timedOut) {
        resolve({ redirectCount, finalUrl, dnsOk });
        return;
      }

      let parsed;
      try {
        parsed = new URL(currentUrl);
      } catch (e) {
        resolve({ redirectCount, finalUrl, dnsOk });
        return;
      }

      const lib = parsed.protocol === "https:" ? https : http;

      const req = lib.request(currentUrl, { method: "HEAD", timeout: timeoutMs }, (res) => {
        dnsOk = true;
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          redirectCount++;
          finalUrl = res.headers.location;
          doRequest(res.headers.location, depth + 1);
        } else {
          resolve({ redirectCount, finalUrl, dnsOk, statusCode: res.statusCode });
        }
      });

      req.on("error", () => {
        resolve({ redirectCount, finalUrl, dnsOk });
      });

      req.on("timeout", () => {
        timedOut = true;
        req.destroy();
        resolve({ redirectCount, finalUrl, dnsOk });
      });

      req.end();
    };

    doRequest(urlStr);
  });
}

// ─── Full analysis (local + redirect check) ───
async function fullAnalysis(urlStr) {
  const localResult = analyzeUrl(urlStr);

  // Also do a quick HEAD request to check redirects & DNS
  const netResult = await checkRedirect(urlStr, 5000);

  const reasons = [...(localResult.reasons || [])];
  let score = localResult.score;

  // DNS resolution failed
  if (!netResult.dnsOk) {
    score += 15;
    reasons.push("Domain tidak merespons / tidak bisa dihubungi - mungkin domain mati atau fake");
  }

  // Redirect chain
  if (netResult.redirectCount >= 3) {
    score += 20;
    reasons.push(`Redirect berlapis (${netResult.redirectCount}x) - teknik phishing umum untuk sembunyikan tujuan`);
  } else if (netResult.redirectCount >= 1) {
    score += 5;
    reasons.push(`Redirect ${netResult.redirectCount}x - periksa tujuan akhir`);
  }

  // Check if redirect goes to different domain
  if (netResult.redirectCount >= 1) {
    try {
      const origHost = new URL(urlStr).hostname;
      const finalHost = new URL(netResult.finalUrl).hostname;
      if (origHost !== finalHost && !finalHost.includes(origHost) && !origHost.includes(finalHost)) {
        score += 25;
        reasons.push(`Redirect ke domain berbeda: ${origHost} -> ${finalHost}`);
      }
    } catch (e) {}
  }

  score = Math.min(score, 100);

  let level, emoji;
  if (score >= 60) {
    level = "BERBAHAYA";
    emoji = "🔴";
  } else if (score >= 30) {
    level = "WASPADA";
    emoji = "🟡";
  } else {
    level = "AMAN";
    emoji = "🟢";
  }

  return { score, level, emoji, reasons, redirects: netResult.redirectCount, finalUrl: netResult.finalUrl };
}

// ─── Plugin Config ───
const pluginConfig = {
  name: "checklink",
  alias: ["checklink", "checkurl", "scanlink", "checklinkdelon", "checklinkdeloff"],
  category: "group",
  description: "AI Phishing & Scam Link Shield - deteksi link berbahaya di grup",
  usage: ".checklink <url>\n.checklinkon (auto-shield on)\n.checklinkoff (auto-shield off)\n.checklinkdelon (auto-delete on)\n.checklinkdeloff (auto-delete off)\n.checklinkstatus",
  example: ".checklink https://example.com\n.checklinkon",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// ─── Export autoShield hook for connection.js ───
// ─── Export autoShield hook for connection.js ───
function autoShieldCheck(msg, sock) {
  try {
    const groupId = msg.key?.remoteJid;
    if (!groupId || !groupId.endsWith("@g.us")) return;
    if (msg.key?.fromMe) return;

    if (!isShieldOn(groupId)) return;

    let text = "";
    const m = msg.message;
    if (m) {
      if (m.conversation) text = m.conversation;
      else if (m.extendedTextMessage?.text) text = m.extendedTextMessage.text;
      else if (m.imageMessage?.caption) text = m.imageMessage.caption;
      else if (m.videoMessage?.caption) text = m.videoMessage.caption;
    }

    if (!text) return;

    // Skip command messages
    const trimmed = text.trim();
    if (trimmed.startsWith(".") || trimmed.startsWith("!") || trimmed.startsWith("/")) return;

    const urls = extractUrls(text);
    if (urls.length === 0) return;

    // Analyze the first URL found
    fullAnalysis(urls[0]).then((result) => {
      if (result.level === "BERBAHAYA") {
        const warning = claraWrap(
          "Link Shield - PERINGATAN",
          [
            `${result.emoji} Link terdeteksi: ${result.level}`,
            `URL: ${urls[0].substring(0, 80)}${urls[0].length > 80 ? "..." : ""}`,
            `Skor Bahaya: ${result.score}%`,
            "",
            "*Alasan:*",
            ...result.reasons.map((r, i) => `${i + 1}. ${r}`),
            "",
            "Tetap waspada. Jangan masukkan data pribadi atau klik link di dalam situs ini.",
          ].join("\n")
        );
        sock.sendMessage(groupId, { text: warning }, { quoted: msg });
      }
    }).catch(() => {});
  } catch (e) {
    // Silent fail
  }
}

// ─── Handler ───
async function handler(m, { sock }) {
  try {
    const command = m.body?.split(" ")[0]?.replace(".", "") || "";
    const groupId = m.key?.remoteJid || "";
    const isOwner = m.isOwner || false;

    // ─── Toggle: Auto-Shield ON ───
    if (command === "checklinkon") {
      if (!isOwner) {
        await m.reply("Perintah ini khusus Owner bot.");
        return;
      }
      await m.react("🕐");
      const db = loadDB();
      if (!db.groups[groupId]) db.groups[groupId] = {};
      db.groups[groupId].autoShield = true;
      db.groups[groupId].enabledAt = Date.now();
      saveDB(db);
      await m.reply(claraWrap("Link Shield", "Auto-Shield untuk grup ini sudah DINYALAKAN.\n\nBot otomatis scan setiap link yang dikirim anggota grup dan memberi peringatan kalau link berbahaya."));
      await m.react("✅");
      return;
    }

    // ─── Toggle: Auto-Shield OFF ───
    if (command === "checklinkoff") {
      if (!isOwner) {
        await m.reply("Perintah ini khusus Owner bot.");
        return;
      }
      await m.react("🕐");
      const db = loadDB();
      if (!db.groups[groupId]) db.groups[groupId] = {};
      db.groups[groupId].autoShield = false;
      saveDB(db);
      await m.reply(claraWrap("Link Shield", "Auto-Shield untuk grup ini sudah DIMATIKAN.\n\nBot berhenti auto-scan link. Manual check dengan .checklink tetap bisa dipakai."));
      await m.react("✅");
      return;
    }

    // ─── Toggle: Auto-Delete ON ───
    if (command === "checklinkdelon") {
      if (!isOwner) {
        await m.reply("Perintah ini khusus Owner bot.");
        return;
      }
      await m.react("🕐");
      const db = loadDB();
      if (!db.groups[groupId]) db.groups[groupId] = {};
      db.groups[groupId].autoDelete = true;
      db.groups[groupId].deleteEnabledAt = Date.now();
      saveDB(db);
      await m.reply(claraWrap("Link Shield - Auto Delete", "Auto-Delete untuk grup ini sudah DINYALAKAN.\n\nBot otomatis hapus pesan yang berisi link berbahaya (skor 60%+) dan beri peringatan ke pengirim.\n\nPastikan bot adalah admin grup agar bisa hapus pesan."));
      await m.react("✅");
      return;
    }

    // ─── Toggle: Auto-Delete OFF ───
    if (command === "checklinkdeloff") {
      if (!isOwner) {
        await m.reply("Perintah ini khusus Owner bot.");
        return;
      }
      await m.react("🕐");
      const db = loadDB();
      if (!db.groups[groupId]) db.groups[groupId] = {};
      db.groups[groupId].autoDelete = false;
      saveDB(db);
      await m.reply(claraWrap("Link Shield - Auto Delete", "Auto-Delete untuk grup ini sudah DIMATIKAN.\n\nBot berhenti menghapus link berbahaya. Auto-Shield (warning) tetap aktif kalau dinyalakan."));
      await m.react("✅");
      return;
    }

    // ─── Status ───
    if (command === "checklinkstatus") {
      await m.react("🕐");
      const db = loadDB();
      const groupData = db.groups[groupId] || {};
      const shieldStatus = groupData.autoShield ? "ON" : "OFF";
      const delStatus = groupData.autoDelete ? "ON" : "OFF";
      const shieldEnabledAt = groupData.enabledAt ? new Date(groupData.enabledAt).toLocaleString("id-ID") : "-";
      const delEnabledAt = groupData.deleteEnabledAt ? new Date(groupData.deleteEnabledAt).toLocaleString("id-ID") : "-";

      const statusBody = [
        `╎ *Status Link Shield*`,
        `╎`,
        `╎ Auto-Shield (Warning): ${shieldStatus}`,
        `╎ Aktif Sejak: ${shieldEnabledAt}`,
        `╎`,
        `╎ Auto-Delete (Hapus): ${delStatus}`,
        `╎ Aktif Sejak: ${delEnabledAt}`,
        `╎ Grup: ${groupId.split("@")[0]}`,
        `╎`,
        `╎ Perintah tersedia:`,
        `╎ 1. .checklink <url> - Cek manual`,
        `╎ 2. .checklinkon - Auto-shield on (owner)`,
        `╎ 3. .checklinkoff - Auto-shield off (owner)`,
        `╎ 4. .checklinkdelon - Auto-delete on (owner)`,
        `╎ 5. .checklinkdeloff - Auto-delete off (owner)`,
        `╎ 6. .checklinkstatus - Lihat status`,
      ].join("\n");
      await m.reply(claraWrap("Link Shield Status", statusBody));
      await m.react("✅");
      return;
    }

    // ─── Manual .checklink <url> ───
    if (command === "checklink" || command === "checkurl" || command === "scanlink") {
      await m.react("🕐");

      const input = m.args?.join(" ").trim() || "";
      let urlToCheck = input;

      // If replying to a message, extract URL from that message
      if (!urlToCheck && m.quoted) {
        const quotedText = m.quoted?.text || m.quoted?.body || "";
        const urls = extractUrls(quotedText);
        if (urls.length > 0) urlToCheck = urls[0];
      }

      // Also check if URL is in the message itself
      if (!urlToCheck) {
        const msgText = m.body || "";
        const urls = extractUrls(msgText);
        if (urls.length > 0) {
          // Remove the command part
          const cmdMatch = msgText.match(/^[.!\/]\w+\s+/);
          if (cmdMatch) urlToCheck = msgText.substring(cmdMatch[0].length).trim();
        }
      }

      if (!urlToCheck) {
        const help = claraWrap(
          "Link Shield",
          [
            "Cara pakai:",
            "",
            "1. .checklink <url> - Cek link manual",
            "2. Reply pesan yang ada link, ketik .checklink",
            "3. .checklinkon - Auto-shield on (owner)",
            "4. .checklinkoff - Auto-shield off (owner)",
            "5. .checklinkdelon - Auto-delete on (owner)",
            "6. .checklinkdeloff - Auto-delete off (owner)",
            "",
            "Contoh: .checklink https://example.com",
          ].join("\n")
        );
        await sendReplyWithNav(m, sock, help, { commandName: "checklink" });
        await m.react("✅");
        return;
      }

      // Add protocol if missing
      if (!urlToCheck.match(/^https?:\/\//i)) {
        urlToCheck = "https://" + urlToCheck;
      }

      // Run full analysis
      const result = await fullAnalysis(urlToCheck);

      const reasonsText = result.reasons.length > 0
        ? result.reasons.map((r, i) => `╎ ${i + 1}. ${r}`).join("\n")
        : "╎ Tidak ada indikasi mencurigakan";

      const redirectInfo = result.redirects > 0
        ? `╎ Redirect: ${result.redirects}x -> ${result.finalUrl.substring(0, 60)}${result.finalUrl.length > 60 ? "..." : ""}`
        : "╎ Redirect: Tidak ada";

      const body = [
        `╎ URL: ${urlToCheck.substring(0, 80)}${urlToCheck.length > 80 ? "..." : ""}`,
        `╎ Status: ${result.emoji} ${result.level}`,
        `╎ Skor Bahaya: ${result.score}%`,
        `╎`,
        `╎ ${redirectInfo}`,
        `╎`,
        `╎ *Hasil Analisis:*`,
        reasonsText,
      ].join("\n");

      await m.reply(claraWrap(`Link Shield - ${result.level}`, body));
      await m.react("✅");
    }
  } catch (e) {
    console.error("Checklink error:", e.message);
    await m.reply(claraWrap("Link Shield", "Terjadi error saat menganalisis link. Coba lagi nanti."));
  }
}

export { pluginConfig as config, handler, autoShieldCheck };
