// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// approvetopup.js — Owner: kelola pesanan beli satuan (.buylimit / .buykoin)
// .approvetopup          → lihat semua pesanan pending
// .approvetopup <nomor>  → approve → limit/koin masuk otomatis ke user
// .approvetopup <nomor> tolak [alasan] → tolak pesanan
import config from "../../config.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, toSC } from "../../src/lib/nova-menu-style.js";
import {
  TOPUP_ITEMS,
  ensureTopups,
} from "../../src/lib/store/nova-store.js";
// Helper apply JALUR RPG / CINTA / ITEM
import { addItem } from "../../src/lib/nova-rpg-service.js";
import { addAffection } from "../../src/lib/nova-rpg-cinta.js";

const pluginConfig = {
  name: "approvetopup",
  alias: ["approvetopup"],
  category: "owner",
  description: "Kelola pesanan topup limit/koin dari user",
  usage: ".approvetopup [nomor] [tolak <alasan>]",
  example: ".approvetopup 6281234567890",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const prefix = m.prefix || config.command?.prefix || ".";
  const db = getDatabase();
  const topups = ensureTopups(db);
  const args = (m.args || []).map((a) => String(a));
  const senderNum = m.sender?.replace(/[^0-9]/g, "") || "";

  // ── List pending ──
  if (args.length === 0) {
    const pending = Object.entries(topups.pending).filter(
      ([, o]) => o.status === "pending",
    );
    if (pending.length === 0) {
      return m.reply(claraWrap("approvetopup", "Tidak ada pesanan topup yang pending."));
    }
    let txt = `${toSC("ᴘᴇꜱᴀɴᴀɴ ᴛᴏᴘᴜᴘ ᴘᴇɴᴅɪɴɢ")} — ${pending.length}\n`;
    for (const [jid, o] of pending) {
      const it = TOPUP_ITEMS[o.type];
      const icon = o.type === "rpgitem" ? "📦" : it?.icon || "▫️";
      const label = o.type === "rpgitem"
        ? `${o.itemName} (${o.itemId}) x${o.qty}`
        : `${o.qty.toLocaleString("id-ID")} ${it?.unit || o.type}`;
      txt += `\n• ${o.phoneNumber} (${o.name || "Unknown"})\n  ${icon} ${label} — ${o.price}\n  Jalur: ${o.jalur || "?"} • Waktu: ${new Date(o.orderedAt).toLocaleString("id-ID")}\n`;
    }
    txt += `\n📌 Approve: *${prefix}approvetopup <nomor>*\n💡 Tolak: *${prefix}approvetopup <nomor> tolak <alasan>*`;
    return m.reply(claraWrap("approvetopup", txt));
  }

  // ── Approve / tolak by nomor ──
  const target = args[0].replace(/[^0-9]/g, "");
  if (target.length < 8) {
    return m.reply(claraWrap("approvetopup", `Nomor tidak valid\n\n📌 Contoh: *${prefix}approvetopup 6281234567890*`));
  }
  const jid = target + "@s.whatsapp.net";
  const order = topups.pending[jid] || topups.pending[target];
  if (!order || order.status !== "pending") {
    return m.reply(claraWrap("approvetopup", `Tidak ada pesanan pending dari *${target}*`));
  }

  const isReject = ["tolak", "batal", "reject"].includes((args[1] || "").toLowerCase());
  const item = TOPUP_ITEMS[order.type];

  if (isReject) {
    const reason = args.slice(2).join(" ") || "Pembayaran tidak terverifikasi";
    delete topups.pending[jid];
    order.status = "rejected";
    order.rejectedAt = Date.now();
    order.rejectedBy = m.sender;
    order.rejectReason = reason;
    topups.history.push(order);
    db.db.write();
    const rejLabel = order.type === "rpgitem"
      ? `${order.itemName} x${order.qty}`
      : `${order.qty.toLocaleString("id-ID")} ${item?.unit || order.type}`;
    await sock.sendMessage(jid, {
      text: `❌ *ᴘᴇꜱᴀɴᴀɴ ᴛᴏᴘᴜᴘ ᴅɪᴛᴏʟᴀᴋ*\n\nItem: *${rejLabel}*\nAlasan: *${reason}*\n\nHubungi owner untuk info lebih lanjut.`,
    }).catch(() => {});
    return m.reply(claraWrap("approvetopup",
      `Status: *ᴅɪᴛᴏʟᴀᴋ*\nPesanan ${order.type} dari *${target}* ditolak`));
  }

  // Approve → terapkan sesuai JALUR pesanan
  const it = TOPUP_ITEMS[order.type];
  const fakeM = { sender: jid, pushName: order.name || "Player" }; // buat helper rpg/cinta/item
  let applyNote = "";

  if (order.type === "limit") {
    const user = db.getUser(jid) || db.setUser(jid);
    if (!user) return m.reply(claraWrap("approvetopup", `Gagal: user *${target}* tidak bisa diakses`));
    // -1 = unlimited, jangan diubah
    if (user.energi !== -1) {
      user.energi = (user.energi ?? config.energi?.default ?? 25) + order.qty;
      db.setUser(jid, user);
    }
  } else if (order.type === "koin") {
    db.updateKoin(jid, order.qty);
  } else if (it?.apply?.startsWith("rpgCurrency:")) {
    // JALUR RPG: diamond / harta(gold) / gems / tokens
    const currency = it.apply.split(":")[1];
    db.updateRpgCurrency(jid, currency, order.qty);
  } else if (order.type === "affection") {
    // JALUR CINTA
    const after = addAffection(fakeM, order.qty);
    if (after === undefined || after === null) {
      return m.reply(claraWrap("approvetopup", `Gagal: data cinta user *${target}* tidak bisa diakses`));
    }
    applyNote = `Affection sekarang: ${after.toLocaleString("id-ID")}`;
  } else if (order.type === "rpgitem") {
    // JALUR ITEM: masuk inventory game
    const ok = addItem(fakeM, order.itemId, order.qty);
    if (!ok) {
      return m.reply(claraWrap("approvetopup", `Gagal: item *${order.itemId}* tidak bisa dimasukkan ke inventory`));
    }
    applyNote = `Item masuk inventory: ${order.itemName} x${order.qty}`;
  } else {
    return m.reply(claraWrap("approvetopup", `Tipe pesanan tidak dikenal: *${order.type}*`));
  }

  delete topups.pending[jid];
  order.status = "approved";
  order.approvedAt = Date.now();
  order.approvedBy = m.sender;
  topups.history.push(order);
  if (topups.history.length > 200) topups.history = topups.history.slice(-200);
  db.db.write();

  const unitLabel = order.type === "rpgitem"
    ? `${order.itemName} (x${order.qty})`
    : `${order.qty.toLocaleString("id-ID")} ${item?.unit || order.type}`;
  await sock.sendMessage(jid, {
    text: `✅ *ᴛᴏᴘᴜᴘ ʙᴇʀʜᴀꜱɪʟ*\n\n+${unitLabel} sudah masuk ke akun kamu!\nTotal bayar: *${order.price}*\n\nTerima kasih sudah topup 🥳`,
  }).catch(() => {});

  return m.reply(claraWrap("approvetopup",
    `Status: *ʙᴇʀʜᴀꜱɪʟ*\nUser: *${order.phoneNumber}*\nItem: *+${unitLabel}*\nJalur: *${order.jalur || "akun"}*\nHarga: *${order.price}*\n\n${order.type === "limit" && db.getUser(jid)?.energi === -1 ? "User unlimited (limit -1) — tidak ditambah" : applyNote || "Item sudah masuk otomatis & user dinotif"}`));
}

export { pluginConfig as config, handler };
