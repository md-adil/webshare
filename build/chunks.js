"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBytesPerSecond = exports.isLastInBlock = exports.slice = exports.getTotal = exports.getBlock = exports.CHUNKS_PER_REQ = exports.CHUNK_SIZE = void 0;
exports.CHUNK_SIZE = 1600;
exports.CHUNKS_PER_REQ = 64;
function getBlock(index) {
    const from = index * exports.CHUNK_SIZE;
    return [from, from + (exports.CHUNKS_PER_REQ * exports.CHUNK_SIZE)];
}
exports.getBlock = getBlock;
;
function getTotal(size) {
    return Math.ceil(size / exports.CHUNK_SIZE);
}
exports.getTotal = getTotal;
function* slice(buffers) {
    const length = buffers.byteLength;
    for (let i = 0; i < exports.CHUNKS_PER_REQ; i++) {
        const begin = i * exports.CHUNK_SIZE;
        const end = Math.min(begin + exports.CHUNK_SIZE, length);
        yield buffers.slice(begin, end);
    }
}
exports.slice = slice;
function isLastInBlock(total, index) {
    return index % exports.CHUNKS_PER_REQ === 0 || total === index;
}
exports.isLastInBlock = isLastInBlock;
function getBytesPerSecond(start, finish) {
    const bytes = exports.CHUNK_SIZE * exports.CHUNKS_PER_REQ;
    return bytes / ((finish - start) / 1000);
}
exports.getBytesPerSecond = getBytesPerSecond;
