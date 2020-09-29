"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const peerjs_1 = __importDefault(require("peerjs"));
const types_1 = require("./types");
const timer_1 = require("./timer");
class Sender extends events_1.EventEmitter {
    constructor(peerConfig, file, id) {
        super();
        this.peerConfig = peerConfig;
        this.file = file;
        this.id = id;
        this.isConnected = false;
        this.currentIndex = 0;
        this.chunkSize = Math.pow(2, 13);
        this.currentTime = 0;
        this.bytesSend = 0;
        this.isCompleted = false;
        this.isCancelled = false;
        this.handleData = (data) => {
            if (data.type === types_1.EventTypes.REQUEST) {
                if (this.isCancelled) {
                    return;
                }
                if (this.isCompleted) {
                    this.handleSent();
                    return;
                }
                this.sendChunks(data.index);
            }
            if (data.type === types_1.EventTypes.CANCEL) {
                this.isCancelled = true;
                this.emit("cancelled");
            }
        };
        const peer = this.peer = new peerjs_1.default(id, peerConfig);
        peer.on("close", () => {
            this.emit("close");
        });
        peer.on("error", err => {
            if (this.isActive) {
                this.emit("error", err);
            }
        });
        peer.on("disconnected", () => {
            peer.reconnect();
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
    handleConnection(connection) {
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
            timer_1.sleep(1000).then(() => {
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
        var _a, _b, _c;
        (_a = this.connection) === null || _a === void 0 ? void 0 : _a.on("data", this.handleData);
        if (this.isCancelled) {
            (_b = this.connection) === null || _b === void 0 ? void 0 : _b.send({
                type: types_1.EventTypes.CANCEL
            });
            return;
        }
        (_c = this.connection) === null || _c === void 0 ? void 0 : _c.send({
            type: types_1.EventTypes.START,
            meta: {
                name: this.file.name,
                size: this.file.size,
                type: this.file.type
            }
        });
    }
    setChunkSize() {
        const time = (new Date).getTime();
        if (!this.currentTime) {
            this.currentTime = time;
            return;
        }
        const diff = (time - this.currentTime) / 1000;
        this.emit("transferrate", this.chunkSize / diff);
        if (diff < 1) {
            this.chunkSize *= 2;
        }
        else if (diff > 2) {
            this.chunkSize /= 2;
        }
        this.currentTime = time;
    }
    sendChunks(index) {
        return __awaiter(this, void 0, void 0, function* () {
            this.setChunkSize();
            if (index < this.currentIndex && this.lastChunk) {
                this.connection.send(this.lastChunk);
                console.log("sending last byte");
                return;
            }
            const chunks = this.lastChunk = yield this.getChunks();
            this.bytesSend += chunks.byteLength;
            this.connection.send(chunks);
            this.emit("progress", this.file, this.bytesSend);
            this.currentIndex++;
            if (this.file.size === this.bytesSend) {
                this.isCompleted = true;
            }
        });
    }
    handleSent() {
        this.connection.send({
            type: types_1.EventTypes.END
        });
        this.emit("completed", this.file);
    }
    getChunks() {
        return __awaiter(this, void 0, void 0, function* () {
            const reader = new FileReader();
            const promise = new Promise((resolve, reject) => {
                reader.onload = () => {
                    resolve(reader.result);
                };
                reader.onerror = () => {
                    reject(reader.error);
                };
            });
            reader.readAsArrayBuffer(this.file.slice(this.bytesSend, this.bytesSend + this.chunkSize));
            return promise;
        });
    }
    cancel() {
        this.isCancelled = true;
        if (this.connection) {
            this.connection.send({
                type: types_1.EventTypes.CANCEL
            });
        }
        else {
            this.close();
        }
        return this;
    }
    close() {
        timer_1.sleep(1000).then(() => {
            this.peer.destroy();
        });
    }
}
exports.default = Sender;
