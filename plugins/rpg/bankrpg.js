// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Bank — Simpan & tarik gold dengan bunga harian

import { animBank } from "../../src/lib/nova-rpg-anim.js";
import {
  ensureRpg, saveRpg, addGold, removeGold
} from "../../src/lib/nova-rpg-service.js";
import { novaGameBox, gameCTA, novaRpgBox } from "../../src/lib/nova-games.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "bank",
  alias: ["bank", "bankrpg"],
  category: "rpg",
  description: "Bank RPG — simpan/tarik gold dengan bunga 5% harian",
  usage: ".bank <nabung|tarik|cek> [jumlah]",
  example: ".bank nabung 500",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const INTEREST_RATE = 0.05; // 5% per hari
const MAX_DEPOSIT = 1000000;

function calcInterest(deposit, lastInterest) {
  if (!deposit || !lastInterest) return 0;
  const days = Math.floor((Date.now() - lastInterest) / (24 * 60 * 60 * 1000));
  if (days < 1) return 0;
  return Math.floor(deposit * INTEREST_RATE * days);
}

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("bankrpg", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const args = m.text?.trim().split(/\s+/) || [];
    const action = args[0]?.toLowerCase();

    // Init bank data
    if (!rpg.bank) rpg.bank = { deposit: 0, lastInterest: 0 };
    const bank = rpg.bank;

    // Auto-claim interest dulu
    const interest = calcInterest(bank.deposit, bank.lastInterest);
    if (interest > 0) {
      bank.deposit += interest;
      bank.lastInterest = Date.now();
      saveRpg(m, { bank });
    }

    if (!action || action === "cek") {
      return m.reply(novaRpgBox("bankrpg", [
        m.pushName || "Player",
        "---",
        `Gold di tangan : ${rpg.gold}`,
        `Gold di bank : ${bank.deposit}`,
        ...(interest > 0 ? [`Bunga diterima : +${interest} gold`] : []),
        "Bunga : 5% per hari",
        "---",
        "📌 .bankrpg nabung <jumlah> — simpan",
        "💡 .bankrpg tarik <jumlah> — tarik",
      ], "info"));
    }

    if (action === "nabung" || action === "simpan" || action === "deposit") {
      const amount = parseInt(args[1]);

      if (!amount || amount < 1) {
        return m.reply(novaRpgBox("bankrpg", "Jumlah tidak valid. Contoh: .bankrpg nabung 500", "warn"));
      }

      if (rpg.gold < amount) {
        await m.react("🚫");
        return m.reply(novaRpgBox("bankrpg", `Gold tidak cukup! Kamu punya *${rpg.gold}*, mau nabung *${amount}*.`, "warn"));
      }

      if (bank.deposit + amount > MAX_DEPOSIT) {
        return m.reply(novaRpgBox("bankrpg", `Maksimal deposit *${MAX_DEPOSIT} gold*. Saldo bank: *${bank.deposit}*.`, "warn"));
      }

      removeGold(m, amount, sock);
      bank.deposit += amount;
      if (!bank.lastInterest) bank.lastInterest = Date.now();
      saveRpg(m, { bank });

      await m.react("🐣");
      await animBank(m, sock, "nabung");
      return m.reply(novaGameBox({
        title: "bankrpg", icon: "🏦",
        flavor: "✅ *BERHASIL MENABUNG!*",
        body: [
          `│ • Setor : ${amount} Gold`,
          `│ • Saldo bank : ${bank.deposit} Gold`,
          `│ • Sisa di tangan : ${rpg.gold - amount} Gold`,
          "│ • Bunga : 5% per hari masuk otomatis",
        ].join("\n"),
        cta: gameCTA("bankrpg"),
      }));
    }

    if (action === "tarik" || action === "ambil" || action === "withdraw") {
      const amount = parseInt(args[1]);

      if (!amount || amount < 1) {
        return m.reply(novaRpgBox("bankrpg", "Jumlah tidak valid. Contoh: .bankrpg tarik 500", "warn"));
      }

      if (bank.deposit < amount) {
        await m.react("🚫");
        return m.reply(novaRpgBox("bankrpg", `Saldo bank tidak cukup! Saldo: *${bank.deposit}*, mau tarik *${amount}*.`, "warn"));
      }

      bank.deposit -= amount;
      addGold(m, amount);
      saveRpg(m, { bank });

      await m.react("🐣");
      await animBank(m, sock, "tarik");
      return m.reply(novaGameBox({
        title: "bankrpg", icon: "🏦",
        flavor: "💵 *BERHASIL MENARIK!*",
        body: [
          `│ • Tarik : ${amount} Gold`,
          `│ • Sisa saldo bank : ${bank.deposit} Gold`,
          `│ • Gold di tangan : ${rpg.gold + amount} Gold`,
        ].join("\n"),
        cta: gameCTA("bankrpg"),
      }));
    }

    return m.reply(novaRpgBox("bankrpg", "Aksi tidak dikenal. Gunakan: nabung, tarik, atau cek", "warn"));
  } catch (err) {
    console.error("bankrpg error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("bankrpg", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
