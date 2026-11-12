/*
  Anime — kategori "Anime" (Animein: beranda, cari, detail, episode, link nonton, jadwal, genre, komentar).
  Satu fitur = satu file di folder /plugins/anime (nama file diawali "_" = diabaikan, mis. _lib.js).
  Format plugin & cara kerja loader: lihat source/PluginLoader.js, helper fitur API: plugins/anime/_lib.js.

  Alur pakai: .animesearch <judul> -> ambil id/slug -> .animedetail <id> -> .animeepisodes <id> -> .animestream <id episode>

  Tambah fitur baru: taruh file di /plugins/anime, lalu tambahkan command-nya di source/MenuData.js (kategori Anime).
  Kalau fiturnya mau kena limit harian, tambahkan nama commandnya di LIMITED (source/Limit.js).
*/
const path = require("path")
const { createLoader } = require("./PluginLoader.js")

module.exports = createLoader({ label: "Anime", dir: path.join(__dirname, "..", "plugins", "anime"), failText: "Gagal mengambil data anime" })
