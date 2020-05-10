import Sender from "./Sender";
import Receiver from "./Receiver";
import readerStream from "filereader-stream";
import { humanFileSize } from "./util";
import log from "./log";

const labelInfo = document.getElementById("label:info");
const labelError = document.getElementById("label:error");
const btnSend = document.getElementById("btn:send");
const btnReceive = document.getElementById("btn:receive");
const input = document.getElementById("input:file") as HTMLInputElement;
const labelProgress = document.getElementById("label:progress");
const labelRate = document.getElementById("label:rate");
let file: File;
input.addEventListener("change", (e) => {
    file = input.files[0];
    sendfile(input.files[0]);
});


const generateId = () => (new Date()).getTime().toString();
let sender: Sender;
const sendfile = (file: File) => {
    const id = "sender";
    sender = new Sender(id, file);
    sender.on("open", (id) => {
        labelInfo.innerText = `Connection opened at ${id}`
    });
    sender.on("connect", connection => {
        labelInfo.innerText = `Connection with connection id ${connection.label}`;
    });
    sender.on("error", err => {
        labelError.innerText = err;
    });
    sender.on("transferrate", rate => {
        labelRate.innerText = humanFileSize(rate);
    });
    sender.on("progress", (f, byte) => {
        labelProgress.innerText = `${humanFileSize(byte)} / ${humanFileSize(f.size)}`;
    })
    sender.on("complete", () => {
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
    receiver = new Receiver(id);
    receiver.on("open", rId => {
        labelInfo.innerText = `Receiver is open on ${rId}`;
    });
    receiver.on("connect", connection => {
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
        labelError.innerText = err;
    });
    receiver.on("progress", (f, byte) => {
        labelProgress.innerText = `${humanFileSize(byte)} / ${humanFileSize(f.size)}`;
    })
    receiver.on("complete", file => {
        console.log(file)
        download(file);
    });
    receiver.on("transferrate", byte => {
        labelRate.innerText = humanFileSize(byte);
    });
}


const download = (file: File) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", file.name);
    a.click();
}

const handleClose = () => {
    receiver && receiver.close();
    sender && sender.close();
}


btnReceive.addEventListener("click", receiveFile);
document.getElementById("btn:close").addEventListener("click", handleClose);