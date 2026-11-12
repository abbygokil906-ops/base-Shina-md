/*
  Helper fitur Stalker (file ini tidak dimuat sebagai fitur karena diawali "_").
  Mesinnya ada di source/ApiTool.js, endpoint-nya otomatis /stalker/<endpoint>.
  output "profile" = kirim foto profil (kalau ada di hasil API) + data profil sebagai caption.
*/
module.exports = require("../../source/ApiTool.js").createKit("stalker")
