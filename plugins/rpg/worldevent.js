// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .worldevent — TIME CAPSULE RPG / EVENT DUNIA (26 Sep 2026, ide owner
// no.6 "fitur masa depan"): event sekali sejarah yang gak bisa diulang.
// Yang ikut dapet GELAR LANGKA PERMANEN. Yang ketinggalan, ketinggalan
// selamanya. Engine: src/lib/rara-world-event.js (jangan duplikasi logika).
// Animasi khas per jenis: komet jatuh / boss muncul dari kabut / lentera
// naik (libworldeventrpg.js).
//
// Commands:
//   .worldevent              — Status event dunia sekarang
//   .worldevent on/off       — Langganan umuman event di chat ini (grup/DM)
//   .worldevent gelar        — Gelar abadi kamu
//   .worldevent riwayat      — Sejarah semua event sepanjang masa
//   .worldevent spawn <jenis> — (Owner) Picu event sekarang: komet/bossdunia/festival
//   .komet / .bossdunia / .festival — Ikut event yang lagi aktif (jalan
//     dari chat mana aja — DM atau grup)

import { raraGuide } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { ensureRpg, useEnergy, addGold, addExp } from "../../src/lib/rara-rpg-service.js";
import {
  ensureWorldEventState, KINDS, spawnEvent, getActiveEvent, sweepEvents,
  participateKomet, attackBoss, joinFestival,
  subscribeChat, unsubscribeChat, scheduleNextSpawn,
  buildStatusCard, buildResultCard, buildHistoryCard, buildTitlesCard,
  announceCard, KOMET_GOLD, KOMET_FIRST10_GOLD, FEST_GOLD, FEST_EXP,
  BOSS_TOP_GOLD, BOSS_ATTACK_ENERGY,
} from "../../src/lib/rara-world-event.js";
import { broadcastSpawn, broadcastResult } from "../../src/lib/rara-world-event.js";

const pluginConfig = {
  name: "worldevent",
  alias: ["eventdunia", "timecapsule", "komet", "bossdunia", "festival"],
  category: "rpg",
  description: "Event dunia sekali sejarah — komet langka, boss dunia, festival abadi. Yang ikut diabadikan gelar langka PERMANEN, yang ketinggalan selamanya",
  usage: ".worldevent — Status event dunia\n.worldevent on — Langganan umuman di chat ini\n.worldevent gelar — Gelar abadi kamu\n.worldevent riwayat — Sejarah semua event\n.komet / .bossdunia / .festival — Ikut event aktif",
  example: ".worldevent\n.komet",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const st = ensureWorldEventState(db);
  const raw = (m.text || "").trim();
  const cmd = (raw.split(/\s+/)[0] || "").toLowerCase().replace(/[^\w]/g, ""); // "worldevent"/"komet"/...
  const args = raw.split(/\s+/).slice(1);
  const sub = (args[0] || "").toLowerCase();
  const chat = m.chat || m.sender;

  // sweep: event yang waktunya habis → umum hasil ke semua langganan
  const ended = sweepEvents(st);
  for (const ev of ended) await broadcastResult(sock, st, ev);

  try {
    // ── pintu pintasan: .komet / .bossdunia / .festival = ikut event aktif ──
    if (["komet", "bossdunia", "festival"].includes(cmd)) {
      const live = getActiveEvent(st);
      if (!live) return m.reply("Belum ada event dunia yang aktif. Sabar \u2014 datangnya gak bisa ditebak, itu gunanya kapsul waktu.\nLangganan umuman: .worldevent on");
      if (live.kind !== cmd) return m.reply("Event yang aktif sekarang " + KINDS[live.kind].label + " (" + live.name + "). Ikut pake: " + KINDS[live.kind].cmd);
      if (cmd === "komet") {
        m.react?.("\u2604\uFE0F");
        const rpg = ensureRpg(m);
        const res = participateKomet(st, live, { sender: m.sender });
        if (!res.ok) return m.reply(res.msg);
        addGold(m, KOMET_GOLD);
        if (res.first10) addGold(m, KOMET_FIRST10_GOLD);
        return m.reply("\u2604\uFE0F Komet " + live.name + " KAMU TANGKAP!" + (res.first10 ? " Kamu penjaring #" + res.rank + " \u2014 10 PERTAMA DIABADIKAN SPESIAL!" : "") + "\n+" + KOMET_GOLD + (res.first10 ? "+" + KOMET_FIRST10_GOLD : "") + " gold \u00B7 gelar abadi: \u2604\uFE0F Penjaring " + live.name + "\nGelar ini gak akan pernah dibagikan lagi \u2014 punya kamu selamanya.");
      }
      if (cmd === "bossdunia") {
        const mine = getActiveEvent(st);
        if (!useEnergy(m, BOSS_ATTACK_ENERGY)) return m.reply("Stamina kurang (" + BOSS_ATTACK_ENERGY + " per serangan boss).");
        const rpg = ensureRpg(m);
        const dmg = (Number(rpg?.level) || 1) * 2 + (Number(rpg?.atk) || 0) + Math.floor(Math.random() * ((Number(rpg?.level) || 1) * 3 + 1));
        const res = attackBoss(st, mine, { sender: m.sender, dmg });
        if (!res.ok) return m.reply(res.msg);
        m.react?.("\u{1F4A5}");
        let txt = "\u{1F47E} Seranganmu mendarat \u2014 " + res.dmg + " damage! HP " + mine.name + ": " + res.hp + "/" + mine.hpMax;
        if (res.killed) {
          txt = "\u{1F47E} PUKUAN TERAKHIR \u2014 " + mine.name + " TUMBANG KARENA SERANGANMU!\nGelar abadi: \u{1F47E} Pembasmi " + mine.name;
          await broadcastResult(sock, st, mine);
        }
        return m.reply(txt);
      }
      if (cmd === "festival") {
        m.react?.("\u{1F38F}");
        const res = joinFestival(st, live, { sender: m.sender });
        if (!res.ok) return m.reply(res.msg);
        addGold(m, FEST_GOLD);
        addExp(m, FEST_EXP);
        return m.reply("\u{1F38F} Kamu resmi pengunjung " + live.name + " nomor " + res.rank + "!\n+" + FEST_GOLD + " gold \u00B7 +" + FEST_EXP + " EXP \u00B7 gelar abadi: \u{1F38F} Pengunjung " + live.name);
      }
    }

    // ── tanpa sub / status ──
    if (!sub || sub === "status" || sub === "tes") {
      m.react?.("\u{1F30D}");
      const live = getActiveEvent(st);
      if (live) return m.reply(buildStatusCard(st));
      return m.reply(buildStatusCard(st) + "\n\n" + raraGuide(
        "worldevent",
        "Event dunia itu SEKALI SEJARAH \u2014 komet yang lewat gak akan balik, boss yang tumbang gak bangkit lagi.\n.worldevent on — langganan umuman event di chat ini (grup/DM)\n.worldevent gelar — gelar abadi kamu\n.worldevent riwayat — sejarah semua event",
        ".worldevent on\n.worldevent gelar",
        "Yang ikut dapet gelar langka PERMANEN. Yang ketinggalan \u2014 ya ketinggalan selamanya. Itulah serunya kapsul waktu."
      ).split("\n").slice(1).join("\n"));
    }

    // ── on/off langganan ──
    if (sub === "on" || sub === "langganan") {
      const res = subscribeChat(st, chat);
      if (!res.ok) return m.reply(res.msg);
      m.react?.("\uD83D\uDD14");
      return m.reply("\uD83D\uDD14 Chat ini langganan event dunia (" + res.msg + " langganan total).\nUmuman + animasi bakal muncul di sini begitu event dimulai.");
    }
    if (sub === "off") {
      const res = unsubscribeChat(st, chat);
      return m.reply(res.ok ? "Langganan event dunia dimati di chat ini." : res.msg);
    }

    // ── gelar ──
    if (sub === "gelar" || sub === "titles") {
      m.react?.("\uD83C\uDF9F\uFE0F");
      return m.reply(buildTitlesCard(st, m.sender));
    }

    // ── riwayat ──
    if (sub === "riwayat" || sub === "sejarah") {
      m.react?.("\u{1F4DC}");
      return m.reply(buildHistoryCard(st));
    }

    // ── spawn (owner-only) ──
    if (sub === "spawn" || sub === "mulai") {
      if (!m.isOwner) return m.reply(" Cuma owner yang bisa memicu event dunia secara manual. Sabar \u2014 event otomatis muncul acak tiap beberapa hari.");
      const kind = (args[1] || "").toLowerCase();
      const res = spawnEvent(st, { kind });
      if (!res.ok) return m.reply(res.msg);
      m.react?.(KINDS[res.event.kind].emoji);
      const card = announceCard(res.event);
      await broadcastSpawn(sock, st, res.event);
      return m.reply("EVENT DUNIA DIMULAI \u2014 " + res.event.name + " (umuman ke " + st.subscribers.length + " chat langganan)");
    }

    return m.reply("Sub gak dikenal. Yang ada: on · off · gelar · riwayat · spawn <jenis> (owner)");
  } catch (e) {
    return m.reply("World event error: " + (e?.message || e));
  }
}

export { pluginConfig as config, handler };
export default { pluginConfig, handler };
