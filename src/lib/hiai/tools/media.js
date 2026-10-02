import { ctx, DOWNLOAD_PLATFORM_MAP, downloadTwitterDirect, downloadUserImageAsUrl, execPluginCommand, fetchSocialMulti } from '../mcp.js';

const DOWNLOAD_PLATFORM_KEYS = ['tiktok', 'instagram', 'youtube', 'youtube_audio', 'twitter', 'facebook']

export default [
{
    name: 'download_media',
    description: 'Download media (video/foto/audio) dari platform sosial yang didukung dan langsung kirim ke user. Pilih "platform" sesuai sumbernya: "tiktok" untuk URL tiktok.com/vt.tiktok.com, "instagram" untuk URL instagram.com (Reels/Post), "youtube" untuk URL youtube.com/youtu.be kalau user mau file VIDEO, "youtube_audio" kalau user minta putar lagu/cari lagu/download MP3 dari YouTube (boleh cukup judul lagu, tidak wajib URL), "twitter" untuk URL twitter.com/x.com. "facebook" untuk url facebook.com',
    parameters: {
        platform: {
            type: 'string',
            description: 'Platform sumber media: "tiktok", "facebook", "instagram", "youtube", "youtube_audio", atau "twitter".',
            enum: DOWNLOAD_PLATFORM_KEYS,
            required: true
        },
        query: { type: 'string', description: 'URL media yang mau didownload. Untuk platform "youtube_audio" boleh diisi judul lagu kalau tidak ada URL.', required: true }
    },
    execute: async ({ platform, query }) => {
        const target = DOWNLOAD_PLATFORM_MAP[platform]
        if (!target) return `Platform "${platform}" tidak dikenali. Pilihan valid: ${DOWNLOAD_PLATFORM_KEYS.join(', ')}.`

        

        

        

        
        if (platform === 'twitter') {
            try {
                return await downloadTwitterDirect(query)
            } catch (e) {
                console.error('[download_media] Gagal download twitter:', e)
                return `Gagal download Twitter/X: ${e.message}`
            }
        }

        try {
            await execPluginCommand(target.command, query)
            return `${target.label} diproses lewat plugin .${target.command}, hasil dikirim langsung ke chat ini.`
        } catch (e) {
            return `Gagal download ${target.label}: ${e.message}`
        }
    }
},
{
    name: 'generate_image',
    description: 'Generate gambar dari deskripsi teks (text-to-image) pakai ImageGPT, lalu langsung kirim ke user. Gunakan saat user minta dibuatkan/digambarkan sesuatu, mis. "gambarin kucing astronot", "bikin gambar pemandangan gunung", "generate image of...". Proses biasanya cepat (~10-15 detik), tapi WAJIB kasih tahu user dulu bahwa ini butuh beberapa detik sebelum manggil tool ini.',
    parameters: {
        prompt: { type: 'string', description: 'Deskripsi/prompt gambar yang mau digenerate, dalam Bahasa Inggris untuk hasil terbaik (terjemahkan dulu kalau user minta pakai Bahasa Indonesia)', required: true },
        aspect_ratio: {
            type: 'string',
            description: 'Rasio aspek gambar: "1:1", "16:9", "9:16", "4:3", "3:4", atau "21:9". Infer dari konteks prompt/permintaan user kalau ada petunjuk jelas — mis. "landscape"/"pemandangan lebar"/"wallpaper" → "16:9", "poster"/"story IG"/"potret vertikal" → "9:16", "cinematic"/"sinematik" → "21:9", "foto produk"/"portrait" biasa → "4:3" atau "3:4". Kalau user tidak menyebut apapun soal orientasi/rasio, JANGAN menebak-nebak — pakai default "1:1".',
            required: false
        },
        style: {
            type: 'string',
            description: 'Gaya visual: "none" (default), "photorealistic", "cinematic", "portrait", "product", "anime", "fantasy", "3d-render", atau "vintage". Infer dari kata kunci di prompt user kalau ada — mis. "gaya anime"/"anime style" → "anime", "realistis"/"fotorealistik" → "photorealistic", "gaya kartun 3D"/"render 3D" → "3d-render", "vintage"/"jadul" → "vintage". Kalau tidak ada petunjuk gaya di prompt, pakai default "none".',
            required: false
        }
    },
    execute: async ({ prompt, aspect_ratio, style }) => {
        if (!ctx().conn || !ctx().currentJid) return 'WA connection not ready'
        try {
            // FIX 2 Okt 2026 (bug report owner "file module tidak ditemukan"):
            // import lama ('../../../scrapers/src/ai-image.js') nunjuk ke file
            // yang GAK PERNAH ADA di repo ini (dicek git log --all, nol hasil) —
            // kemungkinan sisa referensi dari engine HIROBOT asli yang strukturnya
            // beda, gak ke-port pas porting .hiai. Ganti ke engine image generation
            // beneran yang sudah dipakai fitur lain (.agent, .aisticker):
            // callImageGenChain — rantai gemini/xai/openai/qwen → nano-banana →
            // pollinations (free fallback terakhir, SELALU ada hasil).
            const { callImageGenChain } = await import('../../rara-ai-service.js')
            const styleHint = style && style !== 'none' ? `, style: ${style}` : ''
            const img = await callImageGenChain(`${prompt}${styleHint}`, { ratio: aspect_ratio })
            if (!img?.base64) return 'Gagal generate gambar: tidak ada hasil dari server.'

            await ctx().conn.sendMessage(ctx().currentJid,
                { image: Buffer.from(img.base64, 'base64'), caption: prompt },
                { quoted: ctx().currentM }
            )

            return `[SUDAH TERKIRIM] Gambar "${prompt}" berhasil digenerate (engine: ${img.via || '-'}) dan sudah dikirim.`
        } catch (e) {
            console.error('[generate_image] Gagal generate:', e)
            return `Gagal generate gambar: ${e.message}`
        }
    }
},
{
    name: 'ai_edit_image',
    description: 'Edit gambar yang dikirim/di-reply user pakai AI (image-to-image) berdasarkan instruksi teks — misalnya "tambahin kacamata", "ubah jadi gaya anime", "ganti background jadi pantai", dsb. WAJIB ada gambar terlampir di pesan ini ATAU pesan ini me-reply pesan yang berisi gambar/stiker. Proses bisa makan waktu, jadi kasih tahu user dulu bahwa ini agak lama sebelum manggil tool ini.',
    parameters: {
        instruction: { type: 'string', description: 'Instruksi edit dalam Bahasa Inggris untuk hasil terbaik (terjemahkan dulu kalau user minta pakai Bahasa Indonesia), sedetail mungkin soal apa yang diubah', required: true }
    },
    execute: async ({ instruction }) => {
        if (!ctx().conn || !ctx().currentJid) return 'WA connection not ready'
        if (!ctx().currentM) return 'Tidak ada konteks pesan untuk ambil gambar sumber.'
        try {
            const imageUrl = await downloadUserImageAsUrl(ctx().currentM)
            if (!imageUrl) {
                return 'Tidak ada gambar yang terdeteksi — pastikan user melampirkan gambar langsung atau me-reply pesan yang berisi gambar/stiker.'
            }

            // FIX 2 Okt 2026: '../../../scrapers/src/nano.js' gak pernah ada di
            // repo ini — leftover referensi HIROBOT asli yang gak ke-port. Ganti
            // ke engine edit gambar yang udah dipakai fitur lain (.editimg dkk):
            // nanoBananaEdit (kuroneko.js) — image-to-image, balikin SATU url.
            const { nanoBananaEdit } = await import('../../../scraper/kuroneko.js')
            const resultUrl = await nanoBananaEdit(imageUrl, instruction)
            if (!resultUrl) {
                return 'Edit selesai tapi tidak ada URL hasil yang bisa ditemukan di response.'
            }

            try {
                await ctx().conn.sendMessage(ctx().currentJid, { image: { url: resultUrl }, caption: instruction }, { quoted: ctx().currentM })
            } catch (sendErr) {
                console.warn('[ai_edit_image] sendMessage gagal, coba sendFile:', sendErr.message)
                await ctx().conn.sendFile(ctx().currentJid, resultUrl, 'nano.png', instruction, ctx().currentM)
            }

            return `Gambar berhasil diedit sesuai instruksi "${instruction}" dan sudah dikirim ke chat ini.`
        } catch (e) {
            console.error('[ai_edit_image] Gagal edit:', e)
            return `Gagal edit gambar: ${e.message}`
        }
    }
} 
]
