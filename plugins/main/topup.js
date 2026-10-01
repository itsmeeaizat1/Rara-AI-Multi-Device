// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// topup.js — Katalog topup terpadu 4 JALUR (Akun, RPG, Item, Cinta)
// Digenerate langsung dari TOPUP_ITEMS (src/lib/store/rara-store.js)
// → menu SELALU sinkron dengan harga/jalur terbaru, gak ada harga stale.
// Sub: .topup status (cek pesanan pending), .topup <akun|rpg|item|cinta> (filter jalur)

import { getDatabase } from "../../src/lib/rara-database.js";
import { toSC, raraWrap } from "../../src/lib/rara-menu-style.js";
// GUARD FORMAT: pesan berkotak wajib boxLeft() (src/lib/styler.js),
// dilarang nulis "│ " manual — kalimat bebas panjang, wrapText yang motong.
import { boxMessage } from "../../src/lib/styler.js";
import {
  TOPUP_ITEMS,
  RPG_ITEM_RATE,
  RPG_ITEM_MAX_QTY,
  MIN_TOPUP_PRICE,
  ensureTopups,
  topupCancelHint,
} from "../../src/lib/store/rara-store.js";

const pluginConfig = {
  name: "topup",
  alias: ["topup", "katalogtopup"],
  category: "main",
  description: "Katalog topup terpadu — 4 jalur: Akun, RPG, Item & Cinta",
  usage: ".topup [status|akun|rpg|item|cinta]",
  example: ".topup",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const fmt = (n) => Number(n).toLocaleString("id-ID");

// Deskripsi singkat per jalur
const JALUR_DESC = {
  akun: "Kuota fitur bot (limit & koin)",
  rpg: "Mata uang game RPG",
  item: "Item game masuk inventory",
  cinta: "Affection RPG Cinta",
};

// teks item polos — prefix "│ " & pemotongan baris dijamin boxLeft()
function itemLine(prefix, item) {
  return `${item.icon} ${prefix}${item.command} — ${toSC(item.name)} : Rp ${fmt(item.pricePerPack)} / ${fmt(item.packSize)} ${item.unit}`;
}

function katalog(prefix, jalurFilter) {
  const jalurList = jalurFilter ? [jalurFilter] : ["akun", "rpg", "cinta"];
  const lines = [];

  for (const jalur of jalurList) {
    const items = Object.values(TOPUP_ITEMS).filter((it) => it.jalur === jalur);
    if (!items.length) continue;
    lines.push(`◆ ${(JALUR_DESC[jalur] || jalur).toUpperCase()} ◆`);
    for (const it of items) lines.push(itemLine(prefix, it));
    lines.push("────────────────────");
  }

  if (!jalurFilter || jalurFilter === "item") {
    lines.push(`◆ ${JALUR_DESC.item.toUpperCase()} ◆`);
    lines.push(`🎒 ${prefix}buyrpgitem — ${toSC("Item Game")} : Rp ${fmt(RPG_ITEM_RATE)} / ${toSC("poin nilai")}`);
    lines.push(`   ${toSC("beli 1 s/d")} ${fmt(RPG_ITEM_MAX_QTY)}x, ${toSC("min transaksi")} Rp ${fmt(MIN_TOPUP_PRICE)}`);
    lines.push("────────────────────");
  }

  lines.push(`💡 ${toSC("Contoh")}: ${prefix}buylimit 200`);
  lines.push(`📌 ${toSC("Bayar via")} QRIS — ${toSC("otomatis masuk setelah owner approve")}`);
  lines.push(`📌 ${toSC("Cek pesanan pending")}: ${prefix}topup status`);
  return boxMessage("◆ TOKO TOPUP ◆", lines.join("\n"));
}

async function handler(m, { sock }) {
  const args = m.args || [];
  const action = (args[0] || "").toLowerCase();

  // ── STATUS: pesanan pending user (semua jalur) ──
  if (action === "status" || action === "pesanan") {
    const db = getDatabase();
    const topups = ensureTopups(db);
    const sender = m.key.participant || m.key.remoteJid;
    const pending = topups.pending[sender];
    if (!pending || pending.status !== "pending") {
      return m.reply(raraWrap("topup", "Gak ada pesanan topup yang pending.\nKetik .topup buat lihat katalog."));
    }
    return m.reply(raraWrap("topup", [
      `${toSC("Pesanan kamu masih menunggu pembayaran")} —`,
      "",
      `${toSC("Item")} : *${pending.name}*`,
      `${toSC("Jumlah")} : *${fmt(pending.qty)} ${pending.unit}*`,
      `${toSC("Harga")} : *${pending.price}*`,
      `${toSC("Jalur")} : *${pending.jalur}*`,
      "",
      `${toSC("Sudah bayar? Tunggu owner approve.")}`,
      `${toSC("Mau batal")}? Ketik *.${topupCancelHint(pending.type)} batal*`,
    ]));
  }

  // ── FILTER JALUR ──
  if (["akun", "rpg", "item", "cinta"].includes(action)) {
    return m.reply(katalog(m.prefix || ".", action));
  }

  // ── KATALOG LENGKAP ──
  return m.reply(katalog(m.prefix || ".", null));
}

export { pluginConfig as config, handler };
