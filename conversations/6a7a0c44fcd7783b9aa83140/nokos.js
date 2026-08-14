import te from "../../src/lib/nova-error.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

// ============================================================
// Nomor Kosong Plugin
// Generate random Indonesian phone numbers and check if
// they're registered on WhatsApp using Baileys onWhatsApp()
// "Kosong" = not registered on WhatsApp
// ============================================================

// Indonesian phone number prefixes by provider
const PREFIXES = [
  // Telkomsel
  "0811", "0812", "0813", "0821", "0822", "0823", "0851", "0852",
  // Indosat
  "0815", "0816", "0853", "0855", "0856", "0857", "0858",
  // XL
  "0817", "0818", "0819",
  // Tri
  "0827", "0828", "0829", "0895", "0896", "0897", "0898", "0899",
  // Axis
  "0831", "0832", "0833", "0838",
  // Smartfren
  "0881", "0882", "0883", "0884", "0885", "0886", "0887", "0888", "0889",
];

const pluginConfig = {
  name: ["nokos", "nomorkosong", "nomorkos"],
  alias: ["kos", "ceknomor"],
  category: "tools",
  description: "Generate & cek nomor kosong (tidak terdaftar WhatsApp)",
  usage: ".nokos [jumlah] | .nokos cek <nomor> | .nokos wa <nomor>",
  example: ".nokos 10",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 5,
  isEnabled: true,
};

// === Helpers ===

function randomDigit(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateNumber(prefix) {
  // Indonesian numbers are typically 11-13 digits total (including 08xx prefix)
  // Generate 6-8 random digits after prefix
  const remainingLength = randomDigit(6, 8);
  let suffix = "";
  for (let i = 0; i < remainingLength; i++) {
    suffix += Math.floor(Math.random() * 10);
  }
  return prefix + suffix;
}

function formatToJID(number) {
  // Convert 08xx to 62xx
  let cleaned = number.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (cleaned.startsWith("8")) {
    cleaned = "62" + cleaned;
  } else if (!cleaned.startsWith("62")) {
    cleaned = "62" + cleaned;
  }
  return cleaned + "@s.whatsapp.net";
}

function formatDisplay(number) {
  // Format as 08xx-xxxx-xxxx for readability
  let cleaned = number.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("62")) {
    cleaned = "0" + cleaned.slice(2);
  } else if (!cleaned.startsWith("0")) {
    cleaned = "0" + cleaned;
  }
  // Add dashes: 08xx-xxxx-xxxx
  if (cleaned.length >= 8) {
    return cleaned.slice(0, 4) + "-" + cleaned.slice(4, 8) + "-" + cleaned.slice(8);
  }
  return cleaned;
}

function getProviderName(prefix) {
  const p = prefix.slice(0, 4);
  if (["0811", "0812", "0813", "0821", "0822", "0823", "0851", "0852"].includes(p)) return "Telkomsel";
  if (["0815", "0816", "0853", "0855", "0856", "0857", "0858"].includes(p)) return "Indosat";
  if (["0817", "0818", "0819"].includes(p)) return "XL";
  if (["0827", "0828", "0829", "0895", "0896", "0897", "0898", "0899"].includes(p)) return "Tri";
  if (["0831", "0832", "0833", "0838"].includes(p)) return "Axis";
  if (p.startsWith("088")) return "Smartfren";
  return "Unknown";
}

// === Check single number on WhatsApp ===

async function checkOnWhatsApp(sock, number) {
  const jid = formatToJID(number);
  try {
    const [result] = await sock.onWhatsApp(jid);
    return {
      number,
      jid: result?.jid || jid,
      exists: result?.exists === true,
    };
  } catch (err) {
    return { number, jid, exists: false, error: true };
  }
}

// === Check multiple numbers in batch ===

async function checkBatch(sock, numbers) {
  // Build JIDs
  const jids = numbers.map((n) => formatToJID(n));

  try {
    // Baileys onWhatsApp accepts an array
    const results = await sock.onWhatsApp(...jids);

    // Map results back
    return numbers.map((num, i) => {
      const result = results[i] || results.find((r) => r.jid === jids[i]);
      return {
        number: num,
        jid: result?.jid || jids[i],
        exists: result?.exists === true,
      };
    });
  } catch (err) {
    // Fallback: check one by one
    const results = [];
    for (let i = 0; i < numbers.length; i++) {
      const res = await checkOnWhatsApp(sock, numbers[i]);
      results.push(res);
    }
    return results;
  }
}

// === Handler ===

async function handler(m, { sock }) {
  const text = m.text || "";
  const sub = text.split(" ")[0]?.toLowerCase();
  const arg = text.slice(sub.length).trim();

  // === CEK / WA - Check specific number ===
  if (sub === "cek" || sub === "wa" || sub === "check") {
    const number = arg.replace(/[^0-9]/g, "");
    if (!number || number.length < 8) {
      return sendReplyWithNav(
        sock,
        m,
        claraWrap(
          "Nomor Kosong",
          `Masukkan nomor yang ingin dicek!\n\nContoh:\n${m.prefix}nokos cek 08123456789\n${m.prefix}nokos cek 628123456789`
        ),
        "nokos"
      );
    }

    await m.react("🕐");

    try {
      const result = await checkOnWhatsApp(sock, number);
      await m.react("✅");

      const display = formatDisplay(number);
      const provider = getProviderName(number.startsWith("0") ? number : "0" + number.slice(2));
      const status = result.exists ? "TERDAFTAR di WhatsApp" : "KOSONG (tidak terdaftar)";
      const statusIcon = result.exists ? "✅" : "❌";

      const body = `Hasil Cek Nomor\n\n❏ Nomor: ${display}\n❏ Provider: ${provider}\n❏ Status: ${statusIcon} ${status}\n${result.exists ? `❏ JID: ${result.jid}` : ""}\n\n${result.exists ? "Nomor ini sudah terdaftar di WhatsApp." : "Nomor ini KOSONG! Bisa digunakan untuk registrasi WA baru."}`;

      return sendReplyWithNav(sock, m, claraWrap("Nomor Kosong", body), "nokos");
    } catch (err) {
      return m.reply(te(m.prefix, m.command, m.pushName));
    }
  }

  // === Generate & Check (default) ===
  let count = parseInt(sub) || 10;

  // Limit count to prevent rate limiting
  if (count > 30) count = 30;
  if (count < 1) count = 1;

  await m.react("🕐");

  try {
    // Generate random numbers
    const numbers = [];
    for (let i = 0; i < count; i++) {
      const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
      numbers.push(generateNumber(prefix));
    }

    // Check all numbers on WhatsApp
    const results = await checkBatch(sock, numbers);

    // Filter kosong (not registered)
    const kosong = results.filter((r) => !r.exists);
    const terdaftar = results.filter((r) => r.exists);

    let body = `Hasil Generate Nomor Kosong\n\n❏ Total dicek: ${count} nomor\n❏ Kosong: ${kosong.length} nomor\n❏ Terdaftar: ${terdaftar.length} nomor\n\n`;

    if (kosong.length > 0) {
      body += `NOMOR KOSONG:\n\n`;
      kosong.forEach((r, i) => {
        const provider = getProviderName(r.number.slice(0, 4));
        body += `${i + 1}. ${formatDisplay(r.number)}\n   (${provider})\n`;
      });
      body += `\nNomor di atas bisa digunakan untuk registrasi WhatsApp baru.`;
    } else {
      body += `Semua nomor ternyata terdaftar.\nCoba lagi: ${m.prefix}nokos ${count}`;
    }

    // Add terdaftar info if any
    if (terdaftar.length > 0 && kosong.length > 0) {
      body += `\n\nNomor terdaftar: ${terdaftar.length} (tidak ditampilkan)`;
    }

    await m.react("✅");
    return sendReplyWithNav(sock, m, claraWrap("Nomor Kosong", body), "nokos");
  } catch (err) {
    return m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export default { pluginConfig, handler };
