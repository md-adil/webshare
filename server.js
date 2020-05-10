const { PeerServer } = require("peer");
const config = {
    port: 4112
}
const peer = new PeerServer({
    host: "0.0.0.0",
    port: config.port,
});

console.log("Server is running on port: ", config.port)