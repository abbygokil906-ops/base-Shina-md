/*
  Helper fitur Upload (file ini tidak dimuat sebagai fitur karena diawali "_").
  Mesinnya ada di source/ApiTool.js, endpoint-nya otomatis /upload/<endpoint>.
  Input: kirim / reply file apa saja (foto, video, audio, dokumen) lalu ketik command-nya, atau tulis link file langsung.
  Hasil: link file yang sudah di-upload ke layanan tujuan.
*/
module.exports = require("../../source/ApiTool.js").createKit("upload")
