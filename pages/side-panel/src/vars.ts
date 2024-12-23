import type { Language } from './types';

export const DEFAULT_LANGUAGE_CODE: Language['code'] = 'zh-TW';

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'zh-TW', name: 'Traditional Chinese (Taiwan)' },
  { code: 'zh-CN', name: 'Simplified Chinese' },
  { code: 'zh-HK', name: 'Traditional Chinese (Hong Kong)' },
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-AU', name: 'English (Australia)' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'ru', name: 'Russian' },
  { code: 'fil', name: 'Filipino' },
  { code: 'th', name: 'Thai' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
];
