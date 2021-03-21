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
const chunks_1 = require("./chunks");
class Sender extends events_1.EventEmitter {
    constructor(peerConfig, file, id) {
        super();
        this.peerConfig = peerConfig;
        this.file = file;
        this.id = id;
        this.isConnected = false;
        this.currentTime = 0;
        this.isCompleted = false;
        this.isCancelled = false;
        this.bytesSent = 0;
        this.handleData = (data) => {
            data = Number(data);
            if (data === types_1.EventTypes.CANCEL) {
                this.isCancelled = true;
                this.emit("cancelled");
                return;
            }
            if (data === types_1.EventTypes.COMPLETED) {
                return this.handleSent();
            }
            if (data >= 0) {
                this.sendChunks(data);
            }
        };
        this.chunks = chunks_1.getTotal(file.size);
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
            (_b = this.connection) === null || _b === void 0 ? void 0 : _b.send(JSON.stringify({
                type: types_1.EventTypes.CANCEL
            }));
            return;
        }
        (_c = this.connection) === null || _c === void 0 ? void 0 : _c.send(JSON.stringify({
            type: types_1.EventTypes.START,
            meta: {
                name: this.file.name,
                size: this.file.size,
                type: this.file.type
            }
        }));
    }
    sendChunks(index) {
        return __awaiter(this, void 0, void 0, function* () {
            const time = (new Date().getTime());
            if (this.currentTime) {
                this.emit("transferrate", chunks_1.getBytesPerSecond(this.currentTime, time));
            }
            this.currentTime = time;
            const block = yield this.getChunks(...chunks_1.getBlock(index));
            for (const chunks of chunks_1.slice(block)) {
                this.connection.send(chunks);
            }
            this.bytesSent += block.byteLength;
            this.emit("progress", this.file, this.bytesSent);
        });
    }
    handleSent() {
        this.emit("completed", this.file);
    }
    getChunks(from, to) {
        return __awaiter(this, void 0, void 0, function* () {
            const reader = new FileReader();
            const buffers = new Promise((resolve, reject) => {
                reader.onload = () => {
                    resolve(reader.result);
                };
                reader.onerror = () => {
                    reject(reader.error);
                };
            });
            reader.readAsArrayBuffer(this.file.slice(from, Math.min(to, this.file.size)));
            return buffers;
        });
    }
    cancel() {
        this.isCancelled = true;
        if (this.connection) {
            this.connection.send(JSON.stringify({
                type: types_1.EventTypes.CANCEL
            }));
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
