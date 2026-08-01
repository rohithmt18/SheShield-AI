export class RefusalError extends Error {
  constructor(message = 'The AI declined to process this content.') {
    super(message);
    this.name = 'RefusalError';
  }
}

export class NoCredentialsError extends Error {
  constructor(message = 'No Gemini API key configured.') {
    super(message);
    this.name = 'NoCredentialsError';
  }
}
