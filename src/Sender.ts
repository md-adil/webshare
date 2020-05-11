import { EventEmitter } from "events";
import Peer, { DataConnection, PeerJSOption } from "peerjs";
import { EventTypes, FileEvent } from "./types";
import { sleep } from "./timer";

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
    currentIndex =  0;
    lastChunk?: ArrayBuffer;
    chunkSize = Math.pow(2, 13);
    currentTime = 0;
    bytesSend = 0;
    isCompleted = false;
    isCancelled = false;
    constructor(public readonly peerConfig: PeerJSOption, private readonly file: File, public readonly id?: string) {
        super();
        const peer = this.peer = new Peer(id, peerConfig);
        peer.on("close", () => {
            this.emit("close");
        });

        peer.on("error", err => {
            this.emit("error", err);
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
        });
        
        connection.on("error", (err) => {
            this.isConnected = false;
            this.emit("error", err);
        });
    }
   
    connected() {
        this.connection?.on("data", this.handleData);
        if (this.isCancelled) {
            this.connection?.send({
                type: EventTypes.CANCEL
            });
            return;
        }

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
            this.isCancelled = true;
            this.emit("cancelled");
        }
    }

    setChunkSize() {
        if (!this.currentTime) {
            this.currentTime = (new Date).getTime();
            return; 
        }
        const time = (new Date).getTime();
        const diff = (time - this.currentTime) / 1000;
        if (diff < 1) {
            this.chunkSize *= 2;
            this.emit("transferrate", this.chunkSize);
        } else if (diff > 2) {
            this.chunkSize /= 2;
            this.emit("transferrate", this.chunkSize);
        }
        this.currentTime = time;
    }

    async sendChunks(index: number) {
        this.setChunkSize();
        if (index < this.currentIndex && this.lastChunk) {
            this.connection!.send(this.lastChunk);
            console.log("sending last byte");
            return;
        }
        const chunks = this.lastChunk = await this.getChunks();
        this.bytesSend += chunks.byteLength;
        this.connection!.send(chunks);
        this.emit("progress", this.file, this.bytesSend);
        this.currentIndex ++;
        if (this.file.size === this.bytesSend) {
            this.isCompleted = true;
        }
    }

    handleSent() {
        this.connection!.send({
            type: EventTypes.END
        });
        this.emit("completed", this.file);
        this.close();
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
        this.close();
        return this;
    }

    close() {
        sleep(1000).then(() => {
            this.peer.destroy();
        });
    }
}

export default Sender;
