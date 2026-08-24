// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";

// Local Nova AI format — replaces claraWrap + sendReplyWithNav
function claraWrap(title, text) {
  const body = Array.isArray(text) ? text.join("\n") : text;
  const sc = title.replace(/[a-z]/g, c => ({a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',y:'ʏ',z:'ᴢ'})[c] || c);
  return `❀°˖ ${sc} ˖°❀\n\n${body}`;
}
async function sendReplyWithNav(sock, m, text, cmdName) {
  if (!text.includes("❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀")) {
    text = text + "\n\n❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀";
  }
  return await m.reply(text);
}



const pluginConfig = {
  name: "approvalmember",
  alias: ["persetujuanmember", "memberapproval", "reqmember", "setapproval"],
  category: "group",
  description: "Aktifkan/matikan persetujuan member di grup (admin only)",
  usage: ".approvalmember on / .approvalmember off",
  example: ".approvalmember on",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  isAdmin: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const args = m.args || [];
  const action = args[0]?.toLowerCase();

  if (!action || (action !== "on" && action !== "off")) {
    let text = "PERSETUJUAN MEMBER\n\n";
    text += "Aktifkan mode persetujuan member di grup ini.\n";
    text += "Saat aktif, member baru harus di-approve admin sebelum bisa gabung.\n\n";
    text += "Cara pakai:\n";
    text += m.prefix + "approvalmember on — aktifkan\n";
    text += m.prefix + "approvalmember off — matikan\n\n";
    text += "Note: Bot harus jadi admin grup untuk fitur ini.";
    return await sendReplyWithNav(sock, m, text, "approvalmember");
  }

  try {
    // Check if bot is admin
    const metadata = await sock.groupMetadata(m.chat);
    const botId = sock.user?.id?.split(":")[0] + "@s.whatsapp.net" ||
      sock.user?.id?.split("@")[0] + "@s.whatsapp.net";
    const botParticipant = metadata.participants?.find((p) => {
      const pNum = (p.id || "").split("@")[0].split(":")[0];
      const bNum = sock.user?.id?.split(":")[0] || sock.user?.id?.split("@")[0];
      return pNum === bNum;
    });

    if (!botParticipant || !botParticipant.admin) {
      return m.reply(claraWrap("approvalmember", "Bot bukan admin di grup ini.\n\nJadikan bot admin dulu untuk menggunakan fitur ini."));
    }

    await m.react("🕐");

    // WhatsApp group setting: membership_approval_mode
    // Baileys: groupSettingUpdate with memberApprovalMode
    const isOn = action === "on";

    // Use the WA proto to update group settings
    // memberApprovalMode is set via groupSettingsUpdate
    const { proto } = await import("nova");

    const patch = {
      memberApprovalMode: isOn
        ? { isMemberApprovalRequired: true }
        : { isMemberApprovalRequired: false },
    };

    await sock.groupSettingUpdate(m.chat, patch);

    await m.react("✅");

    let text = "PERSETUJUAN MEMBER: " + (isOn ? "*AKTIF*" : "*NONAKTIF*") + "\n\n";
    if (isOn) {
      text += "Sekarang member yang mau gabung harus di-approve admin dulu.\n\n";
      text += "Approve: " + m.prefix + "approvejoin <nomor> <groupId>\n";
      text += "Tolak: " + m.prefix + "rejectjoin <nomor> <groupId>\n\n";
      text += "Notifikasi ke owner/admin bisa di-toggle via " + m.prefix + "togglejoinreq";
    } else {
      text += "Member sekarang bisa langsung gabung tanpa persetujuan.";
    }

    return await sendReplyWithNav(sock, m, text, "approvalmember");
  } catch (error) {
    return m.reply(
      "Gagal mengubah pengaturan persetujuan member.\n\n" +
      "Error: " + (error.message || "Unknown error") + "\n\n" +
      "Pastikan bot adalah admin grup."
    );
  }
}

export { pluginConfig as config, handler };
