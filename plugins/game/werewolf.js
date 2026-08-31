// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Werewolf — Social Deduction Game (5-15 players)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import {
  emoji_role, sesi, playerOnGame, playerOnRoom, playerExit,
  dataPlayer, getPlayerById2, killWerewolf, dreamySeer, sorcerer,
  protectGuardian, roleGenerator, addTimer, startGame, vote,
  clearAllVote, run, run_vote, run_malam, run_pagi,
} from "../../src/lib/nova-werewolf.js";

const pluginConfig = {
  name: "werewolf",
  alias: ["werewolf"],
  aliases: ["werewolf", "ww", "wwpc"],
  category: "game",
  description: "Game Werewolf (social deduction) 5-15 pemain di grup",
  usage: ".ww create | .ww join | .ww start | .ww kill <no> | .ww dreamy <no> | .ww deff <no> | .ww sorcerer <no> | .ww vote <no> | .ww player | .ww exit | .ww delete",
  example: ".ww create",
  isOwner: false, isPremium: false, isGroup: true, isPrivate: false,
  cooldown: 3, energi: 2, isEnabled: true,
};

const THUMB = "https://user-images.githubusercontent.com/72728486/235316834-f9f84ba0-8df3-4444-81d8-db5270995e6d.jpg";

async function handler(m, { sock, text, command }) {
  try {
    const sender = m.sender;
    const chatId = m.chat;
    sock.werewolf = sock.werewolf || {};
    const ww = sock.werewolf;
    const data = ww[chatId];
    const args = (text || "").trim().split(/\s+/);
    const value = (args[0] || "").toLowerCase();
    const targetRaw = args[1];

    const mustNumber = (v) => {
      const n = parseInt(v, 10);
      if (Number.isNaN(n) || n <= 0) return null;
      return n;
    };

    // CREATE ROOM
    if (value === "create") {
      if (ww[chatId]) return m.reply(claraWrap("werewolf", "Group masih dalam sesi permainan.", "info"));
      if (playerOnGame(sender, ww)) return m.reply(claraWrap("werewolf", "Kamu masih dalam sesi game lain.", "info"));
      ww[chatId] = { room: chatId, owner: sender, status: false, iswin: null, cooldown: 0, day: 0, time: "malem", player: [], dead: [], voting: false, seer: false, guardian: [] };
      return m.reply("╭──「 *ᴡᴇʀᴇᴡᴏʟғ* 」\n│ Room dibuat!\n│ 📌 .ww join — bergabung\n│ 📌 .ww start — mulai (min 5)\n╰──────────");
    }

    // JOIN
    if (value === "join") {
      if (!ww[chatId]) return m.reply(claraWrap("werewolf", "Belum ada sesi.", "info"));
      if (ww[chatId].status) return m.reply(claraWrap("werewolf", "Sesi sudah dimulai.", "info"));
      if (ww[chatId].player.length >= 15) return m.reply(claraWrap("werewolf", "Player penuh (max 15).", "info"));
      if (playerOnRoom(sender, chatId, ww)) return m.reply(claraWrap("werewolf", "Kamu sudah join.", "info"));
      if (playerOnGame(sender, ww)) return m.reply(claraWrap("werewolf", "Kamu masih dalam sesi lain.", "info"));
      ww[chatId].player.push({ id: sender, number: ww[chatId].player.length + 1, sesi: chatId, status: false, role: false, effect: [], vote: 0, isdead: false, isvote: false });
      let t = "╭──「 *ᴡᴇʀᴇᴡᴏʟғ ᴘʟᴀʏᴇʀ* 」\n";
      const mentions = [];
      for (const p of ww[chatId].player) { t += "│ " + p.number + ". @" + p.id.split("@")[0] + "\n"; mentions.push(p.id); }
      t += "│\n│ Min 5, Max 15 pemain\n╰──────────";
      return m.reply(t, { mentions });
    }

    // START
    if (value === "start") {
      if (!ww[chatId]) return m.reply(claraWrap("werewolf", "Belum ada sesi.", "info"));
      if (ww[chatId].player.length < 5) return m.reply(claraWrap("werewolf", "Minimal 5 pemain.", "info"));
      if (!playerOnRoom(sender, chatId, ww)) return m.reply(claraWrap("werewolf", "Kamu belum join.", "info"));
      if (ww[chatId].status) return m.reply(claraWrap("werewolf", "Game sudah dimulai.", "info"));
      if (ww[chatId].owner !== sender) return m.reply(claraWrap("werewolf", "Hanya owner room yang bisa start.", "info"));
      roleGenerator(chatId, ww);
      addTimer(chatId, ww);
      startGame(chatId, ww);
      for (const p of ww[chatId].player) {
        await sock.sendMessage(p.id, { text: "🎭 *WEREWOLF ROLE*\n\nHalo @" + p.id.split("@")[0] + ", role kamu adalah *" + p.role.toUpperCase() + "* " + emoji_role(p.role) + "\n\nJangan kasih tau siapapun!", mentions: [p.id] });
      }
      await m.reply("╭──「 *ᴡᴇʀᴇᴡᴏʟғ* 」\n│ 🎮 Game dimulai!\n│ Cek chat pribadi untuk role!\n╰──────────", { mentions: ww[chatId].player.map(p => p.id) });
      return await run(sock, chatId, ww);
    }

    // KILL (werewolf only)
    if (value === "kill") {
      if (!ww[chatId]) return m.reply(claraWrap("werewolf", "Belum ada sesi.", "info"));
      if (dataPlayer(sender, ww).role !== "werewolf") return m.reply(claraWrap("werewolf", "Hanya werewolf yang bisa kill.", "info"));
      const n = mustNumber(targetRaw);
      if (!n) return m.reply(claraWrap("werewolf", "Format: .ww kill <nomor>", "guide"));
      const byId = getPlayerById2(sender, n, ww);
      if (byId === false) return m.reply(claraWrap("werewolf", "Player tidak terdaftar.", "info"));
      if (byId.db.isdead) return m.reply(claraWrap("werewolf", "Player sudah mati.", "info"));
      if (byId.db.id === sender) return m.reply(claraWrap("werewolf", "Tidak bisa kill diri sendiri.", "info"));
      m.reply("Berhasil membunuh player " + n).then(() => { dataPlayer(sender, ww).status = true; killWerewolf(sender, n, ww); });
      return;
    }

    // DREAMY (seer only)
    if (value === "dreamy") {
      if (!ww[chatId]) return m.reply(claraWrap("werewolf", "Belum ada sesi.", "info"));
      if (dataPlayer(sender, ww).role !== "seer") return m.reply(claraWrap("werewolf", "Bukan role kamu.", "info"));
      const n = mustNumber(targetRaw);
      if (!n) return m.reply(claraWrap("werewolf", "Format: .ww dreamy <nomor>", "guide"));
      const byId = getPlayerById2(sender, n, ww);
      if (byId === false) return m.reply(claraWrap("werewolf", "Player tidak terdaftar.", "info"));
      const result = dreamySeer(sender, n, ww);
      m.reply("Identitas player " + n + ": " + result).then(() => { dataPlayer(sender, ww).status = true; });
      return;
    }

    // DEFF (guardian only)
    if (value === "deff") {
      if (!ww[chatId]) return m.reply(claraWrap("werewolf", "Belum ada sesi.", "info"));
      if (dataPlayer(sender, ww).role !== "guardian") return m.reply(claraWrap("werewolf", "Bukan role kamu.", "info"));
      const n = mustNumber(targetRaw);
      if (!n) return m.reply(claraWrap("werewolf", "Format: .ww deff <nomor>", "guide"));
      protectGuardian(sender, n, ww);
      m.reply("Berhasil melindungi player " + n).then(() => { dataPlayer(sender, ww).status = true; });
      return;
    }

    // SORCERER
    if (value === "sorcerer") {
      if (!ww[chatId]) return m.reply(claraWrap("werewolf", "Belum ada sesi.", "info"));
      if (dataPlayer(sender, ww).role !== "sorcerer") return m.reply(claraWrap("werewolf", "Bukan role kamu.", "info"));
      const n = mustNumber(targetRaw);
      if (!n) return m.reply(claraWrap("werewolf", "Format: .ww sorcerer <nomor>", "guide"));
      const result = sorcerer(sender, n, ww);
      m.reply("Identitas player " + n + ": " + result).then(() => { dataPlayer(sender, ww).status = true; });
      return;
    }

    // VOTE
    if (value === "vote") {
      if (!ww[chatId]) return m.reply(claraWrap("werewolf", "Belum ada sesi.", "info"));
      if (!ww[chatId].status) return m.reply(claraWrap("werewolf", "Game belum dimulai.", "info"));
      const n = mustNumber(targetRaw);
      if (!n) return m.reply(claraWrap("werewolf", "Format: .ww vote <nomor>", "guide"));
      vote(chatId, n, sender, ww);
      return m.reply("✅ Vote berhasil");
    }

    // EXIT
    if (value === "exit") {
      if (!ww[chatId]) return m.reply(claraWrap("werewolf", "Tidak ada sesi.", "info"));
      if (ww[chatId].status) return m.reply(claraWrap("werewolf", "Game sudah dimulai, tidak bisa keluar.", "info"));
      playerExit(chatId, sender, ww);
      return m.reply(sender.split("@")[0] + " keluar dari permainan.");
    }

    // DELETE
    if (value === "delete") {
      if (!ww[chatId]) return m.reply(claraWrap("werewolf", "Tidak ada sesi.", "info"));
      if (ww[chatId].owner !== sender) return m.reply(claraWrap("werewolf", "Hanya owner room yang bisa hapus.", "info"));
      delete ww[chatId];
      return m.reply("✅ Sesi dihapus.");
    }

    // PLAYER LIST
    if (value === "player") {
      if (!ww[chatId]) return m.reply(claraWrap("werewolf", "Tidak ada sesi.", "info"));
      let t = "╭──「 *ʟɪsᴛ ᴘʟᴀʏᴇʀ* 」\n";
      ww[chatId].player.forEach(p => { t += "│ " + p.number + ". @" + p.id.split("@")[0] + (p.isdead ? " ☠️" : "") + "\n"; });
      t += "╰──────────";
      return m.reply(t, { mentions: ww[chatId].player.map(p => p.id) });
    }

    // HELP / DEFAULT
    let t = "╭──「 *ᴡᴇʀᴇᴡᴏʟғ* 」\n";
    t += "│ 📌 .ww create — Buat room\n";
    t += "│ 📌 .ww join — Gabung\n";
    t += "│ 📌 .ww start — Mulai (min 5)\n";
    t += "│ 📌 .ww exit — Keluar\n";
    t += "│ 📌 .ww delete — Hapus room\n";
    t += "│ 📌 .ww player — List player\n";
    t += "│ 📌 .ww kill <no> — Kill (werewolf)\n";
    t += "│ 📌 .ww dreamy <no> — Cek role (seer)\n";
    t += "│ 📌 .ww deff <no> — Lindungi (guardian)\n";
    t += "│ 📌 .ww sorcerer <no> — Cek (sorcerer)\n";
    t += "│ 📌 .ww vote <no> — Vote\n";
    t += "│\n│ 5-15 pemain\n";
    t += "╰──────────";
    return m.reply(t);
  } catch (e) {
    console.error("werewolf error:", e.message);
    return m.reply(claraWrap("werewolf", "Error: " + (e.message || "unknown"), "error"));
  }
}

export { pluginConfig as config, handler };
