const { Usage, num, targetOf, needAdmin, needBotAdmin } = require("./_lib.js")

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const hp = (p) => `❤️ HP  ${"▰".repeat(Math.round(p / 10))}${"▱".repeat(10 - Math.round(p / 10))} ${p}%`
const mp = (p) => `🔷 MP  ${"▰".repeat(Math.round(p / 10))}${"▱".repeat(10 - Math.round(p / 10))} ${p}%`

// Tiap skenario = urutan pesan yang diedit satu per satu (drama panjang). Babak terakhir muncul SETELAH target benar-benar dikeluarkan dari grup.
const SCENES = [
    // 1. Pertunjukan sulap panggung
    (t) => [
        `🎪 *PERTUNJUKAN SULAP AKBAR*\n\n_Lampu panggung menyala... musik drumroll berbunyi..._ 🥁`,
        `🎩 Seorang pesulap misterius melangkah ke panggung dengan jubah hitam berkilau.\n\n"Hadirin sekalian... malam ini aku akan melakukan sulap paling berbahaya sepanjang masa!"`,
        `👀 Mata pesulap menyapu seluruh penonton... lalu berhenti tepat di @${t}.\n\n"Kamu. Ya, kamu. Naiklah ke panggung."`,
        `😰 @${t} gemetar... tapi dua penjaga bertopeng sudah menyeretnya naik ke atas panggung.\n${hp(100)}`,
        `🔮 Pesulap mengeluarkan tongkat bercahaya ungu.\n\n"Tenang... ini cuma sedikit menyakitkan."\n_Penonton menahan napas..._ 😨`,
        `🌀 _Bim... salabim..._\n⚡ _Bim salah... bim TABRAK!!!_\n\n💥 Panggung bergetar hebat!\n${hp(60)}`,
        `🌫️ Asap tebal menutupi panggung. Terdengar teriakan @${t} yang makin lama makin kecil...\n\n"TOLOOONG... SINYAL GUE ILANG—"\n${hp(25)}`,
        `📵 Nomor @${t} mulai berkedip...\n\`+62 8xx-xxxx-xxxx\` ➜ \`+62 8xx-xxx-\` ➜ \`+62 8x-\` ➜ \`...\`\n${hp(5)}`,
        `💨 *POOF!!!*\n\nAsap menghilang. Panggung kosong. Cuma ada sandal jepit milik @${t} yang tertinggal. 🩴`,
        `🎩 Pesulap membungkuk.\n\n"Terima kasih hadirin. Jangan cari @${t} di room ini... dia sudah *hilang* dari dimensi ini."\n\n👏👏👏 _Penonton bertepuk tangan, setengahnya masih gemetar._\n\n✨ *SULAP SELESAI* ✨`
    ],

    // 2. RPG: boss penyihir
    (t) => [
        `⚔️ *RPG ENCOUNTER!*\n\n_Hutan Terlarang, tengah malam. Kabut tebal. Suara burung hantu..._ 🦉`,
        `🧙‍♂️ *Penyihir Kegelapan* muncul dari balik pohon!\n\n"Hohoho... ada petualang tersesat rupanya."\n\n🎯 Target terkunci: @${t}\n${hp(100)}\n${mp(100)}`,
        `🛡️ @${t} mencoba kabur... tapi _kakinya tertahan akar sihir!_\n\n[ Command: *LARI* ➜ ❌ GAGAL ]\n${hp(100)}`,
        `🔥 Penyihir mengangkat tongkat, lingkaran sihir merah menyala di tanah.\n\n"Rasakan mantra terlarangku..."\n⚠️ _Cast time: 3... 2... 1..._`,
        `✨ *"BIM SALAH BIM... KICK TABRAK!"* ✨\n\n⚡ CRITICAL HIT! x99\n💥 @${t} menerima *99.999 damage!*\n${hp(30)}`,
        `😵 @${t} masih berdiri... dengan satu kaki.\n\n[ Command: *MINUM POTION* ➜ ❌ _Potion kamu ternyata es teh_ 🧋 ]\n${hp(15)}`,
        `🌌 Penyihir membuka portal dimensi hitam di belakang @${t}.\n\n"Pergilah... ke tempat di mana sinyal tak pernah ada."\n${hp(5)}`,
        `🕳️ Portal menyedot @${t} perlahan...\n📵 Nomor memudar... memudar...\n\n"GUE MASIH MAU NGE-GAME—"\n${hp(1)}`,
        `☠️ *@${t} K.O.*\n\n📜 _Nomor tersebut telah *hilang dari room* dan tak ditemukan di peta mana pun._\n\n🎖️ Penyihir mendapatkan EXP +9999\n🪦 Nisan kecil muncul: "Di sini beristirahat @${t}, korban sulap."\n\n⚔️ *GAME OVER* ⚔️`
    ],

    // 3. Kuis maut ala detektif/horor lucu
    (t) => [
        `🕯️ *MALAM JUMAT KLIWON*\n\n_Room mendadak dingin. Lampu berkedip-kedip..._ 💡`,
        `👻 Sesosok kakek tua berjubah putih muncul di pojok room sambil membawa kain batik.\n\n"Hihihi... aku mencium aroma nomor yang akan hilang..."`,
        `🔦 Senter menyorot satu per satu member... lalu berhenti di @${t}.\n\n"Kamu... *kamu yang dipilih*."`,
        `😱 @${t} mengetik _"anjir siapa itu"_ tapi pesannya *centang satu* terus...\n📶 Sinyal: ▰▰▰▱▱▱▱▱▱▱`,
        `📿 Kakek menaburkan kembang tujuh rupa sambil komat-kamit.\n\n🪄 _"Bim salabim... bim salah... bim *TABRAK*, ada nomor ini akan hilang dari room!"_`,
        `🌪️ Angin kencang! Semua stiker beterbangan! Grup mendadak sepi...\n📶 Sinyal: ▰▱▱▱▱▱▱▱▱▱\n\n"Tolong... foto profil gue... mulai... *transparan*..." — @${t}`,
        `🫥 Foto profil @${t} memudar... namanya berubah jadi \`~\`... lalu jadi \`...\`\n📵 Last seen: _tidak diketahui_`,
        `💨 *HILANG.*\n\nTidak ada notifikasi. Tidak ada jejak. Cuma bubble chat terakhirnya yang menggantung:\n_"woi jangan sulap gu—"_`,
        `👻 Kakek tersenyum puas, lalu ikut menghilang.\n\n🕯️ Room kembali tenang. Tapi kalau tengah malam kamu denger notif bunyi sendiri... itu @${t} lagi cari sinyal.\n\n✨ *SULAP SELESAI* ✨`
    ]
]

module.exports = {
    name: "sulap",
    command: ["sulap"],
    desc: "Sulap ala RPG: bim salabim lalu member BENERAN keluar dari grup (admin/owner)",
    usage: "@tag / reply / nomor",
    example: "@tag",
    async run({ sock, m, text, isOwner }) {
        needAdmin(m, isOwner)      // cuma admin/owner yang boleh nyulap, biar gak disalahgunakan
        needBotAdmin(m)
        const target = targetOf(m, text)
        if (!target) throw new Usage()
        const t = num(target)

        // cek dulu SEBELUM drama, biar gak ada pertunjukan panjang yang berujung gagal
        const botId = sock.decodeJid(sock.user.id)
        const same = (p) => [p.id, p.jid, p.lid, p.phoneNumber].some((x) => x && num(x) === t)
        const part = (m.metadata?.participants || []).find(same)
        const owners = [global.owner, ...(global.ownerExtra || [])].map(String)
        if (num(botId) === t) throw new Usage("🤖 Bot gak bisa nyulap dirinya sendiri.")
        if (owners.includes(t) || part?.admin) throw new Usage("🛡️ Admin/owner kebal sulap, gak bisa dihilangkan.")
        if (m.metadata?.participants && !part) throw new Usage("❌ Nomor itu gak ada di grup ini.")

        const frames = SCENES[Math.floor(Math.random() * SCENES.length)](t)
        const mentions = [target]
        const first = await sock.sendMessage(m.chat, { text: frames[0], mentions }, { quoted: m })
        const edit = (txt) => sock.sendMessage(m.chat, { text: txt, mentions, edit: first.key }).catch(() => {})

        // semua babak kecuali penutup
        for (const f of frames.slice(1, -1)) {
            await sleep(2600)
            await edit(f)
        }

        // puncak sulap: target beneran dikeluarkan dari grup
        await sleep(2600)
        let ok = true
        try { await sock.groupParticipantsUpdate(m.chat, [target], "remove") } catch (e) { ok = false }

        await sleep(1500)
        await edit(ok ? frames[frames.length - 1] : `💨 Asap menghilang... tapi @${t} ternyata masih di sini.\n\n❌ *SULAP GAGAL* (WhatsApp menolak mengeluarkan nomor ini)`)
    }
}
