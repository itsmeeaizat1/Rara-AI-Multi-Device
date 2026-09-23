// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// autoorder.js — config AUTO ORDER PANEL (owner-only): on/off, slot panel,
// kredensial Pakasir, harga per paket. Dengan ini fitur orderpanel bisa
// dinyalakan/dimatikan & diatur harganya dari WA.
import { config } from "../../config.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import {
  RAM_PACKAGES, ensureOrderCfg, packagePrice, getOrderPanelCfg, fmtRupiah,
} from "../../src/lib/nova-auto-order.js";

const pluginConfig = {
  name: "autoorder",
  alias: ["autoorder"],
  category: "owner",
  description: "Config Auto Order Panel (on/off, panel, Pakasir, harga)",
  usage: ".autoorder status | on/off | panel <vN> | pakasir <slug> <apikey> | pediatopup <api_id> <api_key> | markuptopup <jumlah> | pacific <api_key> | markupsmm <persen> | harga <paket> <harga> | hargaadmin <harga>",
  example: ".autoorder harga 2gb 5000",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function statusText(cfg, panelOk) {
  const rows = Object.keys(RAM_PACKAGES).map((k) => `• ${k.toUpperCase()}: ${fmtRupiah(packagePrice(cfg, k))}`);
  return claraWrap("Config Auto Order", [
    `Status: ${cfg.on ? "🟢 AKTIF" : "🔴 MATI"}`,
    `Panel: v${cfg.panel} ${panelOk ? "(terkonfigurasi)" : "(BELUM ada domain/apikey!)"}`,
    `Pakasir: ${cfg.pakasir.slug ? `slug "${cfg.pakasir.slug}" tersimpan` : "BELUM di-set"}`,
    `PanelPedia TopUp: ${cfg.pediatopup.apiId ? `api id ${cfg.pediatopup.apiId} tersimpan · markup ${fmtRupiah(cfg.pediatopup.markup || 0)}` : "BELUM di-set"}`,
    `Pacific SMM: ${cfg.pacific.apiKey ? `apikey tersimpan · markup +${cfg.pacific.markupPct}%` : "BELUM di-set"}`,
    `Harga admin panel: ${fmtRupiah(cfg.adminPrice)}`,
    "",
    "Harga paket:",
    ...rows,
    "",
    "Sub: on/off · panel <vN> · pakasir <slug> <apikey> · pediatopup <api_id> <api_key> · markuptopup <jumlah> · pacific <api_key> · markupsmm <persen> · harga <paket> <harga> · hargaadmin <harga>",
  ]);
}

async function handler(m, { sock, db: _db }) {
  const db = _db || getDatabase();
  const cfg = ensureOrderCfg(db);
  const args = (m.args || []).map(String);
  const sub = (args[0] || "status").toLowerCase();

  if (sub === "on" || sub === "off") {
    cfg.on = sub === "on";
    db.save();
    const panelOk = !!getOrderPanelCfg(cfg.panel);
    if (cfg.on && (!panelOk || !cfg.pakasir.slug)) {
      return m.reply(claraWrap("Config Auto Order", `AutoSWGC nyala, TAPI ada yang belum siap: ${!panelOk ? `panel v${cfg.panel} belum dikonfigurasi` : ""}${!panelOk && !cfg.pakasir.slug ? " · " : ""}${!cfg.pakasir.slug ? "Pakasir belum di-set" : ""}. Order bakal ditolak sampai lengkap.`));
    }
    return m.reply(claraWrap("Config Auto Order", `Auto Order ${cfg.on ? "DIHIDUPKAN 🟢" : "DIMATIKAN 🔴"}`));
  }

  if (sub === "panel") {
    const n = parseInt(String(args[1] || "").replace(/^v/i, ""), 10);
    if (!(n >= 1 && n <= 100)) return m.reply(claraWrap("Config Auto Order", "Panel antara v1-v100 ya, contoh: .autoorder panel v2", "error"));
    cfg.panel = n;
    db.save();
    const ok = !!getOrderPanelCfg(n);
    return m.reply(claraWrap("Config Auto Order", `Slot panel auto order: v${n} ${ok ? "(domain+apikey ketemu)" : "(slot kosong — set dulu via .setpanel v" + n + ")"}`));
  }

  if (sub === "pakasir") {
    const slug = (args[1] || "").trim();
    const apikey = (args[2] || "").trim();
    if (!slug || !apikey || slug.length < 3 || apikey.length < 8) {
      return m.reply(claraWrap("Config Auto Order", "Format: .autoorder pakasir <slug-project> <apikey>\nAmbil di app.pakasir.com/projects", "error"));
    }
    cfg.pakasir.slug = slug;
    cfg.pakasir.apikey = apikey;
    db.save();
    return m.reply(claraWrap("Config Auto Order", `Pakasir tersimpan: slug "${slug}", apikey ${apikey.slice(0, 6)}…`));
  }

  if (sub === "pediatopup") {
    const apiId = (args[1] || "").trim();
    const apiKey = (args[2] || "").trim();
    if (!apiId || !apiKey || apiId.length < 4 || apiKey.length < 8) {
      return m.reply(claraWrap("Config Auto Order", "Format: .autoorder pediatopup <api_id> <api_key>\nAmbil di panelpediatopup.com (menu profil → API).", "error"));
    }
    cfg.pediatopup.apiId = apiId;
    cfg.pediatopup.apiKey = apiKey;
    db.save();
    return m.reply(claraWrap("Config Auto Order", `PanelPedia TopUp tersimpan: api id ${apiId}, api key ${apiKey.slice(0, 6)}…\nTes koneksi: .topuplist`));
  }

  if (sub === "markuptopup") {
    const v = parseInt(args[1], 10);
    if (!Number.isFinite(v) || v < 0 || v > 100000) return m.reply(claraWrap("Config Auto Order", "Markup topup angka rupiah 0-100000 ya, contoh: .autoorder markuptopup 2000", "error"));
    cfg.pediatopup.markup = v;
    db.save();
    return m.reply(claraWrap("Config Auto Order", `Markup topup: ${fmtRupiah(v)} (ditambah ke harga modal PanelPedia tiap layanan)`));
  }

  if (sub === "pacific") {
    const apiKey = (args[1] || "").trim();
    if (!apiKey || apiKey.length < 8) {
      return m.reply(claraWrap("Config Auto Order", "Format: .autoorder pacific <api_key>\nAmbil di api.pacific-pedia.co.id (menu profil).", "error"));
    }
    cfg.pacific.apiKey = apiKey;
    db.save();
    return m.reply(claraWrap("Config Auto Order", `Pacific SMM tersimpan: apikey ${apiKey.slice(0, 6)}…\nTes koneksi: .smmlist`));
  }

  if (sub === "markupsmm") {
    const v = parseInt(args[1], 10);
    if (!Number.isFinite(v) || v < 0 || v > 100) return m.reply(claraWrap("Config Auto Order", "Markup SMM persen 0-100 ya, contoh: .autoorder markupsmm 25", "error"));
    cfg.pacific.markupPct = v;
    db.save();
    return m.reply(claraWrap("Config Auto Order", `Markup SMM: +${v}% di atas harga modal Pacific tiap layanan`));
  }

  if (sub === "hargaadmin") {
    const v = parseInt(args[1], 10);
    if (!Number.isFinite(v) || v < 500) return m.reply(claraWrap("Config Auto Order", "Harga admin minimal Rp500 ya.", "error"));
    cfg.adminPrice = v;
    db.save();
    return m.reply(claraWrap("Config Auto Order", `Harga Admin Panel 1 Bulan: ${fmtRupiah(v)}`));
  }

  if (sub === "harga") {
    const key = (args[1] || "").toLowerCase();
    const v = parseInt(args[2], 10);
    if (!RAM_PACKAGES[key]) return m.reply(claraWrap("Config Auto Order", `Paket nggak dikenal. Pilihan: ${Object.keys(RAM_PACKAGES).join(", ")}`, "error"));
    if (!Number.isFinite(v) || v < 500) return m.reply(claraWrap("Config Auto Order", "Harga minimal Rp500 ya.", "error"));
    cfg.prices[key] = v;
    db.save();
    return m.reply(claraWrap("Config Auto Order", `Harga ${key.toUpperCase()}: ${fmtRupiah(v)}`));
  }

  return m.reply(statusText(cfg, !!getOrderPanelCfg(cfg.panel)));
}

export { pluginConfig as config, handler };
