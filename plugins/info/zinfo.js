// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ═════════════════════════════════════════════
// 🔹 .zinfo suite — fitur info zelapi kategori /info (live verified 15 Sep 2026):
//   .ztokengratis — direktori 24 provider AI gratis
//   .zgold — harga emas Treasury
//   .zgunung — gunung api aktif (magma.esdm.go.id)
//   .zcrypto [btc|eth|bnb|sol|xrp|ada|doge] — teknikal crypto IDR
//   .zsaham <ticker> — quote saham Google Finance (BBRI → auto BBRI:IDX)
//   .zongkir <asal> | <tujuan> | <berat kg> — ongkir multi-kurir
// 🔹 MATI server-side gak dipasang: bloxfruit, ml, xl; tagihanpln butuh nopel asli
//   (gak bisa diverifikasi live); cekgempa/cuaca/sholat/currency/donghua/webtoan = bot udah punya.
// ═════════════════════════════════════════════

import {
  infoTokengratis, infoGold, infoMountain, infoCrypto, infoGfinance, infoOngkir,
  ZEL_CRYPTO_COINS, _setZelInfoHttpForTest, _setZelInfoKeyForTest,
} from "../../src/scraper/zelinfo.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "zinfo",
  alias: ["ztokengratis", "zgold", "zgunung", "zcrypto", "zkrypto", "zsaham", "zongkir"],
  category: "info",
  description: "Info suite zelapi — AI gratis, emas, gunung api, crypto, saham, ongkir",
  usage: ".zinfo — daftar | .ztokengratis | .zgold | .zgunung | .zcrypto btc | .zsaham bbri | .zongkir jakarta | bandung | 1",
  example: ".zcrypto btc",
  isOwner: false, isPremium: false, isGroup: true, isPrivate: true,
  cooldown: 10, energi: 1, isEnabled: true,
};

const v = (x) => (x === null || x === undefined || x === "") ? null : String(x).trim();
const fmt = (n) => { const x = Number(n); return (x === null || x === undefined || isNaN(x)) ? null : x.toLocaleString("id-ID"); };
const short = (s, n = 120) => { const t = String(s || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n) + "…" : t; };

function usageCard() {
  return raraWrap("zinfo", [
    "ℹ️ INFO SUITE (zelapi):",
    "",
    "▸ .ztokengratis — direktori provider AI gratis",
    "▸ .zgold — harga emas Treasury",
    "▸ .zgunung — gunung api aktif (magma.esdm)",
    "▸ .zcrypto <btc|eth|bnb|sol|xrp|ada|doge> — teknikal crypto",
    "▸ .zsaham <ticker> — quote saham (bbri → BBRI:IDX)",
    "▸ .zongkir <asal> | <tujuan> | <kg> — ongkir multi-kurir",
  ].join("\n"));
}

async function handler(m, { sock }) {
  try {
    const command = String(m.command || "").toLowerCase();
    const args = (m.args || []).map(String);
    const text = (m.text || args.join(" ") || "").trim();

    if (command === "zinfo") return m.reply(usageCard());

    await m.react("🧠");

    if (command === "ztokengratis") {
      const r = await infoTokengratis();
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zinfo", `Tokengratis bermasalah: ${r.error}`)); }
      const lines = [`✅ PROVIDER AI GRATIS — ${r.total} direktori (tokengratis.id)`, ""];
      r.list.slice(0, 10).forEach((p, i) => {
        const row = [`${i + 1}. ${p.name}`];
        if (p.modelCount) row.push(`${p.modelCount} model`);
        if (v(p.maxContext)) row.push(`ctx ${p.maxContext}`);
        lines.push(row.join(" · "));
        if (Array.isArray(p.modalities) && p.modalities.length) lines.push(`   🎛️ ${p.modalities.join("/")}`);
      });
      if (r.list.length > 10) lines.push("", `…+${r.list.length - 10} lagi — cek tokengratis.id`);
      await m.reply(raraWrap("zinfo", lines.join("\n")));

    } else if (command === "zgold") {
      const r = await infoGold();
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zinfo", `Gold bermasalah: ${r.error}`)); }
      const g = r.gold;
      const last = Array.isArray(g.prices) ? g.prices[g.prices.length - 1] : null;
      const lines = ["✅ EMAS TREASURY (zelapi)", ""];
      const mv = v(g.movement);
      if (mv) lines.push(`📈 ${mv.toUpperCase()} ${v(g.percentage) ? g.percentage + "%" : ""}`);
      if (v(g.price)) lines.push(`💰 ${fmt(g.price)}`);
      if (last && v(last.buy_price)) lines.push(`🟡 beli ${fmt(last.buy_price)} · jual ${fmt(last.sell_price)}`, `🕒 ${v(last.datetime) || ""}`);
      await m.reply(raraWrap("zinfo", lines.join("\n")));

    } else if (command === "zgunung") {
      const r = await infoMountain();
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zinfo", `Info gunung bermasalah: ${r.error}`)); }
      const lines = ["✅ GUNUNG API AKTIF (magma.esdm.go.id)", ""];
      r.list.slice(0, 10).forEach((g, i) => {
        lines.push(`${i + 1}. 🌋 ${g.name} — ${g.level || "?"}`);
        if (v(g.description)) lines.push(`   ${short(g.description, 100)}`);
      });
      await m.reply(raraWrap("zinfo", lines.join("\n")));

    } else if (command === "zcrypto" || command === "zkrypto") {
      const r = await infoCrypto(args[0] || "btc");
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zinfo", `Crypto bermasalah: ${r.error}`)); }
      const c = r.crypto;
      const lines = [`✅ ${String(c.coin).toUpperCase()} (zelapi)`, ""];
      if (v(c.price)) lines.push(`💰 Rp ${fmt(c.price)}`);
      if (v(c.ma5)) lines.push(`📊 MA5 ${fmt(c.ma5)} · MA10 ${fmt(c.ma10)}`);
      if (v(c.rsi)) lines.push(`📈 RSI ${c.rsi}`);
      if (v(c.signal)) lines.push(`🎯 Signal: ${c.signal}`);
      if (v(c.update)) lines.push("", `🕒 ${c.update}`);
      await m.reply(raraWrap("zinfo", lines.join("\n")));

    } else if (command === "zsaham") {
      const r = await infoGfinance(args.join(" "));
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zinfo", `Saham bermasalah: ${r.error}`)); }
      const q = r.quote;
      const chg = Number(q.change);
      const pct = Number(q.change_percent);
      const arrow = isNaN(chg) ? "" : (chg >= 0 ? "🟢 +" : "🔴 ");
      const lines = ["✅ SAHAM (Google Finance via zelapi)", ""];
      lines.push(`🏢 ${q.name || q.symbol}`);
      lines.push(` ticker ${q.symbol}`);
      if (v(q.price)) lines.push(`💰 ${fmt(q.price)} ${q.currency || ""}`);
      if (!isNaN(chg)) lines.push(`${arrow}${fmt(chg)} (${!isNaN(pct) ? pct.toFixed(2) + "%" : ""}) hari ini`);
      if (v(q.previous_close)) lines.push(`⏮️ close kemarin ${fmt(q.previous_close)}`);
      await m.reply(raraWrap("zinfo", lines.join("\n")));

    } else if (command === "zongkir") {
      const parts = text.split("|").map((s) => s.trim());
      if (parts.length < 2) { await m.react("❌"); return m.reply(raraWrap("zinfo", "Format: .zongkir <asal> | <tujuan> | <berat kg>")); }
      const r = await infoOngkir(parts[0], parts[1], parts[2] || "1");
      if (!r.ok) { await m.react("❌"); return m.reply(raraWrap("zinfo", `Ongkir bermasalah: ${r.error}`)); }
      const lines = [`✅ ONGKIR ${r.weight} Kg (zelapi)`, "", `📍 ${r.route.origin || parts[0]}`, `🎯 ${r.route.destination || parts[1]}`, ""];
      r.couriers.slice(0, 6).forEach((c) => {
        lines.push(`🚚 ${c.name}`);
        (c.services || []).slice(0, 3).forEach((s) => {
          lines.push(`   ▸ ${s.code || s.description} — ${s.price || "?"}${v(s.estimate) ? " · " + s.estimate.replace("Estimasi Tiba", "±") : ""}`);
        });
      });
      await m.reply(raraWrap("zinfo", lines.join("\n")));
    } else {
      return m.reply(usageCard());
    }
    await m.react("🐣");
  } catch (e) {
    try { await m.react("❌"); } catch {}
    await m.reply(raraWrap("zinfo", `fitur error: ${e?.message || e}`));
  }
}

export default { pluginConfig, handler, command: pluginConfig.name };
export { pluginConfig as config, handler };
