import { ensureRpg, saveRpg, removeGold, addGold } from "../../src/lib/nova-rpg-service.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";
const pluginConfig = {
  name: "gbankrpg", alias: ["gbankrpg", "gbank"],
  category: "rpg", description: "Guild Bank — saldo bersama guild",
  usage: ".gbankrpg saldo/setor/tarik <jumlah>",
  example: ".gbankrpg setor 500",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};
global.rpgGuildBank = global.rpgGuildBank || {};
async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("gbankrpg", "RPG belum siap.", "error"));
    if (!rpg.guildId) return m.reply(novaRpgBox("gbankrpg", "⚠️ Kamu belum tergabung guild.", "error"));
    const args = m.args;
    const aksi = (args[0] || "").toLowerCase();
    const jumlah = parseInt(args[1] || "0");
    if (!aksi) return m.reply(novaRpgBox("gbankrpg", `🏰 *GUILD BANK*\n\ngbankrpg saldo → cek saldo guild\ngbankrpg setor <jumlah> → setor gold\ngbankrpg tarik <jumlah> → tarik gold`, "guide"));
    if (!global.rpgGuildBank[rpg.guildId]) global.rpgGuildBank[rpg.guildId] = { balance: 0 };
    const gb = global.rpgGuildBank[rpg.guildId];
  await animGeneric(m, sock, "🏦", "Guild Bank");
    if (aksi === "saldo") return m.reply(novaRpgBox("gbankrpg", `🏰 Saldo Guild: *${gb.balance} gold*`, "info"));
    if (aksi === "setor") {
      if (jumlah <= 0) return m.reply(novaRpgBox("gbankrpg", "Jumlah tidak valid.", "error"));
      if (rpg.gold < jumlah) return m.reply(novaRpgBox("gbankrpg", `💰 Tidak cukup. Kamu punya ${rpg.gold}.`, "error"));
      removeGold(m, jumlah, sock);
      gb.balance += jumlah;
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply(novaRpgBox("gbankrpg", `✅ Setor ${jumlah} gold ke guild bank. Saldo: ${gb.balance}.`, "success"));
    }
    if (aksi === "tarik") {
      if (jumlah <= 0 || jumlah > gb.balance) return m.reply(novaRpgBox("gbankrpg", "Jumlah tidak valid atau saldo tidak cukup.", "error"));
      gb.balance -= jumlah;
      addGold(m, jumlah);
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply(novaRpgBox("gbankrpg", `✅ Tarik ${jumlah} gold dari guild bank. Saldo: ${gb.balance}.`, "success"));
    }
  } catch (e) { return m.reply(novaRpgBox("gbankrpg", "Error.", "error")); }
}
export { pluginConfig as config, handler };
