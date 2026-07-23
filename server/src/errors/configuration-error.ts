export class ConfigurationError extends Error {
  constructor(public readonly fields: string[]) {
    super("Invalid application configuration");
    this.name = "ConfigurationError";
  }
}
