// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: AI Plant Identifier
 * Fitur: .tanaman (reply foto tanaman) → AI identifikasi: nama + latin,
 *        cara perawatan (sirah/cahaya/pupuk), racun buat hewan, fakta.
 *        Engine: vision chain (Gemini → SenseNova → describe+LLM).
 */
import { novaWrap, tipText, novaGuide } from "../../src/lib/nova-menu-style.js";
import { visionScan } from "../../src/lib/nova-vision-chain.js";

const pluginConfig = {
  name: "tanaman",
  alias: ["tanaman", "plantid", "identifikasitanaman"],
  category: "ai",
  description: "Identifikasi tanaman dari foto pakai AI + panduan perawatan",
  usage: ".tanaman (reply foto tanaman)",
  example: ".tanaman (reply foto monstera)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

const PLANT_PROMPT = `Analisis foto ini. Kamu adalah ahli botani.
Jawab HANYA dengan JSON valid (tanpa markdown, tanpa penjelasan lain) dengan skema:
{
  "nama": "nama umum tanaman dalam bahasa Indonesia",
  "latin": "nama ilmiah/latin",
  "jenis": "jenis singkat (hias/berbunga/sukulen/pohon/obat dll)",
  "sirah": "frekuensi menyiram yang pas, singkat",
  "cahaya": "kebutuhan cahaya, singkat",
  "pupuk": "pupuk & jadwalnya, singkat",
  "racun": "aman atau beracun buat kucing & anjing + gejala singkat",
  "fakta": "1 fakta menarik tentang tanaman ini",
  "confident": true
}
Jika foto BUKAN tanaman/tumbuhan/bunga/daun sama sekali, jawab HANYA: {"error":"BUKAN_TANAMAN"}
Jika foto tanaman tapi kamu gak yakin jenisnya, isi "nama" dengan perkiraan terdekat dan set "confident": false.`;

function parsePlantJson(text) {
  const raw = String(text || "").trim();
  // buang markdown fence kalau AI kebablasan
  const body = raw.replace(/```json|```/g, "").trim();
  const m = body.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[0]);
    if (obj?.error === "BUKAN_TANAMAN") return { error: "BUKAN_TANAMAN" };
    if (!obj?.nama) return null;
    return {
      nama: String(obj.nama || ""),
      latin: String(obj.latin || ""),
      jenis: String(obj.jenis || ""),
      sirah: String(obj.sirah || ""),
      cahaya: String(obj.cahaya || ""),
      pupuk: String(obj.pupuk || ""),
      racun: String(obj.racun || ""),
      fakta: String(obj.fakta || ""),
      confident: obj.confident !== false,
    };
  } catch {
    return null;
  }
}

function buildPlantCard(p) {
  const lines = [
    "🌱 *Identifikasi Tanaman*",
    "",
    `🌿 Nama: *${p.nama}*`,
  ];
  if (p.latin) lines.push(`🔬 Latin: _${p.latin}_`);
  if (p.jenis) lines.push(`📌 Jenis: ${p.jenis}`);
  lines.push("");
  lines.push("〔 🧑‍🌾 Perawatan 〕");
  if (p.sirah) lines.push(`💧 Siram: ${p.sirah}`);
  if (p.cahaya) lines.push(`☀️ Cahaya: ${p.cahaya}`);
  if (p.pupuk) lines.push(`🪴 Pupuk: ${p.pupuk}`);
  lines.push("");
  if (p.racun) lines.push(`⚠️ Hewan: ${p.racun}`);
  if (p.fakta) lines.push(`✨ Fakta: ${p.fakta}`);
  if (!p.confident) lines.push("", "_perkiraan AI — bukan identifikasi 100%_");
  return novaWrap("Tanaman", lines.join("\n"));
}

// seam e2e
let _visionFn = visionScan;
export function _setTanamanVisionForTest(fn) { _visionFn = fn || visionScan; }
export function _resetTanamanVisionForTest() { _visionFn = visionScan; }

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig?.command?.prefix || m.prefix || ".";
  const isPhoto = (m.quoted && m.quoted.isImage) || m.isImage;

  if (!isPhoto) {
    return m.reply(
      novaGuide(
        "tanaman",
        `Identifikasi tanaman pakai AI — reply/kirim foto tanaman, daun, atau bunga, terus ketik ${prefix}tanaman`,
        `${prefix}tanaman (reply foto monstera)`,
        "Hasilnya: nama + nama latin, cara perawatan (sirah/cahaya/pupuk), aman/gak buat kucing & anjing, plus fakta menarik"
      )
    );
  }

  await m.react("🧠");
  try {
    const buffer = m.quoted?.isImage ? await m.quoted.download() : await m.download();
    if (!buffer || buffer.length < 1000) throw new Error("foto gak kebaca");

    await m.react("🛠️");
    const vis = await _visionFn({ imageBuffer: buffer, question: PLANT_PROMPT, instruction: "Kamu ahli botani. Jawab HANYA JSON valid sesuai skema yang diminta." });
    if (!vis?.status || !vis?.text) throw new Error("AI vision gak jawab");

    const parsed = parsePlantJson(vis.text);
    if (!parsed) throw new Error("AI jawab gak kebaca");
    if (parsed.error === "BUKAN_TANAMAN") {
      await m.react("❌");
      return m.reply(novaWrap("Tanaman", "Hmm, itu kayaknya bukan tanaman ya 🌱\n\nKirim foto tanaman, daun, atau bunga — terus ketik lagi."));
    }

    await m.reply(buildPlantCard(parsed));
    await m.react("🐣");
  } catch (e) {
    console.error("[tanaman]", e.message || e);
    await m.react("❌");
    await m.reply(novaWrap("Tanaman", [
      "❌ Gagal identifikasi tanaman.",
      "",
      "AI lagi sibuk atau fotonya kurang jelas — coba foto yang lebih dekat & terang ya.",
    ].join("\n")));
  }
}

export { pluginConfig as config, handler };
