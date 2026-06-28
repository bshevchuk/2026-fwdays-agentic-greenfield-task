// @trace FR-FX-01, FR-FX-05

export class FxConversionError extends Error {
  constructor(message: string, public readonly currency: string) {
    super(message);
    this.name = 'FxConversionError';
  }
}

export class FxFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FxFetchError';
  }
}
