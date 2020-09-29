"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logContainer = document.getElementById("container:log");
function log(...messages) {
    if (!logContainer) {
        console.log(...messages);
        return;
    }
    const item = document.createElement("div");
    for (const message of messages) {
        const span = document.createElement("span");
        span.innerText = message;
        span.innerText += " ";
        item.appendChild(span);
    }
    logContainer.append(item);
    item.scrollIntoView({
        behavior: "smooth"
    });
}
exports.default = log;
window.log = log;
