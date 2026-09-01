// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from '../../config.js'
function te(prefix, command, pushName) {
    const tpl = config.errorTemplate || `╭─「 ✦ Error ✦ 」
│ Command: \`${(prefix || '.') + (command || '?')}\`
│ Terjadi kesalahan, coba lagi nanti
│ ${pushName || 'User'}, jika masalah berlanjut
│ silakan hubungi owner
╰────  •  ────`
    return tpl
        .replace(/\{prefix\}/g, prefix || '.')
        .replace(/\{command\}/g, command || '?')
        .replace(/\{pushName\}/g, pushName || 'User')
}

export default te
