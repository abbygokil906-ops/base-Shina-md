const Brand = require("./source/Brand.js")   // identitas hak milik (dikunci)
/*
   Fuyuha Shina Multi Device
   Owner: Fuyuha Arshi
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

//=============================================//

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

// ===== (gerbang fitur jualan Warung/Nokos sudah dihapus dari sini) =====
{
    if (!isCmd) {
        // Setor Template: foto yang diminta bot setelah .tempel1 / .tmpl*
        if (await require("./source/SetorTemplate.js").handleMedia({ sock, m })) return
        if (await require("./source/Game.js").handleReply({ sock, m, isOwner })) return
        // Jawaban game Fun yang sedang berjalan (tebak, cepatketik, hilo, hitungbenda, mastermind, dst) lewat pesan biasa
        if (await require("./source/Fun.js").handleBefore({ sock, m, isOwner })) return
    }
    // ===== WAJIB DAFTAR: semua command (game, stiker, tools, download, stalker, grup, dst) harus .daftar dulu. Owner & .daftar dikecualikan =====
    if (isCmd && await require("./source/Rpg.js").gateAll({ m, command, isOwner })) return
    // Kategori Game
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
    nokosMode: false,
    warungMode: false,
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
        ? (en ? "Button *ON*. Matikan: .button off" : "Button *ON*. Matikan: .button off")
        : (en ? "Button *OFF*. .menu = foto + teks. Nyalakan: .button on".replace("Nyalakan", "Turn on") : "Button *OFF*. .menu jadi foto + teks. Nyalakan: .button on"))
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
        nokosMode: false,
        warungMode: false,
        owner: global.owner,
        botName: global.namaBot,
        version: "1.7",
        status: { owner: "Owner", premium: "Premium", warlock: "Warlock" }[Limit.status(m, isOwner).role],
        limit: Limit.limitText(Limit.status(m, isOwner)),
        runtime: runtime(process.uptime())
    }, { skipLoading: true, skipAudio: true })
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
            text: `Berhasil mengeluarkan @${target.split("@")[0]}`,
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
        const body = `*TAG ALL*\n ${members.length} anggota\n💬 ${pesan}\n\n` + members.map(j => `• @${num(j)}`).join("\n");
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
            return m.reply("Welcome sudah aktif");
        global.db.settings.welcome = true;
        return m.reply("Berhasil menyalakan welcome");
    }

    if (text === "off") {
        if (!global.db.settings.welcome) 
            return m.reply("Welcome sudah tidak aktif");
        global.db.settings.welcome = false;
        return m.reply("Berhasil mematikan welcome");
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
        return m.reply(`Berhasil menyalakan antilink di grup ini`);
    }

    if (text === "off") {
        if (!group.antilink) return m.reply(`Antilink di grup ini sudah tidak aktif!`);
        group.antilink = false;
        return m.reply(`Berhasil mematikan antilink di grup ini`);
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
        return m.reply(`Berhasil menyalakan antilink2 di grup ini`);
    }

    if (text === "off") {
        if (!group.antilink2) return m.reply(`Antilink2 di grup ini sudah tidak aktif!`);
        group.antilink2 = false;
        return m.reply(`Berhasil mematikan antilink2 di grup ini`);
    }
}
break;

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
        return m.reply("Public mode on");
    }

    if (command === "self") {
        global.mode_public = false;
        sock.public = global.mode_public
        let newData = data.replace(/global\.mode_public\s*=\s*(true|false)/, "global.mode_public = false");
        fs.writeFileSync(path, newData, "utf-8");
        return m.reply("Self mode on");
    }
}
break;

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
        
        await m.reply(`Barhasil Menghapus Sever Panel\nNama Server: ${capital(serverName)}`);
        
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
        if (!offServers.length) return m.reply(`Tidak ada panel yang off. Semua aman${cekGagal ? `\n(${cekGagal} server gagal dicek statusnya, nggak dihapus)` : ""}`)

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
        await m.reply(`Selesai\n\nPanel off terdeteksi: ${offServers.length}\nServer terhapus: ${srvOk}${srvFail ? ` (gagal ${srvFail})` : ""}\nUser terhapus: ${userOk}${userFail ? ` (gagal ${userFail})` : ""}\nPanel milik admin yang dihapus: ${adminSrv} (user admin tidak dihapus)`)
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
            await m.reply(`Berhasil membuat akun admin panel\nData akun terkirim ke nomor ${nomor.split("@")[0]}`);
        }

        const teks = `
*Berikut detail akun admin panel 📦*

Server ID: ${user.id}
Username: \`${user.username}\`
Password: \`${password}\`
Tanggal Aktivasi: ${global.tanggal(Date.now())}
*Domain* ${global.domain}

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

        await m.reply(`Berhasil Menghapus Admin Panel\nNama User: ${global.capital(username)}`);

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
    m.reply(`Berhasil menambah reseller`);
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
    m.reply(`Berhasil menghapus reseller`);
}
break;

case "saluran": case "channel": case "ch": {
const { sendNative, urlButton } = require("./source/Button.js")
await sendNative(sock, m.chat, {
    body: `*Saluran ${global.namaCh}*\nGabung biar nggak ketinggalan info terbaru.`,
    footer: global.namaBot,
    buttons: [urlButton("Join Saluran", global.linkChannel)]
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
│ *User*   : @${m.sender.split("@")[0]}
│ *Status* : ${st.label}
│ *Limit*  : ${Limit.limitText(st)}${exp ? `\n│ ⏳ *Premium sampai* : ${exp}` : ""}
╰──────────────⦁

Warlock = limit ${Limit.DAILY_LIMIT}/hari untuk fitur *play, tiktok, sticker, tourl*
Premium & Owner = unlimited
Limit habis? Cari koin lewat RPG, lalu beli limit: *.belilimit <jumlah>*`)
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
        text: `@${target.split("@")[0]} sekarang *Premium*\nDurasi: ${lamaHari ? lamaHari + " hari" : "Permanen"}\nLimit: Unlimited ♾️`,
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
    await sock.sendMessage(m.chat, { text: `Premium @${target.split("@")[0]} dicabut, kembali jadi *Warlock*`, mentions: [target] }, { quoted: m })
}
break

case "listprem": case "listpremium": {
    if (!isOwner) return m.reply(mess.owner)
    const list = Limit.listPremium()
    if (!list.length) return m.reply("Belum ada user premium.")
    const txt = list.map((x, i) => `${i + 1}. @${x.jid.split("@")[0]} — ${x.until ? new Date(x.until + 7 * 3600000).toISOString().slice(0, 10) : "Permanen"}`).join("\n")
    await sock.sendMessage(m.chat, { text: `*LIST PREMIUM* (${list.length})\n\n${txt}`, mentions: list.map((x) => x.jid) }, { quoted: m })
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
    return m.reply(`Berhasil menambah owner\n- ${jid}`);
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
        return m.reply("Berhasil menghapus semua owner");
    }

    if (!global.db.settings.developer.includes(input)) 
        return m.reply("Nomor tidak ditemukan!");

    global.db.settings.developer = global.db.settings.developer.filter(i => i !== input);
    return m.reply(`Berhasil menghapus owner\n- ${input.split("@")[0]}`);
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
    if (!isOwner) return m.reply(mess.owner);

    return m.reply(
        "Reset database penuh dinonaktifkan untuk mencegah data registrasi dan pengaturan terhapus tidak sengaja. " +
        "Jika memang perlu reset, lakukan setelah membuat backup database/database.json."
    );
}
break
        
case "play": {
    if (!text) return m.reply(`*Format Salah!*\n\nContoh penggunaan:\n${cmd} nama lagu atau penyanyi\n\nContoh: ${cmd} alan walker faded`);

    
  await sock.sendMessage(m.chat, { react: { text: '🧭', key: m.key } })       

    try {
       
        let result = await playYt(text);

        
        if (!result) {
            return m.reply("Gagal menemukan atau mengunduh audio. Server API mungkin sedang sibuk atau coba kata kunci lain.");
        }

        
        let caption = `ıllıllı *YOUTUBE DOWNLOAD* ıllıllı\n\n`;
        caption += `*Judul* : ${result.title}\n`;
        caption += `*Channel* : ${result.channel || 'Tidak diketahui'}\n`;
        caption += `*Source URL* : ${result.url || '-'}\n\n`;
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
        m.reply("Terjadi kesalahan internal saat memproses musik.");
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
        warnMsg += `*Download Mode:*\n`;
        warnMsg += `=> ${cmd} link_tiktok\n\n`;
        warnMsg += `*Search Mode:*\n`;
        warnMsg += `=> ${cmd} kata_kunci\n\n`;
        warnMsg += `_© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${Brand.hak.nama}_`;
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
          return m.reply("Gagal mengambil data TikTok. Pastikan link valid dan tidak diprivate.");
      }

      await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

      const d = json.data;

      let info = `╭━━━〔 ᴛɪᴋᴛᴏᴋ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ 〕━━━╮\n`;
      info += `┃\n`;
      info += `┃ *Judul:* ${d.title || "Tidak ada judul"}\n`;
      info += `┃ *Author:* ${d.author?.nickname || d.author?.unique_id || "Unknown"}\n`;
      info += `┃ *Region:* ${d.region || "-"}\n`;
      info += `┃ *Durasi:* ${formatDuration(d.duration)}\n`;
      info += `┃ *Views:* ${formatNumber(d.play_count)}\n`;
      info += `┃ *Komen:* ${formatNumber(d.comment_count)}\n`;
      info += `┃ *Share:* ${formatNumber(d.share_count)}\n`;
      info += `┃\n`;
      info += `╰━━━━━━━━━━━━━━━━━━━━━\n\n`;
      info += `_© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${Brand.hak.nama}_`;

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
          return m.reply("Video tidak ditemukan. Coba gunakan kata kunci lain.");
      }

      await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

      let caption = `╭━━━〔 ᴛɪᴋᴛᴏᴋ sᴇᴀʀᴄʜ 〕━━━╮\n`;
      caption += `┃\n`;
      caption += `┃ *Judul:* ${v.title || "Tidak ada judul"}\n`;
      caption += `┃ *Author:* ${v.author?.nickname || v.author?.unique_id || "Unknown"}\n`;
      caption += `┃ *Region:* ${v.region || "-"}\n`;
      caption += `┃ *Durasi:* ${formatDuration(v.duration)}\n`;
      caption += `┃ *Views:* ${formatNumber(v.play_count)}\n`;
      caption += `┃ *Komen:* ${formatNumber(v.comment_count)}\n`;
      caption += `┃ *Share:* ${formatNumber(v.share_count)}\n`;
      caption += `┃\n`;
      caption += `╰━━━━━━━━━━━━━━━━━━━━━\n\n`;
      caption += `_© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${Brand.hak.nama}_`;

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
    m.reply("Terjadi kesalahan saat memproses data TikTok.");
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