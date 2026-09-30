// hi-shim.js — matchParticipant versi ringkas (port dari lib/utils/simple.js engine asal)
// Versi sederhana: cocokkan jid & nomor polos (tanpa normalizeParticipant engine asal).
export function decodeJid(jid) {
  if (!jid || typeof jid !== 'string') return jid;
  const [number] = jid.split('@');
  const [bare] = number.split(':');
  const domain = jid.split('@')[1]?.split('.')[0] || 's.whatsapp.net';
  return bare + '@' + domain;
}

export function matchParticipant(conn, p, targetJid) {
  if (!p || !targetJid) return false;
  const decoded = decodeJid(p.id) || conn?.decodeJid?.(p?.id);
  if (decoded === targetJid) return true;
  const pn = p.phoneNumber || p.pn || p.phone_number || '';
  const targetNum = String(targetJid).split('@')[0];
  if (p.id && String(p.id).split('@')[0] === targetNum) return true;
  if (pn && String(pn).split('@')[0] === targetNum) return true;
  if (p.user_id && String(p.user_id).split('@')[0] === targetNum) return true;
  return false;
}
