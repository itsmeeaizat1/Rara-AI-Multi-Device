// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import te from "../../src/lib/nova-error.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

// ============================================================
// Nomor Kosong Plugin v2
// Advanced WhatsApp number checker & generator
// ============================================================

const PROVIDERS = {
  telkomsel: ["0811", "0812", "0813", "0821", "0822", "0823", "0851", "0852", "0853"],
  indosat:   ["0815", "0816", "0855", "0856", "0857", "0858"],
  xl:        ["0817", "0818", "0819"],
  tri:       ["0827", "0828", "0829", "0895", "0896", "0897", "0898", "0899"],
  axis:      ["0831", "0832", "0833", "0838"],
  smartfren: ["0881", "0882", "0883", "0884", "0885", "0886", "0887", "0888", "0889"],
  all: null,
};

const PROVIDER_NAMES = {
  "0811": "Telkomsel", "0812": "Telkomsel", "0813": "Telkomsel",
  "0821": "Telkomsel", "0822": "Telkomsel", "0823": "Telkomsel",
  "0851": "Telkomsel", "0852": "Telkomsel", "0853": "Telkomsel",
  "0815": "Indosat", "0816": "Indosat",
  "0855": "Indosat", "0856": "Indosat", "0857": "Indosat", "0858": "Indosat",
  "0817": "XL", "0818": "XL", "0819": "XL",
  "0827": "Tri", "0828": "Tri", "0829": "Tri",
  "0895": "Tri", "0896": "Tri", "0897": "Tri", "0898": "Tri", "0899": "Tri",
  "0831": "Axis", "0832": "Axis", "0833": "Axis", "0838": "Axis",
  "0881": "Smartfren", "0882": "Smartfren", "0883": "Smartfren",
  "0884": "Smartfren", "0885": "Smartfren", "0886": "Smartfren",
  "0887": "Smartfren", "0888": "Smartfren", "0889": "Smartfren",
};

const SAVE_FILE = path.join(process.cwd(), "src", "data", "nokos_result.json");

const pluginConfig = {
  name: ["nokos", "nomorkosong", "nomorkos"],
  alias: ["nokos", "nomorkosong", "nomorkos"],
  category: "tools",
  description: "Generate & cek nomor kosong WhatsApp (v2 - advanced)",
  usage: ".nokos [jumlah] [provider]\n.nokos prefix <08xx> [jumlah]\n.nokos cek <nomor>\n.nokos wa <nomor>\n.nokos save\n.nokos list\n.nokos clear",
  example: ".nokos 10 telkomsel\n.nokos prefix 0852 5\n.nokos cek 08123456789",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 5,
  isEnabled: true,
};

// === Helpers ===

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function genNumber(prefix) {
  const len = randomInt(6, 8);
  let suffix = "";
  for (let i = 0; i < len; i++) suffix += Math.floor(Math.random() * 10);
  return prefix + suffix;
}

function toJID(number) {
  let c = number.replace(/[^0-9]/g, "");
  if (c.startsWith("0")) c = "62" + c.slice(1);
  else if (c.startsWith("8")) c = "62" + c;
  else if (!c.startsWith("62")) c = "62" + c;
  return c + "@s.whatsapp.net";
}

function toDisplay(number) {
  let c = number.replace(/[^0-9]/g, "");
  if (c.startsWith("62")) c = "0" + c.slice(2);
  else if (!c.startsWith("0")) c = "0" + c;
  if (c.length >= 8) return c.slice(0, 4) + "-" + c.slice(4, 8) + "-" + c.slice(8);
  return c;
}

function providerOf(number) {
  const p = number.replace(/[^0-9]/g, "").slice(0, 4);
  return PROVIDER_NAMES[p] || "Unknown";
}

function loadSaved() {
  try {
    if (fs.existsSync(SAVE_FILE)) return JSON.parse(fs.readFileSync(SAVE_FILE, "utf-8"));
  } catch (e) { console.error('[nokos.js]:', e.message); }
  return { numbers: [], lastUpdate: null };
}

function saveSaved(data) {
  try {
    const dir = path.dirname(SAVE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SAVE_FILE, JSON.stringify(data, null, 2));
  } catch (e) { console.error('[nokos.js]:', e.message); }
}

// === WhatsApp Check ===

async function checkWA(sock, numbers) {
  const results = [];
  const batch = 5;
  for (let i = 0; i < numbers.length; i += batch) {
    const chunk = numbers.slice(i, i + batch);
    const jids = chunk.map(toJID);
    try {
      const res = await sock.onWhatsApp(...jids);
      for (let j = 0; j < chunk.length; j++) {
        const r = Array.isArray(res) ? res.find(x => x.jid === jids[j]) || res[j] : res;
        results.push({
          number: chunk[j],
          jid: r?.jid || jids[j],
          exists: r?.exists === true,
        });
      }
    } catch {
      for (const num of chunk) {
        results.push({ number: num, jid: jids[chunk.indexOf(num)], exists: false });
      }
    }
    if (i + batch < numbers.length) await new Promise(r => setTimeout(r, 300));
  }
  return results;
}

// === Profile Info (for registered numbers) ===

async function getProfile(sock, jid) {
  try {
    const [pic] = await Promise.all([
      sock.profilePictureUrl(jid, "image").catch(() => null),
    ]);
    return { hasPic: !!pic, picUrl: pic };
  } catch {
    return { hasPic: false };
  }
}

// === Handler ===

async function handler(m, { sock }) {
  const args = (m.text || "").trim().split(/\s+/);
  const sub = args[0]?.toLowerCase();
  const arg1 = args[1] || "";
  const arg2 = args[2] || "";

  // --- CEK / WA ---
  if (sub === "cek" || sub === "wa" || sub === "check") {
    const num = arg1.replace(/[^0-9]/g, "");
    if (!num || num.length < 8) {
      return m.reply( claraWrap("Nomor Kosong",
        `Masukkan nomor yang ingin dicek!\n\nContoh:\n.nokos cek 08123456789\n.nokos cek 628123456789`
      ), "nokos");
    }
    try {
      const [res] = await sock.onWhatsApp(toJID(num));
      const disp = toDisplay(num);
      const prov = providerOf(num);
      const registered = res?.exists === true;
      let body = `Hasil Cek Nomor\n\n`;
      body += `Nomor: ${disp}\n`;
      body += `Provider: ${prov}\n`;
      body += `Status: ${registered ? "TERDAFTAR" : "KOSONG"}\n`;
      if (registered) {
        body += `JID: ${res.jid}\n`;
        const prof = await getProfile(sock, res.jid);
        body += `Foto profil: ${prof.hasPic ? "Ada" : "Tidak"}\n`;
        body += `\nNomor ini sudah aktif di WhatsApp.`;
      } else {
        body += `\nNomor ini KOSONG!\nBisa digunakan untuk registrasi WA baru.\n\nCatatan: Kamu harus punya akses ke nomor ini untuk menerima OTP via SMS.`;
      }
      return m.reply( claraWrap("Nomor Kosong", body), "nokos");
    } catch {
      return m.reply(claraWrap("nokos", te(m.prefix, m.command, m.pushName), "error"));
    }
  }

  // --- PREFIX ---
  if (sub === "prefix") {
    const prefix = arg1.replace(/[^0-9]/g, "");
    if (!prefix || prefix.length < 4) {
      return m.reply( claraWrap("Nomor Kosong",
        `Masukkan prefix minimal 4 digit!\n\nContoh:\n.nokos prefix 0852 5\n.nokos prefix 62813 10`
      ), "nokos");
    }
    let count = parseInt(arg2) || 10;
    if (count > 30) count = 30;
    if (count < 1) count = 1;
    try {
      const nums = [];
      for (let i = 0; i < count; i++) nums.push(genNumber(prefix));
      const results = await checkWA(sock, nums);
      const kosong = results.filter(r => !r.exists);
      const terdaftar = results.filter(r => r.exists);
      let body = `Hasil Generate (Prefix ${prefix})\n\n`;
      body += `Total dicek: ${count}\n`;
      body += `Kosong: ${kosong.length}\n`;
      body += `Terdaftar: ${terdaftar.length}\n\n`;
      if (kosong.length > 0) {
        body += `NOMOR KOSONG:\n\n`;
        kosong.forEach((r, i) => {
          body += `${i + 1}. ${toDisplay(r.number)}\n   (${providerOf(r.number)})\n`;
        });
      } else {
        body += `Semua nomor terdaftar. Coba lagi!\n.nokos prefix ${prefix} ${count}`;
      }
      return m.reply( claraWrap("Nomor Kosong", body), "nokos");
    } catch {
      return m.reply(claraWrap("nokos", te(m.prefix, m.command, m.pushName), "error"));
    }
  }

  // --- SAVE ---
  if (sub === "save") {
    try {
      const count = parseInt(arg1) || 10;
      const prov = arg2?.toLowerCase() || "all";
      const prefixes = PROVIDERS[prov] || PROVIDERS.all || Object.values(PROVIDERS).flat();
      const nums = [];
      for (let i = 0; i < count; i++) {
        const p = prefixes[randomInt(0, prefixes.length - 1)];
        nums.push(genNumber(p));
      }
      const results = await checkWA(sock, nums);
      const kosong = results.filter(r => !r.exists).map(r => r.number);
      const data = loadSaved();
      const newNums = kosong.filter(n => !data.numbers.includes(n));
      data.numbers.push(...newNums);
      data.lastUpdate = new Date().toISOString();
      saveSaved(data);
      return m.reply( claraWrap("Nomor Kosong",
        `Hasil Save Nomor Kosong\n\nDicek: ${count} nomor\nDitemukan kosong: ${kosong.length}\nBaru disimpan: ${newNums.length}\nTotal tersimpan: ${data.numbers.length}\n\nGunakan .nokos list untuk melihat semua nomor tersimpan.`
      ), "nokos");
    } catch {
      return m.reply(claraWrap("nokos", te(m.prefix, m.command, m.pushName), "error"));
    }
  }

  // --- LIST ---
  if (sub === "list") {
    const data = loadSaved();
    if (data.numbers.length === 0) {
      return m.reply( claraWrap("Nomor Kosong",
        `Belum ada nomor kosong tersimpan.\n\nGunakan .nokos save [jumlah] [provider] untuk mulai menyimpan.`
      ), "nokos");
    }
    let body = `Daftar Nomor Kosong Tersimpan\n\n`;
    body += `Total: ${data.numbers.length} nomor\n`;
    body += `Update: ${data.lastUpdate ? new Date(data.lastUpdate).toLocaleString("id-ID") : "-"}\n\n`;
    data.numbers.slice(0, 30).forEach((n, i) => {
      body += `${i + 1}. ${toDisplay(n)} (${providerOf(n)})\n`;
    });
    if (data.numbers.length > 30) body += `\n...dan ${data.numbers.length - 30} nomor lainnya.`;
    body += `\n\n.nokos clear untuk hapus semua\n.nokos export untuk export ke txt`;
    return m.reply( claraWrap("Nomor Kosong", body), "nokos");
  }

  // --- CLEAR ---
  if (sub === "clear") {
    saveSaved({ numbers: [], lastUpdate: null });
    return m.reply( claraWrap("Nomor Kosong",
      `Database nomor kosong berhasil dihapus.`
    ), "nokos");
  }

  // --- EXPORT ---
  if (sub === "export") {
    const data = loadSaved();
    if (data.numbers.length === 0) {
      return m.reply( claraWrap("Nomor Kosong",
        `Tidak ada nomor untuk diexport.`
      ), "nokos");
    }
    const txt = data.numbers.map(n => n.replace(/[^0-9]/g, "").replace(/^0/, "62")).join("\n");
    const exportPath = path.join(process.cwd(), "tmp", "nokos_export.txt");
    try {
      const dir = path.dirname(exportPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(exportPath, txt);
      await sock.sendMessage(m.chat, {
        document: fs.readFileSync(exportPath),
        mimetype: "text/plain",
        fileName: `nokos_${data.numbers.length}nums_${Date.now()}.txt`,
      }, { quoted: m });
    } catch {
      let body = `Export Nomor Kosong (${data.numbers.length} nomor)\n\n`;
      body += data.numbers.map((n, i) => `${i + 1}. ${n}`).join("\n");
      body += `\n\nKirim file gagal. Copy manual di atas.`;
      return m.reply( claraWrap("Nomor Kosong", body), "nokos");
    }
    return;
  }

  // --- HELP ---
  if (sub === "help" || sub === "menu") {
    let body = `Nomor Kosong v2 - Menu\n\n`;
    body += `.nokos [jumlah] [provider]\n  Generate & cek nomor random\n  Contoh: .nokos 10 telkomsel\n\n`;
    body += `.nokos prefix <08xx> [jumlah]\n  Generate dari prefix spesifik\n  Contoh: .nokos prefix 0852 5\n\n`;
    body += `.nokos cek <nomor>\n  Cek nomor spesifik di WhatsApp\n  Contoh: .nokos cek 08123456789\n\n`;
    body += `.nokos save [jumlah] [provider]\n  Generate, cek & simpan yang kosong\n  Contoh: .nokos save 20 indosat\n\n`;
    body += `.nokos list\n  Lihat nomor kosong tersimpan\n\n`;
    body += `.nokos export\n  Export nomor tersimpan ke txt\n\n`;
    body += `.nokos clear\n  Hapus semua nomor tersimpan\n\n`;
    body += `Provider: telkomsel, indosat, xl, tri, axis, smartfren, all\n`;
    body += `Max 30 nomor per command`;
    return m.reply( claraWrap("Nomor Kosong", body), "nokos");
  }

  // --- DEFAULT: generate with optional provider ---
  let count = parseInt(sub) || 10;
  const prov = arg1?.toLowerCase() && PROVIDERS[arg1.toLowerCase()] ? arg1.toLowerCase() : "all";
  if (count > 30) count = 30;
  if (count < 1) count = 1;
  const prefixes = PROVIDERS[prov] || Object.values(PROVIDERS).flat();
  try {
    const nums = [];
    for (let i = 0; i < count; i++) {
      const p = prefixes[randomInt(0, prefixes.length - 1)];
      nums.push(genNumber(p));
    }
    const results = await checkWA(sock, nums);
    const kosong = results.filter(r => !r.exists);
    const terdaftar = results.filter(r => r.exists);
    let body = `Hasil Generate Nomor Kosong\n\n`;
    body += `Provider: ${prov}\n`;
    body += `Total dicek: ${count}\n`;
    body += `Kosong: ${kosong.length}\n`;
    body += `Terdaftar: ${terdaftar.length}\n\n`;
    if (kosong.length > 0) {
      body += `NOMOR KOSONG:\n\n`;
      kosong.forEach((r, i) => {
        body += `${i + 1}. ${toDisplay(r.number)}\n   (${providerOf(r.number)})\n`;
      });
      body += `\nNomor di atas belum terdaftar WhatsApp.\nGunakan .nokos save untuk menyimpan otomatis.`;
    } else {
      body += `Semua nomor terdaftar. Coba lagi!\n.nokos ${count} ${prov}`;
    }
    return m.reply( claraWrap("Nomor Kosong", body), "nokos");
  } catch {
    return m.reply(claraWrap("nokos", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
