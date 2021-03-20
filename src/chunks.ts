export const CHUNK_SIZE = 1600;
export const CHUNKS_PER_REQ = 64;

export function getBlock(index: number): [ number, number ] {
    const from = index * CHUNK_SIZE;
    const to = from + ( CHUNK_SIZE * CHUNKS_PER_REQ );
    return [ from, to ];
};

export function getTotal(size: number) {
    return Math.floor(size / CHUNK_SIZE);
}

export function *slice(buffers: ArrayBuffer) {
    const length = buffers.byteLength;
    let remaining = length - 1;
    for (let i = 0; i < CHUNKS_PER_REQ; i++) {
        const begin = i * CHUNKS_PER_REQ;
        const end = Math.min(begin + CHUNK_SIZE, remaining);
        remaining =- CHUNK_SIZE;
        yield buffers.slice(begin, end);
    }
}

export function isLastInBlock(total: number, index: number) {
    return index % CHUNKS_PER_REQ === 0 || total === index;
}
