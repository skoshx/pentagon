export class PentagonCreateItemError extends Error {
  constructor(message: string, cause?: string) {
    super(message, { cause });
  }
}

export class PentagonDeleteItemError extends Error {
  constructor(message: string, cause?: string) {
    super(message, { cause });
  }
}

export class PentagonKeyError extends Error {
  constructor(message: string, cause?: string) {
    super(message, { cause });
  }
}

export class PentagonUpdateError extends Error {
  constructor(message: string, cause?: string) {
    super(message, { cause });
  }
}

export class PentagonBatchOpError extends Error {
  constructor(message: string, cause?: string) {
    super(message, { cause });
  }
}
