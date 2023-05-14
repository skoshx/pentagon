export class PentagonCreateItemError extends Error {
  constructor(message: string, cause?: string) {
    super(message, { cause });
  }
}

export class PentagonKeyError extends Error {
  constructor(message: string, cause?: string) {
    super(message, { cause });
  }
}
