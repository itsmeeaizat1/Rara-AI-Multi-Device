// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ai9.js — NOVA ROUTER (rancangan 9router): chat AI multi-provider
// dengan key pooling, circuit breaker, health tracking & routing transparan.
// Modul: src/lib/nova-ai-router.js — provider registry: ai-chain.js (apikeys.json)
import te from "../../src/lib/nova-error.js";
import { novaBox } from "../../src/lib/nova-menu-style.js";
import { routerChat, getRouterStatus, resetProviderHealth } from "../../src/lib/nova-ai-router.js";
import { getSession, appendTurn, toMessages } from "../../src/lib/nova-ai-session.js";

const pluginConfig = {
  name: "ai9",
  alias: ["ai9", "router9", "novarouter"],
  category: "ai",
  description: "Nova Router — AI multi-provider rancangan 9router (pooling + circuit breaker)",
  usage: ".ai9 <pesan> | .ai9 provider <nama> <pesan> | .ai9 status | .ai9 list | .ai9 reset <nama>",
  example: ".ai9 jelaskan kuantum singkat\n.ai9 provider ikyy_gemma bikin pantun\n.ai9 status",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const SUB = ["status", "list", "provider", "reset"];

async function handler(m, { sock, args }) {
  const argList = (args || []).map(String);
  const sub = argList[0]?.toLowerCase();

  // ── .ai9 status / .ai9 list — dashboard health (box standar) ──
  if (sub === "status" || sub === "list") {
    const st = getRouterStatus();
    const lines = [
      `Total permintaan hari ini: ${st.day.totalReq || 0}`,
      "---",
    ];
    for (const p of st.providers) {
      const icon = p.status === "ok" ? "✅" : p.status === "cooldown" ? "⏸" : p.status === "fail" ? "❌" : "•";
      const keyTag = p.free ? "free" : p.hasKey ? (p.pool > 1 ? `key x${p.pool}` : "key") : "no-key";
      const lat = p.latency ? `${p.latency}ms` : "-";
      const cd = p.cooldownLeft ? ` • cooldown ${p.cooldownLeft}mnt` : "";
      lines.push(`${icon} ${p.name} — ${keyTag} • ${lat} • ${p.reqToday}x hari ini${cd}`);
    }
    lines.push("---", `Isi key/pool: src/lib/apikey/apikeys.json (aiMultiprovider)`);
    return m.reply(novaBox("AI Router — Status", lines));
  }

  // ── .ai9 reset <nama> — bersihin health 1 provider ──
  if (sub === "reset") {
    const name = argList[1];
    if (!name) return m.reply(novaBox("AI Router", ["Sebut nama provider yang mau di-reset.", "Contoh: .ai9 reset groq", "Daftar nama: .ai9 list"]));
    resetProviderHealth(name);
    return m.reply(novaBox("AI Router", [`Health "${name}" di-reset — fails & cooldown dibersihin.`]));
  }

  // ── .ai9 provider <nama> <pesan> — paksa 1 provider ──
  let forced = null;
  let text = argList.join(" ");
  if (sub === "provider") {
    forced = argList[1]?.toLowerCase();
    text = argList.slice(2).join(" ");
    if (!forced || !text) {
      return m.reply(novaBox("AI Router", [
        "Format: .ai9 provider <nama> <pesan>",
        "Contoh: .ai9 provider ikyy_gemma bikin pantun",
        "Daftar nama: .ai9 list",
      ]));
    }
  }

  // quoted context — AI paham pesan yang di-reply
  const quotedText = m.quoted?.text?.trim() || "";
  const userMsg = quotedText
    ? `${text}\n\n[User membalas pesan ini — jadikan konteks]: ${quotedText.slice(0, 500)}`
    : text;

  if (!userMsg?.trim()) {
    return m.reply(novaBox("AI Router", [
      "Ketik pesannya setelah .ai9",
      "---",
      "Contoh    : .ai9 jelaskan kuantum",
      "Paksa     : .ai9 provider ikyy_gemma pantun",
      "Dashboard : .ai9 status",
    ]));
  }

  try {
    await m.react("🕒");

    // session keluarga satuan:<sender> — nyambung dengan AI satuan lain
    const sKey = "satuan:" + m.sender;
    const history = toMessages(sKey);

    const r = await routerChat({
      user: userMsg,
      history,
      forcedProvider: forced,
    });

    appendTurn(sKey, userMsg, r.text);

    await m.react("🐣");
    const replyText = r.text.length > 3500 ? r.text.slice(0, 3500) + "..." : r.text;
    // footer transparansi routing — ciri khas 9router
    await m.reply(`${replyText}\n\n— via ${r.provider} • ${r.latencyMs}ms`);
  } catch (e) {
    console.error("[ai9]:", e.message);
    await m.react("❌");
    return m.reply(novaBox("AI Router", [
      "Semua provider di rantai gagal 😔",
      `Info: ${String(e.message).slice(0, 160)}`,
      "---",
      "Cek dashboard: .ai9 status",
    ]));
  }
}

export { pluginConfig as config, handler };
