// Bidi text utilities for mixed RTL (Arabic, Hebrew) + LTR (French, English) content
// Uses dir="auto" + unicode-bidi: plaintext for proper browser-native bidi handling

const RTL_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0590-\u05FF]/;

export function hasRTLContent(text: string): boolean {
  if (!text) return false;
  return RTL_REGEX.test(text);
}

export function detectDirection(text: string): 'rtl' | 'ltr' {
  if (!text) return 'ltr';
  const rtlChars = (text.match(new RegExp(RTL_REGEX.source, 'g')) || []).length;
  const latinChars = (text.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
  return rtlChars > latinChars ? 'rtl' : 'ltr';
}

/**
 * Returns props to spread on any element displaying mixed bidi text.
 * Uses dir="auto" so the browser resolves direction per-paragraph,
 * and unicode-bidi: plaintext so embedded LTR runs stay correct.
 */
export function getBidiProps(text: string): { dir: string; style: React.CSSProperties } {
  return {
    dir: 'auto',
    style: {
      unicodeBidi: 'plaintext',
      textAlign: 'start',
      whiteSpace: 'pre-wrap' as const,
    },
  };
}

/**
 * @deprecated Use getBidiProps instead for proper mixed-language support
 */
export function getDirectionStyle(text: string): React.CSSProperties {
  return {
    direction: 'ltr', // Let dir="auto" on the element handle it
    textAlign: 'start',
    unicodeBidi: 'plaintext',
  };
}
