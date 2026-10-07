// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Plugin .tgid — cek ID Telegram (akun, grup, channel) langsung dari chat-nya.
// Berguna buat setup bridge: .bridge ownerid add telegram <id> & .bridge notif group|channel <id>.
// ID diambil murni dari JID bridge (tanpa _bridge metadata): tg_<id> DM,
// tg_g<id>@g.us grup, tg_c<id>@newsletter channel, dc_<id> / dc_g<id>@g.us Discord.
import { raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "tgid",
  alias: ["idtelegram", "idtele", "teleid"],
  category: "telegram",
  description: "Cek ID akun Telegram kamu, ID grup, dan ID channel — buat setup bridge",
  usage: ".tgid — jalankan di DM/grup/channel Telegram (atau Discord) lewat bridge",
  example: ".tgid",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// JID bridge → ID platform mentah (angka asli Telegram/Discord)
// tg_g1001234567890@g.us → -1001234567890 (minus dipulihkan — adapter nge-strip 1 tanda)
function parseBridgeJid(sender, chat) {
  const s = String(sender || "");
  const c = String(chat || "");
  const userId = (m) => (m ? m.replace(/^(tg|dc)_/, "") : "");
  let chatKind = "dm"; // dm | group | channel
  let chatId = "";
  let platform = s.startsWith("dc_") ? "discord" : "telegram";
  const g = c.match(/^dc?_?g?(\d+)@g\.us$/) || c.match(/^tg_g(\d+)@g\.us$/);
  if (/^tg_g\d+@g\.us$/.test(c)) { chatKind = "group"; chatId = "-" + c.match(/^tg_g(\d+)@g\.us$/)[1]; }
  else if (/^dc_g\d+@g\.us$/.test(c)) { chatKind = "group"; chatId = c.match(/^dc_g(\d+)@g\.us$/)[1]; platform = "discord"; }
  else if (/^tg_c\d+@newsletter$/.test(c)) { chatKind = "channel"; chatId = "-" + c.match(/^tg_c(\d+)@newsletter$/)[1]; }
  else if (/^dc_c\d+@newsletter$/.test(c)) { chatKind = "channel"; chatId = c.match(/^dc_c(\d+)@newsletter$/)[1]; platform = "discord"; }
  return { platform, senderRaw: s, chatRaw: c, userId: userId(s), chatKind, chatId };
}

async function handler(m, { sock }) {
  const info = parseBridgeJid(m.sender, m.chat);

  // Dari WhatsApp → kartu panduan (fitur ini buat platform bridge)
  if (!info.senderRaw.startsWith("tg_") && !info.senderRaw.startsWith("dc_")) {
    return m.reply(raraWrap("tgid", [
      "Perintah ini buat ngecek ID Telegram/Discord — jalankan langsung dari chat platformnya:",
      "",
      "• ID akun kamu → jalankan .tgid di DM bot Telegram",
      "• ID grup → jalankan .tgid di grup Telegram (bot harus ada di grup)",
      "• ID channel → jalankan .tgid di channel Telegram (bot admin channel)",
      "",
      "Alternatif manual: chat @userinfobot (ID akun) atau @RawDataBot (ID grup/channel).",
      info.chatRaw && info.chatRaw.endsWith("@g.us") ? `\nWhatsApp kamu: ${info.chatRaw}` : "",
    ].filter(Boolean).join("\n")));
  }

  const label = { dm: "💬 Chat Pribadi", group: "👥 Grup", channel: "📢 Channel" }[info.chatKind];
  const lines = [];

  if (info.platform === "telegram") {
    lines.push(`🧑 ID Akun Kamu: *${info.userId}*`);
    if (info.chatKind === "group") {
      lines.push(`${label}: *${info.chatId}*`);
    } else if (info.chatKind === "channel") {
      lines.push(`${label}: *${info.chatId}*`);
    } else {
      lines.push(`${label}: *${info.userId}*`);
    }
    // nama grup/saluran dari registry .jasher (kalau sudah tercatat)
    try {
      const { getDatabase } = await import("../../src/lib/rara-database.js");
      const db = getDatabase();
      const reg = db?.db?.data?.jasher?.groups?.[info.chatRaw];
      if (reg?.name) lines.push(`🏷 Nama: ${reg.name}`);
    } catch {}
    lines.push("");
    lines.push("Siap pakai buat setup bridge:");
    lines.push(`• Daftar owner: .bridge ownerid add telegram ${info.userId}`);
    if (info.chatKind === "group") lines.push(`• Notif grup: .bridge notif group ${info.chatId}`);
    if (info.chatKind === "channel") lines.push(`• Notif channel: .bridge notif channel ${info.chatId}`);
    lines.push("• Info lengkap: .bridge notif");
  } else {
    lines.push(`🧑 ID Kamu: *${info.userId}*`);
    if (info.chatId) lines.push(`💬 ID Chat: *${info.chatId}*`);
    lines.push("");
    lines.push(`Daftar owner: .bridge ownerid add discord ${info.userId}`);
  }

  return m.reply(raraWrap("tgid", lines.join("\n")));
}

export { pluginConfig, handler };
export default { pluginConfig, handler };
