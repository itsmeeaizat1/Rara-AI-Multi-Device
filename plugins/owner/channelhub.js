// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .channelhub — SALURAN HUB: pusat kendali integrasi Saluran WA (fitur no.1
// "bot masa depan", 25 Sep 2026). Tiga modul:
//   autopost  — konten harian AI-generated ke saluran (jam bebas, topic bebas)
//   react     — auto-react post di saluran (emoji + cooldown)
//   reply     — auto-reply keyword di saluran (rules add/list/del)
//   stat      — analitik follower: growth harian/mingguan/bulanan + milestone
// Engine: src/lib/rara-saluran-hub.js (JANGAN duplikasi logika di sini).
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import {
  ensureHubState, parseJamSaluran, buildDailyContent, buildStatCard,
} from "../../src/lib/rara-saluran-hub.js";
import { getSaluranChannel } from "../../src/lib/rara-saluran.js";
import { sendSaluranSafe } from "../../src/lib/rara-saluran-safe.js";
import config from "../../config.js";

const pluginConfig = {
  name: "channelhub",
  alias: ["saluranhub", "saluranwa", "wachannel"],
  category: "owner",
  description: "Pusat kendali integrasi Saluran WA: autopost AI harian, auto-react, auto-reply keyword, dan analitik follower",
  usage: ".channelhub",
  example: ".channelhub status",
  isOwner: true, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

const HELP = [
  "Saluran Hub — pusat kendali integrasi saluran WA",
  "",
  "▸ .channelhub status",
  "  Ringkasan semua modul + kondisi saluran",
  "",
  "▸ .channelhub autopost on 08:00",
  "  Konten AI harian dikirim ke saluran tiap pagi",
  "▸ .channelhub autopost off",
  "▸ .channelhub autopost topic <niche saluran>",
  "▸ .channelhub autopost tes",
  "  Preview konten AI tanpa kirim",
  "",
  "▸ .channelhub react on / off",
  "  Auto-react post di saluran",
  "▸ .channelhub react emoji ❤️ 🔥 👏",
  "▸ .channelhub react cooldown <menit>",
  "",
  "▸ .channelhub reply on / off",
  "  Auto-reply keyword di saluran",
  "▸ .channelhub reply add <keyword>|<balasan>",
  "▸ .channelhub reply list / del <nomor>",
  "",
  "▸ .channelhub stat",
  "  Analitik follower + growth + milestone",
  "▸ .channelhub tes",
  "  Tes kirim ke saluran",
].join("\n");

async function handler(m, { sock }) {
  await m.react("🧠");
  const args = m.args || [];
  const sub = String(args[0] || "").toLowerCase();
  const rest = args.slice(1);
  const db = getDatabase();
  const s = ensureHubState(db);

  // ── tanpa arg → panduan ──
  if (!sub) {
    await m.react("🐣");
    return m.reply(raraWrap("Saluran Hub", HELP, "guide"));
  }

  // ── status ──
  if (sub === "status") {
    const ch = await getSaluranChannel(sock).catch(() => null);
    const meta = ch?.meta || null;
    const ap = s.autopost, r = s.react, rp = s.reply, st = s.stats;
    const snaps = st.snapshots || [];
    const cur = snaps.length ? snaps[snaps.length - 1].count : null;
    const lines = [
      "Saluran: " + (meta?.name || (config.saluran?.name || "belum ada nama")) +
        (ch && !ch.ok ? " ⚠ " + ch.reason : " ✓") +
        (cur != null ? " · " + cur.toLocaleString("id-ID") + " follower" : ""),
      "",
      "Autopost: " + (ap.on ? "ON " + (ap.jam || "08:00") + " WIB" : "off") +
        (ap.lastError ? " ⚠ error terakhir: " + ap.lastError : ""),
      "Topic: " + (ap.topic || "default"),
      "",
      "Auto-react: " + (r.on ? "ON · " + (r.emojis || []).join(" ") : "off") +
        " · cooldown " + (r.cooldownMin || 3) + " mnt · hari ini " + (r.count || 0) + "/" + (r.capDay || 30),
      "Auto-reply: " + (rp.on ? "ON · " + (rp.rules || []).length + " rules" : "off") +
        " · hari ini " + (rp.count || 0) + "/" + (rp.capDay || 20),
      "",
      "Analitik: " + snaps.length + " snapshot · milestone terakhir " +
        (st.lastMilestone ? (st.lastMilestone * 500).toLocaleString("id-ID") : "belum ada"),
      "_kartu lengkap: .channelhub stat_",
    ];
    await m.react("🐣");
    return m.reply(raraWrap("Saluran Status", lines));
  }

  // ── stat ──
  if (sub === "stat") {
    const ch = await getSaluranChannel(sock).catch(() => null);
    // snapshot segi refresh (dedupe internal 30 mnt — gak berat)
    try {
      const { snapshotFollowers } = await import("../../src/lib/rara-saluran-hub.js");
      await snapshotFollowers(sock, { force: false });
    } catch { /* snapshot gagal → kartu pakai data lama, jujur di kartunya */ }
    await m.react("🐣");
    return m.reply(buildStatCard(s, ch?.meta?.name || config.saluran?.name || ""));
  }

  // ── tes kirim ──
  if (sub === "tes") {
    const ch = await getSaluranChannel(sock).catch(() => null);
    if (!ch || !ch.ok) {
      await m.react("❌");
      return m.reply("⚠ Saluran dilewati: " + (ch?.reason || "gak bisa resolve saluran") + " — cek .channelid cek");
    }
    try {
      await sendSaluranSafe(sock, ch.jid, { text: "🕒 Tes Saluran Hub\nBot aktif, saluran terhubung dengan baik." });
      await m.react("🐣");
      return m.reply("✅ Tes terkirim ke saluran" + (ch.meta?.name ? " (" + ch.meta.name + ")" : ""));
    } catch (e) {
      await m.react("❌");
      return m.reply("❌ Gagal kirim ke saluran: " + String(e?.message || e).slice(0, 120));
    }
  }

  // ── autopost ──
  if (sub === "autopost") {
    const verb = String(rest[0] || "").toLowerCase();
    const a = s.autopost;
    if (verb === "on") {
      const jam = rest[1] ? parseJamSaluran(rest[1]) : parseJamSaluran(a.jam || "08:00");
      if (rest[1] && !jam) { await m.react("❌"); return m.reply("⚠ Format jam harus HH:MM, contoh: .channelhub autopost on 08:00"); }
      a.on = true;
      if (jam) a.jam = jam;
      db.save?.();
      await m.react("🐣");
      return m.reply("✅ Autopost aktif — konten AI dikirim tiap hari jam " + a.jam + " WIB (claim tercatat saat sukses kirim)");
    }
    if (verb === "off") {
      a.on = false;
      db.save?.();
      await m.react("🐣");
      return m.reply("✅ Autopost dimatikan");
    }
    if (verb === "topic" || verb === "niche") {
      const t = rest.slice(1).join(" ").trim();
      if (!t) { await m.react("❌"); return m.reply("⚠ Kasih topik: .channelhub autopost topic <niche saluran>"); }
      a.topic = t.slice(0, 200);
      db.save?.();
      await m.react("🐣");
      return m.reply("✅ Topic autopost: " + a.topic);
    }
    if (verb === "tes") {
      try {
        const content = await buildDailyContent(a.topic);
        await m.react("🐣");
        return m.reply("📜 Preview konten AI (belum dikirim):\n\n" + content + "\n\n_aktifin pengiriman: .channelhub autopost on 08:00_");
      } catch (e) {
        await m.react("❌");
        return m.reply("❌ AI gagal bikin konten: " + String(e?.message || e).slice(0, 120));
      }
    }
    await m.react("❌");
    return m.reply("⚠ Sub autopost: on [HH:MM] · off · topic <teks> · tes");
  }

  // ── react ──
  if (sub === "react") {
    const verb = String(rest[0] || "").toLowerCase();
    const r = s.react;
    if (verb === "on" || verb === "off") {
      r.on = verb === "on";
      db.save?.();
      await m.react("🐣");
      return m.reply(verb === "on" ? "✅ Auto-react aktif — bot react post di saluran (cooldown " + (r.cooldownMin || 3) + " mnt)" : "✅ Auto-react dimatikan");
    }
    if (verb === "emoji") {
      const list = rest.slice(1).filter(Boolean);
      if (!list.length) { await m.react("❌"); return m.reply("⚠ Kasih emoji: .channelhub react emoji ❤️ 🔥 👏"); }
      r.emojis = list.slice(0, 10);
      db.save?.();
      await m.react("🐣");
      return m.reply("✅ Emoji react: " + r.emojis.join(" "));
    }
    if (verb === "cooldown") {
      const n = Math.max(1, Number(rest[1]) || 0);
      if (!n) { await m.react("❌"); return m.reply("⚠ Format: .channelhub react cooldown <menit>"); }
      r.cooldownMin = Math.min(720, n);
      db.save?.();
      await m.react("🐣");
      return m.reply("✅ Cooldown react: " + r.cooldownMin + " mnt");
    }
    await m.react("❌");
    return m.reply("⚠ Sub react: on · off · emoji <set> · cooldown <menit>");
  }

  // ── reply ──
  if (sub === "reply") {
    const verb = String(rest[0] || "").toLowerCase();
    const rp = s.reply;
    if (verb === "on" || verb === "off") {
      rp.on = verb === "on";
      db.save?.();
      await m.react("🐣");
      return m.reply(verb === "on" ? "✅ Auto-reply aktif — " + (rp.rules || []).length + " rules dimonitor" : "✅ Auto-reply dimatikan");
    }
    if (verb === "add") {
      const raw = rest.slice(1).join(" ").trim();
      const sep = raw.indexOf("|");
      if (!raw || sep < 1) { await m.react("❌"); return m.reply("⚠ Format: .channelhub reply add <keyword>|<balasan>"); }
      const key = raw.slice(0, sep).trim();
      const text = raw.slice(sep + 1).trim();
      if (!key || !text) { await m.react("❌"); return m.reply("⚠ Keyword dan balasan gak boleh kosong"); }
      if ((rp.rules || []).length >= 20) { await m.react("❌"); return m.reply("⚠ Maksimal 20 rules — hapus dulu: .channelhub reply del <nomor>"); }
      rp.rules.push({ key, text, hits: 0 });
      db.save?.();
      await m.react("🐣");
      return m.reply("✅ Rule ditambahkan (" + rp.rules.length + "/20): \"" + key + "\" → balasan dikirim ke saluran");
    }
    if (verb === "list") {
      if (!(rp.rules || []).length) { await m.react("❌"); return m.reply("⚠ Belum ada rule — tambah: .channelhub reply add menu|ketik .menu di chat bot"); }
      const lines = rp.rules.map((x, i) => (i + 1) + ". \"" + x.key + "\" · terpakai " + (x.hits || 0) + "x\n   → " + String(x.text).slice(0, 80));
      await m.react("🐣");
      return m.reply(raraWrap("Reply Rules", ["status: " + (rp.on ? "ON" : "off"), ""].concat(lines)));
    }
    if (verb === "del" || verb === "delete") {
      const n = Number(rest[1]) || 0;
      if (!n || !(rp.rules || [])[n - 1]) { await m.react("❌"); return m.reply("⚠ Nomor gak valid — lihat: .channelhub reply list"); }
      const [gone] = rp.rules.splice(n - 1, 1);
      db.save?.();
      await m.react("🐣");
      return m.reply("✅ Rule \"" + gone.key + "\" dihapus (" + rp.rules.length + " tersisa)");
    }
    await m.react("❌");
    return m.reply("⚠ Sub reply: on · off · add <keyword>|<balasan> · list · del <nomor>");
  }

  await m.react("❌");
  return m.reply("⚠ Sub tidak dikenal. Ketik .channelhub untuk panduan lengkap.");
}

export { pluginConfig as config, handler };
