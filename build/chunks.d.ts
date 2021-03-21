export declare const CHUNK_SIZE = 16000;
export declare const CHUNKS_PER_REQ = 64;
export declare function getBlock(index: number): [number, number];
export declare function getTotal(size: number): number;
export declare function slice(buffers: ArrayBuffer): Generator<ArrayBuffer, void, unknown>;
export declare function isLastInBlock(total: number, index: number): boolean;
export declare function getBytesPerSecond(start: number, finish: number): number;
//# sourceMappingURL=chunks.d.ts.map