// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Bank — Simpan & tarik gold dengan bunga harian

import { animBank } from "../../src/lib/nova-rpg-anim.js";
import {
  ensureRpg, saveRpg, addGold, removeGold
} from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "bankrpg",
  alias: ["bankrpg", "bank"],
  category: "rpg",
  description: "Bank RPG — simpan/tarik gold dengan bunga 5% harian",
  usage: ".bankrpg <nabung|tarik|cek> [jumlah]",
  example: ".bankrpg nabung 500",
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
    if (!rpg) return m.reply(claraWrap("bankrpg", "RPG belum siap. Ketik .daftar dulu.", "error"));

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
      return m.reply(claraWrap("bankrpg", [
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
        return m.reply(claraWrap("bankrpg", "Jumlah tidak valid. Contoh: .bankrpg nabung 500", "warn"));
      }

      if (rpg.gold < amount) {
        await m.react("🚫");
        return m.reply(claraWrap("bankrpg", `Gold tidak cukup! Kamu punya *${rpg.gold}*, mau nabung *${amount}*.`, "warn"));
      }

      if (bank.deposit + amount > MAX_DEPOSIT) {
        return m.reply(claraWrap("bankrpg", `Maksimal deposit *${MAX_DEPOSIT} gold*. Saldo bank: *${bank.deposit}*.`, "warn"));
      }

      removeGold(m, amount, sock);
      bank.deposit += amount;
      if (!bank.lastInterest) bank.lastInterest = Date.now();
      saveRpg(m, { bank });

      await m.react("🐣");
      await animBank(m, sock, "nabung");
      return m.reply([
        "*Berhasil menabung!*",
        "",
        `Setor : ${amount} gold`,
        `Saldo bank : ${bank.deposit} gold`,
        `Sisa di tangan : ${rpg.gold - amount} gold`,
        "Bunga 5% harian masuk otomatis.",
      ].join("\n"));
    }

    if (action === "tarik" || action === "ambil" || action === "withdraw") {
      const amount = parseInt(args[1]);

      if (!amount || amount < 1) {
        return m.reply(claraWrap("bankrpg", "Jumlah tidak valid. Contoh: .bankrpg tarik 500", "warn"));
      }

      if (bank.deposit < amount) {
        await m.react("🚫");
        return m.reply(claraWrap("bankrpg", `Saldo bank tidak cukup! Saldo: *${bank.deposit}*, mau tarik *${amount}*.`, "warn"));
      }

      bank.deposit -= amount;
      addGold(m, amount);
      saveRpg(m, { bank });

      await m.react("🐣");
      await animBank(m, sock, "tarik");
      return m.reply([
        "*Berhasil menarik!*",
        "",
        `Tarik : ${amount} gold`,
        `Sisa saldo bank : ${bank.deposit} gold`,
        `Gold di tangan : ${rpg.gold + amount} gold`,
      ].join("\n"));
    }

    return m.reply(claraWrap("bankrpg", "Aksi tidak dikenal. Gunakan: nabung, tarik, atau cek", "warn"));
  } catch (err) {
    console.error("bankrpg error:", err);
    await m.react("❌");
    return m.reply(claraWrap("bankrpg", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
