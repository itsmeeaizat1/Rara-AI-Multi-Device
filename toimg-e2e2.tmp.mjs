const run = async () => {
  const sharpMod = await import('sharp');
  const sharp = sharpMod.default || sharpMod;
  const big = await sharp({ create: { width: 512, height: 512, channels: 3, background: { r: 90, g: 160, b: 220 } } }).composite([{ input: await sharp({ create: { width: 100, height: 60, channels: 3, background: { r: 250, g: 80, b: 80 } } }).png().toBuffer(), top: 200, left: 200 }]).webp({ quality: 60 }).toBuffer();
  const small = await sharp({ create: { width: 256, height: 256, channels: 3, background: { r: 120, g: 220, b: 120 } } }).webp({ quality: 55 }).toBuffer();
  const anim = await sharp(big).webp().toBuffer();
  const p = await import('./plugins/convert/toimage.js');
  let sent = [], replies = [];
  const mk = (buf, args) => ({ chat: 'c@s', quoted: { isSticker: true, type: 'stickerMessage', download: async () => buf }, args: args || [], react: async () => {}, reply: async (t) => replies.push(String(t)) });
  const sock = { sendMessage: async (jid, c) => { sent.push(c); return ({}) } };

  // 1. cepat (HD lokal) — yang tadi fail
  const t2 = Date.now();
  await p.handler(mk(big, ['cepat']), { sock });
  const r1 = sent[0];
  console.log('1. cepat HD lokal →', r1?.image ? 'OK (' + ((Date.now()-t2)/1000).toFixed(1) + 's)' : 'FAIL');
  if (r1?.image) { const m3 = await sharp(r1.image).metadata(); console.log('   caption:', JSON.stringify(r1.caption), '| ukuran:', m3.width + 'x' + m3.height, m3.format); }

  // 2. default (remini AI, model cached)
  sent.length = 0; const t0 = Date.now();
  await p.handler(mk(big), { sock });
  const r2 = sent[0];
  console.log('2. default remini AI →', r2?.image ? 'OK (' + ((Date.now()-t0)/1000).toFixed(1) + 's)' : 'FAIL');
  if (r2?.image) { const meta = await sharp(r2.image).metadata(); console.log('   caption:', JSON.stringify(r2.caption), '| hasil:', meta.width + 'x' + meta.height); }

  // 3. sticker kecil cepat
  sent.length = 0;
  await p.handler(mk(small, ['cepat']), { sock });
  const r3 = sent[0];
  console.log('3. kecil cepat →', r3?.image ? 'OK' : 'FAIL');
  if (r3?.image) { const m4 = await sharp(r3.image).metadata(); console.log('   ukuran:', m4.width + 'x' + m4.height); }

  // 4. guard: bukan sticker + tanpa reply
  await p.handler({ chat: 'c', quoted: { isSticker: false, type: 'imageMessage', download: async () => Buffer.from('x') }, args: [], react: async () => {}, reply: async (t) => replies.push(String(t)) }, { sock });
  await p.handler({ chat: 'c', quoted: null, args: [], react: async () => {}, reply: async (t) => replies.push(String(t)) }, { sock });
  const guideOk = replies.at(-2)?.toLowerCase().includes('ꜱᴛɪᴄᴋᴇʀ') && replies.at(-1)?.toLowerCase().includes('ʀᴇᴘʟʏ');
  console.log('4. guard guide →', guideOk ? 'OK' : 'FAIL');
  console.log('SELESAI');
};
run().catch(e => console.error('ERR:', e.message));
