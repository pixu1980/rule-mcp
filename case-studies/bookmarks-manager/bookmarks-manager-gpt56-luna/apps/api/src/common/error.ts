/** Typed application error carrying an API-safe code and HTTP status. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message = code,
  ) {
    super(message);
    this.name = "AppError";
  }
}
