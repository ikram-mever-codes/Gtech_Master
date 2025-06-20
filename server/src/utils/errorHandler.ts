class ErrorHandler extends Error {
  public status: number;
  public success: boolean;
  public errors?: any[];

  constructor(message: string, status: number, errors?: any[]) {
    super(message);

    this.name = this.constructor.name;

    this.status = status;
    this.success = false;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default ErrorHandler;
