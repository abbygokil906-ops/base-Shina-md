const { tool } = require("./_lib.js")

module.exports = tool({
    name: "subdofinder",
    command: ["subdofinder"],
    endpoint: "subdo-finder",
    desc: "Cari subdomain",
    usage: "<domain>",
    example: "example.com",
    needs: "text",
    params: ({ text }) => ({ domain: text.replace(/^https?:\/\//i, "").split("/")[0] })
})
