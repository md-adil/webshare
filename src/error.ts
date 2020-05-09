export class AppError extends Error {
    constructor(message: Error | string, public readonly code: string) {
        super(message instanceof Error ?  message.message : message);
    }
}