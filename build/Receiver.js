"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const peerjs_1 = __importDefault(require("peerjs"));
const events_1 = require("events");
const types_1 = require("./types");
const timer_1 = require("./timer");
const log_1 = __importDefault(require("./log"));
class Receiver extends events_1.EventEmitter {
    constructor(peerConfig, id) {
        super();
        this.peerConfig = peerConfig;
        this.id = id;
        this.data = [];
        this.bytesReceived = 0;
        this.currentIndex = 0;
        this.currentTime = 0;
        this.isCompleted = false;
        this.isCancelled = false;
        this.handleData = (data) => {
            var _a, _b;
            if (this.isCancelled) {
                return;
            }
            if (this.isCompleted) {
                return;
            }
            if (data instanceof ArrayBuffer) {
                this.transferRate(data.byteLength);
                this.currentIndex++;
                this.bytesReceived += data.byteLength;
                this.data.push(data);
                this.emit("progress", this.meta, this.bytesReceived);
                (_a = this.connection) === null || _a === void 0 ? void 0 : _a.send({
                    type: types_1.EventTypes.REQUEST,
                    index: this.currentIndex
                });
                return;
            }
            if (data.type === types_1.EventTypes.END) {
                this.handleCompleted();
            }
            if (data.type === types_1.EventTypes.START) {
                this.emit("incoming", data.meta);
                this.meta = data.meta;
                console.log("meta data received, sending back", this.connection);
                (_b = this.connection) === null || _b === void 0 ? void 0 : _b.send({
                    type: types_1.EventTypes.REQUEST,
                    index: this.currentIndex
                });
            }
            if (data.type === types_1.EventTypes.CANCEL) {
                this.isCancelled = true;
                this.emit("cancel");
                this.close();
            }
        };
        this.open();
    }
    open() {
        const peer = this.peer = new peerjs_1.default(this.peerConfig);
        peer.on("open", id => {
            log_1.default("peer open", id);
            this.emit("open", id);
            this.connect();
        });
        peer.on("close", () => {
            log_1.default("peer closed");
            this.emit("close");
        });
        peer.on("disconnected", () => {
            log_1.default("peer disconnected");
            peer.reconnect();
        });
        peer.on("error", (err) => {
            log_1.default("peer error", err);
            if (this.isActive) {
                this.isCancelled = true;
                this.emit("cancelled");
                this.emit("error", err);
            }
        });
    }
    connect() {
        const connection = this.connection = this.peer.connect(this.id, {
            reliable: true,
        });
        log_1.default("connecting...");
        connection.on("open", () => {
            log_1.default("connection open");
            console.log("connected");
            this.emit("connected", this.connection);
            this.connected(connection);
        });
        connection.on("error", err => {
            log_1.default("connection error", err);
            if (this.isActive) {
                this.emit("error", err);
                this.emit("reconnect");
                this.connect();
            }
        });
        connection.on("close", () => {
            log_1.default("connection closed");
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
    transferRate(bytes) {
        const time = (new Date).getTime();
        if (!this.currentTime) {
            this.currentTime = time;
            return;
        }
        const diff = (time - this.currentTime) / 1000;
        this.currentTime = time;
        this.emit("transferrate", bytes / diff);
    }
    connected(connection) {
        connection.on("data", this.handleData);
    }
    handleCompleted() {
        this.isCompleted = true;
        this.emit("completed", new File(this.data, this.meta.name, { type: this.meta.type }));
        this.data = [];
        this.close();
    }
    cancel() {
        var _a;
        this.isCancelled = true;
        (_a = this.connection) === null || _a === void 0 ? void 0 : _a.send({
            type: types_1.EventTypes.CANCEL
        });
        timer_1.sleep(1000).then(() => {
            this.close();
        });
        return this;
    }
    close() {
        var _a;
        (_a = this.connection) === null || _a === void 0 ? void 0 : _a.close();
        timer_1.sleep(1000).then(() => {
            this.peer.destroy();
        });
        log_1.default("connection closed");
    }
    download(file) {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.setAttribute("download", file.name);
        a.click();
        a.remove();
    }
}
exports.default = Receiver;
