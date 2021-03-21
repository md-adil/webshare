export const CHUNK_SIZE = 16000;
export const CHUNKS_PER_REQ = 64;

export function getBlock(index: number): [ number, number ] {
    const from = index * CHUNK_SIZE;
    return [ from, from + (CHUNKS_PER_REQ * CHUNK_SIZE) ];
};

export function getTotal(size: number) {
    return Math.ceil(size / CHUNK_SIZE);
}

export function *slice(buffers: ArrayBuffer) {
    const length = buffers.byteLength;
    for (let i = 0; i < CHUNKS_PER_REQ; i++) {
        const begin = i * CHUNK_SIZE;
        const end = Math.min(begin + CHUNK_SIZE, length);
        yield buffers.slice(begin, end);
    }
}

export function isLastInBlock(total: number, index: number) {
    return index % CHUNKS_PER_REQ === 0 || total === index;
}

export function getBytesPerSecond(start: number, finish: number) {
    const bytes = CHUNK_SIZE * CHUNKS_PER_REQ;
    return bytes / ((finish - start) / 1000)
}