import { alyaHeader, separator, tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "rpgmenuold", alias: ["menurg", "rpglist", "rpgv2", "rpgmenuv2"], category: "rpg",
  description: "Menu RPG lengkap", usage: ".rpgmenu",
  example: ".rpgmenu", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: true, cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    let text = claraWrap("RPG Menu", "⚔️") + "\n\n";
    text += claraWrap("ᴘʀᴏꜰɪʟᴇ", [`◦ ${prefix}rpgprofile - Lihat profile`, `◦ ${prefix}inventory - Lihat tas`, `◦ ${prefix}rpgboard - Top player`].join("\n")) + "\n\n";
    text += claraWrap("ᴀᴅᴠᴇɴᴛᴜʀᴇ", [`◦ ${prefix}adventure - Berpetualang`, `◦ ${prefix}hunt - Berburu hewan`, `◦ ${prefix}fish - Memancing ikan`, `◦ ${prefix}mining - Menambang ore`].join("\n")) + "\n\n";
    text += claraWrap("ᴇᴄᴏɴᴏᴍʏ", [`◦ ${prefix}rpgwork - Bekerja`, `◦ ${prefix}rpgshop - Beli/jual item`, `◦ ${prefix}rpgslot - Casino slot`, `◦ ${prefix}rpgtransfer - Kirim uang`].join("\n")) + "\n\n";
    text += claraWrap("ʀᴇᴡᴀʀᴅ", [`◦ ${prefix}rpgdaily - Reward harian`, `◦ ${prefix}rpgweekly - Reward mingguan`].join("\n")) + "\n\n";
    text += claraWrap("ᴜᴛɪʟɪᴛʏ", `◦ ${prefix}rpgheal - Heal pakai potion`) + "\n\n";
    text += separator("━", 22) + "\n" + tipText("Main tiap hari naik level cepat! 🔥");
    await sendReplyWithNav(sock, m, text, "rpgmenu");
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };