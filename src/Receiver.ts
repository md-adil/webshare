import Peer, { DataConnection, PeerJSOption } from "peerjs";
import { EventEmitter } from "events";
import { EventTypes, FileEvent, IFileMeta } from "./types";
import { sleep } from "./timer";
import log from "./log";
import { getTotal, isLastInBlock } from "./chunks";

interface Receiver {
    on(event: "open", listener: (id: string) => void): this;
    on(event: "close", listener: () => void): this;
    on(event: "disconnected", listener: () => void): this;
    on(event: "connected", listener: (connection: DataConnection) => void): this;
    on(event: "error", listener: (error: Error) => void): this;
    on(event: "reconnect", listener: () => void): this;
    on(event: "transferrate", listener: (byte: number) => void): this;
    on(event: "incoming", listener: (file: IFileMeta) => void): this;
    on(event: 'progress', listener: (file: IFileMeta, bytes: number) => void): this;
    on(event: 'completed', listener: (file: File) => void): this;
    on(event: "cancelled", listener: (file: IFileMeta) => void): this;
}

class Receiver extends EventEmitter {
    public peer?: Peer;
    connection?: DataConnection;
    receiver?: any;
    meta?: IFileMeta;
    data: Array<ArrayBuffer> = [];
    bytesReceived = 0;
    currentIndex = 0;
    currentTime = 0;

    public isCompleted = false;
    public isCancelled = false;
    chunks?: number;
    constructor(public peerConfig: PeerJSOption, public readonly id: string) {
        super();
        this.open();
    }

    open() {
        const peer = this.peer = new Peer(this.peerConfig);
        peer.on("open", id => {
            log("peer open", id);
            this.emit("open", id);
            this.connect();
        });
        peer.on("close", () => {
            log("peer closed");
            this.emit("close");
        });
        peer.on("disconnected", () => {
            log("peer disconnected");
            peer.reconnect();
        });
        peer.on("error", (err) => {
            log("peer error", err);
            if (this.isActive) {
                this.isCancelled = true;
                this.emit("cancelled");
                this.emit("error", err);
            }
        });
    }

    private connect() {
        const connection = this.connection = this.peer!.connect(this.id, {
            reliable: true,
            serialization: 'none'
        });
        log("connecting...");
        connection.on("open", () => {
            log("connection open");
            console.log("connected");
            this.emit("connected", this.connection);
            this.connected(connection);
        });
        connection.on("error", err => {
            log("connection error", err);
            if (this.isActive) {
                this.emit("error", err);
                this.emit("reconnect");
                this.connect();
            }
        });
        connection.on("close", () => {
            log("connection closed");
            this.emit("disconnected");
            if (this.isActive) {
                this.isCancelled = true;
                this.emit("cancelled");
            }
        });
    }

    get isActive() {
        return !this.isCompleted && !this.isCompleted;
    }

    private handleData = (data: ArrayBuffer | FileEvent) => {
        if (this.isCancelled) {
            return;
        }
        if (this.isCompleted) {
            return;
        }
        if (data instanceof ArrayBuffer) {
            this.transferRate(data.byteLength);
            this.bytesReceived += data.byteLength;
            this.data.push(data);
            this.emit("progress", this.meta, this.bytesReceived);
            if (this.chunks === this.currentIndex) {
                this.connection?.send(EventTypes.COMPLETED);
                return this.handleCompleted();
            }
            if (isLastInBlock(this.chunks!, this.currentIndex)) {
                this.connection?.send(++this.currentIndex);
            }
            return;
        }

        if (data.type === EventTypes.START) {
            this.emit("incoming", data.meta);
            this.meta = data.meta;
            console.log("meta data received, sending back", this.connection);
            this.chunks = getTotal(data.meta.size);
            this.connection?.send(this.currentIndex)
        }

        if (data.type === EventTypes.CANCEL) {
            this.isCancelled = true;
            this.emit("cancel");
            this.close();
        }
    }

    transferRate(bytes: number) {
        const time = (new Date).getTime();
        if (!this.currentTime) {
            this.currentTime = time;
            return; 
        }
        const diff = (time - this.currentTime) / 1000;
        this.currentTime = time;
        this.emit("transferrate", bytes / diff);
    }

    connected(connection: DataConnection) {
        connection.on("data", this.handleData)
    }

    handleCompleted() {
        this.isCompleted = true;
        this.emit("completed", new File(this.data, this.meta!.name, { type: this.meta!.type }));
        this.data = [];
        this.close();
    }

    cancel() {
        this.isCancelled = true;
        this.connection?.send({
            type: EventTypes.CANCEL
        });
        sleep(1000).then(() => {
            this.close();
        })
        return this;
    }

    close() {
        this.connection?.close();
        sleep(1000).then(() => {
            this.peer!.destroy();
        });
        log("connection closed");
    }

    download(file: File) {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.setAttribute("download", file.name);
        a.click();
        a.remove();
    }
}

export default Receiver;
