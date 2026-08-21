// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { cpus } from 'os'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import { logger } from './nova-logger.js'
const CONCURRENCY = Math.max(2, cpus().length)
const TIMEOUT = 60_000

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

function queueFFmpeg(command) {
    return new Promise((resolve, reject) => {
        const execute = () => new Promise((res, rej) => {
            const child = exec(command, { maxBuffer: 50 * 1024 * 1024 })
            let timedOut = false
            let stderr = ''

            const timer = setTimeout(() => {
                timedOut = true
                child.kill('SIGKILL')
            }, TIMEOUT)

            child.stderr?.on('data', (chunk) => {
                stderr += chunk
                if (stderr.length > 2000) stderr = stderr.slice(-2000)
            })

            child.on('close', (code) => {
                clearTimeout(timer)
                if (timedOut) return rej(new Error(`FFmpeg timeout (${TIMEOUT / 1000}s)`))
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

export { queueFFmpeg, getQueueStats, toVoiceNote, CONCURRENCY }
