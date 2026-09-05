// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import { novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";
import path from 'path'
import te from '../../src/lib/nova-error.js'
import { claraWrap } from "../../src/lib/nova-menu-style.js"

const pluginConfig = {
    name: 'uploadgdrive',
    alias: ["uploadgdrive"],
    category: 'tools',
    description: 'Upload file/media ke Google Drive via Service Account',
    usage: '.uploadgdrive (reply media/berkas)',
    example: '.uploadgdrive',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 3,
    isEnabled: true
}

const CREDS_PATH = path.join(process.cwd(), 'config', 'gdrive-service-account.json')
const FOLDER_ID_FILE = path.join(process.cwd(), 'config', 'gdrive-folder-id.txt')
const UPLOAD_DIR = path.join(process.cwd(), 'tmp', 'gdrive-uploads')

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

let _driveClient = null
let _googleapis = null

async function loadGoogleAPIs() {
    if (_googleapis) return _googleapis
    _googleapis = await import('googleapis')
    return _googleapis
}

async function getDriveClient() {
    if (_driveClient) return _driveClient

    if (!fs.existsSync(CREDS_PATH)) {
        throw new Error('NO_CREDENTIALS')
    }

    let credentials
    try {
        credentials = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf-8'))
    } catch {
        throw new Error('INVALID_CREDENTIALS')
    }

    if (!credentials.client_email || !credentials.private_key) {
        throw new Error('INVALID_CREDENTIALS')
    }

    const { google } = await loadGoogleAPIs()

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file']
    })

    const authClient = await auth.getClient()
    _driveClient = google.drive({ version: 'v3', auth: authClient })
    return _driveClient
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
    } catch (e) { console.error('[uploadgdrive.js]:', e.message); }
    return 'file_' + Date.now() + '.bin'
}

async function uploadToDrive(filePath, fileName, folderId) {
    const drive = await getDriveClient()
    const mimeType = getMimeType(fileName)

    const fileMetadata = { name: fileName }
    if (folderId) fileMetadata.parents = [folderId]

    const media = {
        mimeType,
        body: fs.createReadStream(filePath)
    }

    const response = await drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, name, size, webViewLink, webContentLink'
    })

    try {
        await drive.permissions.create({
            fileId: response.data.id,
            requestBody: { role: 'reader', type: 'anyone' }
        })
    } catch (err) {
        console.error('[GDrive] Permission error:', err.message)
    }

    return response.data
}

async function listDriveFiles(maxResults) {
    const drive = await getDriveClient()
    const response = await drive.files.list({
        pageSize: maxResults || 10,
        fields: 'files(id, name, size, createdTime, webViewLink)',
        orderBy: 'createdTime desc',
        q: "'me' in owners"
    })
    return response.data.files || []
}

async function deleteDriveFile(fileId) {
    const drive = await getDriveClient()
    await drive.files.delete({ fileId })
    return true
}

function formatBytes(bytes) {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getStoredFolderId() {
    try {
        if (fs.existsSync(FOLDER_ID_FILE)) {
            return fs.readFileSync(FOLDER_ID_FILE, 'utf-8').trim() || null
        }
    } catch (e) { console.error('[uploadgdrive.js]:', e.message); }
    return null
}

function setStoredFolderId(id) {
    const configDir = path.join(process.cwd(), 'config')
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true })
    if (id) {
        fs.writeFileSync(FOLDER_ID_FILE, id)
    } else if (fs.existsSync(FOLDER_ID_FILE)) {
        fs.unlinkSync(FOLDER_ID_FILE)
    }
}

async function handler(m, { sock }) {
    const text = m.text || ''
    const args = text.trim().split(/\s+/).slice(1)
    const subCmd = (args[0] || '').toLowerCase()

    if (subCmd === 'setfolder') {
        const folderId = args[1]
        if (!folderId) {
            const current = getStoredFolderId()
            return m.reply(claraWrap("Upload GDrive",
                "*ɢᴅʀɪᴠᴇ ꜰᴏʟᴅᴇʀ ɪᴅ*\n\n" +
                "Current: `" + (current || 'none (root)') + "`\n\n" +
                "Set folder: `.uploadgdrive setfolder <folderId>`\n" +
                "Reset: `.uploadgdrive setfolder reset`"
            ))
        }
        if (folderId.toLowerCase() === 'reset') {
            setStoredFolderId(null)
            return m.reply(claraWrap("Upload GDrive", "BERHASIL\n\nFolder ID di-reset ke root."))
        }
        setStoredFolderId(folderId)
        return m.reply(claraWrap("Upload GDrive", "BERHASIL\n\nFolder ID: `" + folderId + "`\nUpload selanjutnya akan masuk ke folder ini."))
    }

    if (subCmd === 'list') {
        try {
            const files = await listDriveFiles(10)
            if (files.length === 0) {
                return m.reply(claraWrap("Upload GDrive", "*ɢᴅʀɪᴠᴇ ꜰɪʟᴇꜱ*\n\nBelum ada file di Drive."))
            }
            let body = "*GDrive Files (" + files.length + ")*\n\n"
            files.forEach(function(f, i) {
                body += (i + 1) + ". *" + f.name + "*\n"
                body += "   Size: " + formatBytes(parseInt(f.size || 0)) + "\n"
                body += "   Link: " + (f.webViewLink || 'N/A') + "\n\n"
            })
            return m.reply(claraWrap("Upload GDrive", body))
        } catch (err) {
            return m.reply(claraWrap("Upload GDrive", "GAGAL\n\n" + err.message))
        }
    }

    if (subCmd === 'delete' || subCmd === 'del') {
        const fileId = args[1]
        if (!fileId) {
            return m.reply(claraWrap("Upload GDrive",
                "*ᴅᴇʟᴇᴛᴇ ɢᴅʀɪᴠᴇ ꜰɪʟᴇ*\n\n" +
                "📌 *Cara Pakai:* `.uploadgdrive delete <fileId>`\n" +
                "Lihat fileId: `.uploadgdrive list`"
            ))
        }
        try {
            await deleteDriveFile(fileId)
            return m.reply(claraWrap("Upload GDrive", "BERHASIL\n\nFile `" + fileId + "` berhasil dihapus."))
        } catch (err) {
            return m.reply(claraWrap("Upload GDrive", "GAGAL\n\n" + err.message))
        }
    }

    if (subCmd === 'status') {
        const hasCreds = fs.existsSync(CREDS_PATH)
        let credsInfo = ''
        if (hasCreds) {
            try {
                const creds = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf-8'))
                credsInfo = "\nEmail: `" + (creds.client_email || '?') + "`"
            } catch (e) { console.error('[uploadgdrive.js]:', e.message); }
        }
        return m.reply(claraWrap("Upload GDrive",
            "*ɢᴅʀɪᴠᴇ ꜱᴛᴀᴛᴜꜱ*\n\n" +
            "Credentials: " + (hasCreds ? 'Terpasang' : 'Belum ada') + credsInfo + "\n" +
            "Folder ID: `" + (getStoredFolderId() || 'root') + "`\n\n" +
            "Setup: Taruh `gdrive-service-account.json` di folder `config/`"
        ))
    }

    // Default: upload media
    const hasMedia = m.isMedia || (m.quoted && m.quoted.isMedia)

    if (!hasMedia) {
        return m.reply(
            "GAGAL\n\n" +
            "Reply media/berkas dengan `" + m.prefix + "uploadgdrive`\n\n" +
            "*ꜱᴜʙ-ᴄᴏᴍᴍᴀɴᴅꜱ:*\n" +
            "`" + m.prefix + "uploadgdrive status` - Cek status\n" +
            "`" + m.prefix + "uploadgdrive list` - List 10 file terakhir\n" +
            "`" + m.prefix + "uploadgdrive setfolder <id>` - Set folder tujuan\n" +
            "`" + m.prefix + "uploadgdrive delete <id>` - Hapus file", "uploadgdrive")
    }
    try {
    await m.react("🕒");
        const downloadFn = m.quoted ? m.quoted.download : m.download
        const buffer = await downloadFn()

        if (!buffer || buffer.length === 0) {
            return m.reply(claraWrap("Upload GDrive", "GAGAL\n\nTidak dapat mengunduh media."))
        }

        const fileName = getFileNameFromMessage(m)
        const filePath = path.join(UPLOAD_DIR, 'gdrive_' + Date.now() + '_' + fileName)

        fs.writeFileSync(filePath, buffer)

        const folderId = getStoredFolderId()
        const result = await uploadToDrive(filePath, fileName, folderId)

        try { fs.unlinkSync(filePath) } catch (e) { console.error('[uploadgdrive.js]:', e.message); }
        let body = "BERHASIL UPLOAD\n\n"
        body += "*ɢᴏᴏɢʟᴇ ᴅʀɪᴠᴇ*\n\n"
        body += "Nama: " + result.name + "\n"
        body += "Size: " + formatBytes(parseInt(result.size || buffer.length)) + "\n"
        body += "File ID: `" + result.id + "`\n\n"
        body += "*ʟɪɴᴋ:*\n" + (result.webViewLink || 'N/A')

        await m.react("🐣");
        return m.reply(claraWrap("Upload GDrive", body))

    } catch (error) {
    await m.react("❌");
        console.error('[UploadGDrive] Error:', error.message)

        if (error.message === 'NO_CREDENTIALS') {
            return m.reply(claraWrap("Upload GDrive",
                "GAGAL - Service Account belum di-setup\n\n" +
                "*ᴄᴀʀᴀ ꜱᴇᴛᴜᴘ:*\n" +
                "1. Buka https://console.cloud.google.com\n" +
                "2. Buat project baru, enable Google Drive API\n" +
                "3. IAM > Service Accounts > Create\n" +
                "4. Download JSON key\n" +
                "5. Rename jadi `gdrive-service-account.json`\n" +
                "6. Taruh di folder `config/`\n\n" +
                "Lalu jalankan: `.uploadgdrive status`"
            ))
        }

        if (error.message === 'INVALID_CREDENTIALS') {
            return m.reply(claraWrap("Upload GDrive",
                "GAGAL\n\nFile JSON tidak valid. Pastikan format Service Account benar."
            ))
        }

        return m.reply(claraWrap("uploadgdrive", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }
