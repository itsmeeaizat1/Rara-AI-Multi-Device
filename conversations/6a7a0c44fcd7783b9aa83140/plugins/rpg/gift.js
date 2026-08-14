import { getDatabase } from "../../src/lib/nova-database.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "gift",
  alias: ["gift", "hadiahgift", "kadohadiah", "hadiahistimewa"],
  category: "rpg",
  description: "Beri hadiah ke pasangan untuk meningkatkan love",
  usage: ".gift <item> <jumlah>",
  example: ".gift diamond 1",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);

  if (!user.rpg) user.rpg = {};

  if (!user.rpg.spouse) {
    return sendReplyWithNav(sock, m, `❌ *ʙᴇʟᴜᴍ ᴍᴇɴɪᴋᴀʜ*\n\n` + `> Kamu belum menikah!\n` + `> Nikah dulu dengan \`.marry @user\``, "gift");
  }

  const args = m.args || [];
  const itemKey = args[0]?.toLowerCase();
  const amount = parseInt(args[1]) || 1;

  if (!itemKey) {
    return sendReplyWithNav(sock, m, `🎁 *ɢɪꜰᴛ*\n\n` +
        `*📋 *ᴜsᴀɢᴇ:*
\n` +
        `> > Pilih item untuk diberikan\n` +
        `> > \`.gift diamond 1\`\n` +
        ``, "gift");
  }

  user.inventory = user.inventory || {};

  if ((user.inventory[itemKey] || 0) < amount) {
    return sendReplyWithNav(sock, m, `❌ *ɪᴛᴇᴍ ᴛɪᴅᴀᴋ ᴄᴜᴋᴜᴘ*\n\n` + `> Item *${itemKey}* kamu: ${user.inventory[itemKey] || 0}\n` + `> Butuh: ${amount}`, "gift");
  }

  const spouseJid = user.rpg.spouse;
  const partner = db.getUser(spouseJid);

  if (!partner) {
    { const __navText = claraWrap("ᴘᴀsᴀɴɢᴀɴ ɴᴏᴛ ꜰᴏᴜɴᴅ", `❌ *ᴘᴀsᴀɴɢᴀɴ ɴᴏᴛ ꜰᴏᴜɴᴅ*\n\n> Pasangan tidak ditemukan di database!`); return await m.reply(__navText); };
  }

  partner.inventory = partner.inventory || {};

  user.inventory[itemKey] -= amount;
  partner.inventory[itemKey] = (partner.inventory[itemKey] || 0) + amount;

  user.rpg.love = (user.rpg.love || 0) + amount * 10;
  if (partner.rpg) partner.rpg.love = (partner.rpg.love || 0) + amount * 10;

  db.save();

  let txt = `🎁 *ɢɪꜰᴛ sᴜᴋsᴇs*\n\n`;
  txt += `> 💝 Kamu memberikan ${amount}x ${itemKey}\n`;
  txt += `> 👤 Untuk: @${spouseJid.split("@")[0]}\n`;
  txt += `> 💕 Love: +${amount * 10}\n\n`;
  txt += `> _So sweet! 💖_`;

  await sendReplyWithNav(sock, m, txt, "gift");
}

export { pluginConfig as config, handler };
