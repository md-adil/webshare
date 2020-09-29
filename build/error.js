"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
class AppError extends Error {
    constructor(message, code) {
        super(message instanceof Error ? message.message : message);
        this.code = code;
    }
}
exports.AppError = AppError;
