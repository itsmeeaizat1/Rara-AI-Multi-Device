// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .setpayment — atur info pembayaran toko: Cash, QRIS, e-wallet, bank.
 * Data disimpan di database, override config.js.
 */

import { getDatabase } from "../../src/lib/nova-database.js";
import config from "../../config.js";
import { updateAssetUrl } from "../../src/lib/nova-uploader.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "setpayment",
  alias: ["setpayment"],
  category: "owner",
  description: "Atur Cash, QRIS, e-wallet, dan bank untuk pembayaran toko",
  usage: ".setpayment <perintah> [args]",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function getPaymentData() {
  const db = getDatabase();
  const stored = db.setting("tokoPayment");
  if (stored) return stored;
  return {
    cash: { enabled: false, info: "" },
    qrisUrl: config.payment?.qrisUrl || "",
    methods: config.payment?.methods || [],
    banks: config.payment?.banks || [],
  };
}

function savePaymentData(data) {
  const db = getDatabase();
  db.setting("tokoPayment", data);
}

async function handler(m, { sock }) {
  const args = m.args || [];
  const action = (args[0] || "").toLowerCase();

  // ── CASH ──────────────────────────────────────────────────────────────────

  if (action === "cash") {
    const sub = (args[1] || "").toLowerCase();

    if (sub === "on" || sub === "off") {
      const data = getPaymentData();
      if (!data.cash) data.cash = { enabled: false, info: "" };
      data.cash.enabled = sub === "on";
      savePaymentData(data);
      return m.reply(claraWrap("Info", "\u2705 Pembayaran cash: " + (sub === "on" ? "ON" : "OFF")));
    }

    if (sub === "info" || sub === "set") {
      const info = args.slice(2).join(" ").trim();
      if (!info) {
        const data = getPaymentData();
        return m.reply(
          "Info cash saat ini: " + (data.cash?.info || "(belum diatur)") + "\n\n" +
          "Format: .setpayment cash info <teks>\n" +
          "Contoh: .setpayment cash info COD area Jakarta, hubungi 08xxx"
        );
      }
      const data = getPaymentData();
      if (!data.cash) data.cash = { enabled: false, info: "" };
      data.cash.info = info;
      data.cash.enabled = true;
      savePaymentData(data);
      return m.reply("Info cash disimpan: " + info);
    }

    return m.reply(
      "Format cash:\n\n" +
      "1. .setpayment cash on — Aktifkan cash\n" +
      "2. .setpayment cash off — Matikan cash\n" +
      "3. .setpayment cash info <teks> — Atur info cash (auto ON)\n\n" +
      "Contoh: .setpayment cash info COD area Jakarta saja"
    );
  }

  // ── QRIS ───────────────────────────────────────────────────────────────────

  if (action === "qris") {
    const isImage = m.isImage || (m.quoted && m.quoted.type === "imageMessage");

    if (!isImage) {
      const url = args[1];
      if (url) {
        const data = getPaymentData();
        data.qrisUrl = url;
        savePaymentData(data);
        return m.reply("QRIS diatur via URL: " + url);
      }
      return m.reply(
        "Cara set QRIS:\n\n" +
        "1. Kirim/reply gambar QRIS dengan caption .setpayment qris\n" +
        "2. Atau .setpayment qris <url gambar>\n\n" +
        "QRIS saat ini: " + (getPaymentData().qrisUrl ? "Sudah diatur" : "Belum diatur")
      );
    }

    try {
      let buffer;
      if (m.quoted && m.quoted.isMedia) {
        buffer = await m.quoted.download();
      } else if (m.isMedia) {
        buffer = await m.download();
      }

      if (!buffer) return m.reply(claraWrap("setpayment", "Gagal download gambar QRIS"));

      const uploadResult = await updateAssetUrl(buffer, "toko-qris.jpg", "images");
      const data = getPaymentData();
      data.qrisUrl = uploadResult;
      savePaymentData(data);

      return m.reply(claraWrap("Setpayment", "QRIS berhasil diatur dan disimpan."));
    } catch (err) {
      return m.reply("Error upload QRIS: " + err.message);
    }
  }

  // ── E-WALLET ────────────────────────────────────────────────────────────────

  if (action === "add" || action === "tambah" || action === "ewallet") {
    const text = args.slice(1).join(" ").trim();
    const parts = text.split("|").map((s) => s.trim());

    if (parts.length < 2) {
      return m.reply(
        "Format tambah e-wallet:\n\n" +
        ".setpayment add <nama>|<nomor>|<atas nama>\n\n" +
        "Contoh:\n" +
        ".setpayment add Dana|081234567890|Aizat\n" +
        ".setpayment add GoPay|081234567890|Aizat\n" +
        ".setpayment add OVO|081234567890|Aizat"
      );
    }

    const data = getPaymentData();
    const name = parts[0];
    const number = parts[1];
    const holder = parts[2] || "";

    const existing = data.methods.findIndex((m) => m.name.toLowerCase() === name.toLowerCase());
    if (existing !== -1) {
      data.methods[existing] = { name, number, holder };
    } else {
      data.methods.push({ name, number, holder });
    }

    savePaymentData(data);
    return m.reply(
      "E-wallet disimpan\n\n" +
      "Nama: " + name + "\n" +
      "Nomor: " + number + "\n" +
      "a/n: " + (holder || "-")
    );
  }

  if (action === "del" || action === "hapus") {
    const name = args.slice(1).join(" ").trim();
    if (!name) return m.reply(claraWrap("Setpayment", "Format: .setpayment del <nama e-wallet>"));

    const data = getPaymentData();
    const before = data.methods.length;
    data.methods = data.methods.filter((m) => m.name.toLowerCase() !== name.toLowerCase());
    savePaymentData(data);

    if (data.methods.length === before) return m.reply("E-wallet tidak ditemukan: " + name);
    return m.reply("E-wallet dihapus: " + name);
  }

  // ── BANK / REKENING ──────────────────────────────────────────────────────────

  if (action === "bank" || action === "rekening" || action === "rek") {
    const sub = (args[1] || "").toLowerCase();

    if (sub === "add" || sub === "tambah") {
      const text = args.slice(2).join(" ").trim();
      const parts = text.split("|").map((s) => s.trim());

      if (parts.length < 2) {
        return m.reply(
          "Format tambah rekening bank:\n\n" +
          ".setpayment bank add <nama bank>|<nomor rekening>|<atas nama>\n\n" +
          "Contoh:\n" +
          ".setpayment bank add BCA|1234567890|Aizat\n" +
          ".setpayment bank add Mandiri|9876543210|Aizat"
        );
      }

      const data = getPaymentData();
      const name = parts[0];
      const number = parts[1];
      const holder = parts[2] || "";

      const existing = data.banks.findIndex((b) => b.name.toLowerCase() === name.toLowerCase());
      if (existing !== -1) {
        data.banks[existing] = { name, number, holder };
      } else {
        data.banks.push({ name, number, holder });
      }

      savePaymentData(data);
      return m.reply(
        "Rekening bank disimpan\n\n" +
        "Bank: " + name + "\n" +
        "Rekening: " + number + "\n" +
        "a/n: " + (holder || "-")
      );
    }

    if (sub === "del" || sub === "hapus") {
      const name = args.slice(2).join(" ").trim();
      if (!name) return m.reply(claraWrap("Setpayment", "Format: .setpayment bank del <nama bank>"));

      const data = getPaymentData();
      const before = data.banks.length;
      data.banks = data.banks.filter((b) => b.name.toLowerCase() !== name.toLowerCase());
      savePaymentData(data);

      if (data.banks.length === before) return m.reply("Bank tidak ditemukan: " + name);
      return m.reply("Rekening bank dihapus: " + name);
    }

    return m.reply(claraWrap("Setpayment", "Format: .setpayment bank add <bank>|<rek>|<an> atau .setpayment bank del <nama>"));
  }

  // ── LIST / STATUS ─────────────────────────────────────────────────────────────

  if (action === "list" || action === "status" || action === "cek" || !action) {
    const data = getPaymentData();
    const methods = (data.methods || []).filter((m) => m.number);
    const banks = (data.banks || []).filter((b) => b.number);
    const cash = data.cash || { enabled: false, info: "" };

    let txt = "╭─「 PAYMENT INFO 」\n│\n";
    txt += "╰──────────\n\n";

    // Cash
    txt += "CASH: " + (cash.enabled ? "ON" : "OFF") + "\n";
    if (cash.info) txt += "  " + cash.info + "\n";
    txt += "\n";

    // QRIS
    txt += "QRIS: " + (data.qrisUrl ? "Sudah diatur" : "Belum diatur") + "\n\n";

    // E-Wallet
    if (methods.length > 0) {
      txt += "E-WALLET:\n";
      for (const mw of methods) {
        txt += "  " + mw.name + ": " + mw.number;
        if (mw.holder) txt += " (a/n " + mw.holder + ")";
        txt += "\n";
      }
      txt += "\n";
    } else {
      txt += "E-WALLET: Belum ada\n\n";
    }

    // Bank
    if (banks.length > 0) {
      txt += "REKENING BANK:\n";
      for (const bk of banks) {
        txt += "  " + bk.name + ": " + bk.number;
        if (bk.holder) txt += " (a/n " + bk.holder + ")";
        txt += "\n";
      }
      txt += "\n";
    } else {
      txt += "REKENING BANK: Belum ada\n\n";
    }

    txt += "Perintah:\n";
    txt += "1. .setpayment cash on/off\n";
    txt += "2. .setpayment cash info <teks>\n";
    txt += "3. .setpayment qris (reply gambar / url)\n";
    txt += "4. .setpayment add <nama>|<nomor>|<an>\n";
    txt += "5. .setpayment del <nama e-wallet>\n";
    txt += "6. .setpayment bank add <bank>|<rek>|<an>\n";
    txt += "7. .setpayment bank del <nama bank>";

    return await m.reply(claraWrap("setpayment", txt));
  }

  return m.reply(claraWrap("Setpayment", "Perintah tidak dikenal. Ketik .setpayment untuk lihat semua perintah."));
}

export { pluginConfig as config, handler };
