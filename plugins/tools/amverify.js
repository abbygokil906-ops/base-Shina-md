const { pipe, tool } = require("./_lib.js")

module.exports = tool({
    name: "amverify",
    command: ["amverify"],
    endpoint: "am-verify",
    desc: "Verifikasi email dengan magic link (AM)",
    usage: "<email>|<magic link>",
    example: "nama@gmail.com|https://...",
    needs: "text",
    params: pipe(["email", "magicLink"])
})
