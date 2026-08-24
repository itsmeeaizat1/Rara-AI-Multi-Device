// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { claraWrap, tipText } from "../../src/lib/nova-menu-style.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, "..", "..", "data", "tod-db.json");

// ─── Database ───
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    }
  } catch (e) { console.error('[tod.js]:', e.message); }
  return { groups: {} };
}

function saveDB(db) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (e) {
    console.log("[TOD] Failed to save DB:", e.message);
  }
}

function isTodOn(groupId) {
  const db = loadDB();
  return db.groups[groupId]?.enabled === true; // default OFF
}

function toggleOn(groupId) {
  const db = loadDB();
  if (!db.groups[groupId]) db.groups[groupId] = {};
  db.groups[groupId].enabled = true;
  saveDB(db);
}

function toggleOff(groupId) {
  const db = loadDB();
  if (!db.groups[groupId]) db.groups[groupId] = {};
  db.groups[groupId].enabled = false;
  saveDB(db);
}

function getStats(groupId) {
  const db = loadDB();
  const g = db.groups[groupId];
  if (!g) return { rounds: 0, truths: 0, dares: 0 };
  return {
    rounds: g.rounds || 0,
    truths: g.truths || 0,
    dares: g.dares || 0,
  };
}

function incrementStat(groupId, type) {
  const db = loadDB();
  if (!db.groups[groupId]) db.groups[groupId] = {};
  const g = db.groups[groupId];
  g.rounds = (g.rounds || 0) + 1;
  if (type === "truth") g.truths = (g.truths || 0) + 1;
  if (type === "dare") g.dares = (g.dares || 0) + 1;
  saveDB(db);
}

// ─── Owner check ───
function checkOwner(botConfig, m) {
  const ownerJid = botConfig?.owner?.[0] || botConfig?.ownerNumber || "";
  const sender = m.sender || m.key?.participant || "";
  if (!ownerJid) return false;
  const cleanOwner = ownerJid.replace(/[^0-9]/g, "");
  const cleanSender = sender.replace(/[^0-9]/g, "");
  return cleanOwner === cleanSender;
}

// ─── Get group members ───
async function getGroupMembers(sock, groupId) {
  try {
    const metadata = await sock.groupMetadata(groupId);
    return metadata.participants.filter(p => !p.admin && !p.superAdmin).map(p => p.id);
  } catch (e) {
    try {
      const metadata = await sock.groupMetadata(groupId);
      return metadata.participants.map(p => p.id);
    } catch (e2) {
      return [];
    }
  }
}

// ─── Truth Questions ───
const TRUTHS = [
  "Siapa member paling aneh di grup ini? Jelaskan kenapa.",
  "Apa rahasia yang belum pernah kamu ceritakan ke siapapun?",
  "Siapa orang yang paling sering kamu stalk di WhatsApp?",
  "Apa hal paling memalukan yang pernah kamu lakukan di depan umum?",
  "Kalau bisa hapus satu chat di grup ini, chat siapa yang mau kamu hapus?",
  "Siapa member yang paling sering kamu ignore pesannya?",
  "Apa ketakutan terbesar yang kamu sembunyikan dari orang lain?",
  "Pernah bohong ke teman dekatmu? Tentang apa?",
  "Siapa orang yang diam-diam kamu sukai di grup ini?",
  "Apa hal paling childish yang masih kamu lakukan sampai sekarang?",
  "Kalau grup ini dihapus besok, siapa yang paling kamu rindu?",
  "Apa kebiasaan burukmu yang belum ada yang tahu?",
  "Pernah nyesel jadi teman seseorang di grup ini? Siapa?",
  "Hal paling cringe yang pernah kamu kirim di grup ini?",
  "Siapa member yang paling sering kamu batin 'gila sih ini orang'?",
  "Apa promise yang pernah kamu buat tapi gak pernah ditepati?",
  "Kalau dijodohkan sama salah satu member di sini, mau sama siapa?",
  "Apa hal paling bodoh yang pernah kamu lakukan demi cinta?",
  "Pernah pura-pura sakit buat gak masuk sekolah/kerja? Alasannya apa?",
  "Siapa member yang menurutmu paling drama? Kenapa?",
  "Apa hal paling tabu yang kamu penasaran tapi belum berani tanya?",
  "Kalau bisa jadi member lain selama 1 hari, mau jadi siapa? Kenapa?",
  "Apa hal yang paling bikin kamu insecure sampai sekarang?",
  "Pernah kopdar sama seseorang ternyata kecewa? Cerita dong.",
  "Siapa member yang paling sering kamu batin 'gabisa diajak serius'?",
  "Apa rahasia keluarga yang paling bikin kamu malu kalau ketahuan?",
  "Kalau besok dunia kiamat, siapa yang mau kamu telepon pertama?",
  "Apa kebohongan terbesar yang pernah kamu katakan ke orang tua?",
  "Siapa member yang menurutmu paling 'seperti' punya akun finsta?",
  "Apa hal paling toxic yang pernah kamu lakukan ke seseorang?",
  "Pernah suka sama teman gebetanmu? Cerita dong.",
  "Apa hal yang bikin kamu nangis diam-diam tapi gak pernah kamu cerita?",
  "Kalau bisa undo 1 hal di hidupmu, apa yang mau kamu undo?",
  "Siapa member yang menurutmu paling kuat hafal semua gosip di grup?",
  "Apa pendapatmu tentang salah satu member yang belum pernah kamu sampaikan?",
  "Pernah sakit hati sama orang di grup ini? Siapa dan kenapa?",
  "Apa hal paling norak yang pernah kamu lakuin pas lagi demam?",
  "Siapa member yang menurutmu paling sering fake news?",
  "Apa hal paling gila yang pernah kamu lakuin pas lagi mabuk?",
  "Kalau dipaksa jujur, siapa member yang paling kamu hindari? Kenapa?",
  "Pernah chat seseorang di grup ini tengah malam dan nyesel? Apa isinya?",
  "Apa hal paling jujur yang mau kamu sampaikan ke member yang tag kamu?",
  "Siapa member yang kalau dijadiin best friend paling seru? Kenapa?",
  "Apa hal yang bikin kamu kehilangan respek sama seseorang di grup ini?",
  "Pernah ketahuan ngomongin seseorang di grup ini? Cerita dong.",
  "Apa fantasy yang paling kamu sembunyikan dari semua orang?",
  "Siapa member yang menurutmu paling banyak menyimpan rahasia gelap?",
  "Apa hal paling desperate yang pernah kamu lakukan buat perhatian seseorang?",
  "Kalau bisa bilang 1 kalimat ke ex kamu sekarang, apa yang mau kamu bilang?",
  "Apa hal paling embarrassing yang pernah kamu lakukan pas lagi sendirian?",
  "Siapa member yang kalau dia pindah grup, kamu bakal paling kangen? Kenapa?",
  "Pernah kamu tertidur pas lagi chat sama seseorang? Sama siapa?",
  "Apa hal paling radikal yang pernah kepikiran buat lakuin tapi belum berani?",
  "Siapa member yang menurutmu paling 'beda' dari yang dia tunjukkan?",
  "Apa rahasia yang kalau ketahuan, bikin kamu gak bakal bisa show up di grup lagi?",
  "Pernah kamu iri sama salah satu member? Sama siapa dan kenapa?",
  "Apa hal paling jujur tentang dirimu yang belum ada yang tahu di grup ini?",
  "Siapa member yang kalau kamu pilih jadi partner crime, kamu pilih siapa?",
  "Apa kebiasaan kamu waktu sendirian yang gak bakal kamu lakuin di depan orang?",
  "Pernah kamu hampir putus pertemanan sama seseorang di grup ini? Cerita.",
  "Apa hal paling 'anjir' yang pernah kamu pikirin tentang seseorang di grup ini?",
];

// ─── Dare Challenges ───
const DARES = [
  "Kirim voice note nyanyi lagu yang lagi viral sekarang, minimal 10 detik.",
  "Ganti nama profil kamu jadi 'Si Ganteng/ Cantik Grup' selama 1 jam.",
  "Kirim sticker meme paling random yang kamu punya sekarang.",
  "Chat member terakhir yang kamu chat, bilang 'aku kangen kamu' tanpa konteks.",
  "Rekaman voice note pakai suara bayi bilang 'mama aku lapar'.",
  "Kirim foto view-once dengan caption 'ini buat seseorang di grup'.",
  "Tag member paling pendiem di grup, bilang 'kamu tuh penting buat grup ini'.",
  "Kirim pesan 'aku suka kamu' ke member yang nomornya urutan ke-3 di kontakmu.",
  "Ganti bio WhatsApp jadi 'lagi galau, jangan ganggu' selama 30 menit.",
  "Kirim voice note baca puisi buatan sendiri, minimal 4 baris.",
  "Story WhatsApp 'aku lagi gabut, chat aku' dan screenshot buktinya ke grup.",
  "Tag 3 member acak dan bilang masing-masing satu compliment jujur.",
  "Kirim pesan ke grup: 'aku akui, aku pernah lurus ke salah satu member di sini'.",
  "Rekaman VN ketawa pakai tawa paling jahat selama 15 detik.",
  "Kirim foto selfie sekarang juga tanpa filter, langsung ke grup.",
  "Chat teman terbaikmu 'aku mau cerita, tapi jangan bilang siapa2' lalu diam aja 1 jam.",
  "Kirim sticker yang paling malu kamu punya ke grup.",
  "Ganti nama profil joki nama member paling aktif di grup selama 1 jam.",
  "Kirim VN aksen daerah kamu bilang 'aku tuh paling cakep di grup ini'.",
  "Tag member yang jarang online, bilang 'muncul dong, kamu dirindukan'.",
  "Kirim 5 emoji berurutan yang menggambarkan perasaanmu sekarang, terus jelaskan.",
  "Kirim voice note buat ngomong 'aku akui aku suka diperhatikan' dengan nada dramatis.",
  "Sebutkan 3 kelebihan member yang ada di urutan chat terakhir grup.",
  "Kirim pesan 'maaf aku pernah ngegossip kalian' tanpa sebut nama.",
  "Ganti foto profil jadi foto meme selama 1 jam.",
  "Kirim VN nyanyi lagu anak-anak paling cringe yang kamu tahu.",
  "Tag member paling sering online, bilang 'kamu tuh paling setia di grup'.",
  "Kirim foto makanan/ minuman terdekat dari kamu sekarang.",
  "Kirim pesan ke grup: 'kalau aku jual, harga kalian berapa?' (tag 3 member).",
  "Rekaman VN ketawa dan terus bilang 'gila sih aku' pakai nada paling absurd.",
  "Kirim sticker love ke 3 member paling pendiam di grup.",
  "Ganti bio jadi 'aku tuh paling cute di grup' selama 1 jam.",
  "Kirim pesan 'siapa yang mau jadi pacarku?' ke grup dan biarkan 5 menit.",
  "Tag 2 member acak dan bilang 'kalian berdua paling cocok jadi couple'.",
  "Kirim VN dengan suara paling serak bilang 'aku tuh bukan aku kalau bukan aku'.",
  "Sebut 3 kebiasaan unik member yang paling sering kamu perhatiin.",
  "Kirim 3 foto screenshot chat terakhir kamu (sensor nama) ke grup.",
  "Tag member yang paling sering kamu lihat story-nya, bilang 'aku fans kamu'.",
  "Kirim VN aksen bule bilang 'hello everybody, I am very handsome/beautiful'.",
  "Ganti nama jadi emoji ✊ selama 30 menit. Jangan diganti sampai waktu habis.",
  "Kirim sticker sedih dan bilang 'ini gue banget siang ini'.",
  "Tag member yang menurutmu paling kuat rahasia, bilang 'aku trust kamu'.",
  "Kirim foto langit/ tembok/ lantai terdekat dengan caption 'inilah hidupku'.",
  "Kirim VN dengan nada paling pelan bilang 'aku mau tidur, ditemenin ya'.",
  "Tag 3 member paling baik di grup, sebut masing-masing satu alasan.",
  "Kirim 1 foto profile WhatsApp kamu yang paling lama gak diganti.",
  "Ganti bio jadi 'available buat ditemenin 24 jam' selama 2 jam.",
  "Kirim pesan 'siapa yang mau ikut aku kopdar besok?' dan tunggu respon.",
  "Tag member yang paling sering reply chat kamu, bilang 'makasih udah selalu ada'.",
  "Kirim VN nyanyi chorus lagu yang kamu pakai buat healing.",
];

// ─── Confessions (bonus mode) ───
const CONFESSIONS = [
  "Confess: Hal paling malu yang pernah kamu lakuin pas SMA/Junior.",
  "Confess: Seseorang di grup ini yang pernah kamu batin 'garang banget'.",
  "Confess: Hal paling toxic yang pernah kamu lakuin ke temen.",
  "Confess: Rahasia yang kalau kamu ceritain, bakal bikin heboh grup ini.",
  "Confess: Seseorang yang kamu batin 'kok bisa ya aku temen sama dia'.",
  "Confess: Hal paling desperate yang pernah kamu lakuin buat gebetan.",
  "Confess: Kebohongan yang paling sering kamu pakai sampe sekarang.",
  "Confess: Seseorang di grup ini yang kamu batin 'anaknya lumayan'.",
  "Confess: Hal yang paling sering kamu lakuin pas lagi mules.",
  "Confess: Rahasia yang kamu simpen dan kalau kebuka, kamu bakal malu banget.",
  "Confess: Hal paling cringe yang pernah kamu pikirin pas lagi gabut.",
  "Confess: Seseorang yang pernah kamu ghost tanpa alasan jelas.",
  "Confess: Hal paling 'anjir' yang pernah kamu lihat di grup ini.",
  "Confess: Kebohongan yang pernah kamu bikin cuma buat ngindarin seseorang.",
  "Confess: Seseorang di grup ini yang kalau dijadiin saudara, kamu mau.",
  "Confess: Hal paling munafik yang pernah kamu lakuin.",
  "Confess: Seseorang yang pernah kamu anggap sahabat ternyata ngecewain.",
  "Confess: Hal yang paling kamu khawatirin kalau ketahuan member grup ini.",
  "Confess: Seseorang di grup ini yang kamu pengen minta maaf tapi belum berani.",
  "Confess: Hal paling gila yang pernah kepikiran buat kamu lakuin besok.",
];

// ─── Random helpers ───
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomExclude(arr, exclude) {
  const filtered = arr.filter(item => item !== exclude);
  if (filtered.length === 0) return arr.length > 0 ? arr[0] : null;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// ─── Format display name ───
function displayName(jid) {
  const num = jid.split("@")[0];
  return `@${num}`;
}

// ─── Plugin ───
export default {
  name: "tod",
  alias: ["confession"],
  category: "group",
  desc: "Truth or Dare & Confession - Mini game interaktif untuk groups. Bot kasih pertanyaan jujur (Truth), tantangan seru (Dare), atau confession random.",
  usage: ".tod - Random truth/dare\n.tod truth - Pertanyaan jujur\n.tod dare - Tantangan seru\n.tod confess - Confession random\n.tod target - Tunjuk member random\n.todon / .todoff - Toggle (owner)\n.todstats - Statistik grup",
  example: ".tod\n.tod truth\n.tod dare\n.tod confess\n.tod target",
  wait: "🕐",
  error: "❌",

  async handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
    const groupId = m.key?.remoteJid || m.chat || "";
    const raw = m.text?.trim() || "";
    const sender = m.sender || m.key?.participant || "";
    const senderName = m.pushName || sender.split("@")[0];
    const isOwner = checkOwner(botConfig, m);

    // ─── Toggle commands ───
    if (new RegExp(`^${prefix}todon\\b`, "i").test(raw)) {
      if (!isOwner) {
        await m.reply(claraWrap("Truth or Dare", [
          `┊ Status: *Akses Ditolak*`,
          ``,
          `┊ Hanya owner yang bisa mengatur fitur ini.`,
        ].join("\n")));
        return { handled: true };
      }
      toggleOn(groupId);
      await m.reply(claraWrap("Truth or Dare", [
        `┊ Status: *AKTIF* 🟢`,
        ``,
        `┊ Truth or Dare dinyalakan di grup ini.`,
        `┊ Ketik *${prefix}tod* untuk mulai main!`,
      ].join("\n")));
      await m.react("✅");
      return { handled: true };
    }

    if (new RegExp(`^${prefix}todoff\\b`, "i").test(raw)) {
      if (!isOwner) {
        await m.reply(claraWrap("Truth or Dare", [
          `┊ Status: *Akses Ditolak*`,
        ].join("\n")));
        return { handled: true };
      }
      toggleOff(groupId);
      await m.reply(claraWrap("Truth or Dare", [
        `┊ Status: *NONAKTIF* 🔴`,
        ``,
        `┊ Truth or Dare dimatikan.`,
        `┊ Ketik *${prefix}todon* untuk aktifkan lagi.`,
      ].join("\n")));
      await m.react("✅");
      return { handled: true };
    }

    // ─── Stats ───
    if (new RegExp(`^${prefix}todstats\\b`, "i").test(raw)) {
      const stats = getStats(groupId);
      const lines = [
        `┊ Statistik Truth or Dare Grup`,
        ``,
        `┊ Total ronde: *${stats.rounds}*`,
        `┊ Truth diberikan: *${stats.truths}*`,
        `┊ Dare diberikan: *${stats.dares}*`,
        ``,
        `┊ Status: ${isTodOn(groupId) ? "*AKTIF* 🟢" : "*NONAKTIF* 🔴"}`,
      ];
      await m.reply(claraWrap("Tod - Statistik", lines.join("\n")));
      await m.react("✅");
      return { handled: true };
    }

    // ─── Check if enabled ───
    if (!isTodOn(groupId)) {
      await m.reply(claraWrap("Truth or Dare", [
        `┊ Status: *Nonaktif di grup ini*`,
        ``,
        `┊ Owner: ketik *${prefix}todon* untuk mengaktifkan.`,
      ].join("\n")));
      return { handled: true };
    }

    // ─── Group only check ───
    if (!groupId.endsWith("@g.us")) {
      await m.reply(claraWrap("Truth or Dare", [
        `┊ Fitur ini khusus untuk grup.`,
        `┊ Ajak teman kamu main di grup!`,
      ].join("\n")));
      return { handled: true };
    }

    await m.react("🕒");

    // ─── Parse sub-command ───
    const subMatch = raw.toLowerCase().match(
      new RegExp(`^${prefix}tod\\s+(truth|dare|confess|confession|target|help|bantu)\\b`, "i")
    );

    // Also handle .truth and .dare directly
    const directCmd = raw.toLowerCase().match(
      new RegExp(`^${prefix}(truth|dare|confess|confession)\\b`, "i")
    );

    const subCmd = subMatch ? subMatch[1] : directCmd ? directCmd[1] : null;

    // ─── Help ───
    if (subCmd === "help" || subCmd === "bantu") {
      await m.reply(claraWrap("Tod - Bantuan", [
        `┊ Cara Pakai Truth or Dare:`,
        ``,
        `┊ 1. *${prefix}tod* - Random truth atau dare`,
        `┊ 2. *${prefix}tod truth* - Paksa dapat pertanyaan jujur`,
        `┊ 3. *${prefix}tod dare* - Paksa dapat tantangan seru`,
        `┊ 4. *${prefix}tod confess* - Confession random`,
        `┊ 5. *${prefix}tod target* - Bot tunjuk member random`,
        ``,
        `┊ Owner:`,
        `┊    *${prefix}todon* / *${prefix}todoff* - Toggle`,
        `┊    *${prefix}todstats* - Statistik grup`,
        ``,
        `┊ 📌 Mainnya jujur ya, jangan skip!`,
        `┊ 📌 Kalau dapat dare, lakuin ya, gak boleh kabur!`,
      ].join("\n")));
      await m.react("✅");
      return { handled: true };
    }

    // ─── Get group members for target mode ───
    let members = [];
    if (subCmd === "target" || (!subCmd && Math.random() < 0.35)) {
      members = await getGroupMembers(sock, groupId);
      members = members.filter(id => id !== sender && !id.includes(sock.user?.id?.split("@")[0] || "BOT"));
    }

    // ─── Target mode: point at random member ───
    if (subCmd === "target") {
      if (members.length === 0) {
        await m.reply(claraWrap("Truth or Dare", [
          `┊ Tidak ada member lain yang bisa ditunjuk.`,
          `┊ Coba lagi nanti ya!`,
        ].join("\n")));
        await m.react("✅");
        return { handled: true };
      }

      const target = randomItem(members);
      const types = ["truth", "dare"];
      const chosen = randomItem(types);
      const prompt = chosen === "truth" ? randomItem(TRUTHS) : randomItem(DARES);
      const label = chosen === "truth" ? "Truth" : "Dare";
      const emoji = chosen === "truth" ? "🤔" : "🎯";

      incrementStat(groupId, chosen);

      const lines = [
        `┊ ${emoji} ${label.toUpperCase()} - Target Acak!`,
        ``,
        `┊ Ditunjuk: ${displayName(target)}`,
        `┊ Tantangan untuk: ${displayName(sender)}`,
        ``,
        `┊ Pertanyaan/Tantangan:`,
        `┊ *${prompt}*`,
        ``,
        `┊ ${chosen === "truth" ? "Jujur ya, jangan diplomasi!" : "Lakuin ya, jangan kabur!"}`,
      ];

      const text = claraWrap("Tod - Target", lines.join("\n")) +
        "\n" +
        tipText(`Kalau skip, wajib kasih 1 dare ke ${displayName(target)}`);

      try {
        await sock.sendMessage(groupId, {
          text,
          mentions: [target, sender],
        });
      } catch (e) {
        await m.reply(text);
      }
      await m.react("✅");
      return { handled: true };
    }

    // ─── Determine type ───
    let type;
    if (subCmd === "truth" || subCmd === "dare") {
      type = subCmd;
    } else if (subCmd === "confess" || subCmd === "confession") {
      type = "confess";
    } else {
      // Random: 45% truth, 45% dare, 10% confess
      const roll = Math.random();
      if (roll < 0.45) type = "truth";
      else if (roll < 0.90) type = "dare";
      else type = "confess";
    }

    // ─── Generate prompt ───
    let prompt, label, emoji, instruction;

    if (type === "truth") {
      prompt = randomItem(TRUTHS);
      label = "TRUTH";
      emoji = "🤔";
      instruction = "Jawab jujur ya, jangan diplomasi!";
      incrementStat(groupId, "truth");
    } else if (type === "dare") {
      prompt = randomItem(DARES);
      label = "DARE";
      emoji = "🎯";
      instruction = "Lakuin tantangannya, jangan kabur!";
      incrementStat(groupId, "dare");
    } else {
      prompt = randomItem(CONFESSIONS);
      label = "CONFESSION";
      emoji = "🤐";
      instruction = "Spill ya, ini safe space!";
    }

    // ─── 30% chance to target another member ───
    let targetMember = null;
    if (members.length > 0 && type !== "confess" && Math.random() < 0.30) {
      targetMember = randomItem(members);
    }

    const lines = [
      `┊ ${emoji} ${label}`,
      ``,
      `┊ Untuk: ${displayName(sender)}`,
    ];

    if (targetMember) {
      lines.push(`┊ Tapi tunjuk: ${displayName(targetMember)}`);
    }

    lines.push(
      ``,
      `┊ Pertanyaan/Tantangan:`,
      `┊ *${prompt}*`,
      ``,
      `┊ ${instruction}`
    );

    if (targetMember) {
      lines.push(`┊ ${displayName(targetMember)} wajib respon ya!`);
    }

    let text = claraWrap(`Tod - ${label}`, lines.join("\n"));

    if (type === "truth") {
      text += "\n" + tipText("Skip? Wajib kasih 1 truth ke member lain");
    } else if (type === "dare") {
      text += "\n" + tipText("Skip? Wajib kasih 1 dare ke member lain");
    } else {
      text += "\n" + tipText("Confession aman di sini, jangan takut spill");
    }

    if (targetMember) {
      try {
        await sock.sendMessage(groupId, {
          text,
          mentions: [sender, targetMember],
        });
      } catch (e) {
        await m.reply(text);
      }
    } else {
      await m.reply(text);
    }
    await m.react("✅");
    return { handled: true };
  },
};
