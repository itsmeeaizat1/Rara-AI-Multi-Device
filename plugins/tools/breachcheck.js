// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import crypto from "crypto";

const pluginConfig = {
  name: "breachcheck",
  alias: ["breachcheck"],
  category: "tools",
  description: "Cek apakah password/email pernah bocor di data breach (HIBP API + lokal)",
  usage: ".breachcheck pass <password> | .breachcheck email <email>",
  example: ".breachcheck pass 12345678\n.breachcheck email test@gmail.com",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

// HIBP Password API (k-anonymity model, free, no API key)
async function checkPasswordBreach(password) {
  try {
    const hash = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const res = await fetch("https://api.pwnedpasswords.com/range/" + prefix, {
      headers: { "User-Agent": "Nova-AI-Bot" },
    });

    if (!res.ok) throw new Error("HIBP API error: " + res.status);

    const text = await res.text();
    const lines = text.split("\n");

    for (const line of lines) {
      const [hashSuffix, count] = line.trim().split(":");
      if (hashSuffix === suffix) {
        return { breached: true, count: parseInt(count) };
      }
    }

    return { breached: false, count: 0 };
  } catch (e) {
    throw new Error("Gagal cek HIBP: " + e.message);
  }
}

// Email validation + disposable check (local)
const DISPOSABLE_DOMAINS = [
  "10minutemail.com", "guerrillamail.com", "mailinator.com", "tempmail.net",
  "throwaway.email", "temp-mail.org", "fakeinbox.com", "getnada.com",
  "yopmail.com", "sharklasers.com", "guerrillamail.info", "grr.la",
  "dispostable.com", "maildrop.cc", "mintemail.com", "tempinbox.com",
  "mohmal.com", "emailfake.com", "tempr.email", "burnermail.io",
  "trashmail.com", "mailnesia.com", "tem-mail.com", "discard.email",
  "mailtemp.net", "tempmailo.com", "emailondeck.com", "spam4.me",
  "tmpmail.org", "fakeemail.net", "mailtothis.com",
];

function validateEmail(email) {
  const regex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;
  const match = email.toLowerCase().match(regex);
  if (!match) return { valid: false, domain: null, disposable: false };

  const domain = match[1];
  const disposable = DISPOSABLE_DOMAINS.includes(domain);

  return { valid: true, domain, disposable };
}

// Common breach database (local knowledge)
const KNOWN_BREACHES_BY_DOMAIN = {
  "yahoo.com": [{ name: "Yahoo 2013-2014", date: "2014", records: "500 juta", desc: "Yahoo data breach besar — email, nama, tanggal lahir" }],
  "yahoo.co.id": [{ name: "Yahoo 2013-2014", date: "2014", records: "500 juta", desc: "Yahoo data breach besar" }],
  "gmail.com": [{ name: "Google+ 2018", date: "2018", records: "52 juta", desc: "Google+ API bug — profil pengguna" }],
  "hotmail.com": [{ name: "Microsoft 2019", date: "2019", records: "250 juta", desc: "Microsoft customer support breach" }],
  "outlook.com": [{ name: "Microsoft 2019", date: "2019", records: "250 juta", desc: "Microsoft customer support breach" }],
  "facebook.com": [{ name: "Facebook 2019", date: "2019", records: "533 juta", desc: "Facebook data scraping — nomor HP, email, nama" }],
  "linkedin.com": [{ name: "LinkedIn 2021", date: "2021", records: "700 juta", desc: "LinkedIn data scraping — profil profesional" }],
  "adobe.com": [{ name: "Adobe 2013", date: "2013", records: "153 juta", desc: "Adobe breach — email, password terenkripsi" }],
  "dropbox.com": [{ name: "Dropbox 2012", date: "2012", records: "68 juta", desc: "Dropbox breach — email + password" }],
  "tumblr.com": [{ name: "Tumblr 2013", date: "2013", records: "65 juta", desc: "Tumblr breach — email + password" }],
  "myspace.com": [{ name: "MySpace 2013", date: "2013", records: "360 juta", desc: "MySpace breach — email + password" }],
};

async function handler(m, { sock }) {
  const args = m.args || [];
  const sub = (args[0] || "").toLowerCase();

  // ===== HELP =====
  if (!sub || sub === "help" || sub === "menu") {
    return m.reply( claraWrap("Breach Check", [
      "Cek apakah password/email pernah bocor di data breach",
      "",
      "CARA PAKAI:",
      m.prefix + "breachcheck pass <password> — Cek password di HIBP",
      m.prefix + "breachcheck email <email> — Cek email + disposable",
      "",
      "CONTOH:",
      m.prefix + "breachcheck pass password123",
      m.prefix + "breachcheck email test@gmail.com",
      "",
      "Password: dicek via HaveIBeenPwned (k-anonymity, password tetap aman)",
      "Email: dicek format + domain disposable + breach database lokal",
    ]), "breachcheck");
  }

  // ===== PASSWORD CHECK =====
  if (sub === "pass" || sub === "password" || sub === "pw") {
    const password = args.slice(1).join(" ");
    if (!password) {
      return m.reply(claraWrap("Breach Check", "Masukkan password!\n💡 *Contoh:* .breachcheck pass password123"));
    }

    await m.react("🔍");

    try {
      const result = await checkPasswordBreach(password);

      if (result.breached) {
        await m.react("🚫");
        return m.reply(claraWrap("Breach Check", [
          "Password: ```" + "*".repeat(Math.min(password.length, 20)) + "```",
          "",
          "Status: *TERBOCOR!*",
          "Ditemukan " + result.count.toLocaleString("id-ID") + "x di data breach",
          "",
          "GANTI PASSWORD INI SEGERA!",
          "Password ini sudah pernah bocor dan tidak aman dipakai.",
          "",
          "Saran: Pakai .passwordgen untuk generate password baru.",
        ], "warn"));
      } else {
        await m.react("🐣");
        // Strength check
        let strength = 0;
        if (password.length >= 8) strength += 25;
        if (password.length >= 12) strength += 15;
        if (/[a-z]/.test(password)) strength += 10;
        if (/[A-Z]/.test(password)) strength += 15;
        if (/[0-9]/.test(password)) strength += 15;
        if (/[^a-zA-Z0-9]/.test(password)) strength += 20;
        if (strength > 100) strength = 100;

        let verdict = strength >= 80 ? "SANGAT KUAT" : strength >= 60 ? "KUAT" : strength >= 40 ? "SEDANG" : "LEM AH";

        return m.reply(claraWrap("Breach Check", [
          "Password: ```" + "*".repeat(Math.min(password.length, 20)) + "```",
          "",
          "Status: *ᴀᴍᴀɴ*",
          "Tidak ditemukan di database breach (HIBP)",
          "",
          "Kekuatan password: " + verdict + " (" + strength + "/100)",
          strength < 60 ? "Tip: Tambah panjang, huruf besar, angka, simbol." : "Password aman dan tidak pernah bocor.",
        ], "success"));
      }
    } catch (e) {
      await m.react("❌");
      return m.reply(claraWrap("Breach Check", "Error: " + e.message + "\n\nMungkin API HIBP sedang down. Coba lagi nanti."));
    }
  }

  // ===== EMAIL CHECK =====
  if (sub === "email" || sub === "mail") {
    const email = args[1] || "";
    if (!email) {
      return m.reply(claraWrap("Breach Check", "Masukkan email!\n💡 *Contoh:* .breachcheck email test@gmail.com"));
    }

    await m.react("🔍");

    const validation = validateEmail(email);

    if (!validation.valid) {
      await m.react("❌");
      return m.reply(claraWrap("Breach Check", "Format email tidak valid!\n💡 *Contoh:* user@domain.com"));
    }

    const lines = [
      "Email: " + email.toLowerCase(),
      "Domain: " + validation.domain,
    ];

    if (validation.disposable) {
      lines.push("");
      lines.push("Status: *DISPOSABLE/TEMP*");
      lines.push("Domain " + validation.domain + " adalah email sekali pakai!");
      lines.push("Tidak boleh dipakai untuk akun penting atau transaksi.");
      await m.react("⚠️");
      return m.reply(claraWrap("Breach Check", lines, "warn"));
    }

    // Cek breach lokal
    const breaches = KNOWN_BREACHES_BY_DOMAIN[validation.domain] || [];
    if (breaches.length > 0) {
      lines.push("");
      lines.push("Status: *ᴅᴏᴍᴀɪɴ ᴘᴇʀɴᴀʜ ᴛᴇʀʙᴏᴄᴏʀ*");
      lines.push("");
      lines.push("Breaches yang melibatkan " + validation.domain + ":");
      breaches.forEach((b, i) => {
        lines.push((i + 1) + ". " + b.name);
        lines.push("   Tahun: " + b.date + " | Records: " + b.records);
        lines.push("   " + b.desc);
      });
      lines.push("");
      lines.push("Saran: Gunakan email berbeda untuk akun penting.");
      lines.push("Aktifkan 2FA di semua akun yang pakai email ini.");
      await m.react("⚠️");
      return m.reply(claraWrap("Breach Check", lines, "warn"));
    }

    lines.push("");
    lines.push("Status: *ᴀᴍᴀɴ*");
    lines.push("Domain bukan disposable");
    lines.push("Tidak ada breach yang diketahui untuk domain ini");
    lines.push("");
    lines.push("Tetap aktifkan 2FA untuk keamanan ekstra.");
    await m.react("🐣");
    return m.reply(claraWrap("Breach Check", lines, "success"));
  }

  // DEFAULT - help
  return m.reply( claraWrap("Breach Check", [
    "Pilih mode cek:",
    "",
    m.prefix + "breachcheck pass <password> — Cek password di HIBP",
    m.prefix + "breachcheck email <email> — Cek email + disposable",
  ]), "breachcheck");
}

export { pluginConfig as config, handler };
