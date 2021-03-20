export declare enum EventTypes {
    START = "file:start",
    END = "file:end",
    PAUSE = "file:pause",
    CANCEL = -9,
    COMPLETED = -1
}
export interface IFileMeta {
    name: string;
    size: number;
    type: string;
    data?: Blob;
}
interface IStart {
    type: EventTypes.START;
    meta: IFileMeta;
}
interface IEnd {
    type: EventTypes.END;
}
interface ICancel {
    type: EventTypes.CANCEL;
}
export declare type FileEvent = IStart | IEnd | ICancel;
export declare type ReceiverEvent = number | EventTypes.CANCEL | EventTypes.COMPLETED;
export {};
//# sourceMappingURL=types.d.ts.map