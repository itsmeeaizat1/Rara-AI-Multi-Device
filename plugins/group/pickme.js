// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getParticipantJid, getParticipantJids } from "../../src/lib/nova-lid.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { delay } from "../../src/lib/nova-utils.js";

const pluginConfig = {
  name: "pickmegc",
  alias: ["pick", "randompick", "pilihaku", "acakmember", "roulettepick"],
  category: "group",
  description: "Pilih member grup secara acak untuk tugas/assignment",
  usage: ".pickme [jumlah] atau .pickme @tag1 @tag2 atau .pickme team 2",
  example: ".pickme 3",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

// ==================== Helpers ====================
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomPick(arr, count) {
  return shuffle(arr).slice(0, count);
}

// Extract mentioned JIDs from message
function extractMentions(m) {
  const jids = new Set();
  // From quoted message
  if (m.quoted?.sender) jids.add(m.quoted.sender);
  // From message mentions
  if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
    m.message.extendedTextMessage.contextInfo.mentionedJid.forEach(j => jids.add(j));
  }
  // From m.mentionedJid if available
  if (m.mentionedJid) {
    (Array.isArray(m.mentionedJid) ? m.mentionedJid : [m.mentionedJid]).forEach(j => jids.add(j));
  }
  return [...jids];
}

// ==================== Handler ====================
async function handler(m, { sock, text: args }) {
  try {
    const groupMeta = m.groupMetadata;
    const participants = groupMeta?.participants || [];

    if (participants.length === 0) {
      await m.reply(claraWrap("Pick Me", "Gagal mendapatkan data member grup."));
      return { handled: true };
    }

    // Build member list
    let allMembers = getParticipantJids(participants);
    // Remove bot itself
    const botJid = sock.user?.id;
    allMembers = allMembers.filter(jid => jid !== botJid);

    const prefix = m.prefix || ".";
    const argStr = (m.text || "").replace(new RegExp(`^${prefix}pickme\\s*`, "i"), "").trim();

    // Mode detection
    const mentioned = extractMentions(m);
    let pool = allMembers;
    let mode = "all";

    // .pickme help
    if (argStr.toLowerCase() === "help" || argStr === "?") {
      const helpText = [
        "CARA PAKAI PICK ME:",
        "",
        `1. ${prefix}pickme`,
        "   Pilih 1 member acak dari semua member",
        "",
        `2. ${prefix}pickme 5`,
        "   Pilih 5 member acak",
        "",
        `3. ${prefix}pickme @tag1 @tag2 @tag3`,
        "   Pilih dari member yang di-tag saja",
        "",
        `4. ${prefix}pickme team 2`,
        "   Bagi jadi 2 tim secara acak",
        "",
        `5. ${prefix}pickme exclude @tag`,
        "   Pilih acak, kecuali yang di-tag",
        "",
        `6. ${prefix}pickme reroll`,
        "   Pilih ulang dari pool terakhir",
      ].join("\n");
      await m.reply(claraWrap("Pick Me", helpText));
      return { handled: true };
    }

    // Parse args
    let count = 1;
    let isTeamMode = false;
    let teamCount = 2;
    let isExcludeMode = false;

    const tokens = argStr.split(/\s+/).filter(Boolean);

    for (const token of tokens) {
      const lower = token.toLowerCase();
      if (lower === "team" || lower === "tim") {
        isTeamMode = true;
      } else if (lower === "exclude" || lower === "kecuali") {
        isExcludeMode = true;
      } else if (lower === "reroll" || lower === "ulang") {
        // Reroll from last pool
        const rerollKey = `pickme_last_${m.chat}`;
        const lastPool = global[rerollKey];
        if (!lastPool || lastPool.length === 0) {
          await m.reply(claraWrap("Pick Me", "Tidak ada pool sebelumnya untuk di-reroll."));
          return { handled: true };
        }
        const picked = randomPick(lastPool, 1);
        await m.reply(
          claraWrap("Pick Me - Reroll", 
            `Pilihan ulang:\n\n@${picked[0].split("@")[0]}`,
            "success"),
          { mentions: picked }
        );
        return { handled: true };
      } else if (/^\d+$/.test(token)) {
        const num = parseInt(token);
        if (isTeamMode) {
          teamCount = Math.min(Math.max(num, 2), 10);
        } else {
          count = Math.min(Math.max(num, 1), 50);
        }
      }
    }

    // Handle mentioned members
    if (mentioned.length > 0) {
      if (isExcludeMode) {
        pool = allMembers.filter(jid => !mentioned.includes(jid));
      } else {
        pool = mentioned.filter(jid => allMembers.includes(jid));
        mode = "tagged";
      }
    }

    if (pool.length === 0) {
      await m.reply(claraWrap("Pick Me", "Tidak ada member yang bisa dipilih."));
      return { handled: true };
    }

    // Save pool for reroll
    global[`pickme_last_${m.chat}`] = pool;

    // ==================== Team Mode ====================
    if (isTeamMode) {
      const actualTeamCount = Math.min(teamCount, pool.length);
      const shuffled = shuffle(pool);
      const teams = [];

      for (let i = 0; i < actualTeamCount; i++) {
        teams.push([]);
      }

      shuffled.forEach((jid, idx) => {
        teams[idx % actualTeamCount].push(jid);
      });

      let teamText = "Hasil Pembagian Tim:\n\n";
      const allMentions = [];
      const teamNames = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
      const teamEmojis = ["🔴", "🔵", "🟢", "🟡", "🟣", "🟠", "⚪", "⚫", "🔴", "🔵"];

      for (let i = 0; i < actualTeamCount; i++) {
        const members = teams[i];
        teamText += `${teamEmojis[i]} TIM ${teamNames[i]} (${members.length} orang)\n`;
        members.forEach(jid => {
          teamText += `  - @${jid.split("@")[0]}\n`;
          allMentions.push(jid);
        });
        if (i < actualTeamCount - 1) teamText += "\n";
      }

      await m.reply(claraWrap("Pick Me - Team", teamText, "success"), { mentions: allMentions });
      return { handled: true };
    }

    // ==================== Normal Pick Mode ====================
    const actualCount = Math.min(count, pool.length);
    const picked = randomPick(pool, actualCount);

    // Suspense animation
    await m.react("🕒");

    const suspenseMsgs = [
      "Memilih secara acak...",
      "Mengocok nama...",
      "Roulette berputar...",
    ];
    const suspense = suspenseMsgs[Math.floor(Math.random() * suspenseMsgs.length)];

    if (actualCount === 1) {
      // Single pick with suspense
      await m.reply(claraWrap("Pick Me", suspense, "info"));
      await delay(1500);

      const pickedJid = picked[0];
      const name = m.groupMetadata?.participants?.find(
        p => getParticipantJid(p) === pickedJid
      );

      let displayName = `@${pickedJid.split("@")[0]}`;

      const pickText = [
        "PILIHAN ACAK",
        "",
        `Yang terpilih: ${displayName}`,
        "",
        "Selamat! Kamu ditunjuk untuk misi ini.",
      ].join("\n");

      await m.reply(claraWrap("Pick Me", pickText, "success"), { mentions: picked });
    } else {
      // Multi pick
      let pickText = `Pilihan Acak (${actualCount} orang):\n\n`;
      picked.forEach((jid, idx) => {
        pickText += `${idx + 1}. @${jid.split("@")[0]}\n`;
      });
      pickText += "\nSelamat untuk yang terpilih!";

      await m.reply(claraWrap("Pick Me", pickText, "success"), { mentions: picked });
    }

    await m.react("🐣");
    return { handled: true };
  } catch (error) {
    console.error("pickme error:", error);
    await m.reply(claraWrap("Pick Me", "Terjadi error saat memilih member."));
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
