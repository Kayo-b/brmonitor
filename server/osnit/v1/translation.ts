import type { OsnitItem } from '../../../src/generated/server/osnit/v1/service_server';

declare const process: { env: Record<string, string | undefined> };

const TRANSLATION_CACHE = new Map<string, string>();
const TRANSLATION_CACHE_MAX = 10_000;

const GOOGLE_TRANSLATE_KEY = process.env.GOOGLE_TRANSLATE_API_KEY || '';
const GOOGLE_TRANSLATE_WEB_URL = process.env.OSNIT_GOOGLE_TRANSLATE_WEB_URL || 'https://translate.googleapis.com/translate_a/single';

export function readTranslateTarget(url: string): string {
  try {
    const u = new URL(url);
    const raw = (u.searchParams.get('translate_to') || u.searchParams.get('lang') || '').trim().toLowerCase();
    if (!raw || raw === 'none' || raw === 'original' || raw === 'off') return '';
    if (!/^[a-z]{2,3}(-[a-z0-9]{2,8})?$/i.test(raw)) return '';
    return raw;
  } catch {
    return '';
  }
}

export async function translateItems(items: OsnitItem[], targetLang: string): Promise<OsnitItem[]> {
  if (!targetLang) return items;
  const out: OsnitItem[] = [];
  for (const item of items) {
    out.push(await translateItem(item, targetLang));
  }
  return out;
}

export async function translateItem(item: OsnitItem, targetLang: string): Promise<OsnitItem> {
  if (!targetLang) return item;
  const sourceText = String(item.text || '').trim();
  if (!sourceText || !needsTranslation(sourceText)) return item;

  const translatedText = await translateText(sourceText, targetLang);
  if (!translatedText || translatedText === sourceText) return item;
  const translatedTitle = trimTo(translatedText.replace(/\s+/g, ' '), 180);
  const translatedTags = item.tags.includes(`translated:${targetLang}`)
    ? item.tags
    : [...item.tags, `translated:${targetLang}`];

  return {
    ...item,
    title: translatedTitle,
    text: translatedText,
    tags: translatedTags,
  };
}

async function translateText(input: string, targetLang: string): Promise<string> {
  const text = trimTo(input, 4_500);
  const cacheKey = `${targetLang}:${hashString(text)}`;
  const cached = TRANSLATION_CACHE.get(cacheKey);
  if (cached) return cached;

  const translated = await (GOOGLE_TRANSLATE_KEY
    ? translateViaGoogleApi(text, targetLang)
    : translateViaGoogleWeb(text, targetLang));
  if (!translated) return input;

  if (TRANSLATION_CACHE.size >= TRANSLATION_CACHE_MAX) {
    const first = TRANSLATION_CACHE.keys().next().value;
    if (first) TRANSLATION_CACHE.delete(first);
  }
  TRANSLATION_CACHE.set(cacheKey, translated);
  return translated;
}

async function translateViaGoogleApi(text: string, targetLang: string): Promise<string> {
  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(GOOGLE_TRANSLATE_KEY)}`;
    const body = new URLSearchParams();
    body.set('q', text);
    body.set('target', targetLang);
    body.set('format', 'text');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) return '';
    const payload = await res.json() as {
      data?: {
        translations?: Array<{ translatedText?: string }>;
      };
    };
    const value = payload.data?.translations?.[0]?.translatedText || '';
    return typeof value === 'string' ? value.trim() : '';
  } catch {
    return '';
  }
}

async function translateViaGoogleWeb(text: string, targetLang: string): Promise<string> {
  try {
    const url = new URL(GOOGLE_TRANSLATE_WEB_URL);
    url.searchParams.set('client', 'gtx');
    url.searchParams.set('sl', 'auto');
    url.searchParams.set('tl', targetLang);
    url.searchParams.set('dt', 't');
    url.searchParams.set('q', text);

    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json,text/plain,*/*' },
    });
    if (!res.ok) return '';
    const payload = await res.json() as unknown;
    const segments = Array.isArray(payload) ? payload[0] : null;
    if (!Array.isArray(segments)) return '';
    const merged = segments
      .map((seg) => (Array.isArray(seg) ? seg[0] : ''))
      .filter((value): value is string => typeof value === 'string')
      .join('');
    return merged.trim();
  } catch {
    return '';
  }
}

function needsTranslation(text: string): boolean {
  return /[^\x00-\x7F]/.test(text);
}

function trimTo(value: string, n: number): string {
  return value.length > n ? value.slice(0, n) : value;
}

function hashString(value: string): string {
  let h1 = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h1 ^= value.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0');
}
