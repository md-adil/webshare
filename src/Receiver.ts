import Peer, { DataConnection, PeerJSOption } from "peerjs";
import { EventEmitter } from "events";
import { EventTypes, FileEvent, IFileMeta } from "./types";
import { sleep } from "./timer";
import log from "./log";


interface Receiver {
    on(event: "open", listener: (id: string) => void): this;
    on(event: "close", listener: () => void): this;
    on(event: "disconnected", listener: () => void): this;
    on(event: "connected", listener: (connection: DataConnection) => void): this;
    on(event: "error", listener: (error: string) => void): this;

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
    transferrate = 0;
    file?: File;

    public isCompleted = false;
    public isCancelled = false;
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
            this.emit("error", err);
        });
    }

    private connect() {
        const connection = this.connection = this.peer!.connect(this.id, {
            reliable: true,
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
            this.emit("error", err);
            this.connect();
        });
        connection.on("close", () => {
            log("connection closed");
            this.emit("disconnected");
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
            if (this.transferrate !== data.byteLength) {
                this.transferrate = data.byteLength;
                this.emit("transferrate", this.transferrate);
            }

            this.currentIndex ++;
            this.bytesReceived += data.byteLength;
            this.data.push(data);
            this.emit("progress", this.meta, this.bytesReceived);
            this.connection?.send({
                type: EventTypes.REQUEST,
                index: this.currentIndex
            });
            return;
        }

        if (data.type === EventTypes.END) {
            this.handleCompleted();
        }

        if (data.type === EventTypes.START) {
            this.emit("incoming", data.meta);
            this.meta = data.meta;
            console.log("meta data received, sending back", this.connection);
            this.connection?.send({
                type: EventTypes.REQUEST,
                index: this.currentIndex
            })
        }

        if (data.type === EventTypes.CANCEL) {
            this.isCancelled = true;
            this.emit("cancel");
        }
    }

    connected(connection: DataConnection) {
        connection.on("data", this.handleData)
    }

    handleCompleted() {
        this.isCompleted = true;
        this.file = new File(this.data, this.meta!.name, { type: this.meta!.type });
        this.emit("completed", this.file);
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

    download() {
        const url = URL.createObjectURL(this.file);
        const a = document.createElement("a");
        a.href = url;
        a.setAttribute("download", this.file!.name);
        a.click();
        a.remove();
    }
}

export default Receiver;