/*
  Bahasa menu (English / Indonesia).
  - Bahasa awal diatur di settings.js: global.bahasaDefault = "en" atau "id"
  - Pilihan tiap user disimpan di database (global.db.users[jid].lang), jadi tidak hilang waktu bot restart.
  - Tambah/ubah teks di kamus DICT di bawah.
*/
const DICT = {
    en: {
        name: "English",
        greet: (tag) => `Hi ${tag} 👋✨\nMommy has prepared the menu\nfor you~`,
        hint: "✨ _Tap the button below to pick a menu_",
        wait: "⏳ *Wait sweetie, mommy is getting ready...*",
        infoTitle: "INFO BOT",
        name_: "Name", owner: "Owner", status: "Status", limit: "Limit", mode: "Mode",
        version: "Version", runtime: "Runtime", features: "Features",
        menuOf: (n) => `Menu ${n}`,
        btnCategory: "📂 Choose category",
        btnChannel: "📢 Channel",
        btnOwner: "👑 Owner",
        btnLanguage: "🌐 Language",
        langSection: "Choose language",
        langDesc: "Menu language",
        allMenu: "📖 All Menu",
        allMenuDesc: "Show every menu at once",
        catDesc: (n) => `View ${n} features`,
        langChanged: "✅ Language changed to *English*",
        langUsage: "Use: *.lang en* (English) or *.lang id* (Indonesia)"
    },
    id: {
        name: "Indonesia",
        greet: (tag) => `Halo ${tag} 👋✨\nMommy udah siapin menunya\nbuat kamu~`,
        hint: "✨ _Tekan tombol di bawah buat pilih menu_",
        wait: "⏳ *Wait sayang, mommy siapin dulu...*",
        infoTitle: "INFO BOT",
        name_: "Nama", owner: "Owner", status: "Status", limit: "Limit", mode: "Mode",
        version: "Versi", runtime: "Runtime", features: "Fitur",
        menuOf: (n) => `Menu ${n}`,
        btnCategory: "📂 Pilih kategori",
        btnChannel: "📢 Saluran",
        btnOwner: "👑 Owner",
        btnLanguage: "🌐 Bahasa",
        langSection: "Pilih bahasa",
        langDesc: "Bahasa menu",
        allMenu: "📖 All Menu",
        allMenuDesc: "Tampilkan semua menu sekaligus",
        catDesc: (n) => `Lihat daftar fitur ${n}`,
        langChanged: "✅ Bahasa diganti ke *Indonesia*",
        langUsage: "Pakai: *.lang en* (English) atau *.lang id* (Indonesia)"
    }
}

const LANGS = Object.keys(DICT)
const fallback = () => (DICT[global.bahasaDefault] ? global.bahasaDefault : "en")

function getLang(jid) {
    const l = global.db && global.db.users && global.db.users[jid] && global.db.users[jid].lang
    return DICT[l] ? l : fallback()
}

function setLang(jid, lang) {
    if (!DICT[lang]) return false
    if (!global.db.users) global.db.users = {}
    if (typeof global.db.users[jid] !== "object") global.db.users[jid] = {}
    global.db.users[jid].lang = lang
    return true
}

// terima "en", "english", "inggris", "id", "indo", "indonesia", "bahasa"
function parseLang(s = "") {
    s = String(s).toLowerCase().trim()
    if (["en", "eng", "english", "inggris"].includes(s)) return "en"
    if (["id", "ind", "indo", "indonesia", "indonesian"].includes(s)) return "id"
    return null
}

const dict = (lang) => DICT[lang] || DICT[fallback()]

module.exports = { DICT, LANGS, getLang, setLang, parseLang, dict }
