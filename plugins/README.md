# plugins/

Semua fitur plugin Fuyuha Shina MD ada di sini, satu folder per kategori menu:

| Folder      | Kategori menu | Loader                | Format file                      |
|-------------|---------------|-----------------------|----------------------------------|
| `game/`     | Game          | `source/Game.js`      | ESM (dari bot lain)              |
| `rpg/`      | RPG           | `source/Rpg.js`       | ESM (dari bot lain)              |
| `download/` | Download      | `source/Download.js`  | ESM (`handler.command = [...]`) + `download/api/` CommonJS (fitur API, satu fitur satu file) |
| `stiker/`   | Stiker + QC   | `source/Stiker.js`    | CommonJS, satu fitur satu file   |
| `tools/`    | Tools         | `source/Tools.js`     | CommonJS, satu fitur satu file   |
| `stalker/`  | Stalker       | `source/Stalker.js`   | CommonJS, satu fitur satu file   |
| `aiimage/`  | AI Image      | `source/AiImage.js`   | CommonJS, satu fitur satu file (API /ai-image) |
| `ai/`       | AI            | `source/Ai.js`        | CommonJS, satu fitur satu file (API /ai) |
| `anime/`    | Anime         | `source/Anime.js`     | CommonJS, satu fitur satu file (API /animein) |
| `canva/`    | Canva         | `source/Canva.js`     | CommonJS, satu fitur satu file (API /canvas) |
| `upload/`   | Upload        | `source/Upload.js`    | CommonJS, satu fitur satu file (API /upload: kirim file, dapat link) |
| `fun/`      | Fun           | `source/Fun.js`       | ESM, satu fitur satu file (+ `fun/_engine.js` penghubung ke Fuyuha Shina MD) |
| (satu file) | Info          | `source/Info.js`      | semua fitur di satu file          |
| (satu file) | Komiku        | `source/Komiku.js`    | semua fitur di satu file          |
| (satu file) | Search        | `source/Search.js`    | semua fitur di satu file          |
| `grup/`     | Group (lanjutan) | `source/Grup.js`   | CommonJS, satu fitur satu file   |

- Nama file diawali `_` = bukan fitur (helper), diabaikan loader.
- Fitur baru: taruh file di folder kategorinya, lalu tambahkan command-nya di `source/MenuData.js`.
- Mau kena limit harian: tambahkan nama commandnya di `LIMITED` pada `source/Limit.js`.
- `tools/` dan `stalker/` memakai mesin API yang sama: `source/ApiTool.js` (panggil API, kirim hasil, preset parameter).
- `game/`, `rpg/`, `download/` punya `package.json` sendiri (`"type": "module"`), jangan dihapus.

- `fun/lama/` = fitur Fun gaya API (artinama, cekjodoh, pap, quotes*, dst), CommonJS, dimuat lewat `source/PluginLoader.js` dari `source/Fun.js`.
- `grup/` = command (toggle anti, welcome, swgc, getpp/setpp, sulap, auto). Yang jalan otomatis tanpa command (hapus pesan, notif promote/demote, auto read) ada di `source/GroupGuard.js`, dipanggil dari `fuyuha.js` & `main.js`.

- Semua file database (database.json, bljpm/blpush/contacts, komiku.json) ada di folder `/database`, path-nya diatur `source/DbPath.js`. File lama di `/storage` otomatis dipindah.
