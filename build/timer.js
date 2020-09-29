"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = void 0;
exports.sleep = (time) => {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
};
