/*
  .carijodoh — bot milih satu anggota grup secara acak jadi "jodoh" pengirim, lalu dibully habis.
  Hanya di grup. Hasil acak setiap kali dipakai. Kata-katanya bisa diubah di daftar INTRO / BULLY / MATCH di bawah.
*/
const pick = (a) => a[Math.floor(Math.random() * a.length)]
const digits = (x) => String(x || "").split("@")[0].split(":")[0]

const INTRO = [
    "Nih jodoh lu: {j}. Udah, terima aja daripada jomblo terus.",
    "Hasil pencarian selesai. Jodoh lu: {j}. Jangan banyak milih, lu bukan siapa-siapa.",
    "Semesta udah nyerah nyariin yang lebih bagus. Jodoh lu: {j}.",
    "Setelah nyisir seluruh grup, cuma ini yang mau: {j}. Sukurin."
]
const MATCH = [
    "Kalo ditolak, jangan nangis. Stok lu emang tinggal ini doang.",
    "Syukurin aja. Lu tuh bukan lagi dalam posisi bisa pilih-pilih.",
    "Orang lain nyari yang terbaik, lu nyari yang mau aja. Beda level, bro.",
    "Diterima atau enggak terserah, tapi inget: antrean di belakang lu kosong."
]
const BULLY = [
    "Lu jomblo bukan karena belum ketemu yang cocok, tapi karena yang ketemu kagak ada yang nyesel pas lu ilang.",
    "Chat lu tuh kayak iklan: dibuka, dilihat, terus di-skip.",
    "Temen-temen lu udah pada jalan, lu masih sibuk nanya 'dia lagi ngapain ya'.",
    "Lu tuh ibarat wifi tetangga: banyak yang liat namanya, kagak ada yang mau ngejar.",
    "Yang bilang 'nanti juga ada jodohnya' itu kasian doang ama lu, bro.",
    "Tiap malem minggu lu setia banget ama kasur. Setia lu cuma laku di situ.",
    "Lu yang ngetik panjang, dia yang bales 'oh'. Tapi tetep lu nunggu. Gila sih mental lu.",
    "Standar lu tinggi, usaha lu nol. Rumus gagal paling sempurna."
]

module.exports = {
    name: "carijodoh",
    command: ["carijodoh", "jodohku", "nyarijodoh"],
    desc: "Bot pilih jodoh acak dari anggota grup",
    usage: "",
    example: "",
    async run({ sock, m }) {
        if (!m.isGroup) return m.reply("❌ Fitur ini cuma bisa di grup, soalnya bot milih jodoh dari anggota grupnya.")
        let meta = m.metadata
        if (!meta?.participants) meta = await sock.groupMetadata(m.chat)
        const me = [m.sender, m.key?.participantPn, m.key?.participantAlt].filter(Boolean).map(digits)
        const botIds = [sock.user?.id, sock.user?.lid].filter(Boolean).map(digits)
        const pool = (meta.participants || [])
            .map((p) => ({ jid: p.phoneNumber || p.jid || p.id, ids: [p.id, p.jid, p.lid, p.phoneNumber].filter(Boolean).map(digits) }))
            .filter((p) => p.jid && !p.ids.some((x) => me.includes(x) || botIds.includes(x)))
        if (!pool.length) return m.reply("Grup sepi banget, kagak ada yang bisa dijodohin. Wajar lu jomblo.")
        const j = pick(pool).jid
        const tag = "@" + digits(j)
        const out = `${pick(INTRO).replace("{j}", tag)}\n\n${pick(MATCH)}\n\n🗯️ ${pick(BULLY)}`
        await sock.sendMessage(m.chat, { text: out, mentions: [j] }, { quoted: m })
    }
}
