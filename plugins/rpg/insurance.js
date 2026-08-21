// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";
import {
  getPlayer,
  ensurePlayer,
  addGold,
  savePlayer,
} from "../../src/lib/nova-rpg-service.js";

const pluginConfig = {
  name: "insurance",
  alias: ["asuransi", "insurances", "protectrpg"],
  category: "economy",
  description: "Asuransi gold & item - lindungin dari steal/rob, klaim kalau kena",
  usage: ".insurance <buy/status/claim>",
  example: ".insurance buy",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const PLANS = [
  { id: "basic", name: "Asuransi Basic", price: 2000, coverage: 5000, duration: 3 },
  { id: "silver", name: "Asuransi Silver", price: 5000, coverage: 15000, duration: 5 },
  { id: "gold", name: "Asuransi Gold", price: 10000, coverage: 40000, duration: 7 },
  { id: "platinum", name: "Asuransi Platinum", price: 25000, coverage: 100000, duration: 14 },
];

function isExpired(insurance) {
  if (!insurance || !insurance.buyDate) return true;
  const buy = new Date(insurance.buyDate);
  const expire = new Date(buy);
  expire.setDate(expire.getDate() + insurance.duration);
  return new Date() > expire;
}

async function handler(m, { sock, config: botConfig, args }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const player = ensurePlayer(m, m.pushName || "Player");
    if (!player) {
      return m.reply(claraWrap("Insurance", "Belum terdaftar di RPG. Ketik .daftarrpg dulu."));
    }

    const subCmd = (args[0] || "status").toLowerCase();
    const insurance = player.insurance || null;

    if (subCmd === "buy") {
      const target = (args[1] || "").toLowerCase();
      const plan = PLANS.find((p) => p.id === target || p.name.toLowerCase().includes(target));
      if (!plan) {
        let lines = "╎❏ Daftar Paket Asuransi:\n\n";
        for (const p of PLANS) {
          lines += `╎❏ *${p.name}*\n`;
          lines += `╎  Harga   : ${p.price.toLocaleString()} gold\n`;
          lines += `╎  Cover   : ${p.coverage.toLocaleString()} gold\n`;
          lines += `╎  Durasi  : ${p.duration} hari\n\n`;
        }
        lines += tipText(`Ketik ${prefix}insurance buy <nama> untuk beli`);
        return m.reply(claraWrap("Insurance Plans", lines));
      }

      if (insurance && !isExpired(insurance)) {
        const currentPlan = PLANS.find((p) => p.id === insurance.planId);
        return m.reply(claraWrap("Insurance", [
          `╎❏ Kamu sudah punya asuransi aktif: *${currentPlan?.name || insurance.planId}*`,
          `╎❏ Tungu sampai expired buat beli baru`,
        ].join("\n")));
      }

      if (player.gold < plan.price) {
        return m.reply(claraWrap("Insurance", `Gold kurang! Butuh ${plan.price.toLocaleString()} gold, kamu punya ${player.gold.toLocaleString()} gold.`));
      }

      player.gold -= plan.price;
      const newInsurance = {
        planId: plan.id,
        planName: plan.name,
        coverage: plan.coverage,
        remaining: plan.coverage,
        duration: plan.duration,
        buyDate: new Date().toISOString().slice(0, 10),
        claims: 0,
      };
      savePlayer(m, { gold: player.gold, insurance: newInsurance });

      return m.reply(claraWrap("Insurance Bought", [
        `╎❏ *${plan.name}* berhasil dibeli!`,
        `╎❏ Coverage: ${plan.coverage.toLocaleString()} gold`,
        `╎❏ Durasi: ${plan.duration} hari`,
        `╎❏ Berlaku dari: ${newInsurance.buyDate}`,
        "",
        tipText("Kalau kena steal/rob, ketik .insurance claim"),
      ].join("\n")));
    }

    if (subCmd === "claim") {
      if (!insurance || isExpired(insurance)) {
        return m.reply(claraWrap("Insurance", "Tidak ada asuransi aktif! Ketik .insurance buy untuk beli."));
      }

      const lostAmount = player.lastLost || 0;
      if (lostAmount <= 0) {
        return m.reply(claraWrap("Insurance", [
          "╎❏ Tidak ada kerugian yang bisa diklaim",
          "╎❏ Klaim hanya bisa dipakai kalau kamu kena steal/rob",
        ].join("\n")));
      }

      const claimAmount = Math.min(lostAmount, insurance.remaining);
      if (claimAmount <= 0) {
        return m.reply(claraWrap("Insurance", "Coverage asuransi sudah habis! Beli paket baru."));
      }

      insurance.remaining -= claimAmount;
      insurance.claims += 1;
      player.lastLost = 0;
      addGold(m, claimAmount);
      savePlayer(m, { insurance, lastLost: 0 });

      return m.reply(claraWrap("Insurance Claim", [
        `╎❏ Klaim berhasil!`,
        `╎❏ Refund: ${claimAmount.toLocaleString()} gold`,
        `╎❏ Sisa coverage: ${insurance.remaining.toLocaleString()} gold`,
        `╎❏ Total klaim: ${insurance.claims}x`,
      ].join("\n")));
    }

    // status (default)
    if (!insurance || isExpired(insurance)) {
      let lines = "╎❏ Tidak ada asuransi aktif\n\n";
      lines += "╎❏ Asuransi lindungin gold kamu dari steal/rob\n";
      lines += tipText(`Ketik ${prefix}insurance buy buat lihat paket`);
      return m.reply(claraWrap("Insurance", lines));
    }

    const plan = PLANS.find((p) => p.id === insurance.planId);
    const buyDate = new Date(insurance.buyDate);
    const expireDate = new Date(buyDate);
    expireDate.setDate(expireDate.getDate() + insurance.duration);
    const daysLeft = Math.ceil((expireDate - new Date()) / (1000 * 60 * 60 * 24));

    let lines = `╎❏ *${insurance.planName}*\n`;
    lines += `╎❏ Coverage: ${insurance.remaining.toLocaleString()}/${insurance.coverage.toLocaleString()} gold\n`;
    lines += `╎❏ Durasi: ${daysLeft} hari lagi\n`;
    lines += `╎❏ Klaim: ${insurance.claims}x\n`;
    lines += `╎❏ Berlaku: ${insurance.buyDate} sampai ${expireDate.toISOString().slice(0, 10)}\n`;
    if (player.lastLost && player.lastLost > 0) {
      lines += `\n╎❏ Kerugian belum diklaim: ${player.lastLost.toLocaleString()} gold\n`;
      lines += tipText(`Ketik ${prefix}insurance claim buat refund`);
    } else {
      lines += tipText("Asuransi aktif, kamu terlindungi!");
    }
    return m.reply(claraWrap("Insurance Status", lines));
  } catch (error) {
    return m.reply(claraWrap("Insurance", `Error: ${error.message}`));
  }
}

export { pluginConfig as config, handler };
