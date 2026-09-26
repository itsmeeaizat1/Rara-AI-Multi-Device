// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .guild — GUILD WAR ANTAR GRUP (26 Sep 2026, ide owner no.5 "fitur masa
// depan": RPG Nova jadi sosial — 1 grup = 1 guild, perang lintas grup,
// papan peringkat global). Kekuatan guild = agregat stat RPG anggota.
// Engine: src/lib/nova-guildwar.js (jangan duplikasi logika di sini).
// Animasi khas: dua pasukan berbaris → bentrok 💥 (libguildwarrpg.js).
//
// Commands:
//   .guild create <nama> [| <emoji>] — Bikin guild di grup ini (1 grup 1 guild)
//   .guild join                     — Gabung guild grup (level RPG ≥ 3)
//   .guild info [nama]              — Profil guild ini / guild lain
//   .guild donate <gold>            — Sumbang gold ke treasury guild
//   .guild war <nama lawan>         — Tantang guild grup lain (taruhan 300 gold)
//   .guild attack                   — Serang saat perang live (⚡2, jeda 20 dtk)
//   .guild score                    — Live skor perang (🕒)
//   .guild top                      — Peringkat guild SEMUA grup
//   .guild leave / .guild bubar     — Keluar / bubarkan (ketua)

import { novaGuide } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { ensureRpg, useEnergy, addGold, addExp, removeGold } from "../../src/lib/nova-rpg-service.js";
import {
  ensureGuildWarState, createGuild, joinGuild, leaveGuild, disbandGuild,
  donateTreasury, findGuildByName, getGuild, startWar, warAttack, guildSide,
  sweepWars, buildWarStartCard, buildScoreCard, buildResultCard,
  buildGuildCard, buildTopCard, getGuildPower, guildRank, memberPower,
  WAR_STAKE, WAR_WINDOW_MS, MIN_JOIN_LEVEL, ATTACK_ENERGY, MVP_GOLD,
} from "../../src/lib/nova-guildwar.js";
import { playWarAnim, playVictoryAnim } from "../../src/lib/libanimationrpg/libguildwarrpg.js";

const pluginConfig = {
  name: "guildwar",
  alias: ["guild", "guildgrup", "peranggrup"],
  category: "rpg",
  description: "Guild War antar grup — 1 grup = 1 guild, perang lintas grup dengan taruhan treasury, MVP & papan peringkat global",
  usage: ".guild create <nama> — Bikin guild di grup ini\n.guild join — Gabung (level RPG ≥ 3)\n.guild war <nama lawan> — Tantang guild grup lain\n.guild attack — Serang saat perang live\n.guild score — Live skor perang\n.guild top — Peringkat semua grup\n.guild donate <gold> — Sumbang treasury",
  example: ".guild create Naga Hitam | \u{1F409}",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

// umumkan hasil perang ke KEDUA grup (lintas grup)
async function announceWarEnd(sock, war) {
  const card = buildResultCard(war);
  for (const side of [war.atk, war.def]) {
    try { if (sock?.sendMessage) await sock.sendMessage(side.group, { text: card }); } catch {}
  }
  const r = war.result || {};
  if (r.winner && r.winner !== "tie") {
    try { await playVictoryAnim(sock, war[r.winner].group, { name: war[r.winner].name, emoji: war[r.winner].emoji }); } catch {}
  }
}

// hadiah personal: MVP +150 gold, peserta dapet EXP sesuai serangan
async function personalRewards(war) {
  const { mvp } = war.result || {};
  for (const [s, rec] of Object.entries(war.attackers)) {
    const fakeM = { sender: s };
    if (s === mvp) { try { addGold(fakeM, MVP_GOLD); } catch {} }
    try { addExp(fakeM, Math.min(60, 5 + rec.hits * 5)); } catch {}
  }
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const st = ensureGuildWarState(db);
  const args = (m.text || "").trim().split(/\s+/).slice(1);
  const sub = (args[0] || "").toLowerCase();
  const group = m.chat || "";

  if (!m.isGroup) return m.reply("Guild cuma bisa di grup \u2014 di sinilah guildmu dibangun.");

  // sweep dulu: ada perang yang waktunya habis? → umumkan + hadiah
  const ended = sweepWars(st);
  for (const war of ended) {
    await personalRewards(war).catch(() => {});
    await announceWarEnd(sock, war).catch(() => {});
  }

  try {
    // ── tanpa sub / bantuan ──
    if (!sub) {
      m.react?.("\u2694\uFE0F");
      const mine = getGuild(st, group);
      return m.reply(novaGuide(
        "guild",
        (mine ? "Grup ini punya guild: " + mine.emoji + " " + mine.name + " (" + mine.members.length + " anggota, treasury " + mine.treasury + " gold)" : "Grup ini belum punya guild \u2014 bikin: .guild create <nama>") + "\n.guild join — gabung guild grup ini\n.guild war <nama lawan> — tantang guild grup lain (taruhan " + WAR_STAKE + " gold)\n.guild attack — serang saat perang live\n.guild top — peringkat guild semua grup\n.guild donate <gold> — sumbang treasury",
        ".guild create Naga Hitam | \u{1F409}\n.guild war Elang Biru\n.guild attack",
        "1 grup = 1 guild. Kekuatan guild = gabungan stat RPG seluruh anggota. Perang 10 menit: yang paling banyak nyerang & terkuat menang, pot masuk treasury pemenang, MVP dapet bonus personal."
      ));
    }

    // ── create ──
    if (sub === "create" || sub === "bikin") {
      m.react?.("\u{1F6E1}\uFE0F");
      const rest = args.slice(1).join(" ");
      const [rawName, rawEmoji] = rest.split("|").map((x) => (x || "").trim());
      const res = createGuild(st, { group, name: rawName, emoji: rawEmoji, sender: m.sender });
      return m.reply(res.ok ? res.msg : res.msg);
    }

    // ── join ──
    if (sub === "join" || sub === "gabung") {
      const rpg = ensureRpg(m);
      if (!rpg) return m.reply("Profil RPG kamu belum siap. Main dulu: .working");
      if ((Number(rpg.level) || 1) < MIN_JOIN_LEVEL) {
        return m.reply("Level RPG kamu belum " + MIN_JOIN_LEVEL + " (sekarang " + (rpg.level || 1) + "). Naikin level dulu \u2014 kerja/berburu/bertualang!");
      }
      m.react?.("\u{1F91D}");
      const res = joinGuild(st, { group, sender: m.sender });
      return m.reply(res.msg);
    }

    // ── leave ──
    if (sub === "leave" || sub === "keluar") {
      const res = leaveGuild(st, { group, sender: m.sender });
      return m.reply(res.msg);
    }

    // ── bubar ──
    if (sub === "bubar" || sub === "disband") {
      const res = disbandGuild(st, { group, sender: m.sender });
      return m.reply(res.msg);
    }

    // ── donate ──
    if (sub === "donate" || sub === "sumbang") {
      const amount = Math.floor(Number(args[1]) || 0);
      if (amount < 1) return m.reply("Sebut jumlah goldnya. Contoh: .guild donate 500");
      const rpg = ensureRpg(m);
      if ((Number(rpg?.gold) || 0) < amount) return m.reply("Gold kamu kurang \u2014 punya " + (rpg?.gold || 0) + ", butuh " + amount + ".");
      removeGold(m, amount);
      const res = donateTreasury(st, { group, amount });
      if (!res.ok) return m.reply(res.msg);
      m.react?.("\u{1F4B0}");
      return m.reply("\u{1F4B0} +" + amount + " gold \u2192 treasury " + res.guild.name + " (total " + res.guild.treasury + ").\nSumbangan orang baik gak pernah sia-sia \u2014 ini modal perangmu.");
    }

    // ── info ──
    if (sub === "info" || sub === "profil") {
      const q = args.slice(1).join(" ");
      const g = q ? findGuildByName(st, q) : getGuild(st, group);
      if (!g) return m.reply(q ? "Guild \"" + q + "\" gak ketemu di seluruh bot." : "Grup ini belum punya guild. Bikin: .guild create <nama>");
      const power = getGuildPower(st, db, g);
      const rank = guildRank(st, g);
      return m.reply(buildGuildCard(g, { power, rank }));
    }

    // ── war ──
    if (sub === "war" || sub === "perang" || sub === "tantang") {
      const mine = getGuild(st, group);
      if (!mine) return m.reply("Grup ini belum punya guild. Bikin dulu: .guild create <nama>");
      if (!mine.members.includes(m.sender)) return m.reply("Kamu bukan anggota " + mine.name + ". Gabung dulu: .guild join");
      const targetName = args.slice(1).join(" ");
      if (!targetName) return m.reply("Siapa musuhnya? Contoh: .guild war Elang Biru\nLihat daftar guild semua grup: .guild top");
      const target = findGuildByName(st, targetName);
      if (!target) return m.reply("Guild \"" + targetName + "\" gak ketemu. Cek nama di: .guild top");
      if (target.group === group) return m.reply("Itu guild grup sendiri! Cari musuh dari grup lain.");
      m.react?.("\u2694\uFE0F");
      const res = startWar(st, { guildA: mine, guildB: target });
      if (!res.ok) return m.reply(res.msg);
      const war = res.war;
      // animasi pasukan berbaris → bentrok (khas guild war), lalu kartu mulai
      const animOk = await playWarAnim(sock, group, { nameA: war.atk.name, emojiA: war.atk.emoji, nameB: war.def.name, emojiB: war.def.emoji });
      if (animOk) { try { await sock?.sendMessage(group, { text: buildWarStartCard(war) }); } catch {} }
      else await m.reply(buildWarStartCard(war));
      // umum ke grup lawan juga
      try { await sock?.sendMessage(war.def.group, { text: "\u2694\uFE0F GUILD " + war.atk.name + " menantang " + war.def.name + "!\n\n" + buildWarStartCard(war) }); } catch {}
      // backup timer: kalau gak ada command guild sampai waktu habis
      const t = setTimeout(async () => {
        const endedLate = sweepWars(st);
        for (const w of endedLate) { await personalRewards(w).catch(() => {}); await announceWarEnd(sock, w).catch(() => {}); }
      }, WAR_WINDOW_MS + 5000);
      t.unref?.();
      return true;
    }

    // ── attack ──
    if (sub === "attack" || sub === "serang") {
      const mine = getGuild(st, group);
      if (!mine || !mine.members.includes(m.sender)) return m.reply("Kamu bukan anggota guild grup ini. Gabung: .guild join");
      const war = Object.values(st.wars).find((w) => w.status === "live" && (w.atk.gid === mine.id || w.def.gid === mine.id));
      if (!war) return m.reply("Gak ada perang aktif buat guild kamu. Tantang dulu: .guild war <nama>");
      const side = guildSide(war, mine.id);
      if (!useEnergy(m, ATTACK_ENERGY)) return m.reply("Stamina kamu kurang (" + ATTACK_ENERGY + " per serangan). Istirahat dulu \u2014 energi regen tiap 5 menit.");
      const rpg = ensureRpg(m);
      const dmg = memberPower(rpg) + Math.floor(Math.random() * ((Number(rpg?.level) || 1) + 1));
      const res = warAttack(st, war, { side, sender: m.sender, dmg });
      if (!res.ok) return m.reply(res.msg);
      m.react?.("\u{1F4A5}");
      const mineSide = side === "atk" ? war.atkScore : war.defScore;
      const foeSide = side === "atk" ? war.defScore : war.defScore;
      const foeName = side === "atk" ? war.def.name : war.atk.name;
      await m.reply("\u2694\uFE0F Seranganmu nyabuk " + foeName + " \u2014 " + res.dmg + " poin!\nSkor: " + mineSide + " (kamu) vs " + foeSide + " (" + foeName + ")");
      return true;
    }

    // ── score ──
    if (sub === "score" || sub === "skor") {
      const mine = getGuild(st, group);
      const war = mine && Object.values(st.wars).find((w) => w.status === "live" && (w.atk.gid === mine.id || w.def.gid === mine.id));
      if (!war) return m.reply("Gak ada perang aktif. Tantang: .guild war <nama lawan>");
      m.react?.("\uD83D\uDD52");
      return m.reply(buildScoreCard(war));
    }

    // ── top ──
    if (sub === "top" || sub === "peringkat" || sub === "rank") {
      m.react?.("\u{1F3C6}");
      return m.reply(buildTopCard(st));
    }

    return m.reply("Sub gak dikenal. Yang ada: create · join · leave · bubar · info · donate · war · attack · score · top");
  } catch (e) {
    return m.reply("Guild war error: " + (e?.message || e));
  }
}

export { pluginConfig as config, handler };
export default { pluginConfig, handler };
