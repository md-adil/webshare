export const CHUNK_SIZE = 16;
export const CHUNKS_PER_REQ = 3;

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

for (const buf of slice(new ArrayBuffer(48))) {
    console.log(buf);
}