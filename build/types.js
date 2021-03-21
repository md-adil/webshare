"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventTypes = void 0;
var EventTypes;
(function (EventTypes) {
    EventTypes["START"] = "file:start";
    EventTypes["END"] = "file:end";
    EventTypes["PAUSE"] = "file:pause";
    EventTypes[EventTypes["CANCEL"] = -9] = "CANCEL";
    EventTypes[EventTypes["COMPLETED"] = -1] = "COMPLETED";
})(EventTypes = exports.EventTypes || (exports.EventTypes = {}));
