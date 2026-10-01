// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// buyrpgitem.js — Beli ITEM GAME dari ITEM_DB (JALUR ITEM)
// Item yang sama dipakai di semua game RPG (material, senjata, armor, consumable, dll).
// Harga per item berdasarkan value di ITEM_DB (terpusat: rara-store.js calcRpgItemPrice).
import fs from "fs";
import config from "../../config.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraWrap, bracketBox, tipText, toSC } from "../../src/lib/rara-menu-style.js";
import { ITEM_DB } from "../../src/lib/rara-rpg-service.js";
import {
  ensureTopups,
  calcRpgItemPrice,
  RPG_ITEM_MIN_QTY,
  RPG_ITEM_MAX_QTY,
  MIN_TOPUP_PRICE,
  RPG_ITEM_RATE,
  topupCancelHint,
} from "../../src/lib/store/rara-store.js";

const pluginConfig = {
  name: "buyrpgitem",
  alias: ["buyrpgitem"],
  category: "main",
  description: "Beli item game (senjata, armor, material, consumable) — masuk inventory RPG",
  usage: ".buyrpgitem <item> <jumlah>",
  example: ".buyrpgitem hpPotion 5",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

const RARITY_ICON = {
  common: "⚪", uncommon: "🟢", rare: "🔵", epic: "🟣", legendary: "🟠",
};

async function sendQRIS(sock, m) {
  const qrisUrl = config.payment?.qrisUrl || "";
  if (!qrisUrl) return;
  try {
    let qrisBuffer;
    if (/^https?:\/\//.test(qrisUrl)) {
      const response = await fetch(qrisUrl);
      qrisBuffer = Buffer.from(await response.arrayBuffer());
    } else {
      qrisBuffer = fs.readFileSync(qrisUrl);
    }
    await sock.sendMessage(m.chat, {
      image: qrisBuffer,
      caption: "Scan QRIS di atas untuk pembayaran item game",
    }, { quoted: m });
  } catch (e) {
    console.error("[buyrpgitem] QRIS error:", e.message);
  }
}

async function notifyOwner(sock, m, itemDef, qty, price, prefix) {
  const ownerNumbers = config.owner?.number || ["628174887770"];
  const buyerNumber = m.sender?.replace(/[^0-9]/g, "") || "";
  const notifText =
    `\n│ ${toSC("Pembeli")}: *${toSC(m.pushName || "Unknown")}*\n` +
    `│ ${toSC("Nomor")}: ${buyerNumber}\n` +
    `│ ${toSC("Item")}: *${toSC(itemDef.name)} (${itemDef.id})*\n` +
    `│ ${toSC("Jumlah")}: *${qty}x*\n` +
    `│ ${toSC("Jalur")}: *${toSC("item")}*\n` +
    `│ ${toSC("Harga")}: *${price}*\n` +
    `│ ${toSC("Status")}: *${toSC("MENUNGGU PEMBAYARAN")}*\n\n` +
    `${toSC("Jika sudah bayar, ketik")}: *${prefix}approvetopup ${buyerNumber}*`;
  for (const num of ownerNumbers) {
    try {
      await sock.sendMessage(`${num}@s.whatsapp.net`, { text: notifText });
    } catch (e) {
      console.error(`[buyrpgitem] Notif owner ${num} error:`, e.message);
    }
  }
}

async function handler(m, { sock }) {
  const prefix = m.prefix || config.command?.prefix || ".";
  const db = getDatabase();
  const topups = ensureTopups(db);
  const sender = m.sender;
  const args = m.args || [];

  // ── batal ──
  if (["batal", "cancel"].includes((args[0] || "").toLowerCase())) {
    const pending = topups.pending[sender];
    if (!pending || pending.status !== "pending" || pending.type !== "rpgitem") {
      return m.reply(raraWrap("buyrpgitem", "Tidak ada pesanan item game yang pending."));
    }
    delete topups.pending[sender];
    db.db.write();
    return m.reply(raraWrap("buyrpgitem", "Pesanan item game dibatalkan."));
  }

  // ── tanpa argumen: katalog item (dikelompokin per tipe) ──
  if (args.length === 0) {
    const pending = topups.pending[sender];
    let pendingBox = "";
    if (pending && pending.status === "pending") {
      pendingBox = bracketBox("🕒", "Pesanan Pending", [
        `Item: *${pending.itemName || pending.name}*`,
        `Harga: *${pending.price}*`,
        `Ketik *.${topupCancelHint(pending.type)} batal* untuk batalkan`,
      ]) + "\n\n";
    }

    const byType = {};
    for (const [id, def] of Object.entries(ITEM_DB)) {
      const t = def.type || "lainnya";
      if (!byType[t]) byType[t] = [];
      byType[t].push({ id, ...def });
    }
    const boxes = [];
    const priceOf = (def) => {
      const p = calcRpgItemPrice(def.id, RPG_ITEM_MIN_QTY);
      return p ? p.rupiah : "-";
    };
    for (const [type, list] of Object.entries(byType)) {
      boxes.push(bracketBox("📦", `Tipe: ${type} (${list.length})`, [
        ...list.map((d) =>
          `${RARITY_ICON[d.rarity] || "▫️"} *${d.id}* — ${priceOf(d)}/pc`,
        ).slice(0, 12),
        ...(list.length > 12 ? [`... +${list.length - 12} lainnya`] : []),
      ]));
    }
    return m.reply(pendingBox + boxes.join("\n\n") + "\n\n" +
      tipText(`Ketik ${prefix}buyrpgitem <item> <jumlah> — contoh: ${prefix}buyrpgitem hpPotion 5`));
  }

  // ── .buyrpgitem <item> [jumlah] ──
  const rawId = String(args[0]);
  // key ITEM_DB camelCase — lookup case-insensitive biar user bebas ketik huruf besar/kecil
  const itemId =
    Object.keys(ITEM_DB).find((k) => k.toLowerCase() === rawId.toLowerCase()) ||
    rawId.toLowerCase();
  const qtyRaw = args.length > 1 ? Number(args[1]) : RPG_ITEM_MIN_QTY;
  const itemDef = ITEM_DB[itemId];
  if (!itemDef) {
    return m.reply(raraWrap("buyrpgitem", `Item ${itemId} tidak ada di katalog\n\n📌 Ketik ${prefix}buyrpgitem buat lihat semua item`, "info"));
  }
  if (!Number.isInteger(qtyRaw) || qtyRaw < RPG_ITEM_MIN_QTY || qtyRaw > RPG_ITEM_MAX_QTY) {
    return m.reply(raraWrap("buyrpgitem", `Jumlah harus angka bulat ${RPG_ITEM_MIN_QTY}-${RPG_ITEM_MAX_QTY}\n\n📌 Contoh: ${prefix}buyrpgitem ${itemId} 5`, "info"));
  }

  const price = calcRpgItemPrice(itemId, qtyRaw);
  const pending = topups.pending[sender];
  if (pending && pending.status === "pending" && pending.type !== "rpgitem") {
    return m.reply(raraWrap("buyrpgitem", `Masih ada pesanan ${pending.itemName || pending.name} pending\nSelesaikan / batal dulu: .${topupCancelHint(pending.type)} batal`, "info"));
  }
  const isReplace = pending && pending.status === "pending";

  await m.react("🕒");
  topups.pending[sender] = {
    sender,
    phoneNumber: sender.split("@")[0],
    name: m.pushName || "Unknown",
    type: "rpgitem",
    itemId,
    itemName: itemDef.name,
    qty: qtyRaw,
    unit: "pcs",
    jalur: "item",
    apply: "rpgItem",
    price: price.rupiah,
    priceNum: price.rupiahNum,
    status: "pending",
    orderedAt: Date.now(),
  };
  db.db.write();

  const detailBox = bracketBox(RARITY_ICON[itemDef.rarity] || "📦", "Detail Topup Item", [
    `Item: *${itemDef.name}* (${itemDef.id})`,
    `Tipe: *${itemDef.type}* • Rarity: *${itemDef.rarity}*`,
    `Jumlah: *${qtyRaw}x*`,
    `Harga: *${price.rupiah}*`,
    `Waktu: *${new Date().toLocaleString("id-ID")}*`,
    `Status: *Menunggu pembayaran*`,
  ]);
  const stepsBox = bracketBox("📝", "Cara Pembayaran", [
    `1. Bayar *${price.rupiah}* via QRIS/E-Wallet`,
    `2. Screenshot bukti transfer`,
    `3. Kirim bukti ke owner`,
    `4. Owner approve → item masuk inventory game!`,
  ]);
  const contactBox = bracketBox("👨‍💻", "Kontak Owner", [
    `Nama: *${config.owner?.name || "Owner"}*`,
    `Nomor: wa.me/${(config.owner?.number || ["628174887770"])[0]}`,
  ]);

  await m.react("🐣");
  await m.reply(detailBox + "\n\n" + stepsBox + "\n\n" + contactBox + "\n\n" +
    tipText(`${isReplace ? "Pesanan lama diganti • " : ""}Ketik ${prefix}buyrpgitem batal untuk batalkan`));
  await sendQRIS(sock, m);
  await notifyOwner(sock, m, { id: itemId, ...itemDef }, qtyRaw, price.rupiah, prefix);
}

export { pluginConfig as config, handler };
