const { HTTP, tool } = require("./_lib.js")

module.exports = tool({
    name: "cjstoesm",
    command: ["cjstoesm"],
    endpoint: "cjstoesm",
    desc: "Ubah kode CommonJS jadi ESM",
    usage: "<kode> atau <link file>",
    example: "const a = require('a')",
    needs: "text",
    params: ({ text }) => (HTTP.test(text.trim()) ? { url: text.trim() } : { code: text })
})
