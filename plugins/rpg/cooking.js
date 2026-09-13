// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// plugins/rpg/cooking.js — COOKING RPG (porting script owner 10 Sep 2026:
// cooking.js + cookingData.js standalone → sistem plugin Nova).
// Game self-contained: gold/energy/level/inventory/alat/resep sendiri.
//
// Command:
//   .cooking                    → status + menu
//   .cooking masak [resep]      → masak + jual otomatis (animasi scene)
//   .cooking resep              → daftar resep (✅ bisa / ❌ bahan kurang)
//   .cooking inventory          → isi inventory bahan
//   .cooking toko               → toko bahan
//   .cooking beli [bahan] [qty] → beli bahan (qty opsional, cap 20)
//   .cooking alat               → alat masak yang dipunyai
//   .cooking belialat [nama]    → beli alat (bonus harga jual)
//   .cooking istirahat          → +50 energy (cooldown 3 mnt)
//   .cooking help               → bantuan lengkap
import {
  INGREDIENTS, RECIPES, TOOLS,
  getCookingPlayer, saveCooking, cookDish, buyIngredient, buyTool, restCook,
  hasIngredients, setCookingStatePath, beliScenes, restScenes,
} from "../../src/lib/nova-cooking.js";
import { formatRp } from "../../src/lib/nova-rpg-service.js";
import { rpgScene } from "../../src/lib/nova-rpg-anim.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "cooking",
  alias: ["cookingrpg", "chef", "dapur", "masakgame"],
  category: "rpg",
  description: "Cooking RPG — masak resep Indonesia, kelola bahan & alat masak, naik level jadi chef legend",
  usage: ".cooking (status)\n.cooking masak [resep]\n.cooking resep\n.cooking toko | beli [bahan] [qty]\n.cooking belialat [alat]\n.cooking istirahat",
  example: ".cooking masak nasi goreng",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 3, energi: 0, isEnabled: true,
};

// ─── delay animasi bisa dikecilin dari env (e2e) ───
const animDelay = () => Number(process.env.COOKING_ANIM_MS) || 400;

function statusMenu(p, prefix) {
  const best = p.bestDish ? `${p.bestDish.price >= 0 ? "" : ""}${p.bestDish.name} (${formatRp(p.bestDish.price)})` : "-";
  return novaRpgBox("cooking",
    `🍳 COOKING RPG\n\n` +
    `👤 Chef : ${p.name}\n⭐ Level : ${p.level} (${p.exp}/${p.maxExp} EXP)\n` +
    `⚡ Energy : ${p.energy}/${p.maxEnergy}\n💵 Gold : ${formatRp(p.gold)}\n` +
    `📦 Bahan : ${Object.keys(p.inventory).length} jenis\n🛠️ Alat : ${p.tools.length}\n` +
    `📊 Total Masak : ${p.totalCook}\n🏆 Hidangan Terbaik : ${best}\n\n` +
    `📌 Perintah:\n` +
    `• ${prefix}cooking masak [resep] — masak\n` +
    `• ${prefix}cooking resep — lihat resep\n` +
    `• ${prefix}cooking inventory — lihat bahan\n` +
    `• ${prefix}cooking toko / beli [bahan] [qty]\n` +
    `• ${prefix}cooking alat / belialat [nama]\n` +
    `• ${prefix}cooking istirahat — pulih energy\n` +
    `• ${prefix}cooking help — bantuan lengkap`);
}

async function handler(m, { sock }) {
  try {
    const sub = (m.args?.[0] || "").toLowerCase();
    const args = m.args || [];
    const player = getCookingPlayer(m.sender, m.pushName || "Chef");
    const P = m.prefix || ".";
    const WORK_SUBS = ["masak", "cook", "beli", "belialat", "istirahat", "rest"];
    if (WORK_SUBS.includes(sub)) await m.react("🕒");

    // ══════ STATUS / MENU ══════
    if (!sub || sub === "status" || sub === "menu") {
      return m.reply(statusMenu(player, P));
    }

    // ══════ HELP ══════
    if (sub === "help") {
      return m.reply(novaRpgBox("cooking",
        `📖 BANTUAN COOKING RPG\n\n` +
        `🍳 ${P}cooking masak [resep]\n   Masak hidangan — bahan dikonsumsi,\n   hidangan auto-jual (harga × bonus alat).\n   Butuh 20 energy per masak.\n\n` +
        `📖 ${P}cooking resep\n   Daftar resep terbuka + terkunci.\n   Resep baru kebuka tiap naik level.\n\n` +
        `📦 ${P}cooking inventory\n   Stok bahan kamu.\n\n` +
        `🏪 ${P}cooking toko\n   Daftar bahan + harga.\n\n` +
        `🛒 ${P}cooking beli [bahan] [jumlah]\n   Beli bahan (jumlah opsional, maks 20).\n\n` +
        `🛠️ ${P}cooking alat / belialat [nama]\n   Alat bonus harga jual:\n   Kualitas +X% semua hidangan,\n   Sushi +30% / Steak +25% spesifik.\n\n` +
        `😴 ${P}cooking istirahat\n   +50 energy, cooldown 3 menit.\n\n` +
        `⬆️ Naik level: max energy +10, energy +30,\n   dan resep level baru kebuka otomatis!`));
    }

    // ══════ MASAK ══════
    if (sub === "masak" || sub === "cook") {
      const recipeName = args.slice(1).join(" ").trim();
      if (!recipeName) {
        await m.react("❌");
        return m.reply(novaRpgBox("cooking", `Masak apa? Ketik resepnya!\n\n📌 ${P}cooking resep — lihat daftar resep\nContoh: ${P}cooking masak telur dadar`, "warn"));
      }
      const r = cookDish(m.sender, recipeName, m.pushName || "Chef");
      if (!r.ok) {
        await m.react("❌");
        if (r.code === "ingredients" && r.missing) {
          const list = r.missing.map((x) => `• ${INGREDIENTS[x.ing]?.emoji || "📦"} ${x.ing} (butuh ${x.qty}, punya ${x.have})`).join("\n");
          return m.reply(novaRpgBox("cooking", `Bahan tidak cukup!\n\n📋 Bahan yang kurang:\n${list}\n\n💡 Beli bahan: ${P}cooking beli [bahan]`, "warn"));
        }
        const t = r.code === "energy" ? "warn" : "warn";
        return m.reply(novaRpgBox("cooking", r.error, t));
      }

      // ANIMASI EDIT BERULANG: 7 fase, tiap fase 1 pesan morphing
      // (pembuka → potong bahan → kompor → aduk → progress → uap → plating)
      try {
        for (const ph of r.phases) {
          await rpgScene(m, sock, ph.frames, animDelay(), ph.title);
        }
      } catch {}

      const res = r.result;
      let body =
        `🍳 HASIL MASAKAN\n\n` +
        `👤 Chef : ${res.playerName}\n` +
        `🍽️ Hidangan : ${r.recipe.emoji} ${r.recipe.name}\n` +
        `💰 Harga Jual : ${formatRp(res.sellPrice)}\n` +
        `⭐ EXP : +${res.expGain}\n` +
        `⚡ Energy : ${res.energy}/${res.maxEnergy}\n\n` +
        `💵 Gold : ${formatRp(res.gold)}\n` +
        `📊 Total Masak : ${res.totalCook}`;
      if (res.bonusPct > 0) body += `\n🎯 Bonus Alat : +${res.bonusPct}%`;
      if (res.isBest) body += `\n🏆 Hidangan Terbaik Baru!`;
      for (const lu of res.levelUps) {
        body += `\n\n⬆️ LEVEL UP! Level ${lu.from} → ${lu.to}\n⚡ Max Energy +10`;
        if (lu.newRecipes.length) {
          body += `\n🆕 RESEP BARU TERBUKA:\n` + lu.newRecipes.map((r2) => `   ${r2.emoji} ${r2.name}`).join("\n");
        }
      }
      await m.react("🐣");
      return m.reply(novaRpgBox("cooking", body, "success"));
    }

    // ══════ RESEP ══════
    if (sub === "resep" || sub === "recipes") {
      const available = Object.values(RECIPES).filter((r) => r.level <= player.level);
      const locked = Object.values(RECIPES).filter((r) => r.level > player.level);
      let body = `📖 RESEP TERSEDIA (Level ${player.level})\n`;
      for (const r of available) {
        const can = hasIngredients(player, r) ? "✅" : "❌";
        body += `\n${can} ${r.emoji} ${r.name}\n   Level ${r.level} | ⭐ ${r.exp} EXP | 💰 ${formatRp(r.price)}\n   📝 ${Object.entries(r.ingredients).map(([k, q]) => `${k}${q > 1 ? " x" + q : ""}`).join(", ")}`;
      }
      if (locked.length) {
        body += `\n\n🔒 RESEP TERKUNCI:\n` + locked.slice(0, 6).map((r) => `   ${r.emoji} ${r.name} (Level ${r.level})`).join("\n");
      }
      body += `\n\n💡 Masak: ${P}cooking masak [nama resep]\n✅ = bahan lengkap, ❌ = bahan kurang`;
      return m.reply(novaRpgBox("cooking", body));
    }

    // ══════ INVENTORY ══════
    if (sub === "inventory" || sub === "inv") {
      const items = Object.entries(player.inventory);
      if (!items.length) {
        return m.reply(novaRpgBox("cooking", `Inventory kosong!\n\nBeli bahan dulu: ${P}cooking toko\nLalu: ${P}cooking beli [bahan]`, "warn"));
      }
      let body = `📦 INVENTORY ${player.name}\n`;
      for (const [name, qty] of items) {
        const ing = INGREDIENTS[name];
        body += `\n${ing?.emoji || "📦"} ${name} : ${qty}`;
      }
      body += `\n\n💵 Gold : ${formatRp(player.gold)}`;
      return m.reply(novaRpgBox("cooking", body));
    }

    // ══════ TOKO ══════
    if (sub === "toko" || sub === "shop") {
      const categories = {};
      Object.values(INGREDIENTS).forEach((ing) => {
        (categories[ing.category] = categories[ing.category] || []).push(ing);
      });
      let body = `🏪 TOKO BAHAN\n\n💵 Gold : ${formatRp(player.gold)}\n`;
      for (const [cat, ings] of Object.entries(categories)) {
        body += `\n🧺 ${cat}\n` + ings.map((ing) => `   ${ing.emoji} ${ing.name} — ${formatRp(ing.price)}`).join("\n");
      }
      body += `\n\n💡 Beli: ${P}cooking beli [nama bahan] [jumlah]`;
      return m.reply(novaRpgBox("cooking", body));
    }

    // ══════ BELI BAHAN (qty opsional) ══════
    if (sub === "beli") {
      // .cooking beli alat [nama] → belialat juga jalan
      if ((args[1] || "").toLowerCase() === "alat") {
        args.splice(1, 1);
        return handleBuyTool(m, args.slice(1).join(" "), P);
      }
      const name = args.slice(1).filter((a) => !/^\d+$/.test(a)).join(" ").trim();
      const qty = Number(args.find((a) => /^\d+$/.test(a))) || 1;
      if (!name) {
        await m.react("❌");
        return m.reply(novaRpgBox("cooking", `Beli apa? Ketik nama bahannya!\n\nContoh: ${P}cooking beli telur 5\nDaftar: ${P}cooking toko`, "warn"));
      }
      const r = buyIngredient(m.sender, name, qty);
      if (!r.ok) {
        await m.react("❌");
        return m.reply(novaRpgBox("cooking", r.error, "warn"));
      }
      // animasi beli morphing (🛒 → 💰💨 → ✅)
      try { await rpgScene(m, sock, beliScenes(r.ing), animDelay(), "belanja"); } catch {}
      await m.react("🐣");
      return m.reply(novaRpgBox("cooking",
        `🛒 BELI BERHASIL!\n\n${r.ing.emoji} ${r.ing.name} x${r.qty}\n💰 Harga : ${formatRp(r.total)}\n💵 Sisa Gold : ${formatRp(r.gold)}`, "success"));
    }

    // ══════ ALAT ══════
    if (sub === "alat" || sub === "tools") {
      if (!player.tools.length) {
        return m.reply(novaRpgBox("cooking",
          `🛠️ Belum punya alat masak!\n\nBelanja alat: ${P}cooking belialat [nama]\n\nDaftar alat & bonus:\n` +
          Object.values(TOOLS).map((t) => `   ${t.emoji} ${t.name} — ${formatRp(t.price)} (${t.bonus})`).join("\n"), "warn"));
      }
      let body = `🛠️ ALAT MASAK ${player.name}\n`;
      for (const t of player.tools) {
        const tool = TOOLS[t];
        body += `\n${tool.emoji} ${t} — ${tool.bonus}`;
      }
      body += `\n\n💡 Alat Kualitas menaikkan harga jual semua hidangan`;
      return m.reply(novaRpgBox("cooking", body));
    }

    // ══════ BELI ALAT ══════
    if (sub === "belialat" || sub === "alatbeli" || sub === "buytool") {
      return handleBuyTool(m, args.slice(1).join(" "), P);
    }

    // ══════ ISTIRAHAT ══════
    if (sub === "istirahat" || sub === "rest") {
      const r = restCook(m.sender);
      if (!r.ok) {
        await m.react("❌");
        return m.reply(novaRpgBox("cooking", r.error, "warn"));
      }
      try { await rpgScene(m, sock, restScenes(player, r.gained), animDelay(), "istirahat"); } catch {}
      await m.react("🐣");
      return m.reply(novaRpgBox("cooking",
        `😊 ISTIRAHAT SELESAI\n\n⚡ Energy : +${r.gained} → ${r.energy}/${r.maxEnergy}\n💤 Istirahat lagi bisa 3 menit lagi`, "success"));
    }

    // ══════ SUB GAK DIKENAL ══════
    await m.react("❌");
    return m.reply(novaRpgBox("cooking",
      `Sub-perintah "${sub}" gak dikenal.\n\nKetik ${P}cooking buat lihat menu, atau ${P}cooking help buat bantuan lengkap.`, "warn"));
  } catch (e) {
    await m.react("❌");
    return m.reply(novaRpgBox("cooking", `Game error: ${e?.message || "unknown"}`, "error"));
  }
}

async function handleBuyTool(m, toolName, P) {
  if (!toolName) {
    await m.react("❌");
    return m.reply(novaRpgBox("cooking",
      `Beli alat apa?\n\nDaftar alat:\n` +
      Object.values(TOOLS).map((t) => `   ${t.emoji} ${t.name} — ${formatRp(t.price)} (${t.bonus})`).join("\n") +
      `\n\nContoh: ${P}cooking belialat oven`, "warn"));
  }
  const r = buyTool(m.sender, toolName);
  if (!r.ok) {
    await m.react("❌");
    return m.reply(novaRpgBox("cooking", r.error, "warn"));
  }
  await m.react("🐣");
  return m.reply(novaRpgBox("cooking",
    `🛠️ ALAT BARU!\n\n${r.tool.emoji} ${r.tool.name}\n✨ Bonus : ${r.tool.bonus}\n💰 Harga : ${formatRp(r.tool.price)}\n💵 Sisa Gold : ${formatRp(r.gold)}`, "success"));
}

export { pluginConfig as config, handler };
