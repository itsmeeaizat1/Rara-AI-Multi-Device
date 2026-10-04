// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import config from "../../config.js";
import te from "../../src/lib/rara-error.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

const pluginConfig = {
  name: "rvo",
  alias: ["rvo"],
  category: "tools",
  description: "Baca pesan sekali lihat (view once)",
  usage: ".rvo (reply pesan view once)",
  example: ".rvo",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const quoted = m.quoted;
  if (!quoted) {
    return m.reply(
      `Reply pesan sekali lihat (view once) untuk membukanya.\n\n\`Contoh: ${m.prefix}rvo\` (reply pesan view once)`,
    );
  }

  if (!quoted.isViewOnce && !quoted.isMedia) {
    return m.reply(raraWrap("Rvo", "❌ Reply pesan view once (sekali lihat) untuk membukanya."));
  }
  try {
    await m.react("🕒");
    let originalCaption = "";
    if (quoted.message?.[quoted.type]?.caption) {
      originalCaption = quoted.message[quoted.type].caption;
    } else if (quoted.body) {
      originalCaption = quoted.body;
    }

    const buffer = await quoted.download();
    if (!buffer) throw new Error("Gagal download media");

    const caption = originalCaption ? `\`Pesan :\`\n${originalCaption}` : "";

    let rcard = "";
    try {
      const rinfo = await probeBuffer(buffer);
      rcard = mediaResultCard({
        header: "rvo",
        type: quoted.isImage ? "gambar" : "video",
        size: rinfo.size, mime: rinfo.mime, width: rinfo.width, height: rinfo.height,
      });
    } catch { /* best-effort */ }
    if (quoted.isImage) {
      await sock.sendMessage(
        m.chat,
        {
          image: buffer,
          caption: (rcard || caption),
        },
        { quoted: m },
      );
    } else if (quoted.isVideo) {
      await sock.sendMessage(
        m.chat,
        {
          video: buffer,
          caption: (rcard || caption),
        },
        { quoted: m },
      );
    } else if (quoted.isAudio) {
      await sock.sendMessage(
        m.chat,
        {
          audio: buffer,
          mimetype: quoted.message?.[quoted.type]?.mimetype || "audio/mpeg",
        },
        { quoted: m },
      );
      try {
        const ainfo = await probeBuffer(buffer, { mime: "audio/mpeg" });
        const acard = mediaResultCard({
          header: "rvo",
          type: "audio",
          size: ainfo.size, mime: ainfo.mime, duration: ainfo.duration,
        });
        if (acard) await m.reply(acard);
      } catch { /* best-effort */ }
    } else {
      const ext = quoted.type?.replace("Message", "") || "bin";
      let docCard = "";
      try {
        const dinfo = await probeBuffer(buffer);
        docCard = mediaResultCard({
          header: "rvo",
          type: "dokumen",
          request: [["Format", ext]],
          size: dinfo.size, mime: dinfo.mime,
        });
      } catch { /* best-effort */ }
      await m.react("🐣");
      await sock.sendMessage(
        m.chat,
        {
          document: buffer,
          fileName: `rvo_${Date.now()}.${ext}`,
          mimetype:
            quoted.message?.[quoted.type]?.mimetype ||
            "application/octet-stream",
          caption: (docCard || caption || "📎 View once media"),
        },
        { quoted: m },
      );
    }
  } catch (e) {
    await m.react("❌");
    let msg = e.message;
    if (
      msg.includes("Gagal download") ||
      msg.includes("decrypt") ||
      msg.includes("download") ||
      msg.includes("Timeout") ||
      msg.includes("404") ||
      msg.includes("Gone")
    ) {
      msg =
        "Media sudah kadaluarsa atau sudah dihapus dari server WhatsApp.\n\n_Pesan View Once yang terlalu lama atau sering dibuka biasanya akan otomatis hangus dari sistem WhatsApp dan tidak bisa diunduh lagi._";
    }
    { const __navText = raraWrap("Gagal Membuka View Once", `${msg}`); await m.reply(__navText); };
  }
}

export { pluginConfig as config, handler };
