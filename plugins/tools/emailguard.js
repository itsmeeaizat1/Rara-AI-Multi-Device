// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "emailguard",
  alias: ["cekemail", "emailcheck", "validatemail", "emailvalidator"],
  category: "tools",
  description: "Validasi email + deteksi disposable/temp mail + cek domain reputation",
  usage: ".emailguard <email>",
  example: ".emailguard test@gmail.com",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

// Daftar domain disposable/temp email lengkap
const DISPOSABLE_DOMAINS = new Set([
  "10minutemail.com", "guerrillamail.com", "mailinator.com", "tempmail.net",
  "throwaway.email", "temp-mail.org", "fakeinbox.com", "getnada.com",
  "yopmail.com", "sharklasers.com", "guerrillamail.info", "grr.la",
  "dispostable.com", "maildrop.cc", "mintemail.com", "tempinbox.com",
  "mohmal.com", "emailfake.com", "tempr.email", "burnermail.io",
  "trashmail.com", "mailnesia.com", "tem-mail.com", "discard.email",
  "mailtemp.net", "tempmailo.com", "emailondeck.com", "spam4.me",
  "tmpmail.org", "fakeemail.net", "mailtothis.com", "mailcatch.com",
  "inboxbear.com", "spamcowboy.com", "spamfree.com", "antispammail.de",
  "deadaddress.com", "jetable.net", "mailcatch.com", "tempmail.io",
  "fakebox.com", "guerrillamail.net", "guerrillamail.org", "incognitomail.com",
  "mailnull.com", "spamgourmet.com", "tempmaila.com", "tempmailb.com",
  "trbvm.com", "trbvn.com", "vomoto.com", "wants.dicksinhisan.us",
  "armyspy.com", "cuvox.de", "dayrep.com", "einrot.com",
  "fleckens.hu", "gustr.com", "jourrapide.com", "loremail.net",
  "superrito.com", "warwick.com", "rhyta.com", "armyspy.com",
]);

// Domain email populer (untuk info tambahan)
const POPULAR_DOMAINS = {
  "gmail.com": { name: "Google Gmail", reputation: "trusted", notes: "Email resmi Google" },
  "yahoo.com": { name: "Yahoo Mail", reputation: "trusted", notes: "Email resmi Yahoo" },
  "yahoo.co.id": { name: "Yahoo Indonesia", reputation: "trusted", notes: "Yahoo Indonesia" },
  "hotmail.com": { name: "Microsoft Hotmail", reputation: "trusted", notes: "Microsoft" },
  "outlook.com": { name: "Microsoft Outlook", reputation: "trusted", notes: "Microsoft" },
  "live.com": { name: "Microsoft Live", reputation: "trusted", notes: "Microsoft" },
  "icloud.com": { name: "Apple iCloud", reputation: "trusted", notes: "Apple" },
  "protonmail.com": { name: "ProtonMail", reputation: "trusted", notes: "Email terenkripsi" },
  "proton.me": { name: "Proton Mail", reputation: "trusted", notes: "Email terenkripsi" },
  "tutanota.com": { name: "Tutanota", reputation: "trusted", notes: "Email terenkripsi" },
  "zoho.com": { name: "Zoho Mail", reputation: "trusted", notes: "Business email" },
  "aol.com": { name: "AOL Mail", reputation: "trusted", notes: "Email klasik" },
  "mail.com": { name: "Mail.com", reputation: "trusted", notes: "Email provider" },
  "gmx.com": { name: "GMX Mail", reputation: "trusted", notes: "Email provider" },
  "yandex.com": { name: "Yandex Mail", reputation: "caution", notes: "Rusia — hati-hati" },
  "yandex.ru": { name: "Yandex Russia", reputation: "caution", notes: "Rusia — hati-hati" },
};

function analyzeEmail(email) {
  const errors = [];
  const info = [];
  let riskScore = 0;

  // Validasi format dasar
  const regex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;
  const match = email.toLowerCase().match(regex);

  if (!match) {
    errors.push("Format email tidak valid");
    return { valid: false, errors, riskScore: 100, domain: null, disposable: false, info };
  }

  const local = match[0].split("@")[0];
  const domain = match[1];

  // Cek disposable
  const disposable = DISPOSABLE_DOMAINS.has(domain);
  if (disposable) {
    riskScore += 50;
    info.push("Domain disposable terdeteksi: " + domain);
  }

  // Cek domain populer
  const popular = POPULAR_DOMAINS[domain];
  if (popular) {
    info.push("Provider: " + popular.name + " (" + popular.reputation + ")");
    if (popular.reputation === "caution") {
      riskScore += 15;
      info.push("Catatan: " + popular.notes);
    }
  } else {
    // Domain tidak dikenal
    riskScore += 10;
    info.push("Domain tidak dikenal — perlu hati-hati");
  }

  // Cek TLD mencurigakan
  const tld = "." + domain.split(".").pop();
  const suspiciousTLDs = [".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".click"];
  if (suspiciousTLDs.includes(tld)) {
    riskScore += 25;
    info.push("TLD mencurigakan: " + tld + " — sering dipakai scam");
  }

  // Cek local part terlalu pendek
  if (local.length < 3) {
    riskScore += 10;
    info.push("Nama email terlalu pendek (" + local.length + " karakter)");
  }

  // Cek local part terlalu panjang (mencurigakan)
  if (local.length > 64) {
    riskScore += 10;
    info.push("Nama email terlalu panjang (" + local.length + " karakter)");
  }

  // Cek domain tanpa MX record indikasi (sederhana: domain dengan IP)
  if (/^\d+\.\d+\.\d+\.\d+$/.test(domain)) {
    riskScore += 30;
    info.push("Domain berupa IP address — sangat mencurigakan");
  }

  // Cek plus addressing (gmail)
  if (local.includes("+")) {
    info.push("Plus addressing terdeteksi (alias Gmail) — bisa untuk filter spam");
  }

  // Cek banyak dot di local part
  if ((local.match(/\./g) || []).length > 3) {
    riskScore += 5;
    info.push("Banyak titik di nama email — bisa mencurigakan");
  }

  // Final verdict
  let verdict;
  if (riskScore >= 60) verdict = "BERBAHAYA";
  else if (riskScore >= 35) verdict = "MENCURIGAKAN";
  else if (riskScore >= 15) verdict = "HATI-HATI";
  else verdict = "AMAN";

  return { valid: true, domain, disposable, riskScore, verdict, info, errors, local };
}

async function handler(m, { sock }) {
  const email = m.args.join(" ").trim();

  if (!email) {
    return m.reply( claraWrap("Email Guard", [
      "Validasi email + deteksi disposable/temp mail",
      "",
      "CARA PAKAI:",
      m.prefix + "emailguard <email>",
      m.prefix + "cekemail <email>",
      "",
      "CONTOH:",
      m.prefix + "emailguard test@gmail.com",
      m.prefix + "emailguard user@yopmail.com",
      "",
      "Deteksi: format valid, disposable domain, TLD mencurigakan, reputation",
    ]), "emailguard");
  }

  await m.react("🔍");

  try {
    const result = analyzeEmail(email);

    if (!result.valid) {
      await m.react("❌");
      return m.reply(claraWrap("Email Guard", [
        "Email: " + email,
        "Status: *ᴛɪᴅᴀᴋ ᴠᴀʟɪᴅ*",
        "",
        result.errors.join("\n"),
      ], "warn"));
    }

    let verdictEmoji = "✅";
    if (result.riskScore >= 60) verdictEmoji = "🚫";
    else if (result.riskScore >= 35) verdictEmoji = "⚠️";
    else if (result.riskScore >= 15) verdictEmoji = "⚠️";

    let lines = [
      "Email: " + email.toLowerCase(),
      "Domain: " + result.domain,
      "Nama: " + result.local,
      "",
      "Status: " + verdictEmoji + " *" + result.verdict + "*",
      "Risk Score: " + result.riskScore + "/100",
      "",
    ];

    if (result.disposable) {
      lines.push("*DISPOSABLE/TEMP MAIL*");
      lines.push("Email ini sekali pakai — tidak boleh dipakai untuk akun penting!");
      lines.push("");
    }

    if (result.info.length > 0) {
      lines.push("Detail:");
      result.info.forEach((f, i) => {
        lines.push((i + 1) + ". " + f);
      });
    }

    lines.push("");
    if (result.riskScore >= 35) {
      lines.push("PERINGATAN: Email ini mencurigakan.");
      lines.push("Jangan dipakai untuk transaksi atau akun penting.");
    } else {
      lines.push("Email terlihat valid dan aman.");
      lines.push("Tetap aktifkan 2FA untuk keamanan ekstra.");
    }

    await m.react(result.riskScore >= 35 ? "⚠️" : "✅");
    return m.reply(claraWrap("Email Guard", lines));
  } catch (e) {
    console.error("[Email Guard]", e);
    await m.react("❌");
    return m.reply(claraWrap("Email Guard", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
