/*
  Daftar kata kasar untuk Anti Toxic (bukan fitur, diawali "_" jadi diabaikan loader).
  Tambah kata di WORDS. Pencocokan per kata utuh (bukan potongan), huruf berulang & angka-mirip-huruf (k0nt0l, kontooool) ikut terdeteksi.
*/
const WORDS = [
    "anjing", "anjg", "anjink", "anying", "asu", "babi", "bangsat", "bgst", "bajingan", "kontol", "kntl", "memek", "pepek",
    "ngentot", "ngewe", "jancok", "jancuk", "jembut", "itil", "peler", "tolol", "goblok", "gblk", "kampret", "keparat",
    "brengsek", "bedebah", "sialan", "tai", "taik", "pukimak", "kimak", "cibai", "lonte", "jablay", "pelacur", "perek", "sundal"
]

const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" }
const squash = (s) => s.replace(/(.)\1+/g, "$1")
const SET = new Set(WORDS.map(squash))

function normalize(text = "") {
    return String(text).toLowerCase().replace(/[013457@$]/g, (c) => LEET[c] || c)
}

function findToxic(text = "") {
    const tokens = normalize(text).split(/[^a-z]+/).filter(Boolean)
    for (const t of tokens) if (SET.has(squash(t))) return t
    return null
}

module.exports = { WORDS, findToxic }
