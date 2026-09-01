// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-error.js — Plain text error template (no box decoration)
import config from '../../config.js'

function te(prefix, command, pushName) {
  return `❌ Gagal: .${command || '?'} mengalami error, coba lagi nanti`
}

export default te
