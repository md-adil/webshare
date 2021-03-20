import { EventEmitter } from "events";
import Peer, { DataConnection, PeerJSOption } from "peerjs";
import { EventTypes, FileEvent, ReceiverEvent } from "./types";
import { sleep } from "./timer";
import _chunk from "lodash/chunk";
import { getBlock, getBytesPerSecond, getTotal, slice } from "./chunks";

interface Sender {
    on(event: "open", listener: (id: string) => void): this;
    on(event: "close", listener: () => void): this;
    on(event: "disconnected", listener: () => void): this;
    on(event: "connected", listener: (connection: DataConnection) => void): this;
    on(event: "error", listener: (error: Error) => void): this;

    on(event: "transferrate", listener: (bytes: number) => void): this;
    on(event: 'progress', listener: (file: File, bytes: number) => void): this;
    on(event: 'completed', listener: (file: File) => void): this;
    on(event: "cancelled", listener: () => void): this;
}

class Sender extends EventEmitter {
    peer: Peer;
    connection?: DataConnection;
    public isConnected = false;
    currentTime = 0;
    isCompleted = false;
    isCancelled = false;
    chunks: number;
    bytesSent = 0;
    constructor(public readonly peerConfig: PeerJSOption, private readonly file: File, public readonly id?: string) {
        super();
        this.chunks = getTotal(file.size);
        const peer = this.peer = new Peer(id, peerConfig);
        peer.on("close", () => {
            this.emit("close");
        });

        peer.on("error", err => {
            if (this.isActive) {
                this.emit("error", err);
            }
        });
        
        peer.on("disconnected", () => {
            peer.reconnect()
        });

        peer.on("open", id => {
            this.emit("open", id);
        });

        peer.on("connection", (connection) => {
            if (this.isConnected) {
                console.log("Already connected, rejecting");
                connection.close();
                return;
            }
            this.handleConnection(connection);
        });
    }

    get isActive() {
        return !this.isCancelled && !this.isCompleted;
    }
  
    handleConnection(connection: DataConnection) {
        this.connection = connection;
        connection.on("open", () => {
            this.isConnected = true;
            this.emit("connected", connection);
            this.connected();
        });

        connection.on("close", () => {
            this.isConnected = false;
            this.emit("disconnected");
            if (this.isActive) {
                this.isCancelled = true;
                this.emit("cancelled");
            }
            sleep(1000).then(() => {
                this.peer.destroy();
            });
        });
        
        connection.on("error", (err) => {
            this.isConnected = false;
            if (this.isActive) {
                this.emit("error", err);
            }
        });
    }
   
    connected() {
        this.connection?.on("data", this.handleData);
        if (this.isCancelled) {
            this.connection?.send(JSON.stringify({
                type: EventTypes.CANCEL
            }));
            return;
        }
        this.connection?.send(JSON.stringify({
            type: EventTypes.START,
            meta: {
                name: this.file.name,
                size: this.file.size,
                type: this.file.type
            }
        }));
    }

    handleData = (data: ReceiverEvent) => {
        data = Number(data);
        if (data === EventTypes.CANCEL) {
            this.isCancelled = true;
            this.emit("cancelled");
            return;
        }
        if (data === EventTypes.COMPLETED) {
            return this.handleSent();
        }
        if (data >= 0) {
            this.sendChunks(data as number);
        }
    }

    async sendChunks(index: number) {
        const time = (new Date().getTime());
        if (this.currentTime) {
            this.emit("transferrate", getBytesPerSecond(this.currentTime, time));
        }
        this.currentTime = time;
        const block = await this.getChunks(...getBlock(index));
        for (const chunks of slice(block)) {
            this.connection!.send(chunks);
        }
        this.bytesSent += block.byteLength;
        this.emit("progress", this.file, this.bytesSent);
    }

    handleSent() {
        this.emit("completed", this.file);
    }

    async getChunks(from: number, to: number) {
        const reader = new FileReader();
        const buffers = new Promise<ArrayBuffer>((resolve, reject) => {
            reader.onload = () => {
                resolve(reader.result as ArrayBuffer);
            }
            reader.onerror = () => {
                reject(reader.error);
            }
        })
        reader.readAsArrayBuffer(this.file.slice(
            from, Math.min(to, this.file.size)
        ));
        return buffers;
    }

    cancel() {
        this.isCancelled = true;
        if (this.connection) {
            this.connection.send(JSON.stringify({
                type: EventTypes.CANCEL
            }));
        } else {
            this.close();
        }
        return this;
    }

    close() {
        sleep(1000).then(() => {
            this.peer.destroy();
        });
    }
}

export default Sender;
