const { PeerServer } = require("peer");
const config = {
    port: 4112
}
const peer = new PeerServer({
    port: config.port,
});

console.log("Server is running on port: ", config.port)