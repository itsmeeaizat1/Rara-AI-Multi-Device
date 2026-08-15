// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader,  separator, claraWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { getUser } from "../../src/lib/nova-rpg.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "rpgshop", alias: ["shoprpg", "rpgbuy", "rpgsell", "belirpg", "jualrpg"], category: "rpg",
  description: "Beli & jual item RPG", usage: ".rpgshop <buy/sell> <item> <jumlah>",
  example: ".rpgshop buy potion 5", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: true, cooldown: 2, energi: 0, isEnabled: true,
};

const BUY = { potion: 1250, wood: 700, rock: 850, string: 400, iron: 3000, diamond: 10000, emerald: 6000 };
const SELL = { potion: 650, wood: 350, rock: 437, string: 200, iron: 1500, diamond: 5000, emerald: 3000 };

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const args = (m.text || "").trim().split(/\s+/);
    const action = args[0]?.toLowerCase();
    const item = args[1]?.toLowerCase();
    const count = Math.max(1, parseInt(args[2]) || 1);
    const db = getDatabase();
    const user = getUser(db, m.sender);
    
    if (!action || (action !== "buy" && action !== "sell" && action !== "list")) {
      let text = claraWrap("RPG Shop", "🏪") + "\n\n";
      text += claraWrap("ᴄᴀʀᴀ ᴘᴀᴋᴀɪ", [`◦ Beli: *${prefix}rpgshop buy <item> <jumlah>*`, `◦ Jual: *${prefix}rpgshop sell <item> <jumlah>*`, `◦ List: *${prefix}rpgshop list*`].join("\n")) + "\n\n";
      text += claraWrap("ʜᴀʀɢᴀ ʙᴇʟɪ", Object.entries(BUY).map(([k,v]) => `◦ ${k}: Rp${v.toLocaleString("id-ID")}`)) + "\n\n";
      text += claraWrap("ʜᴀʀɢᴀ ᴊᴜᴀʟ", Object.entries(SELL).map(([k,v]) => `◦ ${k}: Rp${v.toLocaleString("id-ID")}`)) + "\n\n";
      text += separator("━", 22);
      await sendReplyWithNav(sock, m, text, "rpgshop");
      return { handled: true };
    }
    
    if (action === "list") {
      let text = claraWrap("RPG Shop List", "🏪") + "\n\n";
      text += claraWrap("ʙᴇʟɪ", Object.entries(BUY).map(([k,v]) => `◦ ${k}: Rp${v.toLocaleString("id-ID")}`)) + "\n\n";
      text += claraWrap("ᴊᴜᴀʟ", Object.entries(SELL).map(([k,v]) => `◦ ${k}: Rp${v.toLocaleString("id-ID")}`)) + "\n\n";
      text += separator("━", 22);
      await sendReplyWithNav(sock, m, text, "rpgshop");
      return { handled: true };
    }
    
    if (!item || !BUY[item]) {
      await sendReplyWithNav(sock, m, claraWrap("RPG Shop", [`◦ Item: *${item || "kosong"}*`,
        `◦ Tersedia: ${Object.keys(BUY).join(", ")}`].join("\n")), "rpgshop");
      return { handled: true };
    }
    
    if (action === "buy") {
      const total = BUY[item] * count;
      if (user.money < total) {
        await sendReplyWithNav(sock, m, claraWrap("RPG Shop", [`◦ Butuh: *Rp${total.toLocaleString("id-ID")}*`,
          `◦ Punya: *Rp${user.money.toLocaleString("id-ID")}*`].join("\n")), "rpgshop");
        return { handled: true };
      }
      user.money -= total;
      user[item] = (user[item] || 0) + count;
      db.write();
      await sendReplyWithNav(sock, m, claraWrap("RPG Shop", [`◦ Item: *${item}* x${count}`,
        `◦ Harga: *Rp${total.toLocaleString("id-ID")}*`,
        `◦ Sisa uang: *Rp${user.money.toLocaleString("id-ID")}*`].join("\n")), "rpgshop");
    } else if (action === "sell") {
      if ((user[item] || 0) < count) {
        await sendReplyWithNav(sock, m, claraWrap("RPG Shop", [`◦ ${item}: *${user[item] || 0}*`,
          `◦ Butuh: *${count}*`].join("\n")), "rpgshop");
        return { handled: true };
      }
      const total = SELL[item] * count;
      user[item] -= count;
      user.money += total;
      db.write();
      await sendReplyWithNav(sock, m, claraWrap("RPG Shop", [`◦ Item: *${item}* x${count}`,
        `◦ Dapat: *Rp${total.toLocaleString("id-ID")}*`,
        `◦ Total uang: *Rp${user.money.toLocaleString("id-ID")}*`].join("\n")), "rpgshop");
    }
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };