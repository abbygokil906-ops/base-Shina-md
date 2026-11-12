const fs = require("fs")
const path = require("path")
const { randomBytes } = require("crypto")
const { Usage, needAdmin, mediaOf } = require("./_lib.js")

// kirim SW (status grup) ke satu grup
async function postGroupStatus(sock, jid, content) {
    const { generateWAMessageContent, generateWAMessageFromContent, proto } = require("baileys")
    const inside = await generateWAMessageContent(content, { upload: sock.waUploadToServer })
    const messageSecret = randomBytes(32)
    const msg = generateWAMessageFromContent(jid, proto.Message.fromObject({
        messageContextInfo: { messageSecret },
        groupStatusMessageV2: { message: { ...inside, messageContextInfo: { messageSecret } } }
    }), { userJid: sock.user.id })
    await sock.relayMessage(jid, msg.message, { messageId: msg.key.id })
}

// isi SW: foto / video / audio (kirim langsung atau reply) atau teks saja
async function buildContent(m, caption) {
    const media = await mediaOf(m, /image|video|audio/)
    if (media) {
        if (/image/.test(media.mime)) return { image: media.buffer, caption }
        if (/video/.test(media.mime)) return { video: media.buffer, caption }
        return { audio: media.buffer, mimetype: "audio/mp4", ptt: false }
    }
    const teks = (caption || m.quoted?.text || "").trim()
    if (!teks) throw new Usage()
    return { text: teks }
}

const blacklist = () => {
    try { return JSON.parse(fs.readFileSync(require("../../source/DbPath.js")("bljpm.json"), "utf8")).blacklistJpm || [] } catch (e) { return [] }
}

module.exports = {
    name: "swgc",
    command: ["swgc", "swgca"],
    desc: "Bikin SW (status grup): teks / foto / video. swgca = ke semua grup (owner)",
    usage: "<teks>  (atau kirim/reply foto, video, teks)",
    example: "Halo semuanya!",
    async run({ sock, m, command, text, isOwner }) {
        // ----- swgca: semua grup, owner saja -----
        if (command === "swgca") {
            if (!isOwner) throw new Usage(global.mess?.owner || "Fitur ini hanya untuk ownerbot.")
            const content = await buildContent(m, text)
            const all = Object.keys(await sock.groupFetchAllParticipating())
            const skip = new Set(blacklist())
            const targets = all.filter((id) => !skip.has(id))
            await m.reply(`⏳ Mengirim SW ke ${targets.length} grup...`)
            let ok = 0, fail = 0
            for (const id of targets) {
                try { await postGroupStatus(sock, id, content); ok++ } catch (e) { fail++ }
                await new Promise((r) => setTimeout(r, 3000))   // jeda biar aman dari banned
            }
            return m.reply(`✅ SW terkirim ke ${ok} grup${fail ? `, gagal ${fail}` : ""}${skip.size ? `\n(grup blacklist JPM dilewati)` : ""}`)
        }

        // ----- swgc: grup ini (owner boleh tentukan grup lain: .swgc 1203xxx@g.us | teks) -----
        let jid = m.chat
        let caption = text
        const first = (text.split(/\s+/)[0] || "")
        if (isOwner && /@g\.us$/.test(first)) { jid = first; caption = text.slice(first.length).replace(/^\s*\|?\s*/, "") }
        else needAdmin(m, isOwner)
        const content = await buildContent(m, caption)
        await postGroupStatus(sock, jid, content)
        await m.reply("✅ SW grup terkirim.")
    }
}
