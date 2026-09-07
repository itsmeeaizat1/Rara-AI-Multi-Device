// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-topup-flow.js — Factory plugin beli satuan (satu alur untuk SEMUA jalur toko)
// Dipakai: buylimit, buykoin, buydiamond, buyharta, buygems, buytokens, buycinta
// Alur: validate → terekam pending → QRIS → notif owner → .approvetopup → masuk otomatis
import fs from "fs";
import config from "../../../config.js";
import { getDatabase } from "../nova-database.js";
import { claraWrap, bracketBox, tipText, toSC } from "../nova-menu-style.js";
import {
  TOPUP_ITEMS,
  calcTopupPrice,
  validateTopupQty,
  ensureTopups,
  topupCancelHint,
} from "./nova-store.js";

async function sendQRIS(sock, m, caption) {
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
    await sock.sendMessage(
      m.chat,
      { image: qrisBuffer, caption: caption || "Scan QRIS di atas untuk pembayaran" },
      { quoted: m },
    );
  } catch (e) {
    console.error("[topup] QRIS error:", e.message);
  }
}

async function notifyOwner(sock, m, order, priceStr) {
  const ownerNumbers = config.owner?.number || ["628174887770"];
  const buyerNumber = m.sender?.replace(/[^0-9]/g, "") || "";
  const notifText =
    `\n${toSC("Pembeli")}: *${toSC(m.pushName || "Unknown")}*\n` +
    `${toSC("Nomor")}: ${buyerNumber}\n` +
    `${toSC("Item")}: *${toSC(order.name)}*\n` +
    `${toSC("Jumlah")}: *${order.qty.toLocaleString("id-ID")} ${order.unit}*\n` +
    `${toSC("Jalur")}: *${toSC(order.jalur)}*\n` +
    `${toSC("Harga")}: *${priceStr}*\n` +
    `${toSC("Status")}: *${toSC("MENUNGGU PEMBAYARAN")}*\n` +
    `${toSC("Waktu")}: ${new Date().toLocaleString("id-ID")}\n\n` +
    `${toSC("Jika sudah bayar, ketik")}: *.approvetopup ${buyerNumber}*`;
  for (const num of ownerNumbers) {
    try {
      await sock.sendMessage(`${num}@s.whatsapp.net`, { text: notifText });
    } catch (e) {
      console.error(`[topup] Notif owner ${num} error:`, e.message);
    }
  }
}

/**
 * Factory: bikin plugin beli satuan untuk satu item TOPUP_ITEMS.
 * @param {{ key: string, command: string, aliases: string[], description: string, usage: string, example: string, cooldown?: number }} opts
 */
export function buildTopupPlugin(opts) {
  const item = TOPUP_ITEMS[opts.key];
  if (!item) throw new Error(`buildTopupPlugin: item tidak dikenal: ${opts.key}`);

  const pluginConfig = {
    name: opts.command,
    alias: opts.aliases,
    category: "main",
    description: opts.description,
    usage: opts.usage,
    example: opts.example,
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: opts.cooldown ?? 15,
    energi: 0,
    isEnabled: true,
  };

  async function handler(m, { sock }) {
    const prefix = m.prefix || config.command?.prefix || ".";
    const db = getDatabase();
    const topups = ensureTopups(db);
    const sender = m.sender;
    const args = m.args || [];
    const cmd = opts.command;

    // ── batal ──
    if (["batal", "cancel"].includes((args[0] || "").toLowerCase())) {
      const pending = topups.pending[sender];
      if (!pending || pending.status !== "pending" || pending.type !== opts.key) {
        return m.reply(claraWrap(cmd, `Tidak ada pesanan *${cmd}* yang pending.`));
      }
      delete topups.pending[sender];
      db.db.write();
      return m.reply(claraWrap(cmd, "Pesanan dibatalkan."));
    }

    // ── tanpa argumen: harga & cara pakai ──
    if (args.length === 0) {
      const pending = topups.pending[sender];
      let pendingBox = "";
      if (pending && pending.status === "pending") {
        pendingBox = bracketBox("⏳", "Pesanan Pending", [
          `Item: *${pending.name}*`,
          `Jumlah: *${pending.qty.toLocaleString("id-ID")} ${pending.unit}*`,
          `Harga: *${pending.price}*`,
          `Ketik *.${topupCancelHint(pending.type)} batal* untuk batalkan`,
        ]) + "\n\n";
      }
      const priceBox = bracketBox(item.icon, `Harga ${item.name}`, [
        `Rp ${item.pricePerPack.toLocaleString("id-ID")} per *${item.packSize.toLocaleString("id-ID")} ${item.unit}*`,
        `Minimal *${item.min.toLocaleString("id-ID")}* — maksimal *${item.max.toLocaleString("id-ID")}* sekali beli`,
        `Jalur: *${item.jalur}* — ${item.jalur === "akun" ? "langsung ke akun kamu" : item.jalur === "rpg" ? "masuk ke profil RPG" : item.jalur === "cinta" ? "masuk ke RPG Cinta" : "masuk inventory game"}`,
      ]);
      const howBox = bracketBox("📝", "Cara Beli", [
        `Ketik: *${prefix}${cmd} <jumlah>*`,
        `Contoh: *${prefix}${opts.example.replace(`.${cmd} `, "")}*`,
        `Bayar QRIS → kirim bukti → owner approve → masuk otomatis`,
      ]);
      return m.reply(pendingBox + priceBox + "\n\n" + howBox);
    }

    // ── .buyxxx <jumlah> ──
    const parsed = validateTopupQty(opts.key, Number(args[0]));
    if (!parsed.ok) {
      return m.reply(claraWrap(cmd,
        `${parsed.error}\n\n📌 Ketik: *${prefix}${cmd} <jumlah>*\n💡 Contoh: *${prefix}${opts.example.replace(`.${cmd} `, "")}*`));
    }

    const qty = parsed.qty;
    const price = calcTopupPrice(opts.key, qty);
    const pending = topups.pending[sender];
    if (pending && pending.status === "pending" && pending.type !== opts.key) {
      return m.reply(claraWrap(cmd,
        `Masih ada pesanan *${pending.name}* pending\nSelesaikan / batal dulu: *.${topupCancelHint(pending.type)} batal*`));
    }
    const isReplace = pending && pending.status === "pending";

    topups.pending[sender] = {
      sender,
      phoneNumber: sender.split("@")[0],
      name: m.pushName || "Unknown",
      type: opts.key,
      itemName: item.name,
      qty,
      unit: item.unit,
      jalur: item.jalur,
      apply: item.apply,
      price: price.rupiah,
      priceNum: price.rupiahNum,
      status: "pending",
      orderedAt: Date.now(),
    };
    db.db.write();

    const detailBox = bracketBox(item.icon, `Detail Topup ${item.name}`, [
      `Jumlah: *+${qty.toLocaleString("id-ID")} ${item.unit}*`,
      `Harga: *${price.rupiah}*`,
      `Waktu: *${new Date().toLocaleString("id-ID")}*`,
      `Status: *Menunggu pembayaran*`,
    ]);
    const stepsBox = bracketBox("📝", "Cara Pembayaran", [
      `1. Bayar *${price.rupiah}* via QRIS/E-Wallet`,
      `2. Screenshot bukti transfer`,
      `3. Kirim bukti ke owner`,
      `4. Owner approve → ${item.name} langsung masuk!`,
    ]);
    const contactBox = bracketBox("👨‍💻", "Kontak Owner", [
      `Nama: *${config.owner?.name || "Owner"}*`,
      `Nomor: wa.me/${(config.owner?.number || ["628174887770"])[0]}`,
    ]);

    await m.reply(detailBox + "\n\n" + stepsBox + "\n\n" + contactBox + "\n\n" +
      tipText(`${isReplace ? "Pesanan lama diganti • " : ""}Ketik ${prefix}${cmd} batal untuk batalkan`));
    await sendQRIS(sock, m, `Scan QRIS di atas untuk pembayaran ${item.name}`);
    await notifyOwner(sock, m, { name: item.name, qty, unit: item.unit, jalur: item.jalur }, price.rupiah);
  }

  return { pluginConfig, handler };
}
