import { EventEmitter } from "events";
import Peer, { DataConnection } from "peerjs";
import peerConfig from "./config";
import { EventTypes, FileEvent } from "./types";
import { sleep } from "./timer";

interface Sender {
    on(event: "open", listener: (id: string) => void): this;
    on(event: "disconnected", listener: () => void): this;
    on(event: "connect", listener: (connection: DataConnection) => void): this;
    on(event: "error", listener: (error: string) => void): this;

    on(event: "transferrate", listener: (bytes: number) => void): this;
    on(event: 'progress', listener: (file: File, bytes: number) => void): this;
    on(event: 'complete', listener: (file: File) => void): this;
    on(event: "cancel", listener: () => void): this;
    on(event: "reject", listener: () => void): this;
    on(event: "accept", listener: () => void): this;
}

class Sender extends EventEmitter {
    peer: Peer;
    connection?: DataConnection;
    public isConnected = false;
    currentIndex: 0;
    lastChunk?: ArrayBuffer;
    chunkSize = Math.pow(2, 13);
    currentTime = 0;
    bytesSend = 0;
    isCompleted = false;
    isCancelled = false;
    constructor(public readonly id: string, private readonly file: File) {
        super();
        const peer = this.peer = new Peer(id, peerConfig);
        peer.on("close", () => {
            this.emitError("peer closed");
        });

        peer.on("error", err => {
            this.emitError(err?.message ?? err);
        })
        
        peer.on("disconnected", () => {
            this.emit("disconnected");
            console.log("reconnecting");
            peer.reconnect()
            if (this.isActive) {
                console.log("Connection is active");
            }
        });

        peer.on("open", id => {
            console.log("peer is open: ", id);
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
        console.log("new connection", connection.label);
        connection.on("open", () => {
            this.emit("connect", connection);
            this.connected();
        });

        connection.on("close", () => {
            this.isConnected = false;
            this.emit("disconnected");
            if (this.isCompleted) {
                sleep(1000).then(() => {
                    this.close();
                });
            } else {
                console.log("connection closed unexpectedly")
            }
        });
        
        connection.on("error", (err) => {
            this.isConnected = false;
            console.log("Connection error", err);
        });
    }
   
    connected() {
        this.isConnected = true;
        this.connection?.on("data", this.handleData);
        this.connection?.send({
            type: EventTypes.START,
            meta: {
                name: this.file.name,
                size: this.file.size,
                type: this.file.type
            }
        });
    }

    handleData = (data: FileEvent) => {
        if (data.type === EventTypes.REQUEST) {
            if (this.isCancelled) {
                return;
            }
            if (this.isCompleted) {
                this.handleSent();
                return;
            }
            this.sendChunks(data.index);
        }

        if (data.type === EventTypes.CANCEL) {
            this.isCompleted = true;
            this.isCancelled = true;
            this.emit("cancel");
        }
    }

    setChunkSize() {
        if (!this.currentTime) {
            this.currentTime = (new Date).getTime();
            console.log("Skipping chunk");
            return; 
        }
        const time = (new Date).getTime();
        const diff = (time - this.currentTime) / 1000;
        if (diff < 1) {
            this.chunkSize *= 2;
            console.log("Increase chunk");
            this.emit("transferrate", this.chunkSize);
        } else if (diff > 2) {
            this.chunkSize /= 2;
            console.log("decreasing chunk");
            this.emit("transferrate", this.chunkSize);
        }
        this.currentTime = time;
    }

    async sendChunks(index: number) {
        this.setChunkSize();
        if (index < this.currentIndex && this.lastChunk) {
            this.connection.send(this.lastChunk);
            console.log("sending last byte");
            return;
        }
        const chunks = this.lastChunk = await this.getChunks();
        this.bytesSend += chunks.byteLength;
        this.connection.send(chunks);
        this.emit("progress", this.file, this.bytesSend);
        this.currentIndex ++;
        if (this.file.size === this.bytesSend) {
            this.isCompleted = true;
        }
    }

    handleSent() {
        this.connection.send({
            type: EventTypes.END
        });
        this.emit("complete", this.file);
    }

    async getChunks() {
        const reader = new FileReader();
        const promise = new Promise<ArrayBuffer>((resolve, reject) => {
            reader.onload = () => {
                resolve(reader.result as ArrayBuffer);
            }
            reader.onerror = () => {
                reject(reader.error);
            }
        })

        reader.readAsArrayBuffer(this.file.slice(
            this.bytesSend, this.bytesSend + this.chunkSize
        ));
        return promise;
    }

    cancel() {
        this.isCancelled = true;
        this.connection?.send({
            type: EventTypes.CANCEL
        })
        return this;
    }

    close() {
        sleep(1000).then(() => {
            this.peer.destroy();
        })
    }

    emitError(err: string) {
        this.emit("error", err);
    }
}

export default Sender;
