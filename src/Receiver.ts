import Peer, { DataConnection } from "peerjs";
import { EventEmitter } from "events";
import peerConfig from "./config";
import { EventTypes, FileEvent, IFileMeta } from "./types";
import { sleep } from "./timer";
import log from "./log";


interface Receiver {
    on(event: "open", listener: (id: string) => void): this;
    on(event: "close", listener: () => void): this;
    on(event: "disconnected", listener: () => void): this;
    on(event: "connect", listener: (connection: DataConnection) => void): this;
    on(event: "error", listener: (error: string) => void): this;

    on(event: "transferrate", listener: (byte: number) => void): this;
    on(event: "incoming", listener: (file: File) => void): this;
    on(event: 'progress', listener: (file: File, bytes: number) => void): this;
    on(event: 'complete', listener: (file: File) => void): this;
    on(event: "cancel", listener: (file: File) => void): this;
}

class Receiver extends EventEmitter {
    public peer: Peer;
    connection?: DataConnection;
    receiver?: any;
    file?: IFileMeta;
    data: Array<ArrayBuffer> = [];
    bytesReceived = 0;
    currentIndex = 0;

    public isCompleted = false;
    peerId?: string;
    constructor(public readonly id: string) {
        super();
        this.open();
    }

    open() {
        const peer = this.peer = new Peer(peerConfig);
        peer.on("open", id => {
            this.peerId = id;
            log("peer open", id);
            console.log("peer open", id);
            this.emit("open", id);
            this.connect();
        });
        peer.on("close", () => {
            log("peer closed");
            this.emit("close");
            this.emitError("peer closed");
        });
        peer.on("disconnected", () => {
            log("peer disconnected");
            this.emit("disconnected");
            // peer.id = this.peerId
            sleep(1000).then(() => {
                log("recopening peer", peer.id);
                peer.reconnect();
            });
        });
        peer.on("error", (err) => {
            log("peer error", err);
            console.log(err);
            this.emitError(err.message);
        });
    }

    private connect() {
        const connection = this.connection = this.peer.connect(this.id, {
            reliable: true,
        });
        log("connecting...");
        connection.on("open", () => {
            log("connection open");
            console.log("connected");
            this.emit("connect", this.connection);
            this.connected(connection);
        });
        connection.on("error", err => {
            log("connection error", err);
            console.log("Connection failed, reconnecting...", err);
            this.connect();
        });
        connection.on("close", () => {
            log("connection closed");
            console.log("Connection failed, reconnecting...");
            this.emitError("connection closed");
        });
    }

    private handleData = (data: ArrayBuffer | FileEvent) => {
        if (this.isCompleted) {
            true;
        }
        if (data instanceof ArrayBuffer) {
            console.log("Buffer received");
            this.currentIndex ++;
            this.bytesReceived += data.byteLength;
            this.data.push(data);
            this.emit("progress", this.file, this.bytesReceived);
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
            this.file = data.meta;
            console.log("meta data received, sending back", this.connection);
            this.connection?.send({
                type: EventTypes.REQUEST,
                index: this.currentIndex
            })
        }

        if (data.type === EventTypes.CANCEL) {
            this.isCompleted = true;
            this.emit("cancel");
        }
    }

    connected(connection: DataConnection) {
        connection.on("data", this.handleData)
    }

    handleCompleted() {
        this.isCompleted = true;
        this.emit("complete", new File(this.data, this.file.name, { type: this.file.type }));
    }
    emitError(err: string) {
        if (!this.isCompleted) {
            return;
        }
        this.emit("error", err);
    }

    cancel() {
        this.isCompleted = true;
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
            this.peer.destroy();
        });
        console.log("connection closed");
    }
}

export default Receiver;
