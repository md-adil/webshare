import Peer, { DataConnection } from "peerjs";
import { EventEmitter } from "events";
import peerConfig from "./config";
import { EventTypes, FileEvent, IFileMeta } from "./types";
import { sleep } from "./timer";

interface Receiver {
    on(event: "open", listener: (id: string) => void): this;
    on(event: "disconnected", listener: () => void): this;
    on(event: "connect", listener: (connection: DataConnection) => void): this;
    on(event: "error", listener: (error: string) => void): this;

    on(event: "incoming", listener: (file: File) => void): this;
    on(event: 'progress', listener: (file: File, bytes: number) => void): this;
    on(event: 'complete', listener: (file: File) => void): this;
    on(event: "cancel", listener: (file: File) => void): this;
}

class Receiver extends EventEmitter {
    public readonly peer: Peer;
    connection?: DataConnection;
    receiver?: any;
    file?: IFileMeta;
    data: Array<ArrayBuffer> = [];
    bytesReceived = 0;
    currentIndex = 0;

    public isCompleted = false;
    constructor(public readonly id: string) {
        super();
        const peer = this.peer = new Peer(peerConfig);
        peer.on("open", id => {
            console.log("peer open", id);
            this.emit("open", id);
            this.connect();
        });
        peer.on("close", () => {
            this.emitError("peer closed");
        });
        peer.on("disconnected", () => {
            this.emit("disconnected");
            console.log("reconnecting");
        });
        peer.on("error", (err) => {
            console.log(err);
            this.emitError(err.message);
        });
    }
    private connect() {
        const connection = this.connection = this.peer.connect(this.id, {
            reliable: true,
        });
        connection.on("open", () => {
            console.log("connected");
            this.emit("connect", this.connection);
            this.connected(connection);
        });
        connection.on("error", err => {
            console.log("Connection failed, reconnecting...", err);
            this.connect();
        });
        connection.on("close", () => {
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
