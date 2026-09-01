// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput,  claraHeader,  separator, tipText, claraWrap, novaCaption } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "spy",
  alias: ["spy"],
  category: "info",
  description: "Lihat info target",
  usage: ".spy <@target>",
  example: ".spy @username",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const raw = m.text?.trim() || "";
    const target = raw.replace(/^\.spy\s+/i, "").trim();

    if (!target) {
      const text =
        novaCaption({
  emoji: "ℹ️",
  name: "spy",
  description: "Lihat info target",
  usage: `${prefix}spy <@target>`,
  example: `${prefix}spy @username`,
}) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply( text, "spy");
      return { handled: true };
    }

    const db = getDatabase();
    const targetId = target.replace(/^@+/, "");
    const userKey = Object.keys(db.data || {}).find((key) => String(key).includes(targetId));

    const userName = targetId;
    const userData = userKey ? db.get(userKey) : null;
    const rpg = userData?.rpg || null;

    const lines = [
      `│ Target: *${userName}*`,
      rpg ? `│ Level: *${rpg.level || 0}*` : "│ Level: *-*",
      rpg ? `│ Gold: *${rpg.gold ?? 0}*` : "│ Gold: *-*",
      rpg ? `│ Exp: *${rpg.exp || 0}*` : "│ Exp: *-*",
      "│ Status: *ʙᴇʀʜᴀꜱɪʟ*",
    ];

    const text =
      claraWrap("Spy", "🕵️") +
      "\n\n" +
      claraWrap("Intel", lines) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("spy", text));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("Spy", "Gagal nih, coba lagi ya");

    await m.reply( text, "spy");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
