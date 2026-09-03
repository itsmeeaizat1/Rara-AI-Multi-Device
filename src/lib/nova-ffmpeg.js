// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { cpus } from 'os'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import { logger } from './nova-logger.js'
const CONCURRENCY = Math.max(2, cpus().length)
const TIMEOUT = 60_000
const VIDEO_TIMEOUT = 180_000

let queue = []
let running = 0

function runNext() {
    while (running < CONCURRENCY && queue.length > 0) {
        const task = queue.shift()
        running++
        task.execute()
            .then(task.resolve)
            .catch(task.reject)
            .finally(() => {
                running--
                runNext()
            })
    }
}

function queueFFmpeg(command, timeout = TIMEOUT) {
    return new Promise((resolve, reject) => {
        const execute = () => new Promise((res, rej) => {
            const child = exec(command, { maxBuffer: 50 * 1024 * 1024 })
            let timedOut = false
            let stderr = ''

            const timer = setTimeout(() => {
                timedOut = true
                child.kill('SIGKILL')
            }, timeout)

            child.stderr?.on('data', (chunk) => {
                stderr += chunk
                if (stderr.length > 2000) stderr = stderr.slice(-2000)
            })

            child.on('close', (code) => {
                clearTimeout(timer)
                if (timedOut) return rej(new Error(`FFmpeg timeout (${timeout / 1000}s)`))
                if (code !== 0) return rej(new Error(`FFmpeg exit code ${code}: ${stderr.split('\n').pop()}`))
                res()
            })

            child.on('error', (err) => {
                clearTimeout(timer)
                rej(err)
            })
        })

        queue.push({ execute, resolve, reject })
        runNext()
    })
}

function runProbe(command) {
    return new Promise((resolve, reject) => {
        exec(command, { maxBuffer: 5 * 1024 * 1024, timeout: 20_000 }, (err, stdout) => {
            if (err) return reject(err)
            resolve(stdout.trim())
        })
    })
}

function getQueueStats() {
    return {
        running,
        queued: queue.length,
        concurrency: CONCURRENCY
    }
}

/**
 * Convert any audio buffer to OGG/Opus format for WhatsApp voice notes.
 * Uses FFmpeg with libopus codec, mono, 48kHz.
 * @param {Buffer} inputBuffer - Any audio/video buffer (mp3, wav, mp4, etc.)
 * @returns {Promise<Buffer>} OGG/Opus buffer ready for WhatsApp VN
 */
async function toVoiceNote(inputBuffer) {
    if (!inputBuffer || !Buffer.isBuffer(inputBuffer)) {
        throw new Error('toVoiceNote: input must be a Buffer')
    }

    const tempDir = path.join(process.cwd(), 'tmp')
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

    const ts = Date.now()
    const inputPath = path.join(tempDir, `vn_input_${ts}.inp`)
    const outputPath = path.join(tempDir, `vn_output_${ts}.ogg`)

    try {
        fs.writeFileSync(inputPath, inputBuffer)

        const cmd = [
            'ffmpeg -y',
            `-i "${inputPath}"`,
            '-vn',
            '-c:a libopus',
            '-b:a 64k',
            '-ar 48000',
            '-ac 1',
            '-application voip',
            `"${outputPath}"`
        ].join(' ')

        await queueFFmpeg(cmd)

        if (!fs.existsSync(outputPath)) {
            throw new Error('toVoiceNote: FFmpeg produced no output')
        }

        return fs.readFileSync(outputPath)
    } finally {
        try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath) } catch {}
        try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath) } catch {}
    }
}

/**
 * Pastikan buffer video kompatibel diputar di WhatsApp: video H.264 (baseline/main),
 * audio AAC, container MP4 dengan moov atom di depan (faststart). Banyak sumber
 * download (savetube, ytdl mirror, dll) diam-diam ngasih AV1/VP9/HEVC yang gagal
 * diputar di WA client ("ada masalah dengan file video") walau ekstensinya .mp4.
 * @param {Buffer} inputBuffer - Buffer video mentah dari hasil download
 * @returns {Promise<Buffer>} Buffer MP4 H.264+AAC siap kirim ke WhatsApp
 */
async function toWhatsAppVideo(inputBuffer) {
    if (!inputBuffer || !Buffer.isBuffer(inputBuffer)) {
        throw new Error('toWhatsAppVideo: input must be a Buffer')
    }

    const tempDir = path.join(process.cwd(), 'tmp')
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

    const ts = Date.now()
    const inputPath = path.join(tempDir, `vid_input_${ts}.inp`)
    const outputPath = path.join(tempDir, `vid_output_${ts}.mp4`)

    try {
        fs.writeFileSync(inputPath, inputBuffer)

        let videoCodec = ''
        let audioCodec = ''
        try {
            videoCodec = await runProbe(
                `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "${inputPath}"`
            )
        } catch (e) {
            logger?.warn?.(`[toWhatsAppVideo] probe video gagal: ${e.message}`)
        }
        try {
            audioCodec = await runProbe(
                `ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 "${inputPath}"`
            )
        } catch {
            // wajar kalau video tanpa audio track
        }

        const needsTranscode = videoCodec !== 'h264' || (audioCodec && audioCodec !== 'aac')

        // Target bitrate video: ~1.4x bitrate sumber asli (H.264 butuh sedikit lebih
        // tinggi dari AV1/VP9 buat kualitas setara), dibatasi 400k-1500k biar file
        // tetap ramah dikirim/diupload ke WhatsApp meski durasi video panjang.
        let targetBitrate = 800
        try {
            const formatBitrate = await runProbe(
                `ffprobe -v error -show_entries format=bit_rate -of csv=p=0 "${inputPath}"`
            )
            const srcKbps = parseInt(formatBitrate, 10) / 1000
            if (srcKbps > 0) {
                targetBitrate = Math.min(1200, Math.max(400, Math.round(srcKbps * 1.2)))
            }
        } catch {
            // fallback ke default 800k kalau probe bitrate gagal
        }

        const cmd = needsTranscode
            ? [
                'ffmpeg -y',
                `-i "${inputPath}"`,
                '-c:v libx264',
                '-profile:v baseline',
                '-level 3.1',
                '-pix_fmt yuv420p',
                `-b:v ${targetBitrate}k`,
                `-maxrate ${Math.round(targetBitrate * 1.2)}k`,
                `-bufsize ${targetBitrate * 2}k`,
                '-preset veryfast',
                '-c:a aac',
                '-b:a 96k',
                '-movflags +faststart',
                `"${outputPath}"`
            ].join(' ')
            : [
                'ffmpeg -y',
                `-i "${inputPath}"`,
                '-c:v copy',
                '-c:a copy',
                '-movflags +faststart',
                `"${outputPath}"`
            ].join(' ')

        await queueFFmpeg(cmd, VIDEO_TIMEOUT)

        if (!fs.existsSync(outputPath)) {
            throw new Error('toWhatsAppVideo: FFmpeg produced no output')
        }

        return fs.readFileSync(outputPath)
    } finally {
        try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath) } catch {}
        try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath) } catch {}
    }
}

export { queueFFmpeg, getQueueStats, toVoiceNote, toWhatsAppVideo, CONCURRENCY }
