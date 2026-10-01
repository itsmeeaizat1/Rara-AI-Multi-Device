// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import { raraError, raraEmpty, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";
import path from 'path'
import te from '../../src/lib/rara-error.js'
import { raraWrap } from "../../src/lib/rara-menu-style.js"

const pluginConfig = {
    name: 'uploadsftp',
    alias: ["uploadsftp"],
    category: 'tools',
    description: 'Upload file/media ke server/VPS via SFTP',
    usage: '.uploadsftp (reply media/berkas)',
    example: '.uploadsftp',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 3,
    isEnabled: true
}

const SFTP_CONFIG_PATH = path.join(process.cwd(), 'config', 'sftp-config.json')
const UPLOAD_DIR = path.join(process.cwd(), 'tmp', 'sftp-uploads')

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

let _sftpClient = null
let _Client = null

async function loadSFTPClient() {
    if (_Client) return _Client
    const mod = await import('ssh2-sftp-client')
    _Client = mod.default || mod
    return _Client
}

function loadSFTPConfig() {
    if (!fs.existsSync(SFTP_CONFIG_PATH)) {
        throw new Error('NO_CONFIG')
    }
    let config
    try {
        config = JSON.parse(fs.readFileSync(SFTP_CONFIG_PATH, 'utf-8'))
    } catch {
        throw new Error('INVALID_CONFIG')
    }
    if (!config.host || !config.username) {
        throw new Error('INVALID_CONFIG')
    }
    return config
}

async function getSFTPClient() {
    const Client = await loadSFTPClient()
    const cfg = loadSFTPConfig()

    const sftp = new Client()

    const connectOpts = {
        host: cfg.host,
        port: cfg.port || 22,
        username: cfg.username,
        readyTimeout: 15000,
        keepaliveInterval: 10000
    }

    if (cfg.password) {
        connectOpts.password = cfg.password
    } else if (cfg.privateKey) {
        connectOpts.privateKey = cfg.privateKey
        if (cfg.passphrase) {
            connectOpts.passphrase = cfg.passphrase
        }
    } else {
        throw new Error('NO_AUTH')
    }

    await sftp.connect(connectOpts)
    return { sftp, cfg }
}

function getMimeType(fileName) {
    const ext = path.extname(fileName).toLowerCase()
    const types = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.gif': 'image/gif', '.webp': 'image/webp',
        '.mp4': 'video/mp4', '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo',
        '.mov': 'video/quicktime',
        '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.zip': 'application/zip', '.rar': 'application/vnd.rar',
        '.7z': 'application/x-7z-compressed',
        '.txt': 'text/plain', '.apk': 'application/vnd.android.package-archive',
        '.js': 'text/javascript', '.json': 'application/json',
        '.html': 'text/html', '.csv': 'text/csv'
    }
    return types[ext] || 'application/octet-stream'
}

function getFileNameFromMessage(m) {
    try {
        const msg = m.quoted ? m.quoted.message : m.message
        const types = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage']
        for (const type of types) {
            if (msg && msg[type]) {
                const fileName = msg[type].fileName || msg[type].title
                if (fileName) return fileName
                const mime = msg[type].mimetype || ''
                const ext = mime.split('/')[1] ? mime.split('/')[1].split(';')[0] : 'bin'
                return 'file_' + Date.now() + '.' + ext
            }
        }
    } catch (e) { console.error('[uploadsftp.js]:', e.message); }
    return 'file_' + Date.now() + '.bin'
}

function formatBytes(bytes) {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function sanitizeRemotePath(remotePath) {
    if (!remotePath) return '/'
    let p = remotePath.trim()
    if (!p.startsWith('/')) p = '/' + p
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
    return p
}

async function ensureRemoteDir(sftp, remotePath) {
    const parts = remotePath.split('/').filter(Boolean)
    let current = ''
    for (const part of parts) {
        current += '/' + part
        try {
            await sftp.mkdir(current, true)
        } catch (e) { console.error('[uploadsftp.js]:', e.message); }
    }
    return current
}

async function handler(m, { sock }) {
    const text = m.text || ''
    const args = text.trim().split(/\s+/).slice(1)
    const subCmd = (args[0] || '').toLowerCase()

    // Sub-command: status
    if (subCmd === 'status') {
        const hasConfig = fs.existsSync(SFTP_CONFIG_PATH)
        let configInfo = ''
        if (hasConfig) {
            try {
                const cfg = JSON.parse(fs.readFileSync(SFTP_CONFIG_PATH, 'utf-8'))
                configInfo = '\nHost: `' + (cfg.host || '?') + '`\n'
                configInfo += 'Port: `' + (cfg.port || 22) + '`\n'
                configInfo += 'User: `' + (cfg.username || '?') + '`\n'
                configInfo += 'Auth: ' + (cfg.password ? 'Password' : (cfg.privateKey ? 'Private Key' : 'None'))
                configInfo += '\nRemote Dir: `' + (cfg.remotePath || '/') + '`'
            } catch {
                configInfo = '\nConfig: INVALID'
            }
        }
        return m.reply(raraWrap("Upload SFTP",
            "*sftp status*\n\n" +
            "Config: " + (hasConfig ? 'Terpasang' : 'Belum ada') + configInfo + "\n\n" +
            "Setup: Taruh `sftp-config.json` di folder `config/`"
        ))
    }

    // Sub-command: setpath (remote directory)
    if (subCmd === 'setpath') {
        const remotePath = args[1]
        if (!remotePath) {
            let current = ''
            try {
                const cfg = loadSFTPConfig()
                current = cfg.remotePath || '/'
            } catch (e) { console.error('[uploadsftp.js]:', e.message); }
            return m.reply(raraWrap("Upload SFTP",
                "*remote directory*\n\n" +
                "Current: `" + current + "`\n\n" +
                "Set path: `.uploadsftp setpath /remote/folder`\n" +
                "Reset: `.uploadsftp setpath /`"
            ))
        }

        try {
            const cfg = loadSFTPConfig()
            cfg.remotePath = sanitizeRemotePath(remotePath)
            fs.writeFileSync(SFTP_CONFIG_PATH, JSON.stringify(cfg, null, 2))
            return m.reply(raraWrap("Upload SFTP",
                "BERHASIL\n\nRemote path: `" + cfg.remotePath + "`"
            ))
        } catch (err) {
            return m.reply(raraWrap("Upload SFTP",
                "GAGAL\n\n" + err.message
            ))
        }
    }

    // Sub-command: list
    if (subCmd === 'list') {
        try {
            const { sftp, cfg } = await getSFTPClient()
            const remotePath = cfg.remotePath || '/'

            const list = await sftp.list(remotePath)

            if (list.length === 0) {
                await sftp.end()
                return m.reply(raraWrap("Upload SFTP",
                    "*sftp files*\n\nFolder `" + remotePath + "` kosong."
                ))
            }

            let body = "*SFTP Files (" + remotePath + ")*\n\n"
            list.slice(0, 15).forEach(function(f, i) {
                const icon = f.type === 'd' ? '[DIR]' : '[FILE]'
                body += (i + 1) + ". " + icon + " *" + f.name + "*\n"
                body += "   Size: " + formatBytes(f.size || 0) + "\n\n"
            })

            await sftp.end()
            return m.reply(raraWrap("Upload SFTP", body))
        } catch (err) {
            return m.reply(raraWrap("Upload SFTP", "GAGAL\n\n" + err.message))
        }
    }

    // Sub-command: mkdir (create remote directory)
    if (subCmd === 'mkdir') {
        const dirName = args[1]
        if (!dirName) {
            return m.reply(raraWrap("Upload SFTP",
                "*create remote directory*\n\nUsage: `.uploadsftp mkdir /path/to/dir`"
            ))
        }
        try {
            const { sftp, cfg } = await getSFTPClient()
            const basePath = cfg.remotePath || ''
            const fullPath = basePath + sanitizeRemotePath(dirName)

            await ensureRemoteDir(sftp, fullPath)

            await sftp.end()
            return m.reply(raraWrap("Upload SFTP",
                "BERHASIL\n\nDirectory dibuat: `" + fullPath + "`"
            ))
        } catch (err) {
            return m.reply(raraWrap("Upload SFTP", "GAGAL\n\n" + err.message))
        }
    }

    // Sub-command: delete
    if (subCmd === 'delete' || subCmd === 'del') {
        const fileName = args[1]
        if (!fileName) {
            return m.reply(raraWrap("Upload SFTP",
                "*delete remote file*\n\nUsage: `.uploadsftp delete <filename>`"
            ))
        }
        try {
            const { sftp, cfg } = await getSFTPClient()
            const basePath = cfg.remotePath || ''
            const fullPath = basePath + '/' + fileName

            await sftp.delete(fullPath)

            await sftp.end()
            return m.reply(raraWrap("Upload SFTP",
                "BERHASIL\n\nFile `" + fileName + "` dihapus."
            ))
        } catch (err) {
            return m.reply(raraWrap("Upload SFTP", "GAGAL\n\n" + err.message))
        }
    }

    // Default: upload media
    const hasMedia = m.isMedia || (m.quoted && m.quoted.isMedia)

    if (!hasMedia) {
        return m.reply(
            "GAGAL\n\n" +
            "Reply media/berkas dengan `" + m.prefix + "uploadsftp`\n\n" +
            "*sub-commands:*\n" +
            "`" + m.prefix + "uploadsftp status` - Cek status koneksi\n" +
            "`" + m.prefix + "uploadsftp list` - List file di remote dir\n" +
            "`" + m.prefix + "uploadsftp setpath <path>` - Set remote directory\n" +
            "`" + m.prefix + "uploadsftp mkdir <path>` - Buat folder remote\n" +
            "`" + m.prefix + "uploadsftp delete <name>` - Hapus file remote", "uploadsftp")
    }
    try {
    await m.react("🕒");
        const downloadFn = m.quoted ? m.quoted.download : m.download
        const buffer = await downloadFn()

        if (!buffer || buffer.length === 0) {
            return m.reply(raraWrap("Upload SFTP", "GAGAL\n\nTidak dapat mengunduh media."))
        }

        const fileName = getFileNameFromMessage(m)
        const filePath = path.join(UPLOAD_DIR, 'sftp_' + Date.now() + '_' + fileName)

        fs.writeFileSync(filePath, buffer)

        const { sftp, cfg } = await getSFTPClient()
        const remotePath = cfg.remotePath || '/'

        // Ensure remote directory exists
        if (remotePath && remotePath !== '/') {
            await ensureRemoteDir(sftp, remotePath)
        }

        const remoteFilePath = remotePath + '/' + fileName

        // Upload file
        await sftp.put(filePath, remoteFilePath)

        // Verify upload
        let remoteSize = 0
        try {
            const stat = await sftp.stat(remoteFilePath)
            remoteSize = stat.size
        } catch (e) { console.error('[uploadsftp.js]:', e.message); }

        await sftp.end()

        // Cleanup local temp
        try { fs.unlinkSync(filePath) } catch (e) { console.error('[uploadsftp.js]:', e.message); }
        let body = "BERHASIL UPLOAD\n\n"
        body += "*sftp upload*\n\n"
        body += "Nama: " + fileName + "\n"
        body += "Size: " + formatBytes(buffer.length) + "\n"
        body += "Remote: " + remoteFilePath + "\n"
        body += "Verified: " + (remoteSize === buffer.length ? 'YES' : 'CHECK') + " (" + formatBytes(remoteSize) + ")"

        await m.react("🐣");
        return m.reply(raraWrap("Upload SFTP", body))

    } catch (error) {
    await m.react("❌");
        console.error('[UploadSFTP] Error:', error.message)

        if (error.message === 'NO_CONFIG') {
            return m.reply(raraWrap("Upload SFTP",
                "GAGAL - Config belum di-setup\n\n" +
                "*cara setup:*\n" +
                "1. Buat file `sftp-config.json` di folder `config/`\n" +
                "2. Isi format:\n\n" +
                "```json\n" +
                "{\n" +
                '  "host": "127.0.0.1",\n' +
                '  "port": 22,\n' +
                '  "username": "user",\n' +
                '  "password": "pass",\n' +
                '  "remotePath": "/uploads"\n' +
                "}\n" +
                "```\n\n" +
                "Atau pakai Private Key:\n" +
                "```json\n" +
                "{\n" +
                '  "host": "127.0.0.1",\n' +
                '  "port": 22,\n' +
                '  "username": "user",\n' +
                '  "privateKey": "-----BEGIN ...",\n' +
                '  "passphrase": "optional",\n' +
                '  "remotePath": "/uploads"\n' +
                "}\n" +
                "```\n\n" +
                "Lalu: `.uploadsftp status`"
            ))
        }

        if (error.message === 'INVALID_CONFIG') {
            return m.reply(raraWrap("Upload SFTP",
                "GAGAL\n\nFile config tidak valid. Pastikan format JSON benar."
            ))
        }

        if (error.message === 'NO_AUTH') {
            return m.reply(raraWrap("Upload SFTP",
                "GAGAL\n\nTidak ada metode auth. Isi `password` atau `privateKey` di config."
            ))
        }

        return m.reply(raraWrap("uploadsftp", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }
