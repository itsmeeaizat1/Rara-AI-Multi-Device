// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Toko RPG — Belanja pakai UANG (Rp), mata uang RPG terpisah dari Gold.
// Ekonomi: kerja/game dapet Rp -> belanja equip premium + alat profesi (+30% gajian) + kotak misteri.

import {
  ensureRpg, saveRpg, addItem, addCash, getCash, spendCash, formatRp, ITEM_DB,
} from "../../src/lib/rara-rpg-service.js";
import { animShop } from "../../src/lib/rara-rpg-anim.js";
import te from "../../src/lib/rara-error.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "rpgstore",
  alias: ["tokorpg", "tokouang", "shouang", "malluang", "tokorp"],
  category: "rpg",
  description: "Toko RPG pakai Uang (Rp) — equip premium, potion, alat profesi (+30% gajian), kotak misteri",
  usage: ".tokorpg [kategori] | .tokorpg beli <id> [qty] | .tokorpg alat",
  example: ".tokorpg\n.tokorpg equip\n.tokorpg beli hpPotion 5\n.tokorpg beli alatmedis\n.tokorpg kotak",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// ═══ KATALOG (harga Rp) ═══
// 1. EQUIP PREMIUM — id dari ITEM_DB, bisa dipakai via .equiprpg
const SHOP_EQUIP = [
  { id: "steelBlade",   price: 400_000 },
  { id: "powerAmulet",  price: 600_000 },
  { id: "mithrilArmor", price: 2_000_000 },
  { id: "mithrilHelm",  price: 1_500_000 },
  { id: "windBoots",    price: 1_200_000 },
  { id: "wisdomRing",   price: 1_500_000 },
  { id: "dragonSword",  price: 5_000_000 },
  { id: "dragonArmor",  price: 8_000_000 },
];

// 2. CONSUMABLE — bisa dibeli borongan (qty)
const SHOP_CONSUMABLE = [
  { id: "bread",        price: 5_000 },
  { id: "cookedMeat",   price: 8_000 },
  { id: "energyDrink",  price: 15_000 },
  { id: "hpPotion",     price: 25_000 },
  { id: "mpPotion",     price: 25_000 },
  { id: "luckyCharm",   price: 50_000 },
];

// 3. ALAT PROFESI — beli 1x permanen → gajian +30% (working.js baca rpg.jobTools)
const SHOP_TOOLS = [
  { id: "penebang",    name: "Kapak Legendaris",     price: 2_000_000 },
  { id: "petani",      name: "Traktor Modern",      price: 2_500_000 },
  { id: "penambang",   name: "Bor Tambang Berat",   price: 3_000_000 },
  { id: "nelayan",     name: "Kapal Nelayan",       price: 4_000_000 },
  { id: "kantoran",    name: "Laptop Kantor",       price: 3_500_000 },
  { id: "guru",        name: "Paket Smartboard",    price: 3_000_000 },
  { id: "polisi",      name: "Perlengkapan Taktis", price: 4_500_000 },
  { id: "chef",        name: "Set Dapur Pro",       price: 5_000_000 },
  { id: "dokter",      name: "Alat Medis Lengkap",  price: 6_000_000 },
  { id: "programmer",  name: "Laptop Programmer",   price: 7_000_000 },
  { id: "pilot",       name: "Simulator Penerbangan", price: 10_000_000 },
  { id: "novice",      name: "Kit Petualang",       price: 500_000 },
  { id: "warrior",     name: "Peralatan Veteran",   price: 2_000_000 },
  { id: "mage",        name: "Orb Mana",            price: 2_500_000 },
  { id: "archer",      name: "Busur Elit",          price: 2_500_000 },
  { id: "assassin",    name: "Peralatan Siluman",   price: 3_000_000 },
  { id: "tank",        name: "Plat Baja Menara",    price: 3_000_000 },
  { id: "healer",      name: "Simbol Kehidupan",    price: 3_000_000 },
  { id: "berserker",   name: "Totem Amuk",          price: 3_500_000 },
];

// ═══ KOTAK MISTERI — Rp 100K, reward acak (fun sink uang) ═══
const MYSTERY_PRICE = 100_000;
const MYSTERY_TABLE = [
  { chance: 40, label: "consumable", roll: () => {
      const pool = [["hpPotion", 3], ["mpPotion", 3], ["energyDrink", 5], ["bread", 10], ["cookedMeat", 8], ["luckyCharm", 1]];
      const [id, qty] = pool[Math.floor(Math.random() * pool.length)];
      return { type: "item", id, qty };
  } },
  { chance: 25, label: "cashback", roll: () => {
      const amount = [50_000, 75_000, 100_000, 150_000, 200_000][Math.floor(Math.random() * 5)];
      return { type: "cash", amount };
  } },
  { chance: 20, label: "equip rare", roll: () => ({ type: "item", id: "steelBlade", qty: 1 }) },
  { chance: 10, label: "luckyCharm x2", roll: () => ({ type: "item", id: "luckyCharm", qty: 2 }) },
  { chance: 4,  label: "equip amulet", roll: () => ({ type: "item", id: "powerAmulet", qty: 1 }) },
  { chance: 1,  label: "JACKPOT dragonSword", roll: () => ({ type: "item", id: "dragonSword", qty: 1 }) },
];

const findTool = (id) => SHOP_TOOLS.find(t => t.id.toLowerCase() === String(id).toLowerCase());

function equipList(rpg) {
  return SHOP_EQUIP.map(e => {
    const def = ITEM_DB[e.id] || {};
    const statText = Object.entries(def)
      .filter(([k]) => ["atk","def","spd","hp","evasion","critRate","critDmg"].includes(k))
      .map(([k, v]) => `${k.toUpperCase()} +${v}`).join(" ");
    const owned = rpg?.inventory?.[e.id]?.qty > 0 ? " (di tas)" : "";
    return `${def.name} — ${formatRp(e.price)}${owned}\n   ⚙️ ${statText} | .equiprpg ${e.id}`;
  }).join("\n");
}

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("tokorpg", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const args = m.args?.length ? m.args : (m.text?.trim().split(/\s+/) || []).filter(Boolean);
    const action = (args[0] || "").toLowerCase();

    // ═══ MENU UTAMA ═══
    if (!action || ["menu", "list"].includes(action)) {
      const msg = `💵 Uang kamu: ${formatRp(getCash(m))}

⚔️  eǫuip premium
   ${SHOP_EQUIP.length} gear kelas atas (naga & mithril) — ketik .tokorpg equip

🧪  consumable
   Ramuan & makanan borongan — ketik .tokorpg potion

🔧  alat profesi
   Beli 1x permanen → gajian kerja +30% — ketik .tokorpg alat

🎁  kotak misteri
   ${formatRp(MYSTERY_PRICE)} — hadiah acak, bisa jackpot ${ITEM_DB.dragonSword?.name || "Pedang Naga"} — ketik .tokorpg kotak

📝  cara beli
   .tokorpg beli <id> [qty] — contoh: .tokorpg beli hpPotion 5`;
      await m.react("🐣");
      return m.reply(raraRpgBox("tokorpg", msg, "info"));
    }

    // ═══ KATEGORI: equip ═══
    if (["equip", "senjata", "gear"].includes(action)) {
      const msg = `💵 Uang kamu: ${formatRp(getCash(m))}

⚔️  eǫuip premium (rp)

${equipList(rpg)}

📝 beli: .tokorpg beli <id>`;
      await m.react("🐣");
      return m.reply(raraRpgBox("tokorpg", msg, "info"));
    }

    // ═══ KATEGORI: potion/consumable ═══
    if (["potion", "consumable", "ramuan", "makan"].includes(action)) {
      const msg = `💵 Uang kamu: ${formatRp(getCash(m))}

🧪  consumable (rp)

${SHOP_CONSUMABLE.map(c => `${ITEM_DB[c.id]?.name || c.id} — ${formatRp(c.price)}/pcs (${c.id})`).join("\n")}

📝 beli borongan: .tokorpg beli hpPotion 5`;
      await m.react("🐣");
      return m.reply(raraRpgBox("tokorpg", msg, "info"));
    }

    // ═══ KATEGORI: alat profesi ═══
    if (["alat", "tools", "profesi"].includes(action)) {
      const tools = rpg.jobTools || {};
      const msg = `💵 Uang kamu: ${formatRp(getCash(m))}

🔧  alat profesi (rp) — beli 1x permanen, gajian kerja +30%

${SHOP_TOOLS.map(t => {
  const owned = tools[t.id] ? "✅ sudah punya" : `${formatRp(t.price)}`;
  return `${t.name} (${t.id}) — ${owned}`;
}).join("\n")}

📝 beli: .tokorpg beli <idProfesi> — contoh: .tokorpg beli dokter`;
      await m.react("🐣");
      return m.reply(raraRpgBox("tokorpg", msg, "info"));
    }

    // ═══ KOTAK MISTERI ═══
    if (["kotak", "misteri", "mystery", "gacha"].includes(action)) {
      await m.react("🕒");
      if (!spendCash(m, MYSTERY_PRICE)) {
        await m.react("❌");
        return m.reply(raraRpgBox("tokorpg", `Uang kurang! Kotak misteri ${formatRp(MYSTERY_PRICE)}.\n💵 Uang kamu: ${formatRp(getCash(m))}\nKerja dulu: .kerja dokter (gajian Rp 12.000.000)`, "warn"));
      }
      await animShop(m, sock);
      let pick = Math.random() * 100;
      let result = null;
      for (const entry of MYSTERY_TABLE) {
        if (pick < entry.chance) { result = entry.roll(); break; }
        pick -= entry.chance;
      }
      if (!result) result = MYSTERY_TABLE[0].roll();
      let rewardText;
      if (result.type === "item") {
        addItem(m, result.id, result.qty);
        rewardText = `${ITEM_DB[result.id]?.name || result.id} x${result.qty}`;
      } else {
        addCash(m, result.amount);
        rewardText = `cashback ${formatRp(result.amount)}`;
      }
      await m.react("🐣");
      return m.reply(raraRpgBox("tokorpg", `🎁 KOTAK MISTERI DIBUKA!

Harga: ${formatRp(MYSTERY_PRICE)}
🎁 Hadiah: ${rewardText}
💵 Sisa uang: ${formatRp(getCash(m))}

Coba lagi? .tokorpg kotak`, "success"));
    }

    // ═══ BELI ═══
    if (["beli", "buy", "belanja"].includes(action)) {
      const id = (args[1] || "").toLowerCase();
      if (!id) {
        await m.react("🐣");
        return m.reply(raraRpgBox("tokorpg", "Mau beli apa? Lihat katalog: .tokorpg (atau .tokorpg equip/potion/alat)\nContoh: .tokorpg beli hpPotion 5", "warn"));
      }
      await m.react("🕒");

      // — alat profesi —
      const tool = findTool(id);
      if (tool) {
        const tools = rpg.jobTools || (rpg.jobTools = {});
        if (tools[tool.id]) {
          await m.react("🐣");
          return m.reply(raraRpgBox("tokorpg", `Kamu udah punya *${tool.name}*! Alat profesi cuma bisa dibeli 1x.`, "warn"));
        }
        if (!spendCash(m, tool.price)) {
          await m.react("❌");
          return m.reply(raraRpgBox("tokorpg", `Uang kurang! *${tool.name}* ${formatRp(tool.price)}.\n💵 Uang kamu: ${formatRp(getCash(m))}\nKerja dulu: .kerja ${tool.id === "kantoran" ? "kantor" : tool.id}`, "warn"));
        }
        rpg.jobTools[tool.id] = true;
        saveRpg(m, rpg);
        await m.react("🐣");
        return m.reply(raraRpgBox("tokorpg", `🛒 PEMBELIAN BERHASIL

🔧 Item: ${tool.name}
💵 Harga: ${formatRp(tool.price)}
💼 Sisa uang: ${formatRp(getCash(m))}
✨ Efek: gajian .kerja ${tool.id === "kantoran" ? "kantor" : tool.id} +30% PERMANEN

Cek alat kamu: .tokorpg alat`, "success"));
      }

      // — consumable borongan / equip — (id case-insensitive: hppotion == hpPotion)
      const entry = SHOP_CONSUMABLE.find(c => c.id.toLowerCase() === id) || SHOP_EQUIP.find(c => c.id.toLowerCase() === id);
      if (!entry) {
        await m.react("❌");
        return m.reply(raraRpgBox("tokorpg", `Item *${id}* gak ada di toko Rp. Lihat katalog: .tokorpg`, "error"));
      }
      const isEquip = SHOP_EQUIP.includes(entry);
      const qty = isEquip ? 1 : Math.max(1, Math.min(50, parseInt(args[2], 10) || 1));
      const total = entry.price * qty;
      if (!spendCash(m, total)) {
        await m.react("❌");
        return m.reply(raraRpgBox("tokorpg", `Uang kurang! *${ITEM_DB[entry.id]?.name || entry.id}* x${qty} = ${formatRp(total)}.\n💵 Uang kamu: ${formatRp(getCash(m))}`, "warn"));
      }
      await animShop(m, sock);
      addItem(m, entry.id, qty);
      const def = ITEM_DB[entry.id] || {};
      await m.react("🐣");
      return m.reply(raraRpgBox("tokorpg", `🛒 PEMBELIAN BERHASIL

📦 Item: ${def.name || entry.id} x${qty}
💵 Harga: ${formatRp(entry.price)}/pcs × ${qty} = ${formatRp(total)}
💼 Sisa uang: ${formatRp(getCash(m))}
${isEquip ? "⚔️ Pakai sekarang: .equiprpg " + entry.id : "🧪 Dipakai otomatis pas butuh / .userpg"}

Masih ada uang? .tokorpg kotak buat test luck!`, "success"));
    }

    await m.react("🐣");
    return m.reply(raraRpgBox("tokorpg", te(m.prefix, m.command, m.pushName), "error"));
  } catch (err) {
    console.error("tokorpg error:", err);
    await m.react("❌");
    return m.reply(raraRpgBox("tokorpg", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
