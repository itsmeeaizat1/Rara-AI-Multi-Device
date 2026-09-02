// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
// ============================================================
// 🔹 AI AGENT — Otak AI yang bisa ngatur fitur bot via bahasa natural
// 🔹 Berbeda dari AI biasa (aichat/deepseek), AI Agent bisa EKSEKUSI aksi:
// 🔹 tutup grup, kick, promote, setname, hidetag, dll
// 🔹 Alur: localParse (instan) → DeepSeek (fallback cerdas) → Pollinations
// ============================================================

// ================= DAFTAR TOOLS (whitelist) =================
// AI hanya boleh MEMILIH nama di daftar ini — tidak bisa eksekusi di luar
export const TOOLS = {
  closegc: {
    perm: 'admin', danger: false,
    desc: 'menutup grup agar hanya admin yang bisa chat',
    done: '✅ Grup ditutup. Sekarang hanya admin yang bisa chat.',
    run: (conn, m) => conn.groupSettingUpdate(m.chat, 'announcement')
  },
  opengc: {
    perm: 'admin', danger: false,
    desc: 'membuka grup agar semua member bisa chat',
    done: '✅ Grup dibuka. Semua member bisa chat.',
    run: (conn, m) => conn.groupSettingUpdate(m.chat, 'not_announcement')
  },
  kick: {
    perm: 'admin', args: ['user'], danger: true,
    desc: 'mengeluarkan member dari grup',
    done: '✅ User dikeluarkan dari grup.',
    run: (conn, m, a) => conn.groupParticipantsUpdate(m.chat, [a.user], 'remove')
  },
  add: {
    perm: 'admin', args: ['user'], danger: false,
    desc: 'menambahkan nomor ke grup',
    done: '✅ User ditambahkan ke grup.',
    run: (conn, m, a) => conn.groupParticipantsUpdate(m.chat, [a.user], 'add')
  },
  promote: {
    perm: 'admin', args: ['user'], danger: false,
    desc: 'menjadikan member sebagai admin',
    done: '✅ User sekarang menjadi admin.',
    run: (conn, m, a) => conn.groupParticipantsUpdate(m.chat, [a.user], 'promote')
  },
  demote: {
    perm: 'admin', args: ['user'], danger: false,
    desc: 'menurunkan admin menjadi member biasa',
    done: '✅ User diturunkan menjadi member biasa.',
    run: (conn, m, a) => conn.groupParticipantsUpdate(m.chat, [a.user], 'demote')
  },
  setname: {
    perm: 'admin', args: ['value'], danger: false,
    desc: 'mengganti nama grup',
    done: '✅ Nama grup diganti.',
    run: (conn, m, a) => conn.groupUpdateSubject(m.chat, a.value)
  },
  setdesc: {
    perm: 'admin', args: ['value'], danger: false,
    desc: 'mengganti deskripsi grup',
    done: '✅ Deskripsi grup diganti.',
    run: (conn, m, a) => conn.groupUpdateDescription(m.chat, a.value)
  },
  hidetag: {
    perm: 'admin', args: ['value'], danger: false,
    desc: 'memberi tag kepada semua member dengan pesan',
    done: '✅ Tag terkirim ke semua member.',
    run: async (conn, m, a) => {
      const gc = await conn.groupMetadata(m.chat)
      await conn.sendMessage(m.chat, {
        text: a.value || '',
        mentions: gc.participants.map(p => p.id)
      }, { quoted: m })
    }
  }
}

// ================= PARSER LOKAL (tanpa API, instan) =================
// 🔹 AI AGENT: parser lokal untuk perintah sederhana — instan, tanpa panggil API
// 🔹 Tidak diganti, tidak diubah — sesuai permintaan owner
export function localParse(text) {
  const t = (text || '').toLowerCase()
  if (/(tutup|kunci|close)/.test(t) && /grup|gc\b|group/.test(t)) return { tool: 'closegc', args: {} }
  if (/(buka|open)/.test(t) && /grup|gc\b|group/.test(t)) return { tool: 'opengc', args: {} }
  if (/(kick|keluarkan|usir|tendang)/.test(t)) return { tool: 'kick', args: {} }
  if (/(tambahkan|masukkan).*(nomor|member)/.test(t)) return { tool: 'add', args: {} }
  if (/(jadikan|adminin).*(admin)/.test(t)) return { tool: 'promote', args: {} }
  if (/(turunkan|cabut admin|demote)/.test(t)) return { tool: 'demote', args: {} }
  if (/ganti.*(nama|judul)/.test(t)) return { tool: 'setname', args: { value: text } }
  if (/ganti.*(deskripsi|desc)/.test(t)) return { tool: 'setdesc', args: { value: text } }
  if (/(tag|panggil).*(semua|all)/.test(t)) {
    return { tool: 'hidetag', args: { value: text.replace(/(tag|panggil|semua|all)/gi, '').trim() } }
  }
  return null // tidak match → lanjut ke DeepSeek
}

// ================= OTAK AI — PROVIDER CHAIN =================
// 🔹 AI AGENT: Urutan provider — DeepSeek utama, Pollinations fallback, Groq opsional
// 🔹 DeepSeek butuh key (global.deepseekkey), IkyyXD gratis (key dari apikeys.json)
// 🔹 Groq hanya dipakai kalau ada key (global.groqkey)
const PROVIDERS = [
  {
    name: 'deepseek',
    method: 'post',
    url: 'https://api.deepseek.com/chat/completions',
    key: () => process.env.DEEPSEEK_KEY || global.deepseekkey || '',
    model: 'deepseek-chat',
    headers: (k) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${k}`
    })
  },
  {
    name: 'ikyyxd-gemini',
    method: 'get',
    url: 'https://api.ikyyxd.my.id/ai/gemini',
    key: () => {
      try { return JSON.parse(fs.readFileSync('src/lib/apikey/apikeys.json','utf8')).ikyyxd || '' } catch { return '' }
    },
    headers: () => ({ 'Content-Type': 'application/json' })
  },
  {
    name: 'groq',
    method: 'post',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: () => process.env.GROQ_KEY || global.groqkey || '',
    model: 'llama-3.3-70b-versatile',
    headers: (k) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${k}`
    })
  }
]

// 🔹 AI AGENT: Fungsi umum nanya ke AI — coba provider satu-satu sampai sukses
export async function askAI(system, user) {
  for (const p of PROVIDERS) {
    const key = p.key?.()
    if (p.key && !key) continue // provider ini gak ada key → skip
    try {
      let text
      if (p.method === 'get') {
        // GET-based provider (IkyyXD): gabung system+user jadi satu prompt
        const fullPrompt = `${system}\n\n${user}`
        const url = `${p.url}?apikey=${encodeURIComponent(key)}&text=${encodeURIComponent(fullPrompt)}`
        const res = await fetch(url, { headers: p.headers(key) })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        text = data.result || ''
      } else {
        // POST-based provider (DeepSeek, Groq, OpenAI-compatible)
        const res = await fetch(p.url, {
          method: 'POST',
          headers: p.headers(key),
          body: JSON.stringify({
            model: p.model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user }
            ],
            temperature: 0.1
          })
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        text = data.choices?.[0]?.message?.content
      }
      if (!text) throw new Error('balasan kosong')
      console.log(`[AI] ${p.name} sukses`)
      return text
    } catch (e) {
      console.log(`[AI] ${p.name} gagal: ${e.message} → coba berikutnya...`)
    }
  }
  throw new Error('Semua provider AI gagal')
}

// 🔹 AI AGENT: think() — nerjemahin bahasa manusia jadi perintah tool (JSON)
// 🔹 Tidak diganti, tidak diubah — sesuai permintaan owner
export async function think(text, ctx = {}) {
  const toolsList = Object.entries(TOOLS)
    .map(([k, v]) => `- ${k}: ${v.desc}${v.args ? ' (butuh args: ' + v.args.join(', ') + ')' : ''}`)
    .join('\n')

  const sys = `Kamu adalah otak dari bot WhatsApp bernama "${ctx.botname || 'Bot'}".
Tugasmu MENERJEMAHKAN perintah user menjadi SATU objek JSON saja.

Daftar tools yang tersedia:
${toolsList}

Aturan WAJIB:
- Balas HANYA JSON mentah, tanpa \`\`\` dan tanpa teks lain
- Format: {"tool":"nama_tool","args":{},"reply":"kalimat singkat"}
- Nomor WA format 62xxx tanpa + dan tanpa strip. Mention yang tersedia: ${ctx.mentions || 'tidak ada'}
- Untuk setname/setdesc/hidetag isi args.value dengan teksnya
- Jika perintah user BUKAN aksi bot (hanya bertanya/ngobrol), balas: {"tool":null,"reply":"jawaban percakapanmu"}

Contoh:
"tutup grup" → {"tool":"closegc","args":{},"reply":"Baik, menutup grup."}
"kick 62812" → {"tool":"kick","args":{"user":"62812"},"reply":"Oke."}
"apa itu nodejs" → {"tool":null,"reply":"Node.js adalah runtime JavaScript..."}`

  const raw = await askAI(sys, text)
  const clean = raw.replace(/```json|```/g, '').trim()
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('AI tidak mengembalikan JSON')
  return JSON.parse(clean.slice(start, end + 1))
}
