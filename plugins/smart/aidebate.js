// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { delay } from "../../src/lib/nova-utils.js";

const pluginConfig = {
  name: "aidebate",
  alias: ["aidebate", "debate"],
  category: "smart",
  description: "AI Debate Mode - debat pro vs kontra dengan AI judge",
  usage: ".debate <command>",
  example: ".debate start AI menguntungkan",
  isOwner: false,
  isPremium: true,
  isGroup: true,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

const ROUNDS = 3;
const ROUND_DURATION = 60;

function getDebate(db, gid) {
  const all = db.setting("aidebate") || {};
  return all[gid] || null;
}

function saveDebate(db, gid, data) {
  const all = db.setting("aidebate") || {};
  all[gid] = data;
  db.setting("aidebate", all);
  db.save();
}

function delDebate(db, gid) {
  const all = db.setting("aidebate") || {};
  delete all[gid];
  db.setting("aidebate", all);
  db.save();
}

async function aiJudge(topic, proArgs, conArgs) {
  try {
    const prompt = "Kamu adalah juri debat profesional. Nilai argumen PRO dan KONTRA berikut.\n" +
      "Topik: " + topic + "\n\n" +
      "ARGUMEN PRO:\n" + proArgs + "\n\n" +
      "ARGUMEN KONTRA:\n" + conArgs + "\n\n" +
      "Beri: 1) Skor PRO (0-100), 2) Skor KONTRA (0-100), 3) Alasan singkat, 4) Pemenang. Format:\n" +
      "PRO: <skor>\nKONTRA: <skor>\nALASAN: <ringkas>\nPENERANG: <PRO/KONTRA>";
    const result = await UnlimitedAI(prompt, "nova-ai");
    return result?.success ? result.response : null;
  } catch {
    return null;
  }
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;

  // ==================== START
  if (sub === "start" || sub === "mulai") {
    const topic = args.slice(2).join(" ").trim();
    if (!topic) {
      await m.reply(claraWrap("AI Debate", "Format: " + prefix + "debate start <topik>\n💡 *Contoh:* " + prefix + "debate start AI menguntungkan manusia"));
      return { handled: true };
    }
    const existing = getDebate(db, gid);
    if (existing && existing.status === "active") {
      await m.reply(claraWrap("AI Debate", "Debat masih aktif. Ketik " + prefix + "debate stop dulu."));
      return { handled: true };
    }
    const data = {
      topic,
      pro: null,
      con: null,
      round: 0,
      rounds: ROUNDS,
      proArgs: [],
      conArgs: [],
      status: "waiting",
      startedBy: m.sender,
      startedAt: Date.now(),
    };
    saveDebate(db, gid, data);
    await m.reply(claraWrap("AI Debate", [
      "Topik: " + topic,
      "Ronde: " + ROUNDS,
      "Durasi/ronde: " + ROUND_DURATION + " detik",
      "Status: Menunggu pemain",
      "",
      "Ketik " + prefix + "debate pro untuk join tim PRO",
      "Ketik " + prefix + "debate con untuk join tim KONTRA",
      "Minimal 2 pemain (1 pro + 1 con) untuk mulai",
    ].join("\n")));
    return { handled: true };
  }

  // ==================== JOIN PRO
  if (sub === "pro") {
    const debate = getDebate(db, gid);
    if (!debate) {
      await m.reply(claraWrap("AI Debate", "Belum ada debat. Ketik " + prefix + "debate start <topik>."));
      return { handled: true };
    }
    if (debate.status !== "waiting") {
      await m.reply(claraWrap("AI Debate", "Debat sudah mulai."));
      return { handled: true };
    }
    if (debate.pro) {
      await m.reply(claraWrap("AI Debate", "Tim PRO sudah ada: @" + debate.pro.split("@")[0]));
      return { handled: true };
    }
    if (debate.con === m.sender) {
      await m.reply(claraWrap("AI Debate", "Kamu sudah di tim KONTRA."));
      return { handled: true };
    }
    debate.pro = m.sender;
    saveDebate(db, gid, debate);
    await m.reply(claraWrap("AI Debate", "@" + m.sender.split("@")[0] + " join tim PRO! " + (debate.con ? "Tim lengkap! Ketik " + prefix + "debate begin" : "Menunggu tim KONTRA...")), { mentions: [m.sender] });
    return { handled: true };
  }

  // ==================== JOIN CON
  if (sub === "con" || sub === "kontra") {
    const debate = getDebate(db, gid);
    if (!debate) {
      await m.reply(claraWrap("AI Debate", "Belum ada debat. Ketik " + prefix + "debate start <topik>."));
      return { handled: true };
    }
    if (debate.status !== "waiting") {
      await m.reply(claraWrap("AI Debate", "Debat sudah mulai."));
      return { handled: true };
    }
    if (debate.con) {
      await m.reply(claraWrap("AI Debate", "Tim KONTRA sudah ada: @" + debate.con.split("@")[0]));
      return { handled: true };
    }
    if (debate.pro === m.sender) {
      await m.reply(claraWrap("AI Debate", "Kamu sudah di tim PRO."));
      return { handled: true };
    }
    debate.con = m.sender;
    saveDebate(db, gid, debate);
    await m.reply(claraWrap("AI Debate", "@" + m.sender.split("@")[0] + " join tim KONTRA! " + (debate.pro ? "Tim lengkap! Ketik " + prefix + "debate begin" : "Menunggu tim PRO...")), { mentions: [m.sender] });
    return { handled: true };
  }

  // ==================== BEGIN
  if (sub === "begin" || sub === "mulai2") {
    const debate = getDebate(db, gid);
    if (!debate) {
      await m.reply(claraWrap("AI Debate", "Belum ada debat."));
      return { handled: true };
    }
    if (!debate.pro || !debate.con) {
      await m.reply(claraWrap("AI Debate", "Tim belum lengkap. Butuh 1 PRO + 1 CON."));
      return { handled: true };
    }
    if (m.sender !== debate.pro && m.sender !== debate.con && !m.isOwner) {
      await m.reply(claraWrap("AI Debate", "Hanya pemain atau owner yang bisa mulai."));
      return { handled: true };
    }
    debate.status = "active";
    debate.round = 1;
    debate.currentTurn = debate.pro;
    saveDebate(db, gid, debate);
    await m.reply(claraWrap("AI Debate", [
      "DEBAT DIMULAI!",
      "Topik: " + debate.topic,
      "Ronde 1/" + debate.rounds,
      "PRO: @" + debate.pro.split("@")[0],
      "KONTRA: @" + debate.con.split("@")[0],
      "",
      "Giliran PRO mengirim argumen!",
      "Ketik argumen kamu (teks biasa)",
    ].join("\n")), { mentions: [debate.pro, debate.con] });
    return { handled: true };
  }

  // ==================== ARGUMENT (inline)
  if (sub === "arg" || sub === "argumen") {
    const debate = getDebate(db, gid);
    if (!debate || debate.status !== "active") {
      await m.reply(claraWrap("AI Debate", "Tidak ada debat aktif."));
      return { handled: true };
    }
    const text = args.slice(2).join(" ").trim();
    if (!text) {
      await m.reply(claraWrap("AI Debate", "Ketik argumen kamu: " + prefix + "debate arg <teks>"));
      return { handled: true };
    }
    if (m.sender !== debate.currentTurn) {
      const side = debate.currentTurn === debate.pro ? "PRO" : "KONTRA";
      await m.reply(claraWrap("AI Debate", "Bukan giliran kamu. Giliran tim " + side + "."));
      return { handled: true };
    }

    const side = m.sender === debate.pro ? "pro" : "con";
    if (side === "pro") debate.proArgs.push(text);
    else debate.conArgs.push(text);

    // Switch turn or next round
    const proDone = debate.proArgs.length >= debate.round;
    const conDone = debate.conArgs.length >= debate.round;

    if (proDone && conDone) {
      // Round complete
      if (debate.round >= debate.rounds) {
        // Final - judge
        debate.status = "judging";
        saveDebate(db, gid, debate);
        await m.reply(claraWrap("AI Debate", "Semua ronde selesai! AI Judge sedang menilai..."));
        const verdict = await aiJudge(debate.topic, debate.proArgs.join("\n"), debate.conArgs.join("\n"));
        debate.status = "done";
        debate.verdict = verdict;
        saveDebate(db, gid, debate);
        await m.reply(claraWrap("AI Debate Verdict", "Topik: " + debate.topic + "\n\n" + (verdict || "Gagal menilai nih")));
        return { handled: true };
      } else {
        debate.round++;
        debate.currentTurn = debate.pro;
        saveDebate(db, gid, debate);
        await m.reply(claraWrap("AI Debate", [
          "Ronde " + debate.round + "/" + debate.rounds,
          "Giliran PRO: @" + debate.pro.split("@")[0],
          "Ketik " + prefix + "debate arg <teks>",
        ].join("\n")), { mentions: [debate.pro] });
        return { handled: true };
      }
    } else {
      debate.currentTurn = m.sender === debate.pro ? debate.con : debate.pro;
      saveDebate(db, gid, debate);
      const nextSide = m.sender === debate.pro ? "KONTRA" : "PRO";
      const nextJid = m.sender === debate.pro ? debate.con : debate.pro;
      await m.reply(claraWrap("AI Debate", "Argumen " + side.toUpperCase() + " tersimpan!\nGiliran " + nextSide + ": @" + nextJid.split("@")[0]), { mentions: [nextJid] });
      return { handled: true };
    }
  }

  // ==================== STOP
  if (sub === "stop" || sub === "batal") {
    if (!m.isOwner && !m.isAdmin) {
      await m.reply(claraWrap("AI Debate", "Khusus admin/owner."));
      return { handled: true };
    }
    delDebate(db, gid);
    await m.reply(claraWrap("AI Debate", "Debat dibatalkan."));
    return { handled: true };
  }

  // ==================== HELP
  await m.reply(claraWrap("AI Debate", [
    "AI DEBATE MODE",
    "",
    "Cara pakai:",
    prefix + "debate start <topik>",
    prefix + "debate pro - join tim PRO",
    prefix + "debate con - join tim KONTRA",
    prefix + "debate begin - mulai debat",
    prefix + "debate arg <teks> - kirim argumen",
    prefix + "debate stop (admin)",
    "",
    "AI Judge menilai logika + bukti. " + ROUNDS + " ronde.",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
