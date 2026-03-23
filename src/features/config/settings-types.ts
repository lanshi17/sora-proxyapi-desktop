export interface AppSettings {
  apiKey: string;
  model: string;
  availableModels?: string[]; // Cache fetched models
}
