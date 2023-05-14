export class PentagonCreateItemError extends Error {
  constructor(message: string, cause?: string) {
    super(message, { cause });
  }
}
