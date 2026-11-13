/*
  .cekjodoh — cek kecocokan dua orang (siapa saja: cewek-cowok, cewek-cewek, cowok-cowok, umur berapa pun).
  Hasilnya acak tapi KONSISTEN: pasangan yang sama selalu dapat skor yang sama (urutan nama tidak berpengaruh).
  Skor tinggi = dipuji, skor sedang = datar, skor rendah = dimaki-maki, skor paling rendah = di-bully.
  Pakai:  .cekjodoh Budi & Ani   |   .cekjodoh @tag1 @tag2   |   .cekjodoh Ani (lawannya = kamu)
*/
const { Usage } = require("../../../source/PluginLoader.js")

const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
const pick = (a, seed) => a[seed % a.length]

const TIERS = [
    { min: 90, judul: "💍 JODOH SEJATI", teks: [
        "Ini sih udah takdir. Tinggal cari tanggal, jangan kelamaan mikir!",
        "Cocok banget sampai semesta ikut baper. Cepetan resmiin sebelum diambil orang!",
        "Gila, kalian berdua klop parah. Yang jomblo di sekitar kalian auto iri.",
        "Paket komplit: cocok, serasi, saling melengkapi. Siap-siap undangan!"] },
    { min: 70, judul: "💖 COCOK BANGET", teks: [
        "Lumayan bagus nih. Dikit lagi usaha, jadi deh.",
        "Chemistry-nya dapet. Jangan gengsian, buruan ngobrol serius.",
        "Peluangnya gede. Tinggal salah satu berani duluan, jangan saling nunggu!",
        "Vibes-nya enak. Kalau jalan bareng pasti nggak kehabisan bahan obrolan."] },
    { min: 50, judul: "🙂 YA LUMAYAN", teks: [
        "Biasa aja sih, nggak jelek nggak istimewa. Kayak nasi tanpa lauk.",
        "Bisa jalan kalau mau berjuang. Kalau malas, ya bubar.",
        "Separuh cocok, separuh bikin emosi. Normal lah namanya juga manusia.",
        "Masih ada harapan, tapi jangan terlalu pede dulu ya."] },
    { min: 30, judul: "😤 DIMAKI-MAKI SEMESTA", teks: [
        "Anjir, ngarep amat lu. Orang yang lu taksir aja kagak tau nama lu siapa.",
        "Cocok dari mana, goblok? Lu berdua kalo ketemu juga saling pura-pura sibuk liat HP.",
        "Gue sih kasian sama yang bakal jadian ama lu. Bukan karena lu jahat, tapi karena lu nggak ada effort-nya sama sekali.",
        "Udah lah, lu tuh orangnya enak buat dijadiin temen curhat doang. Dari dulu juga gitu terus kan?"] },
    { min: 10, judul: "🤡 KENA BULLY", teks: [
        "Chat lu dibaca doang, kagak dibales. Itu bukan sibuk bro, itu lu emang kagak penting.",
        "Lu tuh bukan kalah saing, lu bahkan kagak pernah masuk daftar saingan.",
        "Tiap ada yang baik ama lu, lu langsung baper. Padahal dia emang baik ke semua orang, lu doang yang ngerasa spesial.",
        "Nunggu dichat duluan tiap malem, tapi yang chat cuma notif promo. Sabar ya, anjir."] },
    { min: 0, judul: "☠️ BENCANA NASIONAL", teks: [
        "Nol persen. Bukan jodoh, bukan temen, bukan siapa-siapa. Lu berdua tuh kagak nyambung sama sekali, titik.",
        "Yang lu sebut 'gebetan' itu cuma orang yang kebetulan sopan sama lu. Bangun, bro.",
        "Satu RT sepakat: stop ngarep. Energi lu mending dipake benerin hidup dulu, bukan benerin chat yang kagak dibales.",
        "Skor segini tuh bukan sial, ini udah pola. Lu yang selalu ngejar, dia yang selalu ngilang."] }
]

const bar = (n) => "█".repeat(Math.round(n / 10)) + "░".repeat(10 - Math.round(n / 10))

module.exports = {
    name: "cekjodoh",
    command: ["cekjodoh", "jodoh", "cekpasangan"],
    desc: "Cek kecocokan dua orang (siapa saja, umur berapa pun)",
    usage: "<nama1> & <nama2>  |  @tag1 @tag2  |  <nama>",
    example: "Budi & Ani",
    needs: null,
    async run({ sock, m, args, text, prefix }) {
        const num = (j) => String(j).split("@")[0].split(":")[0]
        const tags = (m.mentionedJid || []).filter(Boolean)
        const me = m.pushName || num(m.sender)
        let a, b, mentions = []
        if (tags.length >= 2) { a = "@" + num(tags[0]); b = "@" + num(tags[1]); mentions = tags.slice(0, 2) }
        else if (tags.length === 1 && !/[&x+]/i.test(text.replace(/@\d+/g, ""))) { a = "@" + num(m.sender); b = "@" + num(tags[0]); mentions = [m.sender, tags[0]] }
        else {
            const t = String(text || "").trim()
            if (!t) throw new Usage()
            const parts = t.split(/\s*(?:&|\+|\bdan\b|\bx\b|\bsama\b|,)\s*/i).map((s) => s.trim()).filter(Boolean)
            if (parts.length >= 2) { a = parts[0]; b = parts[1] } else { a = me; b = parts[0] }
        }
        if (a.toLowerCase() === b.toLowerCase()) throw new Usage("Kocak masa sama diri sendiri? Isi dua orang yang beda lah")
        // urutan nama tidak berpengaruh: Budi & Ani == Ani & Budi
        const key = [a, b].map((s) => s.toLowerCase().replace(/\s+/g, "")).sort().join("|")
        const h = hash(key)
        const skor = h % 101
        const tier = TIERS.find((t) => skor >= t.min)
        const umur = 17 + (hash(key + "umur") % 24)          // perkiraan umur ketemu jodoh (17-40)
        const hari = 1 + (hash(key + "hari") % 365)
        const bagian = [["Komunikasi", "k"], ["Chemistry", "c"], ["Kesetiaan", "s"], ["Ekonomi", "e"]]
            .map(([n, k]) => { const v = Math.min(100, Math.max(0, skor + (hash(key + k) % 41) - 20)); return `${n.padEnd(14)} ${bar(v)} ${v}%` })
            .join("\n")
        const out = `*CEK JODOH*\n\n${a}  ❤️  ${b}\n\n*Kecocokan: ${skor}%*\n${bar(skor)}\n\n${bagian}\n\n*${tier.judul}*\n${pick(tier.teks, h >>> 3)}\n\n_Perkiraan jadian: umur ${umur}, sekitar ${hari} hari lagi_`
        await sock.sendMessage(m.chat, { text: out, mentions }, { quoted: m })
    }
}
