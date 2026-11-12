const { HTTP, tool } = require("./_lib.js")

module.exports = tool({
    name: "esmtocjs",
    command: ["esmtocjs"],
    endpoint: "esmtocjs",
    desc: "Ubah kode ESM jadi CommonJS",
    usage: "<kode> atau <link file>",
    example: "import a from 'a'",
    needs: "text",
    params: ({ text }) => (HTTP.test(text.trim()) ? { url: text.trim() } : { code: text })
})
