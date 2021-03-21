import 'babel-regenerator-runtime';
import { Sender, Receiver } from "./";
import { humanFileSize } from "./util";

const labelInfo = document.getElementById("label:info")!;
const labelError = document.getElementById("label:error")!;
const btnSend = document.getElementById("btn:send")!;
const btnReceive = document.getElementById("btn:receive")!;
const input = document.getElementById("input:file") as HTMLInputElement;
const labelProgress = document.getElementById("label:progress")!;
const labelRate = document.getElementById("label:rate")!;


const peerConfig = {
    host: "192.168.0.112",
    port: 4112
};

let file: File;
input.addEventListener("change", (e) => {
    if (!input.files) {
        return;
    }
    file = input.files[0];
    sendFile(input.files[0]);
});


const generateId = () => (new Date()).getTime().toString();
let sender: Sender;
const sendFile = (file: File) => {
    const id = "sender";
    sender = new Sender(peerConfig, file, id);
    sender.on("open", (id) => {
        labelInfo.innerText = `Connection opened at ${id}`
    });
    sender.on("connected", connection => {
        labelInfo.innerText = `Connection with connection id ${connection.label}`;
    });
    sender.on("disconnected", () => {
        labelInfo.innerText = `Disconnected`;
    });
    sender.on("error", err => {
        labelError.innerText = err.message;
    });
    sender.on("transferrate", rate => {
        labelRate.innerText = humanFileSize(rate);
    });
    sender.on("progress", (f, byte) => {
        labelProgress.innerText = `${humanFileSize(byte)} / ${humanFileSize(f.size)}`;
    })
    sender.on("completed", () => {
        labelInfo.innerText = "File has been sent successfully";
    })
}

let receiver: Receiver;
const receiveFile = () => {
    const id = prompt("Enter connection id");
    if (!id) {
        labelError.innerText = "Connection id is required";
        return;
    }
    receiver = new Receiver(peerConfig, id);
    receiver.on("open", rId => {
        labelInfo.innerText = `Receiver is open on ${rId}`;
    });
    receiver.on("connected", connection => {
        labelInfo.innerText = `Receiver is connected ${connection.label}`;
        labelError.innerText = "";
    });
    receiver.on("disconnected", () => {
        labelError.innerText = `Connection disconnected`;
    });
    receiver.on("close", () => {
        labelError.innerText = "Closed connection";
    })
    receiver.on("error", err => {
        labelError.innerText = err.message;
    });
    receiver.on("progress", (f, byte) => {
        labelProgress.innerText = `${humanFileSize(byte)} / ${humanFileSize(f.size)}`;
    })
    receiver.on("completed", file => {
        console.log(file)
        receiver.download(file);
    });
    receiver.on("transferrate", byte => {
        labelRate.innerText = humanFileSize(byte);
    });
}

const handleClose = () => {
    receiver && receiver.close();
    sender && sender.close();
}

btnReceive.addEventListener("click", receiveFile);
document.getElementById("btn:close")!.addEventListener("click", handleClose);
