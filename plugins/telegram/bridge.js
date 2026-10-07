// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .bridge — Rara multi-platform: bot yang sama bisa dipakai dari DM Telegram & Discord.
// Fase 1 (publik, whitelist bertahap): kategori ai/tools/download/search/game/rpg/anime/fun.
// .bridge — status
// .bridge on <telegram|discord|all> — nyalain gateway
// .bridge off <telegram|discord|all> — matiin gateway
// .bridge kategori — liat whitelist · kategori add/del <kategori> (default *: semua kebuka)
// .bridge ownerid <add|del> <platform> <id> — daftarin ID platform kamu jadi owner
// Prasyarat: .setkey telegram <token> (BotFather) · .setkey discord <token> (Developer Portal)
import { getDatabase } from "../../src/lib/rara-database.js";
import { addOwner, removeOwner } from "../../src/lib/rara-premium-db.js";
import { getApiKey } from "../../src/lib/rara-api-keys.js";
import {
  startTelegramBridge,
  stopTelegramBridge,
  getTelegramClient,
  startDiscordBridge,
  stopDiscordBridge,
  bridgeStatus,
} from "../../src/lib/rarabridge/manager.js";
import { ensureBridgeState, DEFAULT_BRIDGE_CATEGORIES, BRIDGE_PLATFORMS } from "../../src/lib/rarabridge/adapter.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "bridge",
  alias: ["rarabridge", "bridgenova"],
  category: "telegram",
  description: "Rara multi-platform — pakai bot dari DM Telegram & Discord",
  usage: ".bridge — status semua platform\n.bridge on <telegram|discord|all> — nyalain\n.bridge off <telegram|discord|all> — matiin\n.bridge kategori — whitelist (default * = semua kebuka)\n.bridge kategori del * lalu add <kategori> — mode restriktif\n.bridge ownerid add/del <platform> <id>\n.bridge notif — status target notif Telegram\n.bridge notif <group|channel> <id> — set target notif\n.bridge notif <group|channel> off — hapus target\n.bridge notif tes — kirim pesan tes ke target",
  example: ".bridge on telegram\n.bridge ownerid add telegram 123456789\n.bridge notif group -1001234567890\n.bridge notif tes",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const b = ensureBridgeState(db);
  const args = (m.text || "").trim().split(/\s+/).filter(Boolean);
  const sub = (args[0] || "status").toLowerCase();
  const target = (args[1] || "").toLowerCase();
  const prefix = ".";

  const line = (label, run, tok) =>
    `${label.padEnd(10)} ${run ? "AKTIF ✅" : "MATI ❌"}${tok ? "" : "  (token belum di-set — .setkey " + label + ")"}`;

  try {
    // ── ON/OFF ──
    if (sub === "on" || sub === "off") {
      const plats = target === "all" ? BRIDGE_PLATFORMS : [target];
      if (!BRIDGE_PLATFORMS.includes(target) && target !== "all") {
        return m.reply(raraWrap("📌 " + prefix + "bridge " + sub + " <telegram|discord|all>", "Platform harus telegram, discord, atau all."));
      }
      const out = [];
      for (const p of plats) {
        if (sub === "on") {
          b.enabled[p] = true;
          const r = p === "telegram" ? await startTelegramBridge() : await startDiscordBridge();
          if (!r.ok) {
            b.enabled[p] = false;
            db.db.write();
            out.push(`${p}: ❌ ${r.error || r.msg || "gagal nyala"}`);
          } else {
            out.push(`${p}: ✅ aktif${r.me ? " sebagai @" + r.me.username : ""}`);
          }
        } else {
          b.enabled[p] = false;
          if (p === "telegram") stopTelegramBridge();
          else stopDiscordBridge();
          out.push(`${p}: ⏹️ dimatikan`);
        }
      }
      db.db.write();
      return m.reply(raraWrap("📍 Status gateway bridge", out.join("\n")));
    }

    // ── KATEGORI ──
    if (sub === "kategori" || sub === "category") {
      const act = (args[1] || "").toLowerCase();
      const cat = (args[2] || "").toLowerCase();
      if (act === "add" || act === "del") {
        if (!cat) return m.reply(raraWrap("📌 " + prefix + "bridge kategori " + act + " <kategori>", "Sebutkan kategorinya."));
        if (act === "add") {
          if (b.categories.includes(cat)) return m.reply(raraWrap("📍 Whitelist bridge", "Kategori " + cat + " sudah ada di whitelist."));
          b.categories.push(cat);
        } else {
          if (!b.categories.includes(cat)) return m.reply(raraWrap("📍 Whitelist bridge", "Kategori " + cat + " gak ada di whitelist."));
          b.categories = b.categories.filter((x) => x !== cat);
        }
        db.db.write();
        return m.reply(raraWrap("📍 Whitelist bridge di-update", `Whitelist kini: ${b.categories.join(", ")}`));
      }
      return m.reply(raraWrap(
        "📍 Whitelist kategori command bridge",
        `Kategori aktif (fase 1):\n${b.categories.map((c) => "• " + c).join("\n")}\n\nTambah: ${prefix}bridge kategori add <kategori>\nHapus: ${prefix}bridge kategori del <kategori>\nDefault: ${DEFAULT_BRIDGE_CATEGORIES.join(", ")}`,
      ));
    }

    // ── NOTIF (target grup & channel Telegram buat info bot) ──
    if (sub === "notif") {
      const { getTgNotifyTargets, setTgNotifyTarget, broadcastToTelegramTargets } = await import("../../src/lib/rara-telegram-notify.js");
      const kind = (args[1] || "").toLowerCase();
      const val = (args[2] || "").trim();
      const cur = getTgNotifyTargets();
      const fmt = (v) => v || "belum di-set";
      if (!kind) {
        return m.reply(raraWrap("📍 Target Notif Telegram", [
          `👥 Grup: ${fmt(cur.group)}`,
          `📢 Channel: ${fmt(cur.channel)}`,
          "",
          `Set: ${prefix}bridge notif group <id>`,
          `     ${prefix}bridge notif channel <id>`,
          `Hapus: ${prefix}bridge notif group off`,
          `Tes kirim: ${prefix}bridge notif tes`,
          "",
          "Semua info bot (ban/sewa/premium/server, ngikutin toggle .autobroadcastchannel) otomatis ikut ke Telegram begitu .bridge on telegram.",
          "Cara ambil ID: add bot ke grup/channel (channel: jadikan admin) → chat @userinfobot atau lihat t.me link (-100…).",
        ].join("\n")));
      }
      if (kind === "tes") {
        const r = await broadcastToTelegramTargets(
          "📍 Tes Notif Rara AI\n\nKalau pesan ini muncul di grup/channel kamu, berarti notif bot Telegram udah nyambung. ✅"
        );
        if (r.sent) return m.reply(raraWrap("📍 Tes Notif Telegram", `Terikirim ke: ${(r.sentTo || []).join(", ") || "-"} ✅`));
        return m.reply(raraWrap("📍 Tes Notif Telegram", `Gagal: ${r.reason || (r.failed || []).join("; ") || "tidak diketahui"}`));
      }
      if (kind !== "group" && kind !== "channel")
        return m.reply(raraWrap("📌 " + prefix + "bridge notif <group|channel> <id>", "Target harus group atau channel. Contoh: " + prefix + "bridge notif group -1001234567890"));
      let r;
      try {
        r = setTgNotifyTarget(kind, val);
      } catch (e) {
        return m.reply(raraWrap("📌 " + prefix + "bridge notif " + kind + " <id>", e?.message || String(e)));
      }
      if (r.cleared) return m.reply(raraWrap("📍 Target Notif Telegram", `Target ${kind === "group" ? "grup" : "channel"} dihapus dari daftar notif.`));
      return m.reply(raraWrap("📍 Target Notif Telegram", [
        `Target ${kind === "group" ? "grup" : "channel"} disimpan: ${r.id} ✅`,
        kind === "group" ? "Pastikan bot udah di-add ke grup itu." : "Pastikan bot udah jadi admin channel itu.",
        `Cek: ${prefix}bridge notif tes`,
      ].join("\n")));
    }

    // ── OWNERID ──
    if (sub === "ownerid") {
      const act = (args[1] || "").toLowerCase();
      const plat = (args[2] || "").toLowerCase();
      const id = (args[3] || "").replace(/\D/g, "");
      if (act !== "add" && act !== "del")
        return m.reply(raraWrap("📌 Owner platform bridge", `Cara daftar ID platform kamu:\n${prefix}bridge ownerid add telegram 123456789\n${prefix}bridge ownerid add discord 987654321098\n\nID Telegram: chat sama @userinfobot · ID Discord: aktifin Developer Mode → klik profil → Copy User ID.`));
      if (!BRIDGE_PLATFORMS.includes(plat)) return m.reply(raraWrap("📌 " + prefix + "bridge ownerid " + act + " <platform> <id>", "Platform harus telegram atau discord."));
      if (!id) return m.reply(raraWrap("📌 " + prefix + "bridge ownerid " + act + " " + plat + " <id>", "ID-nya gak kebaca — angka aja (tanpa tg_/dc_)."));
      const platformId = (plat === "telegram" ? "tg_" : "dc_") + id;
      const r = act === "add" ? addOwner(platformId, "owner-" + plat) : removeOwner(platformId);
      if (!r.success) return m.reply(raraWrap("📍 Owner platform bridge", r.message + " (" + platformId + ")"));
      // simpan juga jejak di state bridge biar gampang audit
      const list = b.ownerIds[plat] || (b.ownerIds[plat] = []);
      if (act === "add") { if (!list.includes(id)) list.push(id); }
      else b.ownerIds[plat] = list.filter((x) => x !== id);
      db.db.write();
      return m.reply(raraWrap("📍 Owner platform bridge", `${platformId} ${act === "add" ? "ditambahkan ke" : "dihapus dari"} daftar owner — command owner-only kini jalan dari ${plat === "telegram" ? "Telegram" : "Discord"}.`));
    }

    // ── STATUS ──
    const st = bridgeStatus();
    const tgTargets = (await import("../../src/lib/rara-telegram-notify.js")).getTgNotifyTargets();
    const tgTok = !!(getApiKey("telegram") || process.env.TELEGRAM_BOT_TOKEN);
    const dcTok = !!(getApiKey("discord") || process.env.DISCORD_BOT_TOKEN);
    return m.reply(raraWrap(
      "📍 Rara Bridge — status gateway",
      [
        line("telegram", st.telegram.running, tgTok),
        line("discord", st.discord.running, dcTok),
        "",
        `Whitelist (${b.categories.length}): ${b.categories.join(", ")}`,
        `Owner platform: telegram ${b.ownerIds.telegram?.length || 0} · discord ${b.ownerIds.discord?.length || 0}`,
        `Notif TG: grup ${tgTargets.group || "-"} · channel ${tgTargets.channel || "-"}`,
        "",
        `Nyalain: ${prefix}bridge on telegram`,
        `Token: ${prefix}setkey telegram <token> (bikin bot di @BotFather)`,
        `       ${prefix}setkey discord <token> (discord.com/developers)`,
        `Notif TG: ${prefix}bridge notif group <id> · ${prefix}bridge notif channel <id>`,
        "",
        "Fase 1: DM only, command teks. Input media menyusul.",
      ].join("\n"),
    ));
  } catch (e) {
    return m.reply("bridge error: " + (e?.message || e));
  }
}

export { pluginConfig as config, handler };
