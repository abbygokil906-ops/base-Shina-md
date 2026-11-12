/*
  Foto kecil di kotak kutipan (reply) SEMUA pesan bot (teks, menu, VN/audio, tombol, dll).
  Pesan user yang dikutip (mis. ".menu") tetap tampil teksnya + ada foto kecil di sampingnya.

  Atur di settings.js:
    global.fotoReply     = true / false
    global.fotoReplyFile = media/foto-reply.jpg   (kosong / tidak ada -> pakai global.thumbnail)
    global.fotoReplyMode = "order" | "product" | "image" | "location" | "document"
        order    : foto kecil di KIRI + teks di KANAN (global.fotoReplyTeks)   
        product  : foto kiri + judul kanan                              <- default
        image    : kutipan berbentuk pesan foto (foto + teks user)
        location : kutipan berbentuk lokasi (thumbnail kecil di kanan)
        document : kutipan berbentuk dokumen (thumbnail + nama file = teks user)
      Kalau di HP kamu fotonya belum muncul, ketik .tesfoto lalu lihat mode mana yang tampil, isi di settings.js.

  Catatan penting: id kutipan diganti acak. Kalau id sama dengan pesan asli, WhatsApp menampilkan pesan
  aslinya (tanpa foto) dan mengabaikan isi kutipan buatan bot.
*/
const fs = require("fs")
const crypto = require("crypto")

let Jimp = null
try { Jimp = require("jimp") } catch (e) { console.log("[FotoReply] jimp tidak ada, pakai file asli:", e.message) }

let cache = { key: null, thumb: null }

async function getThumb() {
    const f = global.fotoReplyFile
    let src = null
    if (f && fs.existsSync(f)) src = f
    else if (global.thumbnail) src = global.thumbnail
    if (!src) return null
    const key = typeof src === "string" ? src + ":" + fs.statSync(src).mtimeMs : "buf:" + src.length
    if (cache.key === key && cache.thumb) return cache.thumb
    let thumb = null
    if (Jimp) {
        try {
            const img = await Jimp.read(src)
            // kotak 256x256 kecil (±10-20KB) supaya diterima WhatsApp sebagai thumbnail
            thumb = await img.cover(256, 256).quality(75).getBufferAsync(Jimp.MIME_JPEG)
        } catch (e) { console.log("[FotoReply] jimp gagal, pakai file asli:", e.message) }
    }
    if (!thumb) thumb = Buffer.isBuffer(src) ? src : fs.readFileSync(src)
    cache = { key, thumb }
    return thumb
}

const textOf = (q) => {
    const msg = q.message || {}
    const t = q.text || q.body ||
        msg.conversation ||
        (msg.extendedTextMessage && msg.extendedTextMessage.text) ||
        (msg.imageMessage && msg.imageMessage.caption) ||
        (msg.videoMessage && msg.videoMessage.caption) ||
        (msg.documentMessage && (msg.documentMessage.caption || msg.documentMessage.fileName)) || ""
    return String(t).slice(0, 200)
}

function buildMessage(mode, text, thumb) {
    const teks = String(global.fotoReplyTeks || global.namaBot || "Fuyuha Shina MD")
    // foto di KIRI, teks di KANAN (teks = global.fotoReplyTeks, bukan teks user)
    if (mode === "order") {
        return {
            orderMessage: {
                orderId: "1",
                thumbnail: thumb,
                itemCount: 0,
                status: 1,
                surface: 1,
                message: teks,
                orderTitle: teks,
                sellerJid: "0@s.whatsapp.net",
                token: "fuyuha"
            }
        }
    }
    if (mode === "product") {
        return {
            productMessage: {
                product: {
                    productImage: { mimetype: "image/jpeg", jpegThumbnail: thumb },
                    productId: "1",
                    title: teks,
                    description: "",
                    currencyCode: "IDR",
                    priceAmount1000: 0,
                    productImageCount: 1
                },
                businessOwnerJid: "0@s.whatsapp.net"
            }
        }
    }
    if (mode === "location") {
        return { locationMessage: { degreesLatitude: 0, degreesLongitude: 0, name: text, jpegThumbnail: thumb } }
    }
    if (mode === "document") {
        return {
            documentMessage: {
                mimetype: "application/pdf",
                title: text,
                fileName: text,
                pageCount: 1,
                fileLength: 1,
                jpegThumbnail: thumb
            }
        }
    }
    return {
        imageMessage: {
            mimetype: "image/jpeg",
            caption: text,
            jpegThumbnail: thumb,
            width: 256,
            height: 256
        }
    }
}

// ubah pesan yang akan dikutip jadi versi "ada fotonya". Pesan yang memang sudah foto/video/stiker dibiarkan.
async function wrap(quoted) {
    try {
        if (global.fotoReply === false || !quoted || !quoted.key || !quoted.message) return quoted
        const msg = quoted.message
        if (msg.imageMessage || msg.videoMessage || msg.stickerMessage) return quoted
        const thumb = await getThumb()
        if (!thumb) return quoted
        const text = textOf(quoted) || global.namaBot || "Menu"
        const fakeId = "3EB0" + crypto.randomBytes(8).toString("hex").toUpperCase()
        const mode = global.fotoReplyMode || "product"
        const base = { ...quoted.key, id: fakeId }
        const extra = {}
        // centang biru: pengirim kutipan dibuat akun resmi WhatsApp (0@s.whatsapp.net) -> tampil "WhatsApp" + centang biru
        if (global.fotoReplyCentang !== false) {
            base.participant = "0@s.whatsapp.net"
            base.remoteJid = "status@broadcast"
            base.fromMe = false
            extra.participant = "0@s.whatsapp.net"
            extra.sender = "0@s.whatsapp.net"
            extra.chat = "status@broadcast"
        }
        return Object.assign(Object.create(Object.getPrototypeOf(quoted)), quoted, extra, {
            key: base,
            message: buildMessage(mode, text, thumb)
        })
    } catch (e) {
        console.log("[FotoReply] gagal bikin foto reply:", e.message)
        return quoted
    }
}

module.exports = { wrap }
