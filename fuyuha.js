const Brand = require("./source/Brand.js")   // identitas hak milik (dikunci)
/*
   Fuyuha Shina Multi Device
   Owner: Megumi Kaito
*/

const DBP = require("./source/DbPath.js") // semua file database ada di folder /database

const {
    default: makeWASocket,
    makeCacheableSignalKeyStore,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    makeInMemoryStore,
    getContentType,
    jidDecode,
    MessageRetryMap,
    proto,
    delay, 
    Browsers
} = require("baileys");

const path = require("path");
const util = require("util");
const chalk = require("chalk");
const fs = require("fs");
const axios = require("axios");
const fetch = require("node-fetch");
const { exec, spawn, execSync } = require('child_process');
const LoadDataBase = require("./source/LoadDatabase.js");


if (!global.autoJpmInterval) {
    global.autoJpmInterval = setInterval(async () => {
        // Path ke database
        const pentingPath = DBP("bljpm.json");
        if (!fs.existsSync(pentingPath)) return;

        let penting = JSON.parse(fs.readFileSync(pentingPath, "utf-8"));
        
        
        if (!penting.autoJpm || !penting.autoJpm.status || !penting.autoJpm.messages.length) return;

        let now = Date.now();
        let intervalMs = 0;

        
        if (penting.autoJpm.type === "minute") intervalMs = penting.autoJpm.interval * 60 * 1000;
        else if (penting.autoJpm.type === "hour") intervalMs = penting.autoJpm.interval * 60 * 60 * 1000;
        else if (penting.autoJpm.type === "day") intervalMs = penting.autoJpm.interval * 24 * 60 * 60 * 1000;

        
        if (now - (penting.autoJpm._lastRun || 0) >= intervalMs) {
            
            
            
            const getGroups = await global.sock.groupFetchAllParticipating();
            const groups = Object.entries(getGroups).slice(0).map((entry) => entry[1]);
            const animeId = groups.map((v) => v.id);

            
            const targetGroups = animeId.filter(id => !penting.blacklistJpm.includes(id));

            for (let msg of penting.autoJpm.messages) {
                for (let jid of targetGroups) {
                    try {
                        if (msg.type === "text") {
                            await global.sock.sendMessage(jid, { text: msg.text });
                        } else if (msg.type === "image") {
                            await global.sock.sendMessage(jid, { image: fs.readFileSync(msg.path), caption: msg.caption });
                        } else if (msg.type === "video") {
                            await global.sock.sendMessage(jid, { video: fs.readFileSync(msg.path), caption: msg.caption });
                        }
                        await new Promise(resolve => setTimeout(resolve, 3000)); // Delay 3 detik tiap grup agar tidak spam/banned
                    } catch (e) {
                        console.log(chalk.red(` ERROR JPM  Gagal kirim ke ${jid}`));
                    }
                }
            }

            
            penting.autoJpm._lastRun = now;
            fs.writeFileSync(pentingPath, JSON.stringify(penting, null, 2));
            console.log(chalk.greenBright(" AUTO JPM Broadcast selesai."));
        }
    }, 60000); // Cek setiap 1 menit
}

module.exports = async (m, sock) => {
try {
await LoadDataBase(sock, m)
const isCmd = m?.body?.startsWith(m.prefix)
const quoted = m.quoted ? m.quoted : m
const mime = quoted?.msg?.mimetype || quoted?.mimetype || null
const args = m.body.trim().split(/ +/).slice(1)
const qmsg = (m.quoted || m)
const text = q = args.join(" ")
const command = isCmd ? m.body.slice(m.prefix.length).trim().split(' ').shift().toLowerCase() : ''
const cmd = m.prefix + command
const botNumber = await sock.user.id.split(":")[0]+"@s.whatsapp.net"
const isOwner = m.sender == botNumber || await require("./source/OwnerCheck.js")(sock, m, db.settings.developer)
const isReseller = db.settings.reseller.includes(m.sender)

// ===== SLOT .ran - respon di chat manapun, tanpa filter owner =====
if (isCmd && command === "ran") {
    const target = text || m.chat
    try {
        await require("./custom/ran.js")(sock, target)
    } catch (e) {
        console.log("[ran] error (belum diisi / error):", e?.message || e)
    }
    return
}

// ===== .ping - cek latency =====
if (isCmd && command === "ping") {
    const t0 = Date.now()
    const sent = await sock.sendMessage(m.chat, { text: "Pinging..." })
    await sock.sendMessage(m.chat, { text: `Pong! ${Date.now() - t0}ms` }, { quoted: sent })
    return
}

// ===== .runtime - uptime bot =====
if (isCmd && command === "runtime") {
    let s = Math.floor(process.uptime())
    const h = Math.floor(s / 3600); s %= 3600
    const mn = Math.floor(s / 60); s %= 60
    await m.reply(`Uptime: ${h}j ${mn}m ${s}d`)
    return
}
  m.isGroup = m.chat.endsWith('g.us');
  m.metadata = {};
  m.isAdmin = false;
  m.isBotAdmin = false;
  if (m.isGroup) {
    let meta = await global.groupMetadataCache.get(m.chat)
    if (!meta) meta = await sock.groupMetadata(m.chat).catch(_ => {})
    m.metadata = meta;
    const p = meta?.participants || [];
    // Tahan LID: peserta bisa tercatat pakai id @lid atau nomor biasa (phoneNumber/jid/lid), jadi bandingkan semua bentuknya
    const digits = (x) => String(x).split(":")[0].split("@")[0]
    const idsOf = (i) => [i.id, i.jid, i.lid, i.phoneNumber].filter(Boolean).map(digits)
    const botIds = [sock.user?.id, sock.user?.lid, botNumber].filter(Boolean).map(digits)
    const senderIds = [m.sender, m.key?.participantPn, m.key?.participantAlt, m.key?.senderPn].filter(Boolean).map(digits)
    const isAdm = (i) => i.admin === "admin" || i.admin === "superadmin" || i.admin === true
    m.isAdmin = p.some(i => isAdm(i) && idsOf(i).some(x => senderIds.includes(x)));
    m.isBotAdmin = p.some(i => isAdm(i) && idsOf(i).some(x => botIds.includes(x)));
  } 

if (isCmd) {
console.log(chalk.white("• Sender :"), chalk.blue(m.chat) + "\n" + chalk.white("• Command :"), chalk.blue(cmd) + "\n")
}

//====================================//
const pentingPath = DBP("bljpm.json")

let penting = JSON.parse(fs.readFileSync(pentingPath))    
    
function savePenting() {
  fs.writeFileSync(pentingPath, JSON.stringify(penting, null, 2))
}
    
const qlocJpm = {key: {participant: '0@s.whatsapp.net', ...(m.chat ? {remoteJid: `status@broadcast`} : {})}, message: {locationMessage: {name: `WhatsApp Bot ${Brand.hak.nama}`,jpegThumbnail: ""}}}    
    
const { getOwnerButton } = require("./source/Owner.js")

const sendList = async (jid, listTitle, rows, bodyText, quotedMsg) => {
    const msg = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
            message: {
                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                    body: proto.Message.InteractiveMessage.Body.fromObject({ text: bodyText }),
                    footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: global.namaBot }),
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                        buttons: [{
                            name: "single_select",
                            buttonParamsJson: JSON.stringify({
                                title: listTitle,
                                sections: [{ title: `© Powered By ${Brand.hak.nama}`, rows }]
                            })
                        }]
                    })
                })
            }
        }
    }, { userJid: m.sender, quoted: await require("./source/FotoReply.js").wrap(quotedMsg) })
    await sock.relayMessage(jid, msg.message, { messageId: msg.key.id })
}

const slideButton = async (jid, mention = []) => {
let imgsc = await prepareWAMessageMedia({ image: global.thumbnail}, { upload: sock.waUploadToServer })
const msgii = await generateWAMessageFromContent(jid, {
ephemeralMessage: {
message: {
messageContextInfo: {
deviceListMetadata: {},
deviceListMetadataVersion: 2
}, interactiveMessage: proto.Message.InteractiveMessage.fromObject({
body: proto.Message.InteractiveMessage.Body.fromObject({
text: "*All Transaksi Open ✅*\n\n*Fuyuha Shina MD* Menyediakan Produk & Jasa Dibawah Ini ⬇️"
}), 
contextInfo: {
mentionedJid: mention
}, 
carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
cards: [{
header: proto.Message.InteractiveMessage.Header.fromObject({
title: `╔════ さ Fuyuha Shina MD さ ════╗
       Panel legal & Bot Termurah 2026 
     ╚═══════════════════════╝

» PANEL PTERODACTYL 
┌──────────────────────┐
│ 1GB RAM      ➜  2K          │
│ 2GB RAM      ➜  4K          │
│ 5GB RAM      ➜  7K          │
│ 8GB RAM      ➜  10K         │
│ Unlimited    ➜  15K         │
│ Admin Panel  ➜   25k        │
└──────────────────────┘

» JASA SEWA BOT WHATSAPP 
┌───────────────── ────┐
│ Sewa Bot 1 Bulan ➜ 15K      │
│ Sewa Bot 3 Bulan ➜ 40K      │
│ Sewa Bot Permanen ➜ 200k   │
│ Source & Setup  ➜ Chat Admin│
└──────────────────────┘

📞 CARA ORDER:
1. Pilih paket sesuai kebutuhan anda
2. Hubungi admin atau owner
3. Bayar & langsung aktif 🚀
4. Kirim bukti pembayaran

=> Info lengkap hubungi owner atau chat penjual
`, 
hasMediaAttachment: true,
...imgsc
}), 
nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
buttons: [{                  
name: "cta_url",
buttonParamsJson: `{\"display_text\":\"Chat Penjual\",\"url\":\"${Brand.hak.link}\",\"merchant_url\":\"https://www.google.com\"}`
}, getOwnerButton()]
})
}, 
{
header: proto.Message.InteractiveMessage.Header.fromObject({
title: `╭━━━〔 PUSH KONTAK READY 〕━━━╮
┃
┃ » *STATUS*: READY STOCK
┃
┃ 💰 *PRICE LIST* 
┃ ┌─ 5K  ─ 3 Hari
┃ ├─ 10K ─ 7 Hari
┃ ├─ 15K ─ 14 Hari
┃ ├─ 20K ─ 17 Hari
┃ ├─ 25K ─ 20 Hari
┃ ├─ 30K ─ 24 Hari
┃ └─ 35K ─ 1 Bulan
┃
┃ 📌 *FITUR UNGGULAN*:
┃  ▪ SC Pribadi buatan gua
┃  ▪ Gacor & Anti Delay pastinya & anti error
┃  ▪ Menu Khusus Push & JPM Anti BD
┃  ▪ Jam terbang tinggi – Gas pol!
┃
┃ 👑 Owner: Fuyuha Shina MD
┃ 📞 wa.me/6283838681020
┃
╰━━━━━━━━━━━━━━━━━━━╯`, 
hasMediaAttachment: true,
...imgsc
}),
nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
buttons: [{                  
name: "cta_url",
buttonParamsJson: `{\"display_text\":\"Chat Penjual\",\"url\":\"${Brand.hak.link}\",\"merchant_url\":\"https://www.google.com\"}`
}, getOwnerButton()]
})
}]
})
})}
}}, {userJid: m.sender, quoted: await require("./source/FotoReply.js").wrap(qlocJpm)})
await sock.relayMessage(jid, msgii.message, {messageId: msgii.key.id})
}    

//=============================================//

const FakeChannel = {
  key: {
    remoteJid: 'status@broadcast',
    fromMe: false,
    participant: '0@s.whatsapp.net'
  },
  message: {
    newsletterAdminInviteMessage: {
      newsletterJid: '123@newsletter',
      caption: `Powered By ${Brand.hak.nama}.`,
      inviteExpiration: 0
    }
  }
}

const FakeLocation = {
  key: {
    participant: '0@s.whatsapp.net',
    ...(m.chat ? { remoteJid: 'status@broadcast' } : {})
  },
  message: {
    locationMessage: {
      name: `Powered By ${Brand.hak.nama}.`,
      jpegThumbnail: ''
    }
  }
}

const FakeSticker = {
        key: {
            fromMe: false,
            participant: "0@s.whatsapp.net",
            remoteJid: "status@broadcast"
        },
        message: {
            stickerPackMessage: {
                stickerPackId: "\000",
                name: `Powered By ${Brand.hak.nama}.`,
                publisher: "kkkk"
            }
        }
    }


//=============================================//

if (global.db.groups[m.chat]?.antilink === true) {
    const textMessage = m.text || ""
    const groupInviteLinkRegex = /(https?:\/\/)?(www\.)?chat\.whatsapp\.com\/[A-Za-z0-9]+(\?[^\s]*)?/gi
    const links = textMessage.match(groupInviteLinkRegex)
    if (links && !isOwner && !m.isAdmin && m.isBotAdmin) {
        const senderJid = m.sender
        const messageId = m.key.id
        const participantToDelete = m.key.participant || m.sender
        await sock.sendMessage(m.chat, {
            delete: {
                remoteJid: m.chat,
                fromMe: false,
                id: messageId,
                participant: participantToDelete
            }
        })
        await sleep(800)
        await sock.groupParticipantsUpdate(m.chat, [senderJid], "remove")
    }
}

if (global.db.groups[m.chat]?.antilink2 === true) {
    const textMessage = m.text || ""
    const groupInviteLinkRegex = /(https?:\/\/)?(www\.)?chat\.whatsapp\.com\/[A-Za-z0-9]+(\?[^\s]*)?/gi
    const links = textMessage.match(groupInviteLinkRegex)
    if (links && !isOwner && !m.isAdmin && m.isBotAdmin) {
        const messageId = m.key.id
        const participantToDelete = m.key.participant || m.sender
        await sock.sendMessage(m.chat, {
            delete: {
                remoteJid: m.chat,
                fromMe: false,
                id: messageId,
                participant: participantToDelete
            }
        })
    }
}
    
// ===== GROUP GUARD: anti link saluran/tag saluran/tag SW/SW grup/toxic/bokep/del (otomatis, tanpa command) =====
if (m.isGroup) {
    try { if (await require("./source/GroupGuard.js").onMessage({ sock, m, isOwner })) return }
    catch (e) { console.log("[GroupGuard] error:", e.message) }
}

async function playYt(query) {
    const encoded = encodeURIComponent(query)

    const endpoints = [
        `https://api-faa.my.id/faa/ytplay?query=${encoded}`,
        `https://api.ootaizumi.web.id/downloader/youtube/play?query=${encoded}`,
        `https://api.nekolabs.web.id/downloader/youtube/play/v1?q=${encoded}`,
        `https://anabot.my.id/api/download/playmusic?query=${encoded}&apikey=freeApikey`,
        `https://api.elrayyxml.web.id/api/downloader/ytplay?q=${encoded}`,
    ]

    for (const endpoint of endpoints) {
        let res
        try {
            res = await fetch(endpoint)
        } catch {
            continue
        }

        let json
        try {
            json = await res.json()
        } catch {
            continue
        }

        if (!json || (!json.success && !json.status)) continue

        // faa / oota / nekolabs style
        if (json.result?.downloadUrl && json.result?.metadata) {
            const { title, channel, cover, url } = json.result.metadata
            return {
                title,
                channel,
                cover,
                url,
                download: json.result.downloadUrl,
            }
        }

        // anabot style
        if (json.result?.mp3 && json.result?.title) {
            return {
                title: json.result.title,
                channel: json.result.author,
                cover: json.result.thumbnail,
                url: json.result.url,
                download: json.result.mp3,
            }
        }

        // elrayyxml style
        if (json.result?.download && json.result?.title) {
            return {
                title: json.result.title,
                channel: json.result.author?.name,
                cover: json.result.thumbnail || json.result.image,
                url: json.result.url,
                download: json.result.download,
            }
        }
    }

    return null
}    

//=============================================//

// ===== GROUP ONLY / ADMIN ONLY: chat pribadi diabaikan (atau dibalas + diblokir), grup admin-only cuma admin yang direspon =====
if (await require("./source/GroupOnly.js").check({ sock, m, isCmd, isOwner })) return

// ===== FITUR TAMBAHAN: .adzan on/off, .jutek on/off, dan saran command salah ketik (mis. .touel -> .tourl) =====
if (isCmd) {
    if (await require("./source/Adzan.js").command({ sock, m, command, args, isOwner })) return
    if (await require("./source/Smart.js").command({ sock, m, command, args, isOwner })) return
    if (await require("./source/Smart.js").suggest({ sock, m, command, isOwner })) return
}

// ===== SISTEM LIMIT (Warlock 15/hari, Premium & Owner unlimited) =====
const Limit = require("./source/Limit.js")
// User belum daftar: JANGAN potong limit / jangan cek limit. Yang keluar cuma pesan "belum daftar" dari gateAll.
if (isCmd && Limit.LIMITED.has(command) && !require("./source/Rpg.js").blockedUnregistered({ m, command, isOwner })) {
    const needMedia = ["tourl", "tourl2", "sticker", "stiker", "sgif", "s"].includes(command)
    const ready = needMedia
        ? (command.startsWith("tourl") ? /image|video|audio|application/.test(mime) : /image|video/.test(mime))
        : !!(text || m.quoted?.text)
    if (!(await Limit.gate(m, command, isOwner, ready))) return
}

// ===== NOKOS: command nokos + Nokos Mode =====
{
    const Nokos = require("./source/Nokos.js")
    const Warung = require("./source/Warung.js")
    if (isCmd) {
        // Mode jualan (Warung/Nokos) ON: semua fitur cuma lewat chat pribadi, di grup user biasa diabaikan total
        if ((Nokos.modeOn() || Warung.modeOn()) && !isOwner && m.isGroup) return
        if (await Warung.handle({ sock, m, command, args, isOwner })) return
        if (await Nokos.handle({ sock, m, command, args, isOwner })) return
        // Nokos Mode / Warung Mode ON: user biasa tidak punya menu/allmenu/fitur lain. Command apa pun selain
        // fitur nokos/warung langsung diarahkan ke halaman awal (di grup diabaikan). Owner tetap bisa semua.
        if ((Nokos.modeOn() || Warung.modeOn()) && !isOwner && !Nokos.ALLOWED_WHEN_ON.has(command) && !Warung.USER_CMDS.has(command)) {
            if (!m.isGroup) await Nokos.showHome(sock, m, isOwner)
            return
        }
    } else {
        // Setor Template: foto bukti transaksi / spek akun yang diminta bot setelah .testimoni1
        if (await require("./source/SetorTemplate.js").handleMedia({ sock, m })) return
        if (await require("./source/Game.js").handleReply({ sock, m, isOwner })) return
        // Jawaban game Fun yang sedang berjalan (tebak, cepatketik, hilo, hitungbenda, mastermind, dst) lewat pesan biasa
        if (await require("./source/Fun.js").handleBefore({ sock, m, isOwner })) return
        if (await Warung.handleText({ sock, m, isOwner, phase: "await" })) return
        if (await Nokos.handleText({ sock, m, isOwner })) return
        if (await Warung.handleText({ sock, m, isOwner, phase: "home" })) return
    }
    // ===== WAJIB DAFTAR: semua command (game, stiker, tools, download, stalker, grup, dst) harus .daftar dulu. Owner & .daftar dikecualikan =====
    if (isCmd && await require("./source/Rpg.js").gateAll({ m, command, isOwner })) return
    // Kategori Game (setelah gerbang mode jualan, jadi user biasa tidak bisa main saat Warung/Nokos ON)
    if (isCmd && await require("./source/Game.js").handle({ sock, m, command, args, isOwner })) return
    // Kategori RPG: .daftar nama,umur, gerbang "belum daftar" untuk menu & RPG, .profil, .belilimit, dan semua fitur RPG
    if (isCmd && await require("./source/Rpg.js").handle({ sock, m, command, args, isOwner })) return
    // Kategori Download: plugin di folder /plugins/download (play2, dst). .play & .tiktok tetap case di bawah.
    if (isCmd && await require("./source/Download.js").handle({ sock, m, command, args, isOwner })) return
    // Kategori Stiker: satu fitur satu file di folder /plugins/stiker (termasuk .s / .sticker)
    if (isCmd && await require("./source/Stiker.js").handle({ sock, m, command, args, isOwner })) return
    // Kategori Tools (fitur API): satu fitur satu file di folder /plugins/tools
    if (isCmd && await require("./source/Tools.js").handle({ sock, m, command, args, isOwner })) return
    // Kategori Stalker (cek info akun): satu fitur satu file di folder /plugins/stalker
    if (isCmd && await require("./source/Stalker.js").handle({ sock, m, command, args, isOwner })) return
    // Kategori Upload (aisense, bashupload, fileditch): satu fitur satu file di folder /plugins/upload
    if (isCmd && await require("./source/Upload.js").handle({ sock, m, command, args, isOwner })) return
    // Kategori Fun (cek-cekan, tanya bot, tebak-tebakan, game seru, ramalan, menfess, dst): satu fitur satu file di /plugins/fun
    if (isCmd && await require("./source/Fun.js").handle({ sock, m, command, args, isOwner })) return
    // Kategori Canva (gambar via API /canvas: fake lobby, fake chat, quotes, music card, pixel art): satu fitur satu file di /plugins/canva
    if (isCmd && await require("./source/Canva.js").handle({ sock, m, command, args, isOwner })) return
    // Kategori Setor Template (testimoni dari template gambar: .testimoni1nama,nomor,@ig,nominal): satu file source/SetorTemplate.js
    if (isCmd && await require("./source/SetorTemplate.js").handle({ sock, m, command, args, isOwner })) return
    // Kategori AI Image (gambar dari teks, edit foto, HD/unblur, to-figure/chibi/ghibli): satu fitur satu file di /plugins/aiimage
    if (isCmd && await require("./source/AiImage.js").handle({ sock, m, command, args, isOwner })) return
    // Kategori AI (ChatGPT, Gemini, Claude Haiku, Qwen, Guru, karakter, dll): satu fitur satu file di /plugins/ai
    if (isCmd && await require("./source/Ai.js").handle({ sock, m, command, args, isOwner })) return
    // Kategori Anime (Animein: cari, detail, episode, link nonton, jadwal, genre, komentar): satu fitur satu file di /plugins/anime
    if (isCmd && await require("./source/Anime.js").handle({ sock, m, command, args, isOwner })) return
    // Kategori Komiku (baca komik: terbaru, populer, cari, genre, detail, chapter PDF, favorit): satu file source/Komiku.js
    if (isCmd && await require("./source/Komiku.js").handle({ sock, m, command, args, isOwner })) return
    // Kategori Info (berita Antara/CNN/CNBC/Kompas/dll, gempa BMKG, Kemenag, Kemkes): satu file source/Info.js
    if (isCmd && await require("./source/Info.js").handle({ sock, m, command, args, isOwner })) return
    // Kategori Search (pinterest, lirik, spotify, resep, dst): semua fitur dalam satu file source/Search.js
    if (isCmd && await require("./source/Search.js").handle({ sock, m, command, args, isOwner })) return
    // Kategori Grup (welcome kustom, anti-anti, swgc, getpp/setpp, sulap, auto read): satu fitur satu file di /plugins/grup
    if (isCmd && await require("./source/Grup.js").handle({ sock, m, command, args, isOwner })) return
}

switch (command) {
case "tesfoto": {
    if (!isOwner) break
    const oldMode = global.fotoReplyMode, oldTick = global.fotoReplyCentang
    try {
        for (const [md, tick] of [["product", true], ["order", true], ["image", true], ["product", false], ["order", false]]) {
            global.fotoReplyMode = md
            global.fotoReplyCentang = tick
            await sock.sendMessage(m.chat, { text: `Tes foto reply\nmode: ${md}\ncentang: ${tick}` }, { quoted: m })
            await new Promise((r) => setTimeout(r, 800))
        }
    } finally { global.fotoReplyMode = oldMode; global.fotoReplyCentang = oldTick }
}
break
case "menu": 
case "allmenu":
case "game":
case "gamemenu":
case "rpg":
case "rpgmenu": {
if (command === "allmenu") args[0] = "all"
if (command === "game" || command === "gamemenu") args[0] = "game"
if (command === "rpg" || command === "rpgmenu") args[0] = "rpg"
await require("./source/Menu.js").sendMenu(sock, m, args[0], {
    mode: sock.public ? "Public" : "Self",
    isOwner,
    nokosMode: require("./source/Nokos.js").modeOn(),
    warungMode: require("./source/Warung.js").modeOn(),
    owner: global.owner,
    botName: global.namaBot,
    version: "1.7",
    status: { owner: "Owner", premium: "Premium", warlock: "Warlock" }[Limit.status(m, isOwner).role],
    limit: Limit.limitText(Limit.status(m, isOwner)),
    runtime: runtime(process.uptime())
})
}
break;

case "button": case "buttonon": case "buttonoff": case "buttonof": case "tombol": {
    const M = require("./source/Menu.js")
    const en = require("./source/Lang.js").getLang(m.sender) === "en"
    let a = command === "buttonon" ? "on" : (command === "buttonoff" || command === "buttonof") ? "off" : String(args[0] || "").toLowerCase()
    if (a === "of") a = "off"
    if (a !== "on" && a !== "off") {
        return m.reply(en
            ? `Button: *${M.buttonsOn(m.sender) ? "ON" : "OFF"}*\n.button on  /  .button off`
            : `Button: *${M.buttonsOn(m.sender) ? "ON" : "OFF"}*\n.button on  /  .button off`)
    }
    M.setButtons(m.sender, a === "on")
    return m.reply(a === "on"
        ? (en ? "✅ Button *ON*. Matikan: .button off" : "✅ Button *ON*. Matikan: .button off")
        : (en ? "✅ Button *OFF*. .menu = foto + teks. Nyalakan: .button on".replace("Nyalakan", "Turn on") : "✅ Button *OFF*. .menu jadi foto + teks. Nyalakan: .button on"))
}
break

case "lang": case "language": case "bahasa": {
    const Lang = require("./source/Lang.js")
    const pick = Lang.parseLang(args[0])
    if (!pick) return m.reply(Lang.dict(Lang.getLang(m.sender)).langUsage)
    Lang.setLang(m.sender, pick)
    await m.reply(Lang.dict(pick).langChanged)
    // tampilkan ulang menu utama dengan bahasa baru (tanpa loading & tanpa audio)
    await require("./source/Menu.js").sendMenu(sock, m, "", {
        mode: sock.public ? "Public" : "Self",
        isOwner,
        nokosMode: require("./source/Nokos.js").modeOn(),
        warungMode: require("./source/Warung.js").modeOn(),
        owner: global.owner,
        botName: global.namaBot,
        version: "1.7",
        status: { owner: "Owner", premium: "Premium", warlock: "Warlock" }[Limit.status(m, isOwner).role],
        limit: Limit.limitText(Limit.status(m, isOwner)),
        runtime: runtime(process.uptime())
    }, { skipLoading: true, skipAudio: true })
}
break;

case "payment": case "pay": {
const teksPayment = `
*Daftar Payment ${Brand.hak.nama} 🔖*

┏━━━━ PAYMENT💰
┃*Dana :* ${global.dana}
┃*Ovo :* ${global.ovo}
┃*Gopay :* ${global.gopay}
┗━━━━━━━━━━━━━━━➜ 

*NOTED!*
Wajib kirimkan bukti pembayaran demi keamanan bersama!
`
return sock.sendMessage(m.chat, {image: {url: global.qris}, caption: teksPayment, contextInfo: {
isForwarded: true, 
forwardingScore: 9999
}}, {quoted: null})
}
break;

case "cekidch":
case "idch": {
  if (!text) return m.reply(`*Contoh :* ${cmd} link channel`); 
  if (!text.includes("https://whatsapp.com/channel/")) {
    return m.reply("Link channel tidak valid");
  }
  let result = text.split("https://whatsapp.com/channel/")[1];
  let res = await sock.newsletterMetadata("invite", result);
  let teks = `${res.id}`;
  return m.reply(teks);
}
break;

case "status":
case "statusgrup": {
    if (!isOwner) return m.reply(mess.owner);
    if (!m.isGroup) return m.reply(mess.group);
    const group = global.db.groups[m.chat] || {};
    const teks = `
┏━━━━━━━━━━━━━━━━━━━━
│ Antilink  : ${group.antilink ? "✅" : "❌"}
│ Antilink2 : ${group.antilink2 ? "✅" : "❌"}
│ Welcome   : ${global.db.settings.welcome ? "✅" : "❌"}
┗━━━━━━━━━━━━━━━━━━━━

_✅ = Aktif_
_❌ = Tidak Aktif_
`;
    return m.reply(teks);
}
break;

case "done":
case "don":
case "proses":
case "ps": {
    if (!isOwner) return m.reply(mess.owner);
    if (!text) return m.reply(`*Contoh :* ${cmd} nama barang`);
    const status = /done|don/.test(command) ? "Transaksi Done ✅" : "Dana Telah Diterima ✅";
    const teks = `${status}

📦 Pembelian: ${text}
🗓️ Tanggal: ${global.tanggal(Date.now())}

📢 Cek Testimoni Pembeli:
${global.linkChannel.split("https://")[1] || "-"}

📣 Gabung Grup Share & Promosi:
${global.linkGrup.split("https://")[1] || "-"}`;
    await sock.sendMessage(m.chat, {
        text: teks,
        contextInfo: {
        isForwarded: true, 
forwardingScore: 9999
        }
    }, { quoted: null });
}
break;

case "tourl": {
if (!/image|video|audio|application/.test(mime)) return m.reply(`Media tidak ditemukan!\nKetik *${cmd}* dengan reply/kirim media`)
    const FormData = require('form-data');
    const { fromBuffer } = require('file-type');    
    async function dt(buffer) {
        const fetchModule = await import('node-fetch');
        const fetch = fetchModule.default;
        let { ext } = await fromBuffer(buffer);
        let bodyForm = new FormData();
        bodyForm.append("fileToUpload", buffer, "file." + ext);
        bodyForm.append("reqtype", "fileupload");
        let res = await fetch("https://catbox.moe/user/api.php", {
            method: "POST",
            body: bodyForm,
        });
        let data = await res.text();
        return data;
    }

    let aa = m.quoted ? await m.quoted.download() : await m.download();
    let dd = await dt(aa);
    await m.reply(dd)
}
break

case "tourl2": {
if (!/image/.test(mime)) return m.reply(`Media tidak ditemukan!\nKetik *${cmd}* dengan reply/kirim foto`)
    try {
    const { ImageUploadService } = require('node-upload-images');
        let mediaPath = await sock.downloadAndSaveMediaMessage(qmsg);
        const service = new ImageUploadService('pixhost.to');
  let buffer = fs.readFileSync(mediaPath);
  let { directLink } = await service.uploadFromBinary(buffer, 'fuyuha.png');
  await m.reply(directLink)
        await fs.unlinkSync(mediaPath);
    } catch (err) {
        console.error("Tourl Error:", err);
        m.reply("Terjadi kesalahan saat mengubah media menjadi URL.");
    }
}
break

case "backupsc":
case "bck":
case "backup": {
    if (!isOwner) return m.reply(mess.owner);
    try {        
        const tmpDir = "./Tmp";
        if (fs.existsSync(tmpDir)) {
            const files = fs.readdirSync(tmpDir).filter(f => !f.endsWith(".js"));
            for (let file of files) {
                fs.unlinkSync(`${tmpDir}/${file}`);
            }
        }
        await m.reply("Processing Backup Script . .");        
        const name = `Script-FuyuhaShinaMD`; 
        const exclude = ["node_modules", "skyzopedia", "package-lock.json", "yarn.lock", ".npm", ".cache"];
        const filesToZip = fs.readdirSync(".").filter(f => !exclude.includes(f) && f !== "");

        if (!filesToZip.length) return m.reply("Tidak ada file yang dapat di-backup.");

        execSync(`zip -r ${name}.zip ${filesToZip.join(" ")}`);

        await sock.sendMessage(m.sender, {
            document: fs.readFileSync(`./${name}.zip`),
            fileName: `${name}.zip`,
            mimetype: "application/zip"
        }, { quoted: m });

        fs.unlinkSync(`./${name}.zip`);

        if (m.chat !== m.sender) m.reply("Script bot berhasil dikirim ke private chat.");
    } catch (err) {
        console.error("Backup Error:", err);
        m.reply("Terjadi kesalahan saat melakukan backup.");
    }
}
break;

case "kick":
case "kik": {
    if (!m.isGroup) return m.reply(mess.group);
    if (!isOwner && !m.isAdmin) return m.reply(mess.admin);
    if (!m.isBotAdmin) return m.reply(mess.botadmin);

    let target;

    if (m.mentionedJid?.[0]) {
        target = m.mentionedJid[0];
    } else if (m.quoted?.sender) {
        target = m.quoted.sender;
    } else if (text) {
        const cleaned = text.replace(/[^0-9]/g, "");
        if (cleaned) target = cleaned + "@s.whatsapp.net";
    }

    if (!target) return m.reply(`*Contoh :* .kick @tag/6283XXX`);

    try {
        await sock.groupParticipantsUpdate(m.chat, [target], "remove");
        return sock.sendMessage(m.chat, {
            text: `✅ Berhasil mengeluarkan @${target.split("@")[0]}`,
            mentions: [target]
        }, { quoted: m });
    } catch (err) {
        console.error("Kick error:", err);
        return m.reply("Gagal mengeluarkan anggota. Coba lagi atau cek hak akses bot.");
    }
}
break;

case "closegc":
case "close":
case "opengc":
case "open": {
    if (!m.isGroup) return m.reply(mess.group);
    if (!isOwner && !m.isAdmin) return m.reply(mess.admin);
    if (!m.isBotAdmin) return m.reply(mess.botadmin);

    try {
        const cmd = command.toLowerCase();

        if (cmd === "open" || cmd === "opengc") {
            await sock.groupSettingUpdate(m.chat, 'not_announcement');
            return m.reply("Grup berhasil dibuka! Sekarang semua anggota dapat mengirim pesan.");
        }

        if (cmd === "close" || cmd === "closegc") {
            await sock.groupSettingUpdate(m.chat, 'announcement');
            return m.reply("Grup berhasil ditutup! Sekarang hanya admin yang dapat mengirim pesan.");
        }

    } catch (error) {
        console.error("Error updating group settings:", error);
        return m.reply("Terjadi kesalahan saat mencoba mengubah pengaturan grup.");
    }
}
break;

case "ht":
case "hidetag": {
    if (!m.isGroup) return m.reply(mess.group);
    if (!isOwner && !m.isAdmin) return m.reply(mess.owner);
    const htText = text || m.quoted?.text || m.quoted?.body || "";
    if (!htText) return m.reply(`*Contoh :* ${cmd} pesannya\n(atau reply sebuah pesan lalu ketik ${cmd})`);
    try {
        // metadata segar (cache bisa kosong / basi) -> ambil ulang kalau perlu
        let meta = m.metadata;
        if (!meta?.participants) meta = await sock.groupMetadata(m.chat);
        // grup LID: id peserta bisa @lid, nomor aslinya di phoneNumber/jid. Pakai apa yang ada, buang yang kosong
        const members = [...new Set((meta.participants || []).map(v => v.phoneNumber || v.jid || v.id).filter(Boolean))];
        if (!members.length) return m.reply("Gagal mendapatkan daftar anggota grup. Coba lagi.");
        await sock.sendMessage(m.chat, { text: htText, mentions: members });
    } catch (error) {
        console.error("Error sending hidetag message:", error);
        return m.reply(`Terjadi kesalahan saat mencoba mengirim pesan hidetag.\n_${error?.message || error}_`);
    }
}
break;

case "tagall": {
    if (!m.isGroup) return m.reply(mess.group);
    if (!isOwner && !m.isAdmin) return m.reply(mess.owner);
    try {
        let meta = m.metadata;
        if (!meta?.participants) meta = await sock.groupMetadata(m.chat);
        const list = (meta.participants || []).map(v => v.phoneNumber || v.jid || v.id).filter(Boolean);
        const members = [...new Set(list)];
        if (!members.length) return m.reply("Gagal mendapatkan daftar anggota grup. Coba lagi.");
        const num = (j) => String(j).split("@")[0].split(":")[0];
        const pesan = text || m.quoted?.text || "Tidak ada pesan";
        const body = `*📢 TAG ALL*\n👥 ${members.length} anggota\n💬 ${pesan}\n\n` + members.map(j => `• @${num(j)}`).join("\n");
        await sock.sendMessage(m.chat, { text: body, mentions: members }, { quoted: m });
    } catch (error) {
        console.error("Error sending tagall message:", error);
        return m.reply(`Terjadi kesalahan saat mencoba tagall.\n_${error?.message || error}_`);
    }
}
break;

case "welcome": {
    if (!isOwner) return m.reply(mess.owner);
    if (!text) return m.reply(`*Contoh :* ${cmd} on/off`);
    if (!/on|off/.test(text)) return m.reply(`*Contoh :* ${cmd} on/off`);

    if (text === "on") {
        if (global.db.settings.welcome) 
            return m.reply("Welcome sudah aktif ✅");
        global.db.settings.welcome = true;
        return m.reply("Berhasil menyalakan welcome ✅");
    }

    if (text === "off") {
        if (!global.db.settings.welcome) 
            return m.reply("Welcome sudah tidak aktif ✅");
        global.db.settings.welcome = false;
        return m.reply("Berhasil mematikan welcome ✅");
    }
}
break;

case "antilink": {
    if (!isOwner) return m.reply(mess.owner);
    if (!m.isGroup) return m.reply(mess.group);
    if (!text) return m.reply(`*Contoh :* ${cmd} on/off`);

    let group = global.db.groups[m.chat];
    if (text === "on") {
        if (group.antilink) return m.reply(`Antilink di grup ini sudah aktif!`);
        group.antilink = true;
        group.antilink2 = false;
        return m.reply(`Berhasil menyalakan antilink di grup ini ✅`);
    }

    if (text === "off") {
        if (!group.antilink) return m.reply(`Antilink di grup ini sudah tidak aktif!`);
        group.antilink = false;
        return m.reply(`Berhasil mematikan antilink di grup ini ✅`);
    }
}
break;

case "antilink2": {
    if (!isOwner) return m.reply(mess.owner);
    if (!m.isGroup) return m.reply(mess.group);
    if (!text) return m.reply(`*Contoh :* ${cmd} on/off`);

    let group = global.db.groups[m.chat];
    if (text === "on") {
        if (group.antilink2) return m.reply(`Antilink2 di grup ini sudah aktif!`);
        group.antilink2 = true;
        group.antilink = false;
        return m.reply(`Berhasil menyalakan antilink2 di grup ini ✅`);
    }

    if (text === "off") {
        if (!group.antilink2) return m.reply(`Antilink2 di grup ini sudah tidak aktif!`);
        group.antilink2 = false;
        return m.reply(`Berhasil mematikan antilink2 di grup ini ✅`);
    }
}
break;

case "jpmch": {
    if (!isOwner) return m.reply(mess.owner)
    if (!text) return m.reply(`*Contoh :* ${cmd} pesannya & bisa dengan foto juga`)

    let mediaPath
    const mimeType = mime
    if (/image/.test(mimeType)) {
        mediaPath = await sock.downloadAndSaveMediaMessage(qmsg)
    }
    
    const Channel = await sock.newsletterFetchAllParticipating()
    const channelList = Object.keys(Channel)
    if (!channelList || channelList.length < 1) return m.reply("Channel tidak ditemukan")
    let successCount = 0
    const messageType = mediaPath ? "teks & foto" : "teks"
    const senderChat = m.chat

    const messageContent = mediaPath
        ? { image: await fs.readFileSync(mediaPath), caption: text }
        : { text }
    global.messageJpm = messageContent

    await m.reply(`Memproses JPM ${messageType} ke ${channelList.length} Channel WhatsApp.`)
    global.statusjpm = true

    for (const chId of channelList) {
    if (global.stopjpm) {
        delete global.stopjpm
        delete global.statusjpm
        break
        }
        try {
            await sock.sendMessage(chId, global.messageJpm)
            successCount++
        } catch (err) {
            console.error(`Gagal kirim ke channel ${chId}:`, err)
        }
        await sleep(global.JedaJpm)
    }

    if (mediaPath) await fs.unlinkSync(mediaPath)    
    delete global.statusjpm
    await m.reply(`JPM Channel Telah Selsai ✅\nBerhasil dikirim ke ${successCount} Channel WhatsApp.`)
}
break

case "jasher": case "jpm": case "jaser": {
if (!isOwner) return m.reply(mess.owner)
if (!text) return m.reply(`*Contoh :* ${cmd} pesannya & bisa dengan foto juga`)
    let mediaPath
    const mimeType = mime
    if (/image/.test(mimeType)) {
        mediaPath = await sock.downloadAndSaveMediaMessage(qmsg)
    }
    const allGroups = await sock.groupFetchAllParticipating()
    const groupIds = Object.keys(allGroups)
    let successCount = 0
    const messageContent = mediaPath
        ? { image: await fs.readFileSync(mediaPath), caption: text }
        : { text }
    global.messageJpm = messageContent
    const senderChat = m.chat
    await m.reply(`Memproses ${mediaPath ? "JPM teks & foto" : "JPM teks"} ke ${groupIds.length} grup chat`)
    global.statusjpm = true
    
    for (const groupId of groupIds) {
        if (global.stopjpm) {
        delete global.stopjpm
        delete global.statusjpm
        break
        }
        try {
            await sock.sendMessage(groupId, global.messageJpm, { quoted: FakeChannel })
            successCount++
        } catch (err) {
            console.error(`Gagal kirim ke grup ${groupId}:`, err)
        }
        await sleep(global.JedaJpm)
    }

    if (mediaPath) await fs.unlinkSync(mediaPath)
    delete global.statusjpm
    await sock.sendMessage(senderChat, {
        text: `JPM ${mediaPath ? "teks & foto" : "teks"} berhasil dikirim ke ${successCount} grup.`,
    }, { quoted: m })
}
break

case "jpmht": {
if (!isOwner) return m.reply(mess.owner)
if (!text) return m.reply(`*Contoh :* ${cmd} pesannya & bisa dengan foto juga`)
    let mediaPath
    const mimeType = mime
    if (/image/.test(mimeType)) {
        mediaPath = await sock.downloadAndSaveMediaMessage(qmsg)
    }
    const allGroups = await sock.groupFetchAllParticipating()
    const groupIds = Object.keys(allGroups)
    let successCount = 0
    const messageContent = mediaPath
        ? { image: await fs.readFileSync(mediaPath), caption: text }
        : { text }
    global.messageJpm = messageContent
    const senderChat = m.chat
    await m.reply(`Memproses ${mediaPath ? "JPM teks & foto" : "JPM teks"} hidetag ke ${groupIds.length} grup chat`)
    global.statusjpm = true
    
    for (const groupId of groupIds) {
        if (global.stopjpm) {
        delete global.stopjpm
        delete global.statusjpm
        break
        }
        messageContent.mentions = allGroups[groupId].participants.map(e => e.id)
        try {
            await sock.sendMessage(groupId, global.messageJpm, { quoted: FakeChannel })
            successCount++
        } catch (err) {
            console.error(`Gagal kirim ke grup ${groupId}:`, err)
        }
        await sleep(global.JedaJpm)
    }

    if (mediaPath) await fs.unlinkSync(mediaPath)
    delete global.statusjpm
    await sock.sendMessage(senderChat, {
        text: `JPM ${mediaPath ? "teks & foto" : "teks"} hidetag berhasil dikirim ke ${successCount} grup.`,
    }, { quoted: m })
}
break

case "public":
case "self": {
    if (!isOwner) return m.reply(mess.owner);
    let path = require.resolve("./settings.js");
    let data = fs.readFileSync(path, "utf-8");

    if (command === "public") {
        global.mode_public = true;
        sock.public = global.mode_public
        let newData = data.replace(/global\.mode_public\s*=\s*(true|false)/, "global.mode_public = true");
        fs.writeFileSync(path, newData, "utf-8");
        return m.reply("✅ Mode berhasil diubah menjadi *Public*");
    }

    if (command === "self") {
        global.mode_public = false;
        sock.public = global.mode_public
        let newData = data.replace(/global\.mode_public\s*=\s*(true|false)/, "global.mode_public = false");
        fs.writeFileSync(path, newData, "utf-8");
        return m.reply("✅ Mode berhasil diubah menjadi *Self*");
    }
}
break;

case "setjeda": {
    if (!isOwner) return m.reply(mess.owner);
    if (!text) return m.reply(`*Contoh :*\n${cmd} push 5000\n${cmd} jpm 6000\n\nKeterangan format waktu:\n1 detik = 1000\n\nJeda waktu saat ini:\nJeda Pushkontak > ${global.JedaPushkontak}\nJeda JPM > ${global.JedaJpm}`);

    let args = text.split(" ");
    if (args.length < 2) return m.reply(`*Contoh :*\n${cmd} push 5000\n${cmd} jpm 6000\n\nKeterangan format waktu:\n1 detik = 1000\n\nJeda waktu saat ini:\nJeda Pushkontak > ${global.JedaPushkontak}\nJeda JPM > ${global.JedaJpm}`);

    let target = args[0].toLowerCase(); // push / jpm
    let value = args[1];

    if (isNaN(value)) return m.reply("Harus berupa angka!");
    let jeda = parseInt(value);

    let fs = require("fs");
    let path = require.resolve("./settings.js");
    let data = fs.readFileSync(path, "utf-8");

    if (target === "push") {
        let newData = data.replace(/global\.JedaPushkontak\s*=\s*\d+/, `global.JedaPushkontak = ${jeda}`);
        fs.writeFileSync(path, newData, "utf-8");
        global.JedaPushkontak = jeda;
        return m.reply(`✅ Berhasil mengubah *Jeda Push Kontak* menjadi *${jeda}* ms`);
    } 
    
    if (target === "jpm") {
        let newData = data.replace(/global\.JedaJpm\s*=\s*\d+/, `global.JedaJpm = ${jeda}`);
        fs.writeFileSync(path, newData, "utf-8");
        global.JedaJpm = jeda;
        return m.reply(`✅ Berhasil mengubah *Jeda JPM* menjadi *${jeda}* ms`);
    }

    return m.reply(`Pilihan tidak valid!\nGunakan: *push* atau *jpm*`);
}
break;

case "pushkontak": case "puskontak": {
if (!isOwner) return m.reply(mess.owner)
if (!text) return m.reply(`*Contoh :* ${cmd} pesannya`)
global.textpushkontak = text
let rows = []
const a = await sock.groupFetchAllParticipating()
if (a.length < 1) return m.reply("Tidak ada grup chat.")
const Data = Object.values(a)
let number = 0
for (let u of Data) {
const name = u.subject || "Unknown"
rows.push({
title: name,
description: `Total Member: ${u.participants.length}`, 
id: `.pushkontak-response ${u.id}`
})
}
await sendList(m.chat, 'Pilih Grup', rows, `\nPilih Target Grup Pushkontak\n`, m)
}
break

case "pushkontak-response": {
  if (!isOwner) return m.reply(mess.owner)
  if (!global.textpushkontak) return m.reply(`Data teks pushkontak tidak ditemukan!\nSilahkan ketik *.pushkontak* pesannya`);
  const teks = global.textpushkontak
  const jidawal = m.chat
  const data = await sock.groupMetadata(text)
  const halls = data.participants
    .filter(v => v.id.includes("@s.whatsapp.net") ? v.id : v.jid)
    .map(v => v.id.includes("@s.whatsapp.net") ? v.id : v.jid)
    .filter(id => id !== botNumber && id.split("@")[0] !== global.owner); 
    
const blPushPath = DBP("blpush.json");
let blacklistUser = fs.existsSync(blPushPath) ? JSON.parse(fs.readFileSync(blPushPath, "utf-8")).blacklistPush : [];    

  await m.reply(`🚀 Memulai pushkontak ke dalam grup ${data.subject} dengan total member ${halls.length}`);
  
  global.statuspush = true
  
 delete global.textpushkontak
 let count = 0
 
  for (const mem of halls) {
    if (global.stoppush) {
    delete global.stoppush
    delete global.statuspush
    break
    }
  if (blacklistUser.includes(mem)) {
        continue;
    }    
    await sock.sendMessage(mem, { text: teks }, { quoted: FakeChannel });
    await global.sleep(global.JedaPushkontak);
    count += 1
  }
  
  delete global.statuspush
  await m.reply(`✅ Sukses pushkontak!\nPesan berhasil dikirim ke *${count}* member.`, jidawal)
}
break

case "pushkontak2": case "puskontak2": {
if (!isOwner) return m.reply(mess.owner)
if (!text || !text.includes("|")) return m.reply(`Masukan pesan & nama kontak\n*Contoh :* ${cmd} pesan|namakontak`)
global.textpushkontak = text.split("|")[0]
let rows = []
const a = await sock.groupFetchAllParticipating()
if (a.length < 1) return m.reply("Tidak ada grup chat.")
const Data = Object.values(a)
let number = 0
for (let u of Data) {
const name = u.subject || "Unknown"
rows.push({
title: name,
description: `Total Member: ${u.participants.length}`, 
id: `.pushkontak-response2 ${u.id}|${text.split("|")[1]}`
})
}
await sendList(m.chat, 'Pilih Grup', rows, `\nPilih Target Grup PushkontakV2\n`, m)
}
break

case "pushkontak-response2": {
  if (!isOwner) return m.reply(mess.owner)
  if (!global.textpushkontak) return m.reply(`Data teks pushkontak tidak ditemukan!\nSilahkan ketik *.pushkontak2* pesannya|namakontak`);
  const teks = global.textpushkontak
  const jidawal = m.chat
  const data = await sock.groupMetadata(text.split("|")[0])
  const halls = data.participants
    .filter(v => v.id.includes("@s.whatsapp.net") ? v.id : v.jid)
    .map(v => v.id.includes("@s.whatsapp.net") ? v.id : v.jid)
    .filter(id => id !== botNumber && id.split("@")[0] !== global.owner);
const blPushPath = DBP("blpush2.json");
let blacklistUser = fs.existsSync(blPushPath) ? JSON.parse(fs.readFileSync(blPushPath, "utf-8")).blacklistPush : [];     

  await m.reply(`🚀 Memulai pushkontak autosave kontak ke dalam grup ${data.subject} dengan total member ${halls.length}`);
  
  global.statuspush = true
  
 delete global.textpushkontak
 let count = 0
 
  for (const mem of halls) {
    if (global.stoppush) {
    delete global.stoppush
    delete global.statuspush
    break
    }    
if (blacklistUser.includes(mem)) {
        continue;
    }      
    const contactAction = {
        "fullName": `${text.split("|")[1]} #${mem.split("@")[0]}`,
        "lidJid": mem, 
        "saveOnPrimaryAddressbook": true
    };
    await sock.sendMessage(mem, { text: teks }, { quoted: FakeChannel });
    await sock.addOrEditContact(mem, contactAction);
    await global.sleep(global.JedaPushkontak);
    count += 1
  }
  
  delete global.statuspush
  await m.reply(`✅ Sukses pushkontak!\nTotal kontak berhasil disimpan *${count}*`, jidawal)
}
break

case "savekontak": case "svkontak": {
if (!isOwner) return m.reply(mess.owner)
if (!text) return m.reply(`Masukan namakontak\n*Contoh :* ${cmd} Xskycode`)
global.namakontak = text
let rows = []
const a = await sock.groupFetchAllParticipating()
if (a.length < 1) return m.reply("Tidak ada grup chat.")
const Data = Object.values(a)
let number = 0
for (let u of Data) {
const name = u.subject || "Unknown"
rows.push({
title: name,
description: `Total Member: ${u.participants.length}`, 
id: `.savekontak-response ${u.id}`
})
}
await sendList(m.chat, 'Pilih Grup', rows, `\nPilih Target Grup Savekontak\n`, m)
}
break

case "savekontak-response": {
  if (!isOwner) return m.reply(mess.owner)
  if (!global.namakontak) return m.reply(`Data nama savekontak tidak ditemukan!\nSilahkan ketik *.savekontak* namakontak`);
  try {
    const res = await sock.groupMetadata(text)
    const halls = res.participants
      .filter(v => v.id.includes("@s.whatsapp.net") ? v.id : v.jid)
      .map(v => v.id.includes("@s.whatsapp.net") ? v.id : v.jid)
      .filter(id => id !== botNumber && id.split("@")[0] !== global.owner)

    if (!halls.length) return m.reply("Tidak ada kontak yang bisa disimpan.")
    let names = text
    const existingContacts = JSON.parse(fs.readFileSync(DBP("contacts.json"), 'utf8') || '[]')
    const newContacts = [...new Set([...existingContacts, ...halls])]

    fs.writeFileSync(DBP("contacts.json"), JSON.stringify(newContacts, null, 2))

    // Buat file .vcf
    const vcardContent = newContacts.map(contact => {
      const phone = contact.split("@")[0]
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${global.namakontak} - ${phone}`,
        `TEL;type=CELL;type=VOICE;waid=${phone}:+${phone}`,
        "END:VCARD",
        ""
      ].join("\n")
    }).join("")

    fs.writeFileSync(DBP("contacts.vcf"), vcardContent, "utf8")

    // Kirim ke private chat
    if (m.chat !== m.sender) {
      await m.reply(`Berhasil membuat file kontak dari grup ${res.subject}\n\nFile kontak telah dikirim ke private chat\nTotal ${halls.length} kontak`)
    }

    await sock.sendMessage(
      m.sender,
      {
        document: fs.readFileSync(DBP("contacts.vcf")),
        fileName: "contacts.vcf",
        caption: `File kontak berhasil dibuat ✅\nTotal ${halls.length} kontak`,
        mimetype: "text/vcard",
      },
      { quoted: m }
    )
    
    delete global.namakontak

    fs.writeFileSync(DBP("contacts.json"), "[]")
    fs.writeFileSync(DBP("contacts.vcf"), "")

  } catch (err) {
    m.reply("Terjadi kesalahan saat menyimpan kontak:\n" + err.toString())
  }
}
break

case "stopjpm": {
if (!isOwner) return m.reply(mess.owner)
if (!global.statusjpm) return m.reply("Jpm sedang tidak berjalan!")
global.stopjpm = true
return m.reply("Berhasil menghentikan jpm ✅")
}
break

case "stoppushkontak": case "stoppush": case "stoppus": {
if (!isOwner) return m.reply(mess.owner)
if (!global.statuspush) return m.reply("Pushkontak sedang tidak berjalan!")
global.stoppush = true
return m.reply("Berhasil menghentikan pushkontak ✅")
}
break

case "1gb": case "2gb": case "3gb": case "4gb": case "5gb": 
case "6gb": case "7gb": case "8gb": case "9gb": case "10gb": 
case "unlimited": case "unli": {
    if (!isOwner && !isReseller) {
        return m.reply(`Fitur ini untuk di dalam grup reseller panel`);
    }
    if (!text) return m.reply(`*Contoh :* ${cmd} username,6283XXX`)

    let nomor, usernem;
    let tek = text.split(",");
    if (tek.length > 1) {
        let [users, nom] = tek.map(t => t.trim());
        if (!users || !nom) return m.reply(`*Contoh :* ${cmd} username,6283XXX`)
        nomor = nom.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        usernem = users.toLowerCase();
    } else {
        usernem = text.toLowerCase();
        nomor = m.isGroup ? m.sender : m.chat
    }

    try {
        var onWa = await sock.onWhatsApp(nomor.split("@")[0]);
        if (onWa.length < 1) return m.reply("Nomor target tidak terdaftar di WhatsApp!");
    } catch (err) {
        return m.reply("Terjadi kesalahan saat mengecek nomor WhatsApp: " + err.message);
    }

    // Mapping RAM, Disk, dan CPU
    const resourceMap = require("./source/PanelSpec.js");
    
    let { ram, disk, cpu } = resourceMap[command] || { ram: "0", disk: "0", cpu: "0" };

    let username = usernem.toLowerCase();
    let email = username + "@gmail.com";
    let name = global.capital(username) + " Server";
    let password = username + "001";

    try {
        let f = await fetch(domain + "/api/application/users", {
            method: "POST",
            headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + apikey },
            body: JSON.stringify({ email, username, first_name: name, last_name: "Server", language: "en", password })
        });
        let data = await f.json();
        if (data.errors) return m.reply("Error: " + JSON.stringify(data.errors[0], null, 2));
        let user = data.attributes;

        let f1 = await fetch(domain + `/api/application/nests/${nestid}/eggs/` + egg, {
            method: "GET",
            headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + apikey }
        });
        let data2 = await f1.json();
        let startup_cmd = data2.attributes.startup;

        let f2 = await fetch(domain + "/api/application/servers", {
            method: "POST",
            headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Bearer " + apikey },
            body: JSON.stringify({
                name,
                description: global.tanggal(Date.now()),
                user: user.id,
                egg: parseInt(egg),
                docker_image: "ghcr.io/parkervcp/yolks:nodejs_20",
                startup: startup_cmd,
                environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start" },
                limits: { memory: ram, swap: 0, disk, io: 500, cpu },
                feature_limits: { databases: 5, backups: 5, allocations: 5 },
                deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] },
            })
        });
        let result = await f2.json();
        if (result.errors) return m.reply("Error: " + JSON.stringify(result.errors[0], null, 2));
        
        let server = result.attributes;
        var orang = nomor
        if (orang !== m.chat) {
        await m.reply(`Berhasil membuat akun panel ✅\ndata akun terkirim ke nomor ${nomor.split("@")[0]}`)
        }

let teks = `
*Berikut detail akun panel kamu 📦*

📡 Server ID: ${server.id}
👤 Username: \`${user.username}\`
🔐 Password: \`${password}\`
🗓️ Tanggal Aktivasi: ${global.tanggal(Date.now())}

*⚙️ Spesifikasi server panel*
- RAM: ${ram == "0" ? "Unlimited" : ram / 1000 + "GB"}
- Disk: ${disk == "0" ? "Unlimited" : disk / 1000 + "GB"}
- CPU: ${cpu == "0" ? "Unlimited" : cpu + "%"}
- Panel: ${global.domain}

*Rules pembelian panel :*  
- Masa aktif 30 hari  
- Data bersifat pribadi, mohon disimpan dengan aman  
- Garansi berlaku 15 hari (1x replace)  
- Klaim garansi wajib menyertakan *bukti chat pembelian*
`
        await sock.sendMessage(orang, { text: teks }, { quoted: m });
    } catch (err) {
        return m.reply("Terjadi kesalahan: " + err.message);
    }
}
break

case "delpanel": {
    if (!isOwner && !isReseller) {
        return m.reply(mess.owner);
    }
    const rows = []
    rows.push({
title: `Hapus Semua`,
description: `Hapus semua server panel`, 
id: `.delpanel-all`
})            
    try {
        const response = await fetch(`${domain}/api/application/servers`, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${apikey}`,
            },
        });

        const result = await response.json();
        const servers = result.data;

        if (!servers || servers.length === 0) {
            return m.reply("Tidak ada server panel!");
        }

        let messageText = `\n*Total server panel :* ${servers.length}\n`

        for (const server of servers) {
            const s = server.attributes;

            const resStatus = await fetch(`${domain}/api/client/servers/${s.uuid.split("-")[0]}/resources`, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${capikey}`,
                },
            });

            const statusData = await resStatus.json();

            const ram = s.limits.memory === 0
                ? "Unlimited"
                : s.limits.memory >= 1024
                ? `${Math.floor(s.limits.memory / 1024)} GB`
                : `${s.limits.memory} MB`;

            const disk = s.limits.disk === 0
                ? "Unlimited"
                : s.limits.disk >= 1024
                ? `${Math.floor(s.limits.disk / 1024)} GB`
                : `${s.limits.disk} MB`;

            const cpu = s.limits.cpu === 0
                ? "Unlimited"
                : `${s.limits.cpu}%`;
            rows.push({
title: `${s.name} || ID:${s.id}`,
description: `Ram ${ram} || Disk ${disk} || CPU ${cpu}`, 
id: `.delpanel-response ${s.id}`
})            
        }                  
        await sendList(m.chat, 'Pilih Server Panel', rows, `\nPilih Server Panel Yang Ingin Dihapus\n`, m)

    } catch (err) {
        console.error("Error listing panel servers:", err);
        m.reply("Terjadi kesalahan saat mengambil data server.");
    }
}
break;

case "delpanel-response": {
    if (!isOwner) return m.reply(mess.owner);
    if (!text) return 
    
    try {
        const serverResponse = await fetch(domain + "/api/application/servers", {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + apikey
            }
        });
        const serverData = await serverResponse.json();
        const servers = serverData.data;
        
        let serverName;
        let serverSection;
        let serverFound = false;
        
        for (const server of servers) {
            const serverAttr = server.attributes;
            
            if (Number(text) === serverAttr.id) {
                serverSection = serverAttr.name.toLowerCase();
                serverName = serverAttr.name;
                serverFound = true;
                
                const deleteServerResponse = await fetch(domain + `/api/application/servers/${serverAttr.id}`, {
                    method: "DELETE",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + apikey
                    }
                });
                
                if (!deleteServerResponse.ok) {
                    const errorData = await deleteServerResponse.json();
                    console.error("Gagal menghapus server:", errorData);
                }
                
                break;
            }
        }
        
        if (!serverFound) {
            return m.reply("Gagal menghapus server!\nID server tidak ditemukan");
        }
        
        const userResponse = await fetch(domain + "/api/application/users", {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + apikey
            }
        });
        const userData = await userResponse.json();
        const users = userData.data;
        
        for (const user of users) {
            const userAttr = user.attributes;
            
            if (userAttr.first_name.toLowerCase() === serverSection) {
                const deleteUserResponse = await fetch(domain + `/api/application/users/${userAttr.id}`, {
                    method: "DELETE",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + apikey
                    }
                });
                
                if (!deleteUserResponse.ok) {
                    const errorData = await deleteUserResponse.json();
                    console.error("Gagal menghapus user:", errorData);
                }
                
                break;
            }
        }
        
        await m.reply(`Barhasil Menghapus Sever Panel ✅\nNama Server: ${capital(serverName)}`);
        
    } catch (error) {
        console.error("Error dalam proses delpanel:", error);
        await m.reply("Terjadi kesalahan saat memproses permintaan");
    }
}
break;

case "delpanel-all": {
if (!isOwner) return m.reply(mess.owner)
await m.reply(`Memproses penghapusan semua user & server panel yang bukan admin`)
try {
const PTERO_URL = global.domain
// Ganti dengan URL panel Pterodactyl
const API_KEY = global.apikey// API Key dengan akses admin

// Konfigurasi headers
const headers = {
  "Authorization": "Bearer " + API_KEY,
  "Content-Type": "application/json",
  "Accept": "application/json",
};

// Fungsi untuk mendapatkan semua user
async function getUsers() {
  try {
    const res = await axios.get(`${PTERO_URL}/api/application/users`, { headers });
    return res.data.data;
  } catch (error) {
    m.reply(JSON.stringify(error.response?.data || error.message, null, 2))
    
    return [];
  }
}

// Fungsi untuk mendapatkan semua server
async function getServers() {
  try {
    const res = await axios.get(`${PTERO_URL}/api/application/servers`, { headers });
    return res.data.data;
  } catch (error) {
    m.reply(JSON.stringify(error.response?.data || error.message, null, 2))
    return [];
  }
}

// Fungsi untuk menghapus server berdasarkan UUID
async function deleteServer(serverUUID) {
  try {
    await axios.delete(`${PTERO_URL}/api/application/servers/${serverUUID}`, { headers });
    console.log(`Server ${serverUUID} berhasil dihapus.`);
  } catch (error) {
    console.error(`Gagal menghapus server ${serverUUID}:`, error.response?.data || error.message);
  }
}

// Fungsi untuk menghapus user berdasarkan ID
async function deleteUser(userID) {
  try {
    await axios.delete(`${PTERO_URL}/api/application/users/${userID}`, { headers });
    console.log(`User ${userID} berhasil dihapus.`);
  } catch (error) {
    console.error(`Gagal menghapus user ${userID}:`, error.response?.data || error.message);
  }
}

// Fungsi utama untuk menghapus semua user & server yang bukan admin
async function deleteNonAdminUsersAndServers() {
  const users = await getUsers();
  const servers = await getServers();
  let totalSrv = 0

  for (const user of users) {
    if (user.attributes.root_admin) {
      console.log(`Lewati admin: ${user.attributes.username}`);
      continue; // Lewati admin
    }

    const userID = user.attributes.id;
    const userEmail = user.attributes.email;

    console.log(`Menghapus user: ${user.attributes.username} (${userEmail})`);

    // Cari server yang dimiliki user ini
    const userServers = servers.filter(srv => srv.attributes.user === userID);

    // Hapus semua server user ini
    for (const server of userServers) {
      await deleteServer(server.attributes.id);
      totalSrv += 1
    }

    // Hapus user setelah semua servernya terhapus
    await deleteUser(userID);
  }
await m.reply(`Berhasil menghapus ${totalSrv} user & server panel yang bukan admin.`)
}

// Jalankan fungsi
return deleteNonAdminUsersAndServers();
} catch (err) {
return m.reply(`${JSON.stringify(err, null, 2)}`)
}
}
break

case "delpanel-off":
case "clearpanel": {
    if (!isOwner) return m.reply(mess.owner)
    await m.reply("Mendeteksi panel yang off (offline), lalu menghapusnya…")
    try {
        const [servers, users] = await Promise.all([ptAll("/api/application/servers"), ptAll("/api/application/users")])
        const userMap = new Map(users.map(u => [u.attributes.id, u.attributes]))
        // deteksi status power asli (offline = merah di panel) lewat Client API
        const offServers = []
        let cekGagal = 0
        for (const x of servers.map(v => v.attributes)) {
            if (x.suspended) { offServers.push(x); continue }
            try {
                const rs = await fetch(`${global.domain}/api/client/servers/${x.uuid.split("-")[0]}/resources`, {
                    method: "GET",
                    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: "Bearer " + global.capikey }
                })
                if (!rs.ok) { cekGagal++; continue }
                const st = (await rs.json())?.attributes?.current_state
                if (st === "offline") offServers.push(x) // hanya yang benar-benar offline, starting/stopping/running aman
            } catch { cekGagal++ }
        }
        if (!offServers.length) return m.reply(`Tidak ada panel yang off. Semua aman ✅${cekGagal ? `\n(${cekGagal} server gagal dicek statusnya, nggak dihapus)` : ""}`)

        let srvOk = 0, srvFail = 0, userOk = 0, userFail = 0, adminSrv = 0
        const touchedUsers = new Set()
        for (const sv of offServers) {
            const r = await fetch(`${global.domain}/api/application/servers/${sv.id}`, { method: "DELETE", headers: ptHeaders() })
            if (r.ok) { srvOk++; touchedUsers.add(sv.user) } else srvFail++
            if (userMap.get(sv.user)?.root_admin) adminSrv++
            await new Promise(r => setTimeout(r, 300))
        }
        // user non-admin ikut dihapus, kecuali masih punya server aktif lain
        const sisa = (await ptAll("/api/application/servers")).map(x => x.attributes)
        for (const uid of touchedUsers) {
            const u = userMap.get(uid)
            if (!u || u.root_admin) continue // admin: hanya servernya yang dihapus, user tetap
            if (sisa.some(x => x.user === uid)) continue // masih punya server lain
            const r = await fetch(`${global.domain}/api/application/users/${uid}`, { method: "DELETE", headers: ptHeaders() })
            if (r.ok) userOk++; else userFail++
            await new Promise(r => setTimeout(r, 300))
        }
        await m.reply(`Selesai ✅\n\nPanel off terdeteksi: ${offServers.length}\nServer terhapus: ${srvOk}${srvFail ? ` (gagal ${srvFail})` : ""}\nUser terhapus: ${userOk}${userFail ? ` (gagal ${userFail})` : ""}\nPanel milik admin yang dihapus: ${adminSrv} (user admin tidak dihapus)`)
    } catch (err) {
        console.error("Error delpanel-off:", err)
        m.reply("Terjadi kesalahan saat memproses panel.")
    }
}
break

case "listpanel":
case "listserver": {
    if (!isOwner && !isReseller) {
        return m.reply(`Fitur ini hanya untuk di dalam grup reseller panel`);
    }

    try {
        const response = await fetch(`${domain}/api/application/servers`, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${apikey}`,
            },
        });

        const result = await response.json();
        const servers = result.data;

        if (!servers || servers.length === 0) {
            return m.reply("Tidak ada server panel!");
        }

        let messageText = `\n*Total server panel :* ${servers.length}\n`

        for (const server of servers) {
            const s = server.attributes;

            const resStatus = await fetch(`${domain}/api/client/servers/${s.uuid.split("-")[0]}/resources`, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${capikey}`,
                },
            });

            const statusData = await resStatus.json();

            const ram = s.limits.memory === 0
                ? "Unlimited"
                : s.limits.memory >= 1024
                ? `${Math.floor(s.limits.memory / 1024)} GB`
                : `${s.limits.memory} MB`;

            const disk = s.limits.disk === 0
                ? "Unlimited"
                : s.limits.disk >= 1024
                ? `${Math.floor(s.limits.disk / 1024)} GB`
                : `${s.limits.disk} MB`;

            const cpu = s.limits.cpu === 0
                ? "Unlimited"
                : `${s.limits.cpu}%`;

            messageText += `
- ID : *${s.id}*
- Nama Server : *${s.name}*
- Ram : *${ram}*
- Disk : *${disk}*
- CPU : *${cpu}*
- Created : *${s.created_at.split("T")[0]}*\n`;
        }                  
        await m.reply(messageText)

    } catch (err) {
        console.error("Error listing panel servers:", err);
        m.reply("Terjadi kesalahan saat mengambil data server.");
    }
}
break;

case "cadmin": {
    if (!isOwner) return m.reply(mess.owner);
    if (!text) return m.reply(`Masukan username & nomor (opsional)\n*contoh:* ${cmd} skyzopedia,628XXX`)
    let nomor, usernem;
    const tek = text.split(",");
    if (tek.length > 1) {
        let [users, nom] = tek;
        if (!users || !nom) return m.reply(`Masukan username & nomor (opsional)\n*contoh:* ${cmd} skyzopedia,628XXX`)

        nomor = nom.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        usernem = users.toLowerCase();
    } else {
        usernem = text.toLowerCase();
        nomor = m.isGroup ? m.sender : m.chat;
    }

    const onWa = await sock.onWhatsApp(nomor.split("@")[0]);
    if (onWa.length < 1) return m.reply("Nomor target tidak terdaftar di WhatsApp!");

    const username = usernem.toLowerCase();
    const email = `${username}@gmail.com`;
    const name = global.capital(args[0]);
    const password = `${username}001`;

    try {
        const res = await fetch(`${domain}/api/application/users`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${apikey}`
            },
            body: JSON.stringify({
                email,
                username,
                first_name: name,
                last_name: "Admin",
                root_admin: true,
                language: "en",
                password
            })
        });

        const data = await res.json();
        if (data.errors) return m.reply(JSON.stringify(data.errors[0], null, 2));

        const user = data.attributes;
        const orang = nomor;

        if (nomor !== m.chat) {
            await m.reply(`Berhasil membuat akun admin panel ✅\nData akun terkirim ke nomor ${nomor.split("@")[0]}`);
        }

        const teks = `
*Berikut detail akun admin panel 📦*

📡 Server ID: ${user.id}
👤 Username: \`${user.username}\`
🔐 Password: \`${password}\`
🗓️ Tanggal Aktivasi: ${global.tanggal(Date.now())}
*🌐* ${global.domain}

*Rules pembelian admin panel:*  
- Masa aktif 30 hari  
- Data bersifat pribadi, mohon disimpan dengan aman  
- Garansi berlaku 15 hari (1x replace)  
- Klaim garansi wajib menyertakan *bukti chat pembelian*
        `;

        await sock.sendMessage(orang, { text: teks }, { quoted: m });

    } catch (err) {
        console.error(err);
        m.reply("Terjadi kesalahan saat membuat akun admin panel.");
    }
}
break;

case "deladmin": {
    if (!isOwner) return m.reply(mess.owner);
    try {
        const res = await fetch(`${domain}/api/application/users`, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${apikey}`
            }
        });
        const rows = []
        const data = await res.json();
        const users = data.data;

        const adminUsers = users.filter(u => u.attributes.root_admin === true);
        if (adminUsers.length < 1) return m.reply("Tidak ada admin panel.");

        let teks = `\n*Total admin panel :* ${adminUsers.length}\n`
        adminUsers.forEach((admin, idx) => {
            teks += `
- ID : *${admin.attributes.id}*
- Nama : *${admin.attributes.first_name}*
- Created : ${admin.attributes.created_at.split("T")[0]}
`;
rows.push({
title: `${admin.attributes.first_name} || ID:${admin.attributes.id}`,
description: `Created At: ${admin.attributes.created_at.split("T")[0]}`, 
id: `.deladmin-response ${admin.attributes.id}`
})            
        });

        await sendList(m.chat, 'Pilih Admin Panel', rows, `\nPilih Admin Panel Yang Ingin Dihapus\n`, m)

    } catch (err) {
        console.error(err);
        m.reply("Terjadi kesalahan saat mengambil data admin.");
    }
}
break;

case "deladmin-response": {
    if (!isOwner) return m.reply(mess.owner);
    if (!text) return 
    try {
        const res = await fetch(`${domain}/api/application/users`, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${apikey}`
            }
        });

        const data = await res.json();
        const users = data.data;

        let targetAdmin = users.find(
            (e) => e.attributes.id == args[0] && e.attributes.root_admin === true
        );

        if (!targetAdmin) {
            return m.reply("Gagal menghapus akun!\nID user tidak ditemukan");
        }

        const idadmin = targetAdmin.attributes.id;
        const username = targetAdmin.attributes.username;

        const delRes = await fetch(`${domain}/api/application/users/${idadmin}`, {
            method: "DELETE",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${apikey}`
            }
        });

        if (!delRes.ok) {
            const errData = await delRes.json();
            return m.reply(`Gagal menghapus akun admin!\n${JSON.stringify(errData.errors[0], null, 2)}`);
        }

        await m.reply(`Berhasil Menghapus Admin Panel ✅\nNama User: ${global.capital(username)}`);

    } catch (err) {
        console.error(err);
        m.reply("Terjadi kesalahan saat menghapus akun admin.");
    }
}
break;

case "listadmin": {
    if (!isOwner) return m.reply(mess.owner);

    try {
        const res = await fetch(`${domain}/api/application/users`, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${apikey}`
            }
        });

        const data = await res.json();
        const users = data.data;

        const adminUsers = users.filter(u => u.attributes.root_admin === true);
        if (adminUsers.length < 1) return m.reply("Tidak ada admin panel.");

        let teks = `\n*Total admin panel :* ${adminUsers.length}\n`
        adminUsers.forEach((admin, idx) => {
            teks += `
- ID : *${admin.attributes.id}*
- Nama : *${admin.attributes.first_name}*
- Created : ${admin.attributes.created_at.split("T")[0]}
`;
        });

        await m.reply(teks)

    } catch (err) {
        console.error(err);
        m.reply("Terjadi kesalahan saat mengambil data admin.");
    }
}
break;

case "addseller": {
    if (!isOwner) return m.reply(mess.owner);
    if (!text && !m.quoted) return m.reply(`*contoh:* ${cmd} 6283XXX`);

    const input = m.mentionedJid[0] 
        ? m.mentionedJid[0] 
        : m.quoted 
            ? m.quoted.sender 
            : text.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    const input2 = input.split("@")[0];

    if (input2 === global.owner || global.db.settings.reseller.includes(input) || input === botNumber)
        return m.reply(`Nomor ${input2} sudah menjadi reseller!`);

    global.db.settings.reseller.push(input);
    m.reply(`Berhasil menambah reseller ✅`);
}
break;

case "listseller": {
    const list = global.db.settings.reseller;
    if (!list || list.length < 1) return m.reply("Tidak ada user reseller");

    let teks = `Daftar reseller:\n`;
    for (let i of list) {
        const num = i.split("@")[0];
        teks += `\n• ${num}\n  Tag: @${num}\n`;
    }

    sock.sendMessage(m.chat, { text: teks, mentions: list }, { quoted: m });
}
break;

case "delseller": {
    if (!isOwner) return m.reply(mess.owner);
    if (!m.quoted && !text) return m.reply(`*Contoh :* ${cmd} 6283XXX`);

    const input = m.mentionedJid[0] 
        ? m.mentionedJid[0] 
        : m.quoted 
            ? m.quoted.sender 
            : text.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    const input2 = input.split("@")[0];

    if (input2 === global.owner || input === botNumber)
        return m.reply(`Tidak bisa menghapus owner!`);

    const list = global.db.settings.reseller;
    if (!list.includes(input))
        return m.reply(`Nomor ${input2} bukan reseller!`);

    list.splice(list.indexOf(input), 1);
    m.reply(`Berhasil menghapus reseller ✅`);
}
break;

case "saluran": case "channel": case "ch": {
const { sendNative, urlButton } = require("./source/Button.js")
await sendNative(sock, m.chat, {
    body: `📢 *Saluran ${global.namaCh}*\nGabung biar nggak ketinggalan info terbaru.`,
    footer: global.namaBot,
    buttons: [urlButton("📢 Join Saluran", global.linkChannel)]
}, { userJid: m.sender, quoted: m })
}
break

case "own": case "owner": {
await sock.sendContact(m.chat, [Brand.hak.nomor], Brand.hak.nama, "Developer Bot", m)
}
break

case "limit": case "ceklimit": case "cekprem": case "status": {
    const st = Limit.status(m, isOwner)
    const u = st.user
    const exp = st.role === "premium" && u.premiumUntil
        ? new Date(u.premiumUntil + 7 * 3600000).toISOString().slice(0, 10) : null
    await m.reply(
`╭─「 🧾 *STATUS KAMU* 」
│ 👤 *User*   : @${m.sender.split("@")[0]}
│ 🥠 *Status* : ${st.label}
│ 📊 *Limit*  : ${Limit.limitText(st)}${exp ? `\n│ ⏳ *Premium sampai* : ${exp}` : ""}
╰──────────────⦁

🧙 Warlock = limit ${Limit.DAILY_LIMIT}/hari untuk fitur *play, tiktok, sticker, tourl*
💎 Premium & 👑 Owner = unlimited
⚔️ Limit habis? Cari koin lewat RPG, lalu beli limit: *.belilimit <jumlah>*`)
}
break

case "addprem": case "addpremium": {
    if (!isOwner) return m.reply(mess.owner)
    const parts = args.filter((a) => a !== "")
    const target = m.quoted ? m.quoted.sender
        : m.mentionedJid[0] ? m.mentionedJid[0]
        : parts[0] && parts[0].replace(/[^0-9]/g, "").length > 6 ? parts[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net" : null
    if (!target) return m.reply(`*Contoh penggunaan :*\n${cmd} 6285XXX 30\n${cmd} @tag 30\n(reply pesan orangnya juga bisa)\n\nAngka di belakang = jumlah hari. Kosongkan untuk permanen.`)
    const lamaHari = m.quoted || m.mentionedJid[0] ? parseInt(parts.find((a) => /^\d{1,4}$/.test(a))) || 0 : parseInt(parts[1]) || 0
    const u = Limit.addPremium(target, lamaHari)
    await sock.sendMessage(m.chat, {
        text: `✅ @${target.split("@")[0]} sekarang *Premium* 💎\n⏳ Durasi: ${lamaHari ? lamaHari + " hari" : "Permanen"}\n📊 Limit: Unlimited ♾️`,
        mentions: [target]
    }, { quoted: m })
}
break

case "delprem": case "delpremium": {
    if (!isOwner) return m.reply(mess.owner)
    const target = m.quoted ? m.quoted.sender
        : m.mentionedJid[0] ? m.mentionedJid[0]
        : text ? text.replace(/[^0-9]/g, "") + "@s.whatsapp.net" : null
    if (!target) return m.reply(`*Contoh penggunaan :*\n${cmd} 6285XXX`)
    if (!Limit.delPremium(target)) return m.reply(`@${target.split("@")[0]} bukan user premium.`)
    await sock.sendMessage(m.chat, { text: `✅ Premium @${target.split("@")[0]} dicabut, kembali jadi *Warlock* 🧙`, mentions: [target] }, { quoted: m })
}
break

case "listprem": case "listpremium": {
    if (!isOwner) return m.reply(mess.owner)
    const list = Limit.listPremium()
    if (!list.length) return m.reply("Belum ada user premium.")
    const txt = list.map((x, i) => `${i + 1}. @${x.jid.split("@")[0]} — ${x.until ? new Date(x.until + 7 * 3600000).toISOString().slice(0, 10) : "Permanen"}`).join("\n")
    await sock.sendMessage(m.chat, { text: `💎 *LIST PREMIUM* (${list.length})\n\n${txt}`, mentions: list.map((x) => x.jid) }, { quoted: m })
}
break

case "addowner": case "addown": {
    if (!isOwner) return m.reply(mess.owner);

    const input = m.quoted 
        ? m.quoted.sender 
        : m.mentionedJid[0] 
            ? m.mentionedJid[0] 
            : text 
                ? text.replace(/[^0-9]/g, "") + "@s.whatsapp.net" 
                : null;

    if (!input) return m.reply(`*Contoh penggunaan :*\n${cmd} 6285XXX`);

    const jid = input.split("@")[0];
    const botNumber = sock.user.id.split(":")[0] + "@s.whatsapp.net";

    if (jid == global.owner || input == botNumber) 
        return m.reply(`Nomor ${jid} sudah menjadi ownerbot.`);

    if (global.db.settings.developer.includes(input)) 
        return m.reply(`Nomor ${jid} sudah menjadi ownerbot.`);

    global.db.settings.developer.push(input);
    return m.reply(`Berhasil menambah owner ✅\n- ${jid}`);
}
break;

case "delowner": case "delown": {
    if (!isOwner) return m.reply(mess.owner);

    const input = m.quoted 
        ? m.quoted.sender 
        : m.mentionedJid[0] 
            ? m.mentionedJid[0] 
            : text 
                ? text.replace(/[^0-9]/g, "") + "@s.whatsapp.net" 
                : null;

    if (!input) return m.reply(`*Contoh penggunaan :*\n${cmd} 6285XXX`);

    if (input.toLowerCase() === "all") {
        global.db.settings.developer = [];
        return m.reply("Berhasil menghapus semua owner ✅");
    }

    if (!global.db.settings.developer.includes(input)) 
        return m.reply("Nomor tidak ditemukan!");

    global.db.settings.developer = global.db.settings.developer.filter(i => i !== input);
    return m.reply(`Berhasil menghapus owner ✅\n- ${input.split("@")[0]}`);
}
break;

case "listowner": case "listown": {
    const Own = global.db.settings.developer;
    if (!Own || Own.length < 1) return m.reply("Tidak ada owner tambahan.");

    let teks = "Daftar owner tambahan:\n";
    for (let i of Own) {
        const num = i.split("@")[0];
        teks += `\n- Number: ${num}\n- Tag: @${num}\n`;
    }
    return sock.sendMessage(m.chat, { text: teks, mentions: Own }, { quoted: m });
}
break;

case "resetdb": case "rstdb": {
if (!isOwner) return m.reply(mess.owner)
global.db = {}
return m.reply("Berhasil mereset database ✅")
}
break
        
case "jpmslide": {
    if (!isOwner) return m.reply(mess.owner);
    
    const pentingPath = DBP("bljpm.json");
    let penting = { blacklistJpm: [] };
    if (fs.existsSync(pentingPath)) {
        penting = JSON.parse(fs.readFileSync(pentingPath, "utf-8"));
    }
    
    // Cek apakah sedang ada proses broadcast lain (anti spam)
    if (global.statusjpm) return m.reply("Sedang ada proses JPM lain berjalan. Tunggu selesai atau ketik .stopjpm");
    
    let allgrup = await sock.groupFetchAllParticipating();
    let grupList = Object.keys(allgrup);
    
    if (grupList.length < 1) return m.reply("Bot belum tergabung di grup manapun.");
    
    let jidAwal = m.chat;
    let success = 0;
    let skipped = 0;
    
    await m.reply(`Memproses *JPM Slide/Carousel* ke ${grupList.length} grup...\nEstimasi waktu: ${Math.round((grupList.length * global.JedaJpm)/1000/60)} menit`);
    
    global.statusjpm = true;   
    
    for (let gid of grupList) {
        if (global.stopjpm) {
            delete global.stopjpm;
            break;
        }
        
        
        if (penting.blacklistJpm.includes(gid)) {
            skipped++; // Tambah hitungan grup yang dilewati
            continue;  // Lanjut ke grup berikutnya tanpa mengirim pesan
        }
        
        try {
            await slideButton(gid);   // fungsi carousel yang sudah ada
            success++;
        } catch (e) {
            console.log(`Gagal kirim slide ke ${gid}:`, e.message);
        }
        
        await sleep(global.JedaJpm); 
    }
    
    delete global.statusjpm;
    
    await sock.sendMessage(jidAwal, {
        text: `✅ *JPM Slide Selesai*\n\n` +
              `Total grup terkirim : ${success}\n` +
              `Total grup dilewati : ${skipped}\n` +
              `Total grup yang dikirim : ${grupList.length}`
    }, { quoted: m });
    
}
break;
    
        
    
    

case "bljpm": {
    if (!isOwner) return m.reply(mess.owner);

    // Lokasi file database blacklist
    const pentingPath = DBP("bljpm.json");

    // Buat file jika belum ada
    if (!fs.existsSync(pentingPath)) {
        fs.mkdirSync(path.dirname(pentingPath), { recursive: true });
        fs.writeFileSync(pentingPath, JSON.stringify({ blacklistJpm: [] }, null, 2));
    }

    let penting = JSON.parse(fs.readFileSync(pentingPath, "utf-8"));

    function savePenting() {
        fs.writeFileSync(pentingPath, JSON.stringify(penting, null, 2));
    }

    let [act, arg] = (text || "").split("|").map(a => a?.trim()?.toLowerCase());

    
    if (m.isGroup) {
        const gid = m.chat;
        if (act === "on") {
            if (!penting.blacklistJpm.includes(gid)) {
                penting.blacklistJpm.push(gid);
                savePenting();
                return m.reply("✅ Grup ini berhasil *ditambahkan ke Blacklist JPM*.\nGrup ini tidak akan menerima JPM lagi.");
            } else {
                return m.reply("Grup ini sudah ada di daftar blacklist.");
            }
        } else if (act === "off") {
            if (penting.blacklistJpm.includes(gid)) {
                penting.blacklistJpm = penting.blacklistJpm.filter(x => x !== gid);
                savePenting();
                return m.reply("✅ Grup ini berhasil *dihapus dari Blacklist JPM*.");
            } else {
                return m.reply("Grup ini belum ada di daftar blacklist.");
            }
        } else {
            return m.reply(`Format:\n${cmd} on\n${cmd} off`);
        }
    }

    // 2. Digunakan di dalam CHANNEL
    if (m.chat.endsWith("@newsletter")) {
        const cid = m.chat;
        if (act === "on") {
            if (!penting.blacklistJpm.includes(cid)) {
                penting.blacklistJpm.push(cid);
                savePenting();
                return m.reply("✅ Channel ini berhasil *ditambahkan ke Blacklist JPM*.");
            } else {
                return m.reply("Channel ini sudah ada di daftar blacklist.");
            }
        } else if (act === "off") {
            if (penting.blacklistJpm.includes(cid)) {
                penting.blacklistJpm = penting.blacklistJpm.filter(x => x !== cid);
                savePenting();
                return m.reply("✅ Channel ini berhasil *dihapus dari Blacklist JPM*.");
            } else {
                return m.reply("Channel ini belum ada di daftar blacklist.");
            }
        } else {
            return m.reply(`Format:\n${cmd} on\n${cmd} off`);
        }
    }

    // 3. Digunakan di PRIVATE CHAT
    if (!m.isGroup && !m.chat.endsWith("@newsletter")) {
        const allGroups = await sock.groupFetchAllParticipating();
        const groupIDs = Object.keys(allGroups);

        const allChannels = await sock.newsletterFetchAllParticipating();
        const channelIDs = Object.keys(allChannels);

        if (!groupIDs.length && !channelIDs.length) {
            return m.reply("Bot belum tergabung di grup atau channel manapun.");
        }

        
        if (!act) {
            let txt = `*Daftar Grup & Channel yang diikuti bot*\n\n`;

            txt += `*Grup (${groupIDs.length})*\n`;
            groupIDs.forEach((id, i) => {
                const subj = allGroups[id].subject || "Tanpa Judul";
                const bl = penting.blacklistJpm.includes(id) ? " (BL)" : "";
                txt += `${i+1}. ${subj}${bl}\n`;
            });

            if (channelIDs.length) {
                txt += `\n*Channel (${channelIDs.length})*\n`;
                channelIDs.forEach((id, i) => {
                    const name = allChannels[id]?.name || "Tanpa Nama";
                    const bl = penting.blacklistJpm.includes(id) ? " (BL)" : "";
                    txt += `${groupIDs.length + i + 1}. ${name}${bl}\n`;
                });
            }

            txt += `\n*Cara pakai massal:*\n${cmd} on|1,3,5\n${cmd} off|2,4\n\n(Nomor sesuai urutan di atas)`;

            return m.reply(txt);
        }

        
        const idxList = arg ? arg.split(",").map(x => parseInt(x.trim()) - 1).filter(x => !isNaN(x)) : [];
        if (!idxList.length) return m.reply("Masukkan nomor urut setelah tanda |");

        const isOn  = act === "on";
        const isOff = act === "off";
        if (!isOn && !isOff) return m.reply("Gunakan on atau off sebelum tanda |");

        const combined = [...groupIDs, ...channelIDs];
        let hasil = [];

        for (const idx of idxList) {
            if (idx < 0 || idx >= combined.length) continue;

            const targetID = combined[idx];
            const isChannel = targetID.endsWith("@newsletter");
            const name = isChannel 
                ? (allChannels[targetID]?.name || "Channel Tanpa Nama")
                : (allGroups[targetID]?.subject || "Grup Tanpa Nama");

            if (isOn) {
                if (!penting.blacklistJpm.includes(targetID)) {
                    penting.blacklistJpm.push(targetID);
                    hasil.push(`+ ${isChannel ? "Channel" : "Grup"} *${name}* masuk blacklist`);
                } else {
                    hasil.push(`~ ${name} sudah BL`);
                }
            } else if (isOff) {
                if (penting.blacklistJpm.includes(targetID)) {
                    penting.blacklistJpm = penting.blacklistJpm.filter(x => x !== targetID);
                    hasil.push(`- ${isChannel ? "Channel" : "Grup"} *${name}* dihapus dari blacklist`);
                } else {
                    hasil.push(`~ ${name} bukan BL`);
                }
            }
        }

        savePenting();

        if (!hasil.length) return m.reply("Tidak ada perubahan.");
        return m.reply(hasil.join("\n"));
    }

    return m.reply("Perintah ini hanya bisa digunakan di grup, channel, atau private chat owner.");
}
break;       
        
case "listbljpm": {
    if (!isOwner) return m.reply(mess.owner);

    const pentingPath = DBP("bljpm.json");
    if (!fs.existsSync(pentingPath)) return m.reply("Daftar blacklist JPM masih kosong.");
    
    let penting = JSON.parse(fs.readFileSync(pentingPath, "utf-8"));
    if (!penting.blacklistJpm || penting.blacklistJpm.length === 0) return m.reply("Daftar blacklist JPM masih kosong.");

    const allGroups = await sock.groupFetchAllParticipating().catch(() => ({}));
    const allChannels = await sock.newsletterFetchAllParticipating().catch(() => ({}));

    let txt = `*📑 DAFTAR BLACKLIST JPM*\nTotal: ${penting.blacklistJpm.length} Grup/Channel\n\n`;
    
    penting.blacklistJpm.forEach((id, i) => {
        let name = "Unknown (Bot tidak di dalam grup/channel ini)";
        if (id.endsWith("@g.us") && allGroups[id]) name = allGroups[id].subject;
        if (id.endsWith("@newsletter") && allChannels[id]) name = allChannels[id].name;
        
        txt += `*${i + 1}.* ${name}\n╰┈➤ ID GROUP: ${id}\n\n`;
    });

    return m.reply(txt);
}
break;
        
case "statusjpm":
case "statuspush":
case "cekstatus": {
    if (!isOwner) return m.reply(mess.owner);
    
    let statusJpm = global.statusjpm ? "🟢 Sedang Berjalan" : "🔴 Sedang Berhenti";
    let statusPush = global.statuspush ? "🟢 Sedang Berjalan" : "🔴 Sedang Berhenti";

    let txt = `*📊 STATUS BROADCAST BOT*\n\n`;
    txt += `*JPM (Grup/Channel)* : ${statusJpm}\n`;
    txt += `*PushKontak* : ${statusPush}\n\n`;
    txt += `_Ketik .stopjpm untuk menghentikan JPM_\n`;
    txt += `_Ketik .stoppush untuk menghentikan Push Kontak_`;

    return m.reply(txt);
}
break;        
        
case "blpush": {
    if (!isOwner) return m.reply(mess.owner);

    const blPushPath = DBP("blpush.json");
    
    // Buat file jika belum ada
    if (!fs.existsSync(blPushPath)) {
        fs.mkdirSync(path.dirname(blPushPath), { recursive: true });
        fs.writeFileSync(blPushPath, JSON.stringify({ blacklistPush: [] }, null, 2));
    }
    
    let dataBl = JSON.parse(fs.readFileSync(blPushPath, "utf-8"));
    let act = args[0]?.toLowerCase(); 
    let input = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text ? text.replace(/[^0-9]/g, "") + "@s.whatsapp.net" : null;

    if (!act || !["add", "del", "list"].includes(act)) {
        return m.reply(`*Format Salah!*\n\n*Cara Penggunaan:*\n- ${cmd} add @tag/nomor (reply)\n- ${cmd} del @tag/nomor (reply)\n- ${cmd} list`);
    }

    if (act === "list") {
        if (!dataBl.blacklistPush || dataBl.blacklistPush.length === 0) return m.reply("Daftar blacklist Push Kontak masih kosong.");
        
        let txt = `*📑 DAFTAR BLACKLIST PUSH KONTAK*\nTotal: ${dataBl.blacklistPush.length} User\n\n`;
        dataBl.blacklistPush.forEach((id, i) => {
            txt += `*${i + 1}.* @${id.split("@")[0]}\n`;
        });
        return sock.sendMessage(m.chat, { text: txt, mentions: dataBl.blacklistPush }, { quoted: m });
    }

    
    if (!input || input === "@s.whatsapp.net") return m.reply("Sertakan nomor, reply pesan, atau tag target!");

    if (act === "add") {
        if (dataBl.blacklistPush.includes(input)) return m.reply("Nomor tersebut sudah ada di daftar blacklist.");
        dataBl.blacklistPush.push(input);
        fs.writeFileSync(blPushPath, JSON.stringify(dataBl, null, 2));
        return sock.sendMessage(m.chat, { text: `✅ Berhasil menambahkan @${input.split("@")[0]} ke Blacklist Push Kontak.`, mentions: [input] }, { quoted: m });
    }

    if (act === "del") {
        if (!dataBl.blacklistPush.includes(input)) return m.reply("Nomor tersebut tidak ada di daftar blacklist.");
        dataBl.blacklistPush = dataBl.blacklistPush.filter(x => x !== input);
        fs.writeFileSync(blPushPath, JSON.stringify(dataBl, null, 2));
        return sock.sendMessage(m.chat, { text: `✅ Berhasil menghapus @${input.split("@")[0]} dari Blacklist Push Kontak.`, mentions: [input] }, { quoted: m });
    }
}
break;        
        
case "blpush2": {
    if (!isOwner) return m.reply(mess.owner);

    const blPushPath = DBP("blpush2.json");
    
    // Buat file jika belum ada
    if (!fs.existsSync(blPushPath)) {
        fs.mkdirSync(path.dirname(blPushPath), { recursive: true });
        fs.writeFileSync(blPushPath, JSON.stringify({ blacklistPush: [] }, null, 2));
    }
    
    let dataBl = JSON.parse(fs.readFileSync(blPushPath, "utf-8"));
    let act = args[0]?.toLowerCase(); 
    let input = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text ? text.replace(/[^0-9]/g, "") + "@s.whatsapp.net" : null;

    if (!act || !["add", "del", "list"].includes(act)) {
        return m.reply(`*Format Salah!*\n\n*Cara Penggunaan:*\n- ${cmd} add @tag/nomor (reply)\n- ${cmd} del @tag/nomor (reply)\n- ${cmd} list`);
    }

    if (act === "list") {
        if (!dataBl.blacklistPush || dataBl.blacklistPush.length === 0) return m.reply("Daftar blacklist Push Kontak masih kosong.");
        
        let txt = `*📑 DAFTAR BLACKLIST PUSH KONTAK2*\nTotal: ${dataBl.blacklistPush.length} User\n\n`;
        dataBl.blacklistPush.forEach((id, i) => {
            txt += `*${i + 1}.* @${id.split("@")[0]}\n`;
        });
        return sock.sendMessage(m.chat, { text: txt, mentions: dataBl.blacklistPush }, { quoted: m });
    }

    
    if (!input || input === "@s.whatsapp.net") return m.reply("Sertakan nomor, reply pesan, atau tag target!");

    if (act === "add") {
        if (dataBl.blacklistPush.includes(input)) return m.reply("Nomor tersebut sudah ada di daftar blacklist.");
        dataBl.blacklistPush.push(input);
        fs.writeFileSync(blPushPath, JSON.stringify(dataBl, null, 2));
        return sock.sendMessage(m.chat, { text: `✅ Berhasil menambahkan @${input.split("@")[0]} ke Blacklist Push Kontak.`, mentions: [input] }, { quoted: m });
    }

    if (act === "del") {
        if (!dataBl.blacklistPush.includes(input)) return m.reply("Nomor tersebut tidak ada di daftar blacklist.");
        dataBl.blacklistPush = dataBl.blacklistPush.filter(x => x !== input);
        fs.writeFileSync(blPushPath, JSON.stringify(dataBl, null, 2));
        return sock.sendMessage(m.chat, { text: `✅ Berhasil menghapus @${input.split("@")[0]} dari Blacklist Push Kontak.`, mentions: [input] }, { quoted: m });
    }
}
break;        
        
case "play": {
    if (!text) return m.reply(`*Format Salah!*\n\nContoh penggunaan:\n${cmd} nama lagu atau penyanyi\n\nContoh: ${cmd} alan walker faded`);

    
  await sock.sendMessage(m.chat, { react: { text: '🧭', key: m.key } })       

    try {
       
        let result = await playYt(text);

        
        if (!result) {
            return m.reply("❌ Gagal menemukan atau mengunduh audio. Server API mungkin sedang sibuk atau coba kata kunci lain.");
        }

        
        let caption = `ıllıllı *YOUTUBE DOWNLOAD* ıllıllı\n\n`;
        caption += `🎵 *Judul* : ${result.title}\n`;
        caption += `👤 *Channel* : ${result.channel || 'Tidak diketahui'}\n`;
        caption += `🔗 *Source URL* : ${result.url || '-'}\n\n`;
        caption += `_Audio sedang dikirim, mohon tunggu..._`;

await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })             
        
        await sock.sendMessage(m.chat, {
            image: { url: result.cover },
            caption: caption
        }, { quoted: m });

        
        await sock.sendMessage(m.chat, {
            audio: { url: result.download },
            mimetype: 'audio/mpeg',
            ptt: false 
        }, { quoted: m });

    } catch (e) {
        console.error("Error di case play:", e.message);
        m.reply("❌ Terjadi kesalahan internal saat memproses musik.");
    }
}
break;        
        
function formatNumber(n) {
  return Number(n || 0).toLocaleString("id-ID");
}

function formatDuration(sec) {
  if (!sec) return "00:00";
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}


case "tiktok":
case "tt":
case "ttsearch":  {
  try {
    const input = m.quoted?.text || text;
    if (!input) {
        let warnMsg = `❖ ── ✦ ──『 ᴛɪᴋᴛᴏᴋ 』── ✦ ── ❖\n\n`;
        warnMsg += `*Format Penggunaan Salah!*\n\n`;
        warnMsg += `📥 *Download Mode:*\n`;
        warnMsg += `=> ${cmd} link_tiktok\n\n`;
        warnMsg += `🔍 *Search Mode:*\n`;
        warnMsg += `=> ${cmd} kata_kunci\n\n`;
        warnMsg += `_© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀɴᴅʀɪ sᴛᴏʀᴇ_`;
        return m.reply(warnMsg);
    }

    // Reaction loading
    await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });
    
    const regex = /(https:\/\/(vt|vm)\.tiktok\.com\/[^\s]+|https:\/\/www\.tiktok\.com\/@[\w.-]+\/video\/\d+)/;
    const url = input.match(regex)?.[0];

    
    if (url) {
      const res = await fetch(`https://www.tikwm.com/api/?url=${url}&hd=1`);
      const json = await res.json();
      if (!json?.data) {
          await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
          return m.reply("❌ Gagal mengambil data TikTok. Pastikan link valid dan tidak diprivate.");
      }

      await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

      const d = json.data;

      let info = `╭━━━〔 🎵 ᴛɪᴋᴛᴏᴋ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ 〕━━━╮\n`;
      info += `┃\n`;
      info += `┃ 📌 *Judul:* ${d.title || "Tidak ada judul"}\n`;
      info += `┃ 👤 *Author:* ${d.author?.nickname || d.author?.unique_id || "Unknown"}\n`;
      info += `┃ 🌍 *Region:* ${d.region || "-"}\n`;
      info += `┃ ⏱️ *Durasi:* ${formatDuration(d.duration)}\n`;
      info += `┃ 👁️ *Views:* ${formatNumber(d.play_count)}\n`;
      info += `┃ 💬 *Komen:* ${formatNumber(d.comment_count)}\n`;
      info += `┃ 🔁 *Share:* ${formatNumber(d.share_count)}\n`;
      info += `┃\n`;
      info += `╰━━━━━━━━━━━━━━━━━━━━━\n\n`;
      info += `_© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀɴᴅʀɪ sᴛᴏʀᴇ_`;

      // ===== foto slide =====
      if (d.images?.length) {
        await m.reply(info); // Kirim caption secara terpisah jika berupa foto slide
        for (let i = 0; i < d.images.length; i++) {
          await sock.sendMessage(
            m.chat,
            { image: { url: d.images[i] } },
            { quoted: m }
          );
        }
      } 
      // ===== video =====
      else {
        await sock.sendMessage(
          m.chat,
          { video: { url: d.play }, caption: info },
          { quoted: m }
        );
      }

      // ===== audio =====
      if (d.music_info?.play) {
        await sock.sendMessage(
          m.chat,
          {
            audio: { url: d.music_info.play },
            mimetype: "audio/mpeg",
            fileName: `TiktokAudio_${d.author?.unique_id || "FuyuhaShinaMD"}.mp3`
          },
          { quoted: m }
        );
      }

    
    } else {
      const res = await fetch(`https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(input)}&count=1&cursor=0&web=1&hd=1`);
      const json = await res.json();
      const v = json?.data?.videos?.[0];
      
      if (!v) {
          await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
          return m.reply("❌ Video tidak ditemukan. Coba gunakan kata kunci lain.");
      }

      await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

      let caption = `╭━━━〔 🔍 ᴛɪᴋᴛᴏᴋ sᴇᴀʀᴄʜ 〕━━━╮\n`;
      caption += `┃\n`;
      caption += `┃ 📌 *Judul:* ${v.title || "Tidak ada judul"}\n`;
      caption += `┃ 👤 *Author:* ${v.author?.nickname || v.author?.unique_id || "Unknown"}\n`;
      caption += `┃ 🌍 *Region:* ${v.region || "-"}\n`;
      caption += `┃ ⏱️ *Durasi:* ${formatDuration(v.duration)}\n`;
      caption += `┃ 👁️ *Views:* ${formatNumber(v.play_count)}\n`;
      caption += `┃ 💬 *Komen:* ${formatNumber(v.comment_count)}\n`;
      caption += `┃ 🔁 *Share:* ${formatNumber(v.share_count)}\n`;
      caption += `┃\n`;
      caption += `╰━━━━━━━━━━━━━━━━━━━━━\n\n`;
      caption += `_© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀɴᴅʀɪ sᴛᴏʀᴇ_`;

      // Handle foto slide pada fitur Search
      if (v.images?.length) {
        await m.reply(caption);
        for (let i = 0; i < v.images.length; i++) {
          await sock.sendMessage(m.chat, { image: { url: v.images[i] } }, { quoted: m });
        }
      } 
      // Handle Video pada fitur Search
      else {
        let videoUrl = v.play.startsWith("http") ? v.play : "https://www.tikwm.com" + v.play;
        await sock.sendMessage(
          m.chat,
          { video: { url: videoUrl }, caption: caption },
          { quoted: m }
        );
      }
      
      // Handle Ekstraksi Audio pada fitur Search
      if (v.music_info?.play) {
          let audioUrl = v.music_info.play.startsWith("http") ? v.music_info.play : "https://www.tikwm.com" + v.music_info.play;
          await sock.sendMessage(
              m.chat,
              {
                  audio: { url: audioUrl },
                  mimetype: "audio/mpeg",
                  fileName: `TiktokSearch_${v.author?.unique_id || "FuyuhaShinaMD"}.mp3`
              },
              { quoted: m }
          );
      }
    }
  } catch (e) {
    console.error(e);
    await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    m.reply("❌ Terjadi kesalahan saat memproses data TikTok.");
  }
}
break;        
        
case "autojpm": {
  if (!isOwner) return m.reply(mess.owner);

  let [cmd, ...argsList] = text.split(" ");
  cmd = cmd ? cmd.toLowerCase() : null;

  
   let penting = JSON.parse(fs.readFileSync(DBP("bljpm.json"))); 

  if (!cmd) {
    let list = penting.autoJpm.messages.map((m, i) => `┃ ${i + 1}. ${m.caption || m.text || "(Media tanpa teks)"}`).join("\n") || "┃ - Data kosong -";
    
    let menu = `╭━━━〔 ⚙️ ᴀᴜᴛᴏ ᴊᴘᴍ sʏsᴛᴇᴍ 〕━━━╮\n`;
    menu += `┃\n`;
    menu += `┃ 🟢 *Status:* ${penting.autoJpm.status ? "ON ✅" : "OFF ❌"}\n`;
    menu += `┃ ⏱️ *Interval:* ${penting.autoJpm.interval || 0} ${penting.autoJpm.type || "menit"}\n`;
    menu += `┃\n`;
    menu += `┃ 📂 *Pesan Tersimpan:*\n`;
    menu += `${list}\n`;
    menu += `┃\n`;
    menu += `┃ 🛠️ *Command List:*\n`;
    menu += `┃ => .autojpm on/off\n`;
    menu += `┃ => .autojpm add <teks> (bisa reply media)\n`;
    menu += `┃ => .autojpm del <nomor/all>\n`;
    menu += `┃ => .autojpm set <angka> menit/jam\n`;
    menu += `┃ => .autojpm preview <nomor>\n`;
    menu += `┃\n`;
    menu += `╰━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    menu += `_© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀɴᴅʀɪ sᴛᴏʀᴇ_`;
    return m.reply(menu);
  }

  if (cmd === "on") {
    if (penting.autoJpm.status) return m.reply("✅ Auto JPM sudah dalam keadaan aktif.");
    if (!penting.autoJpm.interval || !penting.autoJpm.messages.length) {
      return m.reply("❌ Gagal. Set interval waktu dan tambahkan pesan terlebih dahulu!");
    }
    penting.autoJpm.status = true;
    savePenting();
    return m.reply("✅ Sistem Auto JPM berhasil diaktifkan.");
  }

  else if (cmd === "off") {
    penting.autoJpm.status = false;
    savePenting();
    return m.reply("✅ Sistem Auto JPM berhasil dimatikan.");
  }

  else if (cmd === "add") {
    let qmsg = m.quoted ? m.quoted : m;
    let mime = (qmsg.msg || qmsg).mimetype || '';
    let caption = argsList.join(" ");
    let tmpDir = path.join(process.cwd(), "tmp", "autojpm");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    if (/image|video/.test(mime)) {
      let ext = mime.split("/")[1] || "bin";
      let fileName = `autojpm_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
      let filePath = path.join(tmpDir, fileName);

      let buffer = await sock.downloadMediaMessage(qmsg);
      fs.writeFileSync(filePath, buffer);

      penting.autoJpm.messages.push({
        type: /image/.test(mime) ? "image" : "video",
        path: filePath,
        caption: caption
      });
    } else {
      if (!caption) return m.reply("❌ Masukkan teks pesan atau reply media dengan caption.");
      penting.autoJpm.messages.push({
        type: "text",
        text: caption
      });
    }
    
    penting.autoJpm._lastRun = 0;
    savePenting();
    return m.reply("✅ Pesan berhasil ditambahkan ke database Auto JPM.");
  }

  else if (cmd === "del") {
    let idx = argsList[0];
    if (!idx) return m.reply("❌ Masukkan nomor urut pesan atau ketik 'all' untuk hapus semua.");
    
    if (idx.toLowerCase() === "all") {
      penting.autoJpm.messages = [];
    } else {
      idx = parseInt(idx) - 1;
      if (isNaN(idx) || idx < 0 || idx >= penting.autoJpm.messages.length) {
        return m.reply("❌ Nomor urut pesan tidak valid.");
      }
      penting.autoJpm.messages.splice(idx, 1);
    }
    savePenting();
    return m.reply("✅ Pesan berhasil dihapus.");
  }

  else if (cmd === "set") {
    let num = parseInt(argsList[0]);
    let unit = (argsList[1] || "").toLowerCase();
    
    if (isNaN(num) || num <= 0) return m.reply("❌ Masukkan angka yang valid.");
    if (!["menit", "jam", "hari", "minute", "hour", "day"].includes(unit)) {
      return m.reply("❌ Gunakan format satuan: menit / jam / hari.");
    }

    penting.autoJpm.interval = num;
    penting.autoJpm.type = unit.startsWith("m") ? "minute" : unit.startsWith("j") ? "hour" : "day";
    savePenting();
    return m.reply(`✅ Auto JPM berhasil diatur menjadi setiap ${num} ${penting.autoJpm.type}.`);
  }

  // Fitur Preview
  else if (cmd === "preview") {
    let idx = parseInt(argsList[0]) - 1;
    if (isNaN(idx) || idx < 0 || idx >= penting.autoJpm.messages.length) {
        return m.reply("❌ Nomor pesan tidak valid. Cek daftar dengan ketik .autojpm");
    }
    
    let msgData = penting.autoJpm.messages[idx];
    if (msgData.type === "text") {
        return m.reply(`*PREVIEW PESAN #${idx + 1}:*\n\n${msgData.text}`);
    } else if (msgData.type === "image" || msgData.type === "video") {
        if (!fs.existsSync(msgData.path)) return m.reply("❌ File media hilang dari folder tmp.");
        
        let mediaObj = msgData.type === "image" 
            ? { image: fs.readFileSync(msgData.path), caption: msgData.caption || "" }
            : { video: fs.readFileSync(msgData.path), caption: msgData.caption || "" };
            
        await sock.sendMessage(m.chat, mediaObj, { quoted: m });
    }
  }
}
break;        
        
//================================        
default:
if (await require("./source/Smart.js").curt({ sock, m, isCmd, isOwner })) return
if (m.text.toLowerCase().startsWith("xx")) {
    if (!isOwner) return;

    try {
        const result = await eval(`(async () => { ${text} })()`);
        const output = typeof result !== "string" ? util.inspect(result) : result;
        return sock.sendMessage(m.chat, { text: util.format(output) }, { quoted: m });
    } catch (err) {
        return sock.sendMessage(m.chat, { text: util.format(err) }, { quoted: m });
    }
}

if (m.text.toLowerCase().startsWith("x")) {
    if (!isOwner) return;

    try {
        let result = await eval(text);
        if (typeof result !== "string") result = util.inspect(result);
        return sock.sendMessage(m.chat, { text: util.format(result) }, { quoted: m });
    } catch (err) {
        return sock.sendMessage(m.chat, { text: util.format(err) }, { quoted: m });
    }
}

if (m.text.startsWith('$')) {
    if (!isOwner) return;
    
    exec(m.text.slice(2), (err, stdout) => {
        if (err) {
            return sock.sendMessage(m.chat, { text: err.toString() }, { quoted: m });
        }
        if (stdout) {
            return sock.sendMessage(m.chat, { text: util.format(stdout) }, { quoted: m });
        }
    });
}

}

} catch (err) {
console.log(err)
await sock.sendMessage(global.owner+"@s.whatsapp.net", {text: err.toString()}, {quoted: m ? m : null })
}}

//=============================================//

process.on("uncaughtException", (err) => {
console.error("Caught exception:", err);
});


// ---- helper Panel Pterodactyl ----
function ptHeaders() {
    return { Accept: "application/json", "Content-Type": "application/json", Authorization: "Bearer " + global.apikey }
}
async function ptAll(path) {
    const out = []
    for (let page = 1; page <= 50; page++) {
        const r = await fetch(`${global.domain}${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`, { method: "GET", headers: ptHeaders() })
        const j = await r.json()
        out.push(...(j.data || []))
        const pg = j.meta && j.meta.pagination
        if (!pg || page >= pg.total_pages) break
    }
    return out
}

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.blue(">> Update File:"), chalk.black.bgWhite(__filename));
    delete require.cache[file];
    require(file);
});