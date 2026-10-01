// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// beritanotify — Auto Berita Notifier (request owner 12 Sep 2026):
// "buat fitur auto berita notifier misal dr cnn klo update brita baru
// dikirim sbagai plaintext dan thumbnail gambar brita".
//   * .beritanotify on → langganan berita baru di chat ini + sample langsung
//   * .beritanotify off → berhenti langganan chat ini
//   * .beritanotify now → kirim N berita terbaru sekarang (force)
//   * .beritanotify sumber <cnn|tempo|cnbc|kompas>
//   * .beritanotify interval <5-120> menit
//   * .beritanotify status | list
// Subscriber per-chat TETAP dapat + target terpusat
// (.switch auto autoberitanotify set) nambah jangkauan.

import { raraWrap, raraCaption, tipText, toSC } from "../../src/lib/rara-menu-style.js";
import te from "../../src/lib/rara-error.js";
import {
  SOURCES, isBeritaNotifierOn, setBeritaNotifierOn,
  addSubscriber, removeSubscriber, isSubscriber,
  setSource, setIntervalMin, runCheck, statusInfo,
  setSock, syncMonitor,
} from "../../src/lib/rara-berita-notifier.js";

const pluginConfig = {
  name: "beritanotify",
  alias: ["beritanotify", "beritabarak", "newsnotify", "autonews"],
  category: "berita",
  description: "Auto berita notifier — berita baru dari RSS (cnn/tempo/cnbc/kompas) dikirim plaintext + thumbnail",
  usage: ".beritanotify on | off | now | status\n.beritanotify sumber <cnn|tempo|cnbc|kompas>\n.beritanotify interval <5-120>",
  example: ".beritanotify on\n.beritanotify sumber cnn\n.beritanotify now",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    // sock live (buat notif yang dikirim scheduler engine)
    setSock(sock);
    const args = m.args || [];
    const sub = (args[0] || "").toLowerCase();

    // ═══ guide ═══
    if (!sub) {
      const st = statusInfo();
      const guide = raraCaption({
        emoji: "📰",
        name: "beritanotify",
        description: "Notifikasi otomatis berita baru — plaintext + thumbnail gambar berita",
        usage: `${prefix}beritanotify on | off | now | status\n${prefix}beritanotify sumber <${Object.keys(SOURCES).join("|")}>\n${prefix}beritanotify interval <5-120>`,
        example: `${prefix}beritanotify on`,
      }) + "\n" + tipText(
        isSubscriber(m.chat)
          ? `Chat ini LANGGANAN AKTIF (sumber: ${toSC(st.sourceLabel)}) — berita baru otomatis masuk tiap ${st.intervalMin} menit`
          : `Aktifin di chat ini: ${prefix}beritanotify on`
      );
      return m.reply(guide, "beritanotify");
    }

    // ═══ on / off ═══
    if (sub === "on" || sub === "aktif") {
      if (isSubscriber(m.chat)) {
        return m.reply(raraWrap("beritanotify", `Chat ini udah langganan berita (${toSC(statusInfo().sourceLabel)}). Berita baru bakal masuk otomatis.`, "info"));
      }
      addSubscriber(m.chat);
      if (!isBeritaNotifierOn()) setBeritaNotifierOn(true);
      else syncMonitor();
      await m.react("🐣");
      // sample langsung nge-flow (ala anime notifier) — 1 berita terbaru
      const r = await runCheck({ force: true, max: 1, only: m.chat }).catch(() => ({ sent: 0 }));
      if (!r?.sent) {
        return m.reply(raraWrap("beritanotify",
          `✅ ${toSC("langganan berita aktif")} — ${toSC("sumber")} ${toSC(SOURCES[statusInfo().source]?.label || "CNN Indonesia")}\n` +
          `📰 ${toSC("berita baru bakal masuk otomatis tiap")} ${statusInfo().intervalMin} ${toSC("menit")}\n\n` +
          tipText(`Kirim sekarang juga: ${prefix}beritanotify now`)));
      }
      return m.reply(raraWrap("beritanotify", `✅ ${toSC("langganan berita aktif")} — ${toSC("itu sample terbaru di atas")}, berita berikutnya masuk otomatis tiap ${statusInfo().intervalMin} menit`));
    }

    if (sub === "off" || sub === "mati") {
      if (!isSubscriber(m.chat)) {
        return m.reply(raraWrap("beritanotify", `Chat ini gak lagi langganan. Aktifin: ${prefix}beritanotify on`, "info"));
      }
      removeSubscriber(m.chat);
      return m.reply(raraWrap("beritanotify", `🛑 ${toSC("langganan berita dihentikan di chat ini")}\n${tipText(`Grup/chat lain yang langganan tetap jalan — kontrol terpusat: ${prefix}switch auto autoberitanotify off`)}`));
    }

    // ═══ now ═══
    if (sub === "now") {
      await m.react("🕒");
      const r = await runCheck({ force: true, max: 3 });
      if (r?.sent) {
        await m.react("🐣");
        return m.reply(raraWrap("beritanotify", `📰 ${r.berita} ${toSC("berita terbaru dikirim di atas")} (${toSC("sumber")} ${toSC(statusInfo().sourceLabel)})`));
      }
      await m.react("❌");
      return m.reply(raraWrap("beritanotify", `Gagal ambil feed (${r?.error || "coba lagi bentar"}).`, "error"));
    }

    // ═══ status ═══
    if (sub === "status" || sub === "list") {
      const st = statusInfo();
      const srcList = Object.entries(SOURCES).map(([k, v]) => k === st.source ? `▸ ${toSC(v.label)} ✓` : `  ${toSC(v.label)}`).join("\n");
      let txt = `📰 *BERITA NOTIFIER*\n\n⚡ Status: ${st.enabled ? "ON" : "OFF"}\n📡 Sumber: ${toSC(st.sourceLabel)}\n⏱ Cek tiap: ${st.intervalMin} menit\n👥 Subscriber: ${st.subscribers.length} chat\n🎯 Target terpusat: ${toSC(st.targetDesc)}\n🕒 Cek terakhir: ${st.lastCheck ? new Date(st.lastCheck).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "-"}\n\n*Sumber tersedia:*\n${srcList}`;
      return m.reply(raraWrap("beritanotify", txt));
    }

    // ═══ sumber ═══
    if (sub === "sumber" || sub === "source") {
      const name = (args[1] || "").toLowerCase();
      if (!name) {
        return m.reply(raraWrap("beritanotify", `Sumber sekarang: ${toSC(statusInfo().sourceLabel)}\n\nPilihan:\n${Object.entries(SOURCES).map(([k, v]) => `▸ ${toSC(k)} — ${toSC(v.label)}`).join("\n")}\n\nFormat: ${prefix}beritanotify sumber <nama>`, "info"));
      }
      const set = setSource(name);
      if (!set) {
        return m.reply(raraWrap("beritanotify", `Sumber gak dikenal: ${name}\n\nPilihan: ${Object.keys(SOURCES).join(" / ")}`, "error"));
      }
      return m.reply(raraWrap("beritanotify", `📡 ${toSC("sumber berganti ke")} ${toSC(SOURCES[set].label)} — dedup direset, berita sumber baru bakal masuk mulai siklus berikutnya`));
    }

    // ═══ interval ═══
    if (sub === "interval") {
      const v = args[1];
      const set = setIntervalMin(v);
      if (set === null || set === undefined) {
        return m.reply(raraWrap("beritanotify", `Interval gak valid: ${v || "(kosong)"}\n\nFormat: ${prefix}beritanotify interval <5-120> menit`, "error"));
      }
      return m.reply(raraWrap("beritanotify", `⏱ ${toSC("cek tiap")} ${set} ${toSC("menit")}`));
    }

    // ═══ sub gak dikenal ═══
    return m.reply(raraWrap("beritanotify", `Sub gak dikenal. Yang ada: on | off | now | status | sumber | interval`, "info"));
  } catch (err) {
    console.error("beritanotify error:", err);
    await m.react("❌");
    return m.reply(raraWrap("beritanotify", te.raraError(err) || "Gagal memproses", "error"));
  }
}

export { pluginConfig as config, handler };
