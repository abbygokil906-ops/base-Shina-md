/*
  Perkakas bersama untuk fitur berbasis API (kategori Stiker & Tools).
  - ROOT       : domain API (ganti di sini kalau domain API pindah)
  - uploadMedia: upload gambar ke pixhost (sama seperti .tourl2) -> link langsung; video/audio tetap ke catbox karena pixhost hanya menerima gambar
  - getMedia   : ambil media dari pesan ini / pesan yang di-reply sesuai jenis (regex mime), null kalau tidak ada
*/
const axios = require("axios")

const ROOT = "https://apiii-xrina.my.id"

async function uploadPixhost(buffer) {
    const { ImageUploadService } = require("node-upload-images")
    const service = new ImageUploadService("pixhost.to")
    const { directLink } = await service.uploadFromBinary(buffer, "fuyuha.png")
    if (!/^https?:\/\//.test(String(directLink || ""))) throw new Error("Gagal upload media, coba lagi")
    return directLink
}

async function uploadCatbox(buffer, ext) {
    const FormData = require("form-data")
    const fd = new FormData()
    fd.append("reqtype", "fileupload")
    fd.append("fileToUpload", buffer, { filename: `file.${ext}` })
    const res = await axios.post("https://catbox.moe/user/api.php", fd, { headers: fd.getHeaders(), timeout: 60000 })
    const link = String(res.data || "").trim()
    if (!/^https?:\/\//.test(link)) throw new Error("Gagal upload media, coba lagi")
    return link
}

async function uploadMedia(buffer) {
    const { fromBuffer } = require("file-type")
    const { ext, mime } = (await fromBuffer(buffer)) || { ext: "bin", mime: "" }
    // gambar -> pixhost (tourl2), selain gambar (video/audio) -> catbox
    if (/^image\//.test(mime)) return uploadPixhost(buffer)
    return uploadCatbox(buffer, ext)
}

async function getMedia(m, kind = /image/) {
    const q = m.quoted || m
    const mime = q?.msg?.mimetype || q?.mimetype || ""
    if (!kind.test(mime)) return null
    return q.download()
}

module.exports = { ROOT, uploadMedia, getMedia }
