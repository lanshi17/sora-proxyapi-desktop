import { AppSettings } from './settings-types';

const STORE_KEY = 'app-settings';

export const settingsStore = {
  load(): AppSettings {
    const data = localStorage.getItem(STORE_KEY);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
      }
    }
    return {
      apiKey: '',
      model: '',
    };
  },

  save(settings: AppSettings): void {
    localStorage.setItem(STORE_KEY, JSON.stringify(settings));
  }
};
