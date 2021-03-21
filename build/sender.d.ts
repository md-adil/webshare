/// <reference types="node" />
import { EventEmitter } from "events";
import Peer, { DataConnection, PeerJSOption } from "peerjs";
import { ReceiverEvent } from "./types";
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
declare class Sender extends EventEmitter {
    readonly peerConfig: PeerJSOption;
    private readonly file;
    readonly id?: string | undefined;
    peer: Peer;
    connection?: DataConnection;
    isConnected: boolean;
    currentTime: number;
    isCompleted: boolean;
    isCancelled: boolean;
    chunks: number;
    bytesSent: number;
    constructor(peerConfig: PeerJSOption, file: File, id?: string | undefined);
    get isActive(): boolean;
    handleConnection(connection: DataConnection): void;
    connected(): void;
    handleData: (data: ReceiverEvent) => void;
    sendChunks(index: number): Promise<void>;
    handleSent(): void;
    getChunks(from: number, to: number): Promise<ArrayBuffer>;
    cancel(): this;
    close(): void;
}
export default Sender;
//# sourceMappingURL=sender.d.ts.map