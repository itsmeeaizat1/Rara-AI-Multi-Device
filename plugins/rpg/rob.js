// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraHeader,
    separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { getPlayer, ensurePlayer, addGold, savePlayer } from "../../src/lib/nova-rpg-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "rob",
  alias: ["rob", "rampok", "gasit", "rob"],
  category: "economy",
  description: "Rampok pemain lain untuk dapat gold",
  usage: ".rob <@target>",
  example: ".rob @username",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 3600,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const userName = m.pushName || "Player";
    const targetRaw = m.text?.trim();

    if (!targetRaw) {
      const text =
        claraWrap("Cara Pakai", [`  ┊  ➶ Penggunaan: *${prefix}rob <@target>*`,
          `  ┊  ➶ Contoh: *${prefix}rob @username*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "rob");
      return { handled: true };
    }

    const targetName = targetRaw.replace(/^@+/, "") || targetRaw;
    const actor = ensurePlayer(m, userName);
    const actorRpg = actor?.rpg || {};

    if ((actorRpg.gold || 0) < 50) {
      const text =
        claraWrap("Rob", ["  ┊  ➶ Butuh minimal *50 Gold* untuk aksi ini.",
          `  ┊  ➶ Saldo kamu: *${actorRpg.gold || 0} Gold*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}daily untuk klaim gold harian`) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "rob");
      return { handled: true };
    }

    const roll = Math.random();
    const maxSteal = Math.min(180, Math.floor((actorRpg.gold || 0) * 0.4));
    const penalty = Math.min(120, Math.floor((actorRpg.gold || 0) * 0.25));

    let rewardGold = 0;
    let penaltyGold = 0;
    let result = "";

    if (roll < 0.45) {
      rewardGold = Math.floor(Math.random() * maxSteal) + 20;
      result = `Rampokan ke *${targetName}* berhasil.`;
    } else if (roll < 0.8) {
      penaltyGold = Math.floor(Math.random() * penalty) + 10;
      result = `Rampokan ke *${targetName}* gagal dan kamu ditilang.`;
    } else {
      result = `Kamu nyaris ditangkap saat merampok *${targetName}*.`;
    }

    if (rewardGold > 0) addGold(m, rewardGold);
    if (penaltyGold > 0) addGold(m, -penaltyGold);

    const updated = getPlayer(m);
    const updatedRpg = updated?.rpg || {};

    savePlayer(m, {
      rpg: {
        ...updatedRpg,
        gold: updatedRpg.gold ?? actorRpg.gold ?? 0,
      },
    });

    const lines = [
      `  ┊  ➶ Target: *${targetName}*`,
      `  ┊  ➶ Hasil: *${result}*`,
      rewardGold > 0 ? `  ┊  ➶ Dapat: *+${rewardGold} Gold*` : "",
      penaltyGold > 0 ? `  ┊  ➶ Kehilangan: *-${penaltyGold} Gold*` : "",
      `  ┊  ➶ Saldo sekarang: *${updatedRpg.gold ?? actorRpg.gold ?? 0} Gold*`,
    ].filter(Boolean);

    const text =
      claraWrap("Rob", "🥷") +
      "\n\n" +
      claraWrap("HaꜱIl", lines) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "rob");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("rob", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
