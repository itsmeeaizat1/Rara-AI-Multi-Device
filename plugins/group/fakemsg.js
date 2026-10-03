// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Plugin .fakemsg — ganti tampilan teks pesan yang di-reply (port engine lama fakemsg.js)
import { delay } from "rara";
import { raraGuide, raraError } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "fakemsg",
  alias: ["fakechat", "editfake"],
  category: "group",
  description: "Ganti tampilan teks pesan yang di-reply jadi teks lain (prank)",
  usage: ".fakemsg <teks pengganti>",
  example: ".fakemsg iya bener dia doi orang",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🧠");
    const text = (m.text || "").replace(new RegExp("^" + prefix + "fakemsg\\s*", "i"), "").trim();
    if (!m.quoted) {
      await m.react("🐣");
      await m.reply(raraGuide(
        "fakemsg",
        "Reply pesan target terus kasih teks pengganti — tampilan teks pesannya berubah (prank).",
        prefix + "fakemsg udah gue transfer dana 50 juta",
        "Cuma ganti TAMPILAN di layar, bukan isi asli pesan. Khusus grup."
      ));
      return { handled: true };
    }
    if (!text) {
      await m.react("❌");
      await m.reply(raraError("Fakemsg", "Kasih teks penggantinya"));
      return { handled: true };
    }
    const stanzaId = m.quoted.id || m.quoted.key?.id;
    if (!stanzaId) {
      await m.react("❌");
      await m.reply(raraError("Fakemsg", "Gak bisa baca ID pesan yang di-reply"));
      return { handled: true };
    }
    const tempId = await sock.relayMessage(m.chat, {
      extendedTextMessage: { text: "", contextInfo: { isGroupStatus: true } },
    }, {});
    const tempId2 = await sock.relayMessage(m.chat, {
      protocolMessage: {
        key: { jid: m.chat, fromMe: true, id: tempId },
        type: 14,
        editedMessage: { extendedTextMessage: { text, contextInfo: { isGroupStatus: false } } },
      },
    }, { messageId: stanzaId });
    await delay(100);
    await Promise.allSettled([
      sock.sendMessage(m.chat, { delete: { remoteJid: m.chat, id: tempId, fromMe: true } }),
      sock.sendMessage(m.chat, { delete: { remoteJid: m.chat, id: tempId2, fromMe: true } }),
    ]);
    await m.react("⚡");
  } catch (error) {
    console.error("[fakemsg]:", error.message);
    await m.react("❌");
    await m.reply(raraError("Fakemsg", "Gagal: " + String(error.message).slice(0, 120)));
  }
  return { handled: true };
}

export { pluginConfig as config, handler }
