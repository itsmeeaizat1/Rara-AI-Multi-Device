// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "linkscanner",
  alias: ["cekbahaya", "scanurl", "scanlink", "linkcheck", "linkaman"],
  category: "tools",
  description: "Scan URL/link untuk cek apakah aman atau berbahaya (phishing/malware/scam)",
  usage: ".linkscanner <url>",
  example: ".linkscanner https://example.com",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

// Daftar domain berbahaya yang dikenal (local blacklist, no API)
const BLACKLIST_DOMAINS = [
  "bit.ly", "tinyurl.com", "shorte.st", "cutt.ly", "t.co",
  "rebrand.ly", "shorturl.at", "is.gd", "rb.gy", "buff.ly",
  "ow.ly", "tiny.cc", "short.io", "lnkd.in", "po.st",
  "viid.me", "adf.ly", "bc.vc", "ity.im", "soo.gd",
  "q.gs", "shorte.st", "sh.st", "gsurl.in",
];

const PHISHING_KEYWORDS = [
  "login", "verify", "account", "secure", "update", "confirm",
  "bank", "paypal", "free", "gift", "prize", "winner", "claim",
  "otp", "pin", "password", "reset", "unlock", "suspended",
  "diblokir", "terkunci", "hadiah", "gratis", "klaim", "blokir",
  "verifikasi", "akun", "aman", "perbarui", "konfirmasi",
];

const SUSPICIOUS_TLDS = [".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".click", ".country", ".stream", ".download", ".review", ".party", ".trade", ".racing", ".win", ".science", ".work", ".loan", ".men", ".date", ".cricket", ".faith"];

function extractDomain(url) {
  try {
    const u = new URL(url.startsWith("http") ? url : "https://" + url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function scanUrl(url) {
  const domain = extractDomain(url);
  if (!domain) return { safe: false, error: "URL tidak valid" };

  const findings = [];
  let riskScore = 0;

  // 1. Cek URL shortener
  const isShortened = BLACKLIST_DOMAINS.some((d) => domain.includes(d));
  if (isShortened) {
    findings.push("URL shortener terdeteksi — link asli tersembunyi");
    riskScore += 20;
  }

  // 2. Cek TLD mencurigakan
  const tld = "." + domain.split(".").pop();
  if (SUSPICIOUS_TLDS.includes(tld)) {
    findings.push("TLD mencurigakan (" + tld + ") — sering dipakai scam");
    riskScore += 25;
  }

  // 3. Cek keyword phishing di URL
  const urlLower = url.toLowerCase();
  const foundKeywords = PHISHING_KEYWORDS.filter((k) => urlLower.includes(k));
  if (foundKeywords.length > 0) {
    findings.push("Keyword mencurigakan: " + foundKeywords.join(", "));
    riskScore += foundKeywords.length * 10;
  }

  // 4. Cek IP address sebagai domain (langsung ke IP, sering phishing)
  const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  if (ipPattern.test(domain)) {
    findings.push("Langsung ke IP address — sangat mencurigakan");
    riskScore += 30;
  }

  // 5. Cek subdomain berlebihan
  const subdomains = domain.split(".").length - 1;
  if (subdomains > 3) {
    findings.push("Subdomain berlebihan (" + subdomains + " level) — mencurigakan");
    riskScore += 15;
  }

  // 6. Cek karakter aneh di URL
  if (url.includes("@") || url.includes("//") && url.indexOf("//") !== url.lastIndexOf("//")) {
    findings.push("Karakter aneh di URL (@ atau // ganda)");
    riskScore += 15;
  }

  // 7. Cek panjang URL abnormal
  if (url.length > 150) {
    findings.push("URL sangat panjang (" + url.length + " chars) — mencurigakan");
    riskScore += 10;
  }

  // 8. Cek hex encoding
  if (/%[0-9a-f]{2}/i.test(url)) {
    findings.push("Hex encoding terdeteksi — bisa menyembunyikan redirect");
    riskScore += 10;
  }

  // 9. Domain palsu (typosquatting)
  const legitDomains = ["google.com", "facebook.com", "instagram.com", "whatsapp.com", "youtube.com", "twitter.com", "tiktok.com", "shopee.com", "tokopedia.com", "bca.com", "mandiri.co.id", "bni.co.id", "bri.co.id", "ovo.id", "gopay", "dana.id", "linkaja.com"];
  for (const legit of legitDomains) {
    if (domain !== legit && domain.includes(legit.replace(".com", "")) && !domain.endsWith(legit)) {
      findings.push("Kemiripan domain dengan " + legit + " — kemungkinan typosquatting");
      riskScore += 30;
      break;
    }
  }

  // Final verdict
  let verdict;
  if (riskScore >= 60) verdict = "BERBAHAYA";
  else if (riskScore >= 35) verdict = "MENCURIGAKAN";
  else if (riskScore >= 15) verdict = "HATI-HATI";
  else verdict = "AMAN";

  return { domain, riskScore, verdict, findings, isShortened };
}

async function handler(m, { sock }) {
  const url = m.args.join(" ").trim();

  if (!url) {
    return m.reply( claraWrap("Link Scanner", [
      "Scan URL untuk cek keamanan (phishing/malware/scam)",
      "",
      "CARA PAKAI:",
      m.prefix + "linkscanner <url>",
      m.prefix + "cekbahaya <url>",
      "",
      "CONTOH:",
      m.prefix + "linkscanner https://example.com",
      m.prefix + "cekbahaya bit.ly/abc123",
      "",
      "Deteksi: URL shortener, TLD mencurigakan, keyword phishing, typosquatting, hex encoding, IP langsung",
    ]), "linkscanner");
  }

  await m.react("🔍");

  try {
    const result = scanUrl(url);

    if (result.error) {
      await m.react("❌");
      return m.reply(claraWrap("Link Scanner", "Error: " + result.error));
    }

    const verdictEmoji = result.verdict === "AMAN" ? "✅" : result.verdict === "HATI-HATI" ? "⚠️" : result.verdict === "MENCURIGAKAN" ? "⚠️" : "🚫";

    let lines = [
      "URL: " + url,
      "Domain: " + result.domain,
      "",
      "Hasil: " + verdictEmoji + " *" + result.verdict + "*",
      "Risk Score: " + result.riskScore + "/100",
      "",
    ];

    if (result.findings.length > 0) {
      lines.push("Detail temuan:");
      result.findings.forEach((f, i) => {
        lines.push((i + 1) + ". " + f);
      });
    } else {
      lines.push("Tidak ada temuan mencurigakan.");
    }

    lines.push("");
    lines.push(result.verdict === "AMAN"
      ? "Link terlihat aman, tapi tetap hati-hati."
      : result.verdict === "HATI-HATI"
      ? "Ada beberapa indikasi mencurigakan. Cek lagi sebelum klik."
      : result.verdict === "MENCURIGAKAN"
      ? "Link ini mencurigakan! Jangan klik atau masukkan data pribadi."
      : "Link BERBAHAYA! Jangan klik, jangan masukkan data apapun!");

    lines.push("");
    lines.push("Scan lokal — tanpa API, berdasarkan pattern matching");

    await m.react(result.verdict === "AMAN" ? "✅" : "⚠️");
    return m.reply(claraWrap("Link Scanner", lines));
  } catch (e) {
    console.error("[Link Scanner]", e);
    await m.react("❌");
    return m.reply(claraWrap("Link Scanner", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
