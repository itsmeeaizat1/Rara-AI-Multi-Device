// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 .airichdiag — DIAGNOSIS AI RICH (owner 7 Okt 2026: "fitur airich knp
//   g mncul cardnya, g bsa main html didalam chat"). Relay sukses ≠ WA
//   nge-render — server bisa nerima pesan tapi nelen kartunya senyap.
//   Command ini kirim 4 kartu tes KECIL (1 per varian AIRICH_MODE:
//   full/nofwd/noverify/clean), tiap kartu didahului teks penanda.
//   Kartu mana yang muncul di chat → varian itu masih di-render WA.
// 🔹 .airichdiag info — laporan teknis (env mode, verify, ukuran payload,
//   struktur yang dikirim) tanpa kirim apa pun.
// ============================================================
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { buildRichResponse, applyAirichVariant, airichMode } from "../../src/lib/rara-airich.js";

const pluginConfig = {
  name: "airichdiag",
  alias: ["airichdiagnosa", "diagnoseairich"],
  category: "airich",
  description: "Diagnosis kartu AI Rich — tes 4 varian sekaligus + laporan teknis (owner only)",
  usage: ".airichdiag | .airichdiag info",
  example: ".airichdiag\n.airichdiag info",
  isOwner: true, isPremium: false, isGroup: true, isPrivate: true,
  cooldown: 10, energi: 0, isEnabled: true,
};

// payload tes kecil — isinya nama varian biar keliatan jelas pas dibuka
function testPayload(mode) {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #0b1220; color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.card { display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: 100%; height: 100vh; gap: 10px; }
.badge { font-size: 13px; letter-spacing: 2px; color: #7dd3fc; text-transform: uppercase; }
h1 { font-size: 42px; margin: 0; }
p { color: #94a3b8; margin: 0; font-size: 14px; }
.ok { color: #4ade80; font-size: 20px; font-weight: 700; }
</style></head>
<body><div class="card">
<div class="badge">Rara AI Rich — Tes Kartu</div>
<h1>${mode.toUpperCase()}</h1>
<p>Varian ini masih di-render WhatsApp ✅</p>
<div class="ok">BISA DIBUKA = MODE ${mode.toUpperCase()} WORKS</div>
</div></body></html>`;
}

const VARIANTS = ["full", "nofwd", "noverify", "clean"];
const VAR_INFO = {
  full: "struktur lengkap (forward + verify opt env)",
  nofwd: "tanpa label diteruskan",
  noverify: "tanpa verificationMetadata",
  clean: "polos (tanpa forward + tanpa verify)",
};

async function relayVariant(sock, chat, mode) {
  // clone dalam tiap varian — applyAirichVariant mutasi in-place
  const base = buildRichResponse(testPayload(mode), { title: `Tes AI Rich — varian ${mode}` });
  const msg = applyAirichVariant(structuredClone(base), mode);
  try {
    await sock.relayMessage(chat, msg, {});
    return { mode, ok: true, bytes: Buffer.byteLength(JSON.stringify(msg)) };
  } catch (err) {
    return { mode, ok: false, error: String(err?.message || err), bytes: Buffer.byteLength(JSON.stringify(msg)) };
  }
}

async function handler(m, { sock }) {
  const sub = String(m.args?.[0] || m.text || "").trim().toLowerCase();

  // ── info: laporan teknis doang ──
  if (sub === "info") {
    const sample = buildRichResponse(testPayload("info"), { title: "sample" });
    let txt = `🔍 DIAGNOSIS AI RICH — INFO\n\n`;
    txt += `Env AIRICH_MODE: ${process.env.AIRICH_MODE || "(gak diset → full)"}\n`;
    txt += `Aktif sekarang: ${airichMode()}\n`;
    txt += `RARA_AIRICH_VERIFY: ${process.env.RARA_AIRICH_VERIFY === "1" ? "1 (verify nyala)" : "0 (HIROBOT-exact, tanpa verify)"}\n`;
    txt += `Payload tes: ${Buffer.byteLength(testPayload("full"))} B\n`;
    txt += `Pesan utuh (base64 di dalam): ${Buffer.byteLength(JSON.stringify(sample))} B\n\n`;
    txt += `Struktur yang dikirim:\n`;
    txt += `• messageContextInfo.deviceListMetadata (v2)\n`;
    txt += `• messageContextInfo.botMetadata.botResponseId (fresh tiap kirim)\n`;
    txt += `• botForwardedMessage.message.richResponseMessage\n`;
    txt += `  • messageType: 1 (angka)\n`;
    txt += `  • submessages AI_RICH_RESPONSE_TEXT\n`;
    txt += `  • unifiedResponse.data (base64)\n`;
    txt += `  • contextInfo.forwardingScore + botJid 867051314767696@bot\n`;
    txt += `  • trusted_sources: noxXza.js, noxXza.dev\n\n`;
    txt += `Catatan relay: sukses di sini berarti server WA NERIMA pesan —\nnamun render kartu bisa aja dibatasi Meta. Tes varian:\n${(m.prefix || ".")}airichdiag`;
    return m.reply(raraWrap("airichdiag", txt));
  }

  // ── default: kirim 4 kartu tes ──
  const header = [
    "🔍 DIAGNOSIS AI RICH dimulai.",
    "",
    `${VARIANTS.length} kartu tes dikirim ke chat ini (tiap kartu ada teks penanda).`,
    "Kartu yang BISA dibuka = varian itu masih work di WhatsApp.",
    "Kalau semua gak muncul sama sekali → Meta lagi blokir render rich response di akun bot.",
    "",
    `Tip: varian ampuh biasanya ${(m.prefix || ".")}airichdiag → cek pesan berikutnya satu-satu.`,
  ].join("\n");
  await m.reply(raraWrap("airichdiag", header));

  const hasil = [];
  for (let i = 0; i < VARIANTS.length; i++) {
    const mode = VARIANTS[i];
    // teks penanda sebelum tiap kartu
    await m.reply(raraWrap("airichdiag", `🧪 Tes ${i + 1}/${VARIANTS.length} — varian *${mode}* (${VAR_INFO[mode]})\n\nKalau di bawah pesan ini muncul kartu/bubble Unduh yang bisa dibuka → varian *${mode}* WORKS.`));
    const res = await relayVariant(sock, m.chat, mode);
    hasil.push(res);
    await new Promise((r) => setTimeout(r, 1200)); // jeda biar urutan gak kebalik
  }

  let txt = `📋 HASIL RELAY\n\n`;
  for (const h of hasil) {
    txt += `${h.ok ? "✅" : "❌"} ${h.mode} — ${h.ok ? "diterima server (" + h.bytes + " B)" : "DITOLAK: " + h.error}\n`;
  }
  const okCount = hasil.filter((h) => h.ok).length;
  txt += `\n${okCount === 0 ? "Semua relay DITOLAK — cek log bot (koneksi/protocol)." : okCount + "/" + VARIANTS.length + " relay diterima. Sekarang cek MANUAL di chat ini:"}`;
  txt += `\n\n1. Kartu mana yang muncul & bisa dibuka? Balas varian yang works.\n2. Semua muncul? → fitur airich bermasalah di payload spesifik (mis. .plane → cek log fetch payload).\n3. Relay diterima tapi TIDAK ADA yang muncul? → Meta nge-blok render di akun bot — kartu AI Rich gak bisa dipakai sampai Meta buka lagi.`;
  return m.reply(raraWrap("airichdiag", txt));
}

export { pluginConfig as config, handler };
export default { pluginConfig, handler, command: "airichdiag" };
