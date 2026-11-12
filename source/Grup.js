/*
  Grup — kategori fitur grup lanjutan (anti-anti, welcome kustom, swgc, getpp/setpp, sulap, auto read/typing/SW).
  Satu fitur = satu file di folder /plugins/grup (nama file diawali "_" = diabaikan, mis. _lib.js, _toxic.js).
  Yang jalan otomatis tanpa command (hapus pesan, notif promote/demote, auto read) ada di source/GroupGuard.js.
  Format plugin & cara kerja loader: lihat source/PluginLoader.js.
*/
const path = require("path")
const { createLoader } = require("./PluginLoader.js")

module.exports = createLoader({ label: "Grup", dir: path.join(__dirname, "..", "plugins", "grup"), failText: "Fitur grup gagal dijalankan" })
