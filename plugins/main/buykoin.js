// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// buykoin.js — Beli KOIN satuan: masukin jumlah koin yang mau dibeli
// Harga dari src/lib/store/nova-store.js (pusat harga toko).
// Alur: .buykoin 50000 → terekam pending → bayar QRIS → owner .approvetopup → koin masuk
import fs from "fs";
import config from "../../config.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, bracketBox, tipText, toSC } from "../../src/lib/nova-menu-style.js";
import {
  TOPUP_ITEMS,
  calcTopupPrice,
  validateTopupQty,
} from "../../src/lib/store/nova-store.js";

const ITEM_KEY = "koin";
const item = TOPUP_ITEMS[ITEM_KEY];

const pluginConfig = {
  name: "buykoin",
  alias: ["buykoin"],
  category: "main",
  description: "Beli koin satuan — masukin jumlah koin yang mau dibeli",
  usage: ".buykoin <jumlah>",
  example: ".buykoin 200",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

export function ensureTopups(db) {
  if (!db.db.data.topups) db.db.data.topups = { pending: {}, history: [] };
  if (!db.db.data.topups.pending) db.db.data.topups.pending = {};
  if (!Array.isArray(db.db.data.topups.history)) db.db.data.topups.history = [];
  return db.db.data.topups;
}

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
      caption: "Scan QRIS di atas untuk pembayaran topup koin",
    }, { quoted: m });
  } catch (e) {
    console.error("[buykoin] QRIS error:", e.message);
  }
}

async function notifyOwner(sock, m, qty, price) {
  const ownerNumbers = config.owner?.number || ["628174887770"];
  const buyerNumber = m.sender?.replace(/[^0-9]/g, "") || "";
  const notifText =
    `\n│ ${toSC("Pembeli")}: *${toSC(m.pushName || "Unknown")}*\n` +
    `│ ${toSC("Nomor")}: ${buyerNumber}\n` +
    `│ ${toSC("Item")}: *${toSC(item.name)}*\n` +
    `│ ${toSC("Jumlah")}: *${qty.toLocaleString("id-ID")} ${item.unit}*\n` +
    `│ ${toSC("Harga")}: *${price}*\n` +
    `│ ${toSC("Status")}: *${toSC("MENUNGGU PEMBAYARAN")}*\n` +
    `│ ${toSC("Waktu")}: ${new Date().toLocaleString("id-ID")}\n\n` +
    `${toSC("Jika sudah bayar, ketik")}: *.approvetopup ${buyerNumber}*`;
  for (const num of ownerNumbers) {
    try {
      await sock.sendMessage(`${num}@s.whatsapp.net`, { text: notifText });
    } catch (e) {
      console.error(`[buykoin] Notif owner ${num} error:`, e.message);
    }
  }
}

async function handler(m, { sock }) {
  const prefix = m.prefix || config.command?.prefix || ".";
  const db = getDatabase();
  const topups = ensureTopups(db);
  const sender = m.sender;
  const args = m.args || [];

  // .buykoin batal — batalkan pesanan pending
  if (["batal", "cancel"].includes((args[0] || "").toLowerCase())) {
    const pending = topups.pending[sender];
    if (!pending || pending.status !== "pending" || pending.type !== ITEM_KEY) {
      return m.reply(claraWrap("buykoin", "Tidak ada pesanan topup koin yang pending."));
    }
    delete topups.pending[sender];
    db.db.write();
    return m.reply(claraWrap("buykoin", "Pesanan topup koin dibatalkan."));
  }

  // .buykoin — tampil harga & cara pakai
  if (args.length === 0) {
    const pending = topups.pending[sender];
    let pendingBox = "";
    if (pending && pending.status === "pending" && pending.type === ITEM_KEY) {
      pendingBox = bracketBox("⏳", "Pesanan Pending", [
        `Jumlah: *${pending.qty.toLocaleString("id-ID")} ${item.unit}*`,
        `Harga: *${pending.price}*`,
        `Ketik *.buykoin batal* untuk batalkan`,
      ]) + "\n\n";
    }
    const priceBox = bracketBox("⚡", "Harga Topup Koin", [
      `Rp 10.000 per *${item.packSize.toLocaleString("id-ID")} koin*`,
      `Minimal *${item.min}* — maksimal *${item.max.toLocaleString("id-ID")}* sekali beli`,
      `Koin buat belanja di fitur RPG & toko bot`,
    ]);
    const howBox = bracketBox("📝", "Cara Beli", [
      `Ketik: *${prefix}buykoin <jumlah>*`,
      `Contoh: *${prefix}buykoin 200* (harga Rp 20.000)`,
      `Bayar QRIS → kirim bukti → owner approve → koin masuk otomatis`,
    ]);
    return m.reply(pendingBox + priceBox + "\n\n" + howBox + "\n\n" +
      tipText(`Koin kepake buat belanja game & jual beli — cek sisa via *.koin*`));
  }

  // .buykoin <jumlah>
  const parsed = validateTopupQty(ITEM_KEY, Number(args[0]));
  if (!parsed.ok) {
    return m.reply(claraWrap("buykoin",
      `${parsed.error}\n\n📌 Ketik: *${prefix}buykoin <jumlah>*\n💡 Contoh: *${prefix}buykoin 50000*`));
  }

  const qty = parsed.qty;
  const price = calcTopupPrice(ITEM_KEY, qty);
  const pending = topups.pending[sender];
  const isReplace = pending && pending.status === "pending";
  if (pending && pending.type === "limit") {
    return m.reply(claraWrap("buykoin",
      `Masih ada pesanan *buylimit* pending\nSelesaikan / batal dulu: *.buylimit batal*`));
  }

  topups.pending[sender] = {
    sender,
    phoneNumber: sender.split("@")[0],
    name: m.pushName || "Unknown",
    type: ITEM_KEY,
    qty,
    price: price.rupiah,
    priceNum: price.rupiahNum,
    status: "pending",
    orderedAt: Date.now(),
  };
  db.db.write();

  const detailBox = bracketBox("⚡", "Detail Topup Koin", [
    `Jumlah: *+${qty.toLocaleString("id-ID")} koin*`,
    `Harga: *${price.rupiah}*`,
    `Waktu: *${new Date().toLocaleString("id-ID")}*`,
    `Status: *Menunggu pembayaran*`,
  ]);
  const stepsBox = bracketBox("📝", "Cara Pembayaran", [
    `1. Bayar *${price.rupiah}* via QRIS/E-Wallet`,
    `2. Screenshot bukti transfer`,
    `3. Kirim bukti ke owner`,
    `4. Owner approve → koin langsung masuk!`,
  ]);
  const contactBox = bracketBox("👨‍💻", "Kontak Owner", [
    `Nama: *${config.owner?.name || "Owner"}*`,
    `Nomor: wa.me/${(config.owner?.number || ["628174887770"])[0]}`,
  ]);

  await m.reply(detailBox + "\n\n" + stepsBox + "\n\n" + contactBox + "\n\n" +
    tipText(`${isReplace ? "Pesanan lama diganti • " : ""}Ketik ${prefix}buykoin batal untuk batalkan`));
  await sendQRIS(sock, m);
  await notifyOwner(sock, m, qty, price.rupiah);
}

export { pluginConfig as config, handler };
