/*
  Button — pesan tombol gaya "Users Info":
  header lokasi + thumbnail kecil di kanan, tombol balasan cepat dan tombol list.
*/
const Jimp = require("jimp")
const FotoReply = require("./FotoReply.js")
const { generateWAMessageFromContent, prepareWAMessageMedia, proto } = require("baileys")

const isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v)

// kecilkan foto sekali saja lalu simpan di cache (hemat memori & ukuran pesan)
const thumbCache = new WeakMap()
async function toThumb(buffer, size = 200) {
    if (!buffer) return null
    if (thumbCache.has(buffer)) return thumbCache.get(buffer)
    const img = await Jimp.read(buffer)
    const out = await img.cover(size, size).quality(70).getBufferAsync(Jimp.MIME_JPEG)
    thumbCache.set(buffer, out)
    return out
}

class Button {
    #sock
    constructor(sock) {
        if (!sock) throw new Error("Socket is required")
        this.#sock = sock
        this.title = ""
        this.subtitle = ""
        this.body = ""
        this.footer = ""
        this.thumb = null
        this.contextInfo = {}
        this.buttons = []
    }

    setTitle(v)     { this.title = v; return this }
    setSubtitle(v)  { this.subtitle = v; return this }
    setBody(v)      { this.body = v; return this }
    setFooter(v)    { this.footer = v; return this }
    setThumbnail(v) { this.thumb = v; return this }

    setContextInfo(obj) {
        if (!isObj(obj)) throw new TypeError("ContextInfo must be a plain object")
        this.contextInfo = obj
        return this
    }

    // tombol balasan cepat (berdampingan)
    addButton(displayText, buttonId) {
        this.buttons.push({ buttonId, buttonText: { displayText }, type: 1 })
        return this
    }

    // tombol list (dibuka langsung jadi sheet): rows = [{ title, description, id }]
    addList(displayText, sectionTitle, rows) {
        this.buttons.push({
            buttonId: "list",
            buttonText: { displayText },
            type: 1,
            nativeFlowInfo: {
                name: "single_select",
                paramsJson: JSON.stringify({
                    title: displayText,
                    sections: [{
                        title: sectionTitle,
                        highlight_label: "",
                        rows: rows.map((r) => ({ header: "", title: r.title, description: r.description || "", id: r.id }))
                    }]
                })
            }
        })
        return this
    }

    async send(jid, { quoted, ...options } = {}) {
        quoted = await FotoReply.wrap(quoted)
        const jpegThumbnail = await toThumb(this.thumb)

        const msg = generateWAMessageFromContent(jid, {
            buttonsMessage: {
                contentText: this.body,
                footerText: this.footer,
                headerType: 6,
                locationMessage: {
                    degreesLatitude: 0,
                    degreesLongitude: 0,
                    name: this.title,
                    address: this.subtitle,
                    jpegThumbnail
                },
                contextInfo: {
                    ...(quoted ? {
                        stanzaId: quoted.key.id,
                        participant: quoted.sender,
                        remoteJid: quoted.chat,
                        quotedMessage: quoted.message
                    } : {}),
                    ...this.contextInfo
                },
                buttons: this.buttons
            }
        }, { quoted, ...options })

        await this.#sock.relayMessage(msg.key.remoteJid, msg.message, {
            messageId: msg.key.id,
            additionalNodes: [{
                tag: "biz",
                attrs: {},
                content: [{
                    tag: "interactive",
                    attrs: { type: "native_flow", v: "1" },
                    content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }]
                }]
            }]
        })
        return msg
    }
}

/**
 * Pesan native flow biasa (tombol lebar, tersusun ke bawah).
 * buttons: [{ name, buttonParamsJson }]
 */
async function sendNative(sock, jid, { body, footer = "", buttons, image = null, video = null, contextInfo = {} }, options = {}) {
    if (options.quoted) options = { ...options, quoted: await FotoReply.wrap(options.quoted) }
    let header = proto.Message.InteractiveMessage.Header.fromObject({ title: "", hasMediaAttachment: false })
    if (video) {
        // video (di menu utama: video + foto sudah digabung jadi satu video bertumpuk) dikirim sebagai header
        const media = await prepareWAMessageMedia({ video, mimetype: "video/mp4" }, { upload: sock.waUploadToServer })
        // autoplay: mode GIF = putar otomatis, berulang, tanpa suara (WhatsApp tidak mengizinkan autoplay dengan suara)
        if (media.videoMessage) media.videoMessage.gifPlayback = global.menuVideoAutoplay !== false
        header = proto.Message.InteractiveMessage.Header.fromObject({ title: "", hasMediaAttachment: true, ...media })
    } else if (image) {
        // foto dibuat besar (lebar penuh) seperti pesan gambar biasa: kirim ukuran asli + thumbnail jelas
        const media = await prepareWAMessageMedia({ image }, { upload: sock.waUploadToServer })
        try {
            const img = await Jimp.read(image)
            media.imageMessage.width = img.bitmap.width
            media.imageMessage.height = img.bitmap.height
            media.imageMessage.jpegThumbnail = await img.clone().resize(480, Jimp.AUTO).quality(80).getBufferAsync(Jimp.MIME_JPEG)
        } catch (e) {}
        header = proto.Message.InteractiveMessage.Header.fromObject({ title: "", hasMediaAttachment: true, ...media })
    }
    const msg = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
            message: {
                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                    header,
                    body: proto.Message.InteractiveMessage.Body.fromObject({ text: body }),
                    footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: footer }),
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons }),
                    contextInfo
                })
            }
        }
    }, options)
    await sock.relayMessage(jid, msg.message, { messageId: msg.key.id })
    return msg
}

// tombol URL: link tersembunyi, yang tampil hanya teks tombolnya
const urlButton = (text, url) => ({
    name: "cta_url",
    buttonParamsJson: JSON.stringify({ display_text: text, url, merchant_url: url })
})

const quickButton = (text, id) => ({
    name: "quick_reply",
    buttonParamsJson: JSON.stringify({ display_text: text, id })
})

const listButton = (text, sectionTitle, rows) => ({
    name: "single_select",
    buttonParamsJson: JSON.stringify({
        title: text,
        sections: [{ title: sectionTitle, rows: rows.map((r) => ({ header: "", title: r.title, description: r.description || "", id: r.id })) }]
    })
})

module.exports = Button
module.exports.sendNative = sendNative
module.exports.urlButton = urlButton
module.exports.listButton = listButton
module.exports.quickButton = quickButton
