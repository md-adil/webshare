/// <reference types="node" />
import Peer, { DataConnection, PeerJSOption } from "peerjs";
import { EventEmitter } from "events";
import { IFileMeta } from "./types";
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
declare class Receiver extends EventEmitter {
    peerConfig: PeerJSOption;
    readonly id: string;
    peer?: Peer;
    connection?: DataConnection;
    receiver?: any;
    meta?: IFileMeta;
    data: Array<ArrayBuffer>;
    bytesReceived: number;
    currentIndex: number;
    currentTime: number;
    isCompleted: boolean;
    isCancelled: boolean;
    constructor(peerConfig: PeerJSOption, id: string);
    open(): void;
    private connect;
    get isActive(): boolean;
    private handleData;
    transferRate(bytes: number): void;
    connected(connection: DataConnection): void;
    handleCompleted(): void;
    cancel(): this;
    close(): void;
    download(file: File): void;
}
export default Receiver;
//# sourceMappingURL=Receiver.d.ts.map