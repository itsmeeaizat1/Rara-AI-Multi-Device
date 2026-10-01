// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap } from "../../src/lib/nova-menu-style.js";
import { callIkyy } from "../../src/lib/nova-ai-service.js";

/**
 * plugins/ai/askdoctor.js
 * Command .tanyadokter / .aikesehatan — AI Konsultasi Kesehatan
 * Tanya dokter AI tentang gejala, penyakit, gizi, obat, kesehatan umum
 * API: https://api-xemoz-official.my.id/api/ai/deepai-chat.php (gratis, via Xemoz)
 *
 * Cara pakai:
 * .tanyadokter <pertanyaan> — Tanya tentang kesehatan
 * .tanyadokter reset — Reset sesi percakapan
 *
 * Contoh:
 * .tanyadokter cara agar jantung sehat
 * .aikesehatan cara biar sembuh
 * .tanyadokter gejala demam berdarah
 */

const pluginConfig = {
  name: "tanyadokter",
  alias: ["tanyadokter"],
  category: "ai",
  description: "Konsultasi kesehatan dengan AI Dokter (gejala, penyakit, gizi, obat)",
  usage: ".tanyadokter <pertanyaan>\n.tanyadokter reset — Reset sesi",
  example: ".tanyadokter cara agar jantung sehat",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const API_URL = "https://api-xemoz-official.my.id/api/ai/deepai-chat.php";

// System prompt dokter — di-prepend ke pesan user
const DOCTOR_SYSTEM = `Anda adalah seorang dokter umum yang berpengalaman dan ramah. Anda menjawab pertanyaan kesehatan dalam bahasa Indonesia dengan jelas, akurat, dan mudah dipahami oleh orang awam. Selalu sertakan disclaimer bahwa ini adalah saran kesehatan umum dan bukan pengganti konsultasi langsung dengan dokter. Jika gejala yang dijelaskan user cukup serius, sarankan untuk segera ke rumah sakit atau klinik terdekat. Jawab dengan format yang rapi menggunakan poin-poin jika perlu. Jangan gunakan markdown formatting (jangan pakai ** atau ##), gunakan format plain text dengan nomor (1. 2. 3.) untuk poin.`;

// Session storage per user
const sessions = new Map();

function sessionKey(m) {
  return m.sender || m.key?.remoteJid || "unknown";
}

async function callDoctor(message, sessionUuid) {
  // Prepend system prompt ke message
  const fullMessage = `${DOCTOR_SYSTEM}\n\nPertanyaan dari pasien: ${message}`;

  const params = new URLSearchParams({ message: fullMessage });
  if (sessionUuid) params.set("session_uuid", sessionUuid);

  const res = await fetch(`${API_URL}?${params}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30000),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("Response server tidak dapat dibaca.");
  }

  if (!res.ok || !data?.status) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }

  return {
    response: data?.data?.response || "",
    sessionUuid: data?.data?.session_uuid || "",
  };
}

async function handler(m, { sock }) {
  const args = m.args || [];
  const input = args.join(" ").trim();

  if (!input) {
    const help = novaGuide(
      "tanyadokter",
      `Tanya dokter AI tentang kesehatan — gejala, penyakit, gizi, obat, tips\n${m.prefix}tanyadokter <pertanyaan>\n${m.prefix}tanyadokter reset — reset sesi percakapan`,
      `${m.prefix}tanyadokter cara agar jantung sehat\n${m.prefix}aikesehatan cara biar sembuh\n${m.prefix}tanyadokter gejala demam berdarah`
    );
    return m.reply(help, "tanyadokter");
  }

  if (input.toLowerCase() === "reset") {
    const key = sessionKey(m);
    if (sessions.has(key)) {
      sessions.delete(key);
      return m.reply(
        `\n` +
        `Sesi percakapan direset\n` +
        `Kirim pertanyaan baru untuk mulai\n`
      );
    }
    return m.reply(
      `\n` +
      `Tidak ada sesi aktif untuk direset\n`
    );
  }
  try {
  await m.react("🕒");
    const key = sessionKey(m);
    const sessionUuid = sessions.get(key) || "";

    const result = await callDoctor(input, sessionUuid);

    if (result.sessionUuid) {
      sessions.set(key, result.sessionUuid);
    }
    let reply = result.response || "Maaf, tidak ada response dari dokter AI.";

    // Tambah disclaimer di akhir
    reply +=
      `\n\n` +
      `_Catatan: Ini adalah saran kesehatan umum dari AI. Untuk diagnosis pasti, konsultasi langsung dengan dokter._`;

    // Potong jika terlalu panjang
    if (reply.length > 4096) {
      reply = reply.slice(0, 4096) + "\n\n... (dipotong)";
    }

    return m.reply(reply);
  } catch (error) {
    // IkyyXD fallback
    try {
      const ikyyReply = await callIkyy(input?.trim() || m.text, {});
      if (ikyyReply) return m.reply(ikyyReply);
    } catch (ikyyErr) {
      console.error("[askdoctor.js] IkyyXD fallback failed:", ikyyErr.message);
    }

    await m.react("🐣");
    return m.reply(
      `\n` +
      `*Error:* ${error.message || "Gagal menghubungi dokter AI"}\n` +
      `\n` +
      `Coba lagi beberapa saat.`
    );
  }
}

export { pluginConfig as config, handler };
