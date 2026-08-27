// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { queueFFmpeg } from '../../src/lib/nova-ffmpeg.js'
import fs from 'fs'
import path from 'path'
import te from '../../src/lib/nova-error.js'
import {  claraWrap, bracketBox, novaCaption } from "../../src/lib/nova-menu-style.js";

const EFFECTS = {
    bass:      { emoji: '🔊', filter: 'bass=g=20:f=110:w=0.6', desc: 'Bass boost' },
    blown:     { emoji: '💥', filter: 'acrusher=level_in=4:level_out=5:bits=8:mode=log:aa=1', desc: 'Distortion' },
    deep:      { emoji: '🎤', filter: 'asetrate=44100*0.7,atempo=1.3', desc: 'Suara berat' },
    earrape:   { emoji: '📢', filter: 'volume=10,bass=g=30:f=80:w=0.6,acrusher=level_in=8:level_out=12:bits=4:mode=log:aa=1', desc: 'Earrape' },
    echo:      { emoji: '🔁', filter: 'aecho=0.8:0.88:60:0.4', desc: 'Echo/gema' },
    fast:      { emoji: '⚡', filter: 'atempo=1.5', desc: 'Percepat 1.5x' },
    fat:       { emoji: '🎵', filter: 'bass=g=15:f=60:w=0.8,lowpass=f=3000,volume=1.5', desc: 'Thick bass' },
    nightcore: { emoji: '🌙', filter: 'asetrate=44100*1.25,atempo=0.9', desc: 'Nightcore' },
    reverse:   { emoji: '🔄', filter: 'areverse', desc: 'Putar mundur' },
    robot:     { emoji: '🤖', filter: "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75", desc: 'Suara robot' },
    slow:      { emoji: '🐢', filter: 'atempo=0.8,asetrate=44100*0.9', desc: 'Slowed' },
    smooth:    { emoji: '🎶', filter: 'lowpass=f=4000,bass=g=3:f=100,treble=g=-2:f=3000,aecho=0.8:0.88:60:0.4', desc: 'Mellow' },
    tupai:     { emoji: '🐿️', filter: 'asetrate=44100*1.5,atempo=0.8', desc: 'Chipmunk' },
    superfast: { emoji: '💨', filter: 'atempo=2.0', desc: 'Percepat 2x' },
    superslow: { emoji: '🦥', filter: 'atempo=0.5', desc: 'Perlambat 2x' },
    tremolo:   { emoji: '〰️', filter: 'tremolo=f=8:d=0.7', desc: 'Tremolo / getar' },
    vibrato:   { emoji: '🎸', filter: 'vibrato=f=7:d=0.5', desc: 'Vibrato' },
    phone:     { emoji: '📞', filter: 'highpass=f=300,lowpass=f=3400,volume=1.5', desc: 'Suara telepon' },
    cave:      { emoji: '🕳️', filter: 'aecho=0.8:0.9:500:0.3,aecho=0.8:0.9:1000:0.2', desc: 'Gema gua' },
    radio:     { emoji: '📻', filter: 'highpass=f=300,lowpass=f=3000,acrusher=level_in=2:level_out=3:bits=12:mode=log:aa=1', desc: 'Suara radio' },
    demon:     { emoji: '👹', filter: 'asetrate=44100*0.5,atempo=1.5,aecho=0.8:0.88:200:0.5', desc: 'Suara iblis' },
    underwater:{ emoji: '💧', filter: 'lowpass=f=500,tremolo=f=2:d=0.4', desc: 'Bawah air' },
    concert:   { emoji: '🏟️', filter: 'aecho=0.8:0.88:40:0.4,aecho=0.8:0.88:80:0.3,treble=g=3:f=4000', desc: 'Live concert' },
    '8bit':    { emoji: '👾', filter: 'acrusher=level_in=3:level_out=4:bits=4:mode=log:aa=0,aresample=8000', desc: '8-bit retro' },
    helium:    { emoji: '🎈', filter: 'asetrate=44100*2.0,atempo=0.6', desc: 'Suara helium' },
}

const EFFECT_NAMES = Object.keys(EFFECTS)

const pluginConfig = {
    name: "audiofun",
    alias: ["audiofun"],
    category: 'convert',
    description: 'Audio effects & voice changer (25 efek)',
    usage: '.audiofun <efek> atau .audiofun list',
    example: '.audiofun bass (reply audio)',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 8,
    energi: 1,
    isEnabled: true
}

function getMediaSource(m) {
    const selfIsAudio = m.isAudio || m.message?.audioMessage
    const selfIsVideo = m.isVideo || m.message?.videoMessage
    const quotedIsAudio = m.quoted?.isAudio || m.quoted?.message?.audioMessage
    const quotedIsVideo = m.quoted?.isVideo || m.quoted?.message?.videoMessage

    if (selfIsAudio || selfIsVideo) {
        return { download: () => m.download(), ext: selfIsVideo ? 'mp4' : 'ogg' }
    }
    if (quotedIsAudio || quotedIsVideo) {
        return { download: () => m.quoted.download(), ext: quotedIsVideo ? 'mp4' : 'ogg' }
    }
    return null
}

function buildEffectList(prefix) {
    const categories = {
        'Bass & Tone': ['bass', 'fat', 'deep', 'smooth'],
        'Speed': ['fast', 'superfast', 'slow', 'superslow', 'nightcore'],
        'Voice': ['tupai', 'helium', 'robot', 'demon', 'phone'],
        'Space & Echo': ['echo', 'cave', 'concert', 'underwater', 'reverse'],
        'Distortion': ['blown', 'earrape', 'radio', '8bit'],
        'Modulation': ['tremolo', 'vibrato'],
    }

    const boxes = []
    for (const [cat, effects] of Object.entries(categories)) {
        const lines = effects.map(name => {
            const fx = EFFECTS[name]
            return fx.emoji + ' .' + prefix + ' ' + name + ' — ' + fx.desc
        })
        boxes.push(bracketBox('🎵', cat, lines))
    }

    return boxes.join('\n\n') +
        '\n\n' + novaCaption({
  emoji: "🎵",
  name: "audiofun",
  description: "Audio effects & voice changer (25 efek)",
  usage: `${m.prefix}audiofun <efek> atau .audiofun list`,
  example: `${m.prefix}audiofun bass (reply audio)`,
})
}

async function handler(m, { sock }) {
    const prefix = m.prefix || '.'
    const command = m.command

    // Kalau command langsung nama efek (alias), pakai itu
    let effectName
    if (EFFECT_NAMES.includes(command.toLowerCase())) {
        effectName = command.toLowerCase()
    } else {
        // Kalau .audiofun <efek>
        effectName = m.args?.[0]?.toLowerCase()
    }

    // Kalau gak ada efek atau minta list
    if (!effectName || effectName === 'list' || effectName === 'menu') {
        return m.reply(buildEffectList('audiofun'), "audiofun")
    }

    const fx = EFFECTS[effectName]
    if (!fx) {
        return m.reply(
            claraWrap("Audiofun",
                'Efek *' + effectName + '* tidak ditemukan\n\n' +
                'Ketik *' + prefix + 'audiofun list* untuk daftar efek'),
            "audiofun")
    }

    const media = getMediaSource(m)
    if (!media) {
        return m.reply(
            claraWrap("Audiofun",
                fx.emoji + ' *' + effectName.toUpperCase() + '*\n\n' +
                'Reply audio/video dengan command ini\n' +
                'Contoh: reply audio lalu ketik *' + prefix + 'audiofun ' + effectName + '*'),
            "audiofun")
    }

    await m.react('🕐')

    const tempDir = path.join(process.cwd(), 'temp')
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

    const ts = Date.now()
    const inputPath = path.join(tempDir, 'fx_in_' + ts + '.' + media.ext)
    const outputPath = path.join(tempDir, 'fx_out_' + ts + '.ogg')

    try {
        const buffer = await media.download()
        if (!buffer?.length) {
            return m.reply(claraWrap("Error", "❌ Gagal download media"))
        }

        fs.writeFileSync(inputPath, buffer)
        await queueFFmpeg('ffmpeg -y -i "' + inputPath + '" -af "' + fx.filter + '" -vn "' + outputPath + '"')

        if (!fs.existsSync(outputPath)) {
            return m.reply(claraWrap("Error", "❌ Gagal memproses audio"))
        }

        const audioBuffer = fs.readFileSync(outputPath)

        await sock.sendMedia(m.chat, audioBuffer, null, m, {
            type: 'audio'
        })

        await m.react('✅')
    } catch (error) {
        await m.react("🐣");
        m.reply(te(m.prefix, m.command, m.pushName))
    } finally {
        try { fs.existsSync(inputPath) && fs.unlinkSync(inputPath) } catch (e) { console.error('[audiofx.js]:', e.message); }
        try { fs.existsSync(outputPath) && fs.unlinkSync(outputPath) } catch (e) { console.error('[audiofx.js]:', e.message); }
    }
}

export { pluginConfig as config, handler }
