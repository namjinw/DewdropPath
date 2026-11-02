import ko from './ko.js';
import en from './en.js';
import { getLang as savedLang, setLang as saveLang } from '../save.js';

const DICTS = { ko, en };
let lang = detect();

function detect() {
  const saved = savedLang();
  if (saved && DICTS[saved]) return saved;
  const nav = (navigator.language || 'en').toLowerCase();
  return nav.startsWith('ko') ? 'ko' : 'en';
}

export function getLang() { return lang; }

export function setLang(next) {
  if (!DICTS[next]) return;
  lang = next;
  saveLang(next);
  document.documentElement.lang = next;
}

export function toggleLang() { setLang(lang === 'ko' ? 'en' : 'ko'); }

export function t(key, vars = {}) {
  const str = DICTS[lang][key] ?? DICTS.en[key] ?? key;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}

document.documentElement.lang = lang;
