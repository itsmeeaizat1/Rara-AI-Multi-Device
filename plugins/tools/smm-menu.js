// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

// ============================================================
// SMM Menu - Unified entry point for all SMM providers
// Shows: NexusSMM (.smm), UndrCtrl (.undr), ProviderSMM (.prov)
// ============================================================

const pluginConfig = {
  name: ["smmmenu", "menusmm", "smmall"],
  alias: ["smmmenu", "menusmm", "smmall"],
  category: "tools",
  description: "Menu gabungan semua SMM provider",
  usage: ".smmmenu",
  example: ".smmmenu",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  let body = "SMM Services - All Providers\n\n";
  body += "Pilih provider sesuai kebutuhan:\n\n";
  body += "1. *nexussmm* (.smm)\n";
  body += "   100+ layanan global\n";
  body += "   Platform: IG, Telegram, TikTok, YouTube, FB, Twitter\n";
  body += "   Command: .smm\n\n";
  body += "2. *undrctrl* (.undr)\n";
  body += "   Ratusan layanan (TikTok, IG, YouTube, Shopee, ML)\n";
  body += "   Harga USD, auto convert IDR\n";
  body += "   Command: .undr\n\n";
  body += "3. *providersmm* (.prov)\n";
  body += "   98 kategori, fokus Indonesia\n";
  body += "   IG/TikTok/FB/Threads/X Indonesia + Roblox\n";
  body += "   Command: .prov\n\n";
  body += "*Cara pakai (semua provider sama):*\n";
  body += "1. Cari: .smm/.undr/.prov cari <keyword>\n";
  body += "2. Beli: .smm/.undr/.prov beli <id> <link> <qty>\n";
  body += "3. Bayar: .smm/.undr/.prov bayar <token>\n";
  body += "4. Cek: .smm/.undr/.prov cek <order_id>\n";
  body += "5. Refill: .undr/.prov refill <order_id>\n";
  body += "6. Batal: .undr/.prov batal <order_id>\n";
  body += "7. Riwayat: .smm/.undr/.prov list\n\n";
  body += "*owner setup:*\n";
  body += ".smm setkey <api_id>:<api_key>\n";
  body += ".undr setkey <key>\n";
  body += ".prov setkey <key>\n";
  body += ".undr/.prov setmarkup <persen>\n";
  body += ".undr/.prov topup <nomor> <jumlah>";
}

export { pluginConfig as config, handler };
