export declare enum EventTypes {
    START = "file:start",
    END = "file:end",
    PAUSE = "file:pause",
    REQUEST = "file:req",
    CANCEL = "file:cancel"
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
interface IRequest {
    type: EventTypes.REQUEST;
    index: number;
}
interface ICancel {
    type: EventTypes.CANCEL;
}
export declare type FileEvent = IStart | IEnd | IRequest | ICancel;
export {};
//# sourceMappingURL=types.d.ts.map