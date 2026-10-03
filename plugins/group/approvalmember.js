// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraError, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";

function raraWrap(title, text) {
  const scMap = {a:'a',b:'b',c:'c',d:'d',e:'e',f:'f',g:'g',h:'h',i:'i',j:'j',k:'k',l:'l',m:'m',n:'n',o:'o',p:'p',r:'r',s:'s',t:'t',u:'u',v:'v',w:'w',y:'y',z:'z'};
  const toSC = (s) => s.replace(/[a-z]/g, c => scMap[c] || c);
  const body = Array.isArray(text) ? text.join("\n") : text;
  // Convert body to small caps tapi skip baris command (.xxx) dan preserve *bold*
  const scBody = body.split("\n").map(line => {
    if (line.trim().startsWith(".") || line.trim().startsWith("Toggle:")) return line;
    return toSC(line);
  }).join("\n");
  return `${toSC(title)}\n\n${scBody}`;
}
async function formatAndReply(m, text, cmdName) {
  const scMap = {a:'a',b:'b',c:'c',d:'d',e:'e',f:'f',g:'g',h:'h',i:'i',j:'j',k:'k',l:'l',m:'m',n:'n',o:'o',p:'p',r:'r',s:'s',t:'t',u:'u',v:'v',w:'w',y:'y',z:'z'};
  const toSC = (s) => s.replace(/[a-z]/g, c => scMap[c] || c);
  // Convert all text to small caps, skip command lines
  text = text.split("\n").map(line => {
    if (line.trim().startsWith(".") || line.trim().startsWith("Toggle:") || line.includes("°˖") || line.includes("⋆｡˚")) return line;
    return toSC(line);
  }).join("\n");
  if (!text.includes("")) {
    text = text + "\n";
  }
  return await m.reply(text);
}


const pluginConfig = {
  name: "approvalmember",
  alias: ["approvalmember"],
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
    return await formatAndReply(m, text, "approvalmember");
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
      return formatAndReply(m, raraWrap("approvalmember", "Bot bukan admin di grup ini.\n\nJadikan bot admin dulu untuk menggunakan fitur ini."));
    }
    // WhatsApp group setting: membership_approval_mode
    // Baileys: groupSettingUpdate with memberApprovalMode
    const isOn = action === "on";

    // Use the WA proto to update group settings
    // memberApprovalMode is set via groupSettingsUpdate
    const { proto } = await import("rara");

    const patch = {
      memberApprovalMode: isOn
        ? { isMemberApprovalRequired: true }
        : { isMemberApprovalRequired: false },
    };

    await sock.groupSettingUpdate(m.chat, patch);
    let text = "PERSETUJUAN MEMBER: " + (isOn ? "*aktif*" : "*nonaktif*") + "\n\n";
    if (isOn) {
      text += "Sekarang member yang mau gabung harus di-approve admin dulu.\n\n";
      text += "Approve: " + m.prefix + "approvejoin <nomor> <groupId>\n";
      text += "Tolak: " + m.prefix + "rejectjoin <nomor> <groupId>\n\n";
      text += "Notifikasi ke owner/admin bisa di-toggle via " + m.prefix + "togglejoinreq";
    } else {
      text += "Member sekarang bisa langsung gabung tanpa persetujuan.";
    }

    return await formatAndReply(m, text, "approvalmember");
  } catch (error) {
    return m.reply(raraError("ApprovalMember", "Gagal ubah pengaturan nih — pastikan bot admin grup"));
  }
}

export { pluginConfig as config, handler };
