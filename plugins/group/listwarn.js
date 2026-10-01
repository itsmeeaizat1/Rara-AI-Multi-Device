// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {  novaWrap } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from '../../src/lib/nova-database.js'
import * as timeHelper from '../../src/lib/nova-time.js'
const pluginConfig = {
  name: "listwarn",
  alias: ["listwarn"],
  category: "group",
  description: "Melihat daftar warning member",
  usage: ".listwarn atau .listwarn @user",
  example: ".listwarn @user",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  isAdmin: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  let groupData = db.getGroup(m.chat) || {};
  let warnings = groupData.warnings || {};
  const maxWarns = groupData.maxWarnings || 3;

  let targetUser = null;
  if (m.quoted) {
    targetUser = m.quoted.sender;
  } else if (m.mentionedJid && m.mentionedJid.length > 0) {
    targetUser = m.mentionedJid[0];
  }
  if (targetUser) {
    const userWarnings = warnings[targetUser] || [];
    const targetName = targetUser.split("@")[0];

    if (userWarnings.length === 0) {
      await m.reply(novaWrap("Listwarn", `@${targetName} tidak memiliki warning.`, "success"), {
        mentions: [targetUser],
      });
      return;
    }

    let lines = [`Total: *${userWarnings.length}/${maxWarns}*`, ""];

    userWarnings.forEach((w, i) => {
      const date = timeHelper.fromTimestamp(w.time, "DD/MM/YYYY");
      lines.push(`*${i + 1}.* ${w.reason}`);
      lines.push(`   └ _${date}_`);
    });

    await m.reply(novaWrap("Warning " + targetName, lines), { mentions: [targetUser] });
  } else {
    // Show all users with warnings
    const usersWithWarnings = Object.keys(warnings).filter(
      (u) => warnings[u].length > 0,
    );

    if (usersWithWarnings.length === 0) {
      { const __navText = novaWrap("listwarn", `Tidak ada member dengan warning di grup ini.`, "success"); await m.reply(__navText); };
      return;
    }

    let txt = `⚠️ *daftar warning*\n\n`;

    usersWithWarnings.forEach((user, i) => {
      const count = warnings[user].length;
      const name = user.split("@")[0];
      txt += `*${i + 1}.* @${name} - *${count}/${maxWarns}* warning\n`;
    });

    txt += `\nKetik \`${m.prefix}listwarn @user\` untuk detail`;

    await m.reply(txt, { mentions: usersWithWarnings });
  }
}

export { pluginConfig as config, handler }