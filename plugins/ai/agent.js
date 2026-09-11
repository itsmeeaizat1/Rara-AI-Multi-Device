// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// agent — AI AGENT OTONOM MULTI-LANGKAH (request owner 11 Sep 2026 "buatkan no 1"):
// plan (AI pecah tugas jadi query) → search (web multi-engine) → pick (AI milih
// halaman relevan) → read (ekstrak isi halaman) → compose (AI susun jawaban dari
// bukti + sumber). Progress live edit-in-place per fase.
import { claraWrap, novaGuide } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { runAgent } from "../../src/lib/nova-agent.js";
import { smallcapsText } from "../../src/lib/styler.js";

const pluginConfig = {
  name: "agent",
  alias: ["agent", "aiagent", "agensi", "agentai", "agenta"],
  category: "ai",
  description: "AI Agent otonom — mikir sendiri: nyari web, baca halaman, susun jawaban + sumber",
  usage: ".agent <tugas>",
  example: ".agent cari hp terbaik di bawah 5 juta, bandingkan dan kasih rekomendasi",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 20, energi: 3, isEnabled: true,
};

const PHASE_LABEL = {
  plan: "🧠 " + smallcapsText("merencanakan langkah riset"),
  search: "🔍 " + smallcapsText("menyusuri web"),
  pick: "🎯 " + smallcapsText("memilih halaman terbaik"),
  read: "📖 " + smallcapsText("membaca halaman"),
  compose: "✍️ " + smallcapsText("menyusun jawaban"),
};

async function handler(m, { sock }) {
  const task = (m.args || []).join(" ").trim();
  if (!task) {
    return m.reply(novaGuide(
      "agent",
      "AI agent otonom — dia sendiri yang nyari ke web, baca halamannya, terus nyusun jawaban lengkap + sumber.",
      `${m.prefix}agent <tugas apa pun>\n${m.prefix}agent resep masakan rendah kalori yang gampang\n${m.prefix}agent bandingkan iPhone 15 vs Samsung S24 untuk gaming`,
      [`${smallcapsText("alur kerja")} 🧠→🔍→📖→✍️ ${smallcapsText("butuh 1-3 menit, sabar ya")}`],
    ));
  }

  let statusKey = null;
  const setStatus = async (text) => {
    try {
      if (!statusKey) {
        const sent = await sock.sendMessage(m.chat, { text });
        statusKey = sent?.key || null;
        return;
      }
      await sock.sendMessage(m.chat, { text, edit: statusKey });
    } catch {
      try { await m.reply(text); } catch {}
    }
  };

  try {
    await m.react("🕒");
    await setStatus("🧠 " + smallcapsText("agent berpikir..."));

    let step = 0;
    const TOTAL = 5; // plan, search, pick, read, compose
    const res = await runAgent(task, {
      onPhase: (phase, info) => {
        step++;
        const label = PHASE_LABEL[phase] || phase;
        const extra = info ? `\n\n${smallcapsText("fokus")}: ${info}` : "";
        const bar = "🟩".repeat(Math.min(step - 1, TOTAL)) + "⬜".repeat(Math.max(TOTAL - step + 1, 0));
        setStatus(`${label}${extra}\n\n${bar} ${smallcapsText("langkah")} ${step}/${TOTAL}`);
      },
    });

    if (res?.error) {
      await m.react("❌");
      return m.reply(claraWrap("agent", res.error, "error"));
    }

    // status jadi penanda selesai, jawaban dikirim terpisah biar rapi
    await setStatus("✅ " + smallcapsText("riset selesai — jawaban di bawah"));

    const src = (res.sources || []).map((s, i) => `${i + 1}. [${s.tag}] ${s.domain} — ${s.url}`).join("\n");
    const footer = src ? `\n\n📎 ${smallcapsText("sumber")}\n${src}` : "";
    const note = res.viaLocal ? `\n\n⚙️ ${smallcapsText("mode digest lokal")}` : "";
    await m.reply(res.answer + note + footer);
    await m.react("🐣");
  } catch (e) {
    console.error("agent error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap("agent", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
