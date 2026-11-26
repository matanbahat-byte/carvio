// Plain-text normalization only: source markup is never rendered as HTML.
export function cleanJobDescription(value: string): string {
  let text = value;
  // ATS content can contain escaped (sometimes twice-escaped) HTML.
  for (let pass = 0; pass < 3; pass++) {
    text = text.replace(/&(?:amp|lt|gt|quot|apos|nbsp|mdash|ndash|bull|rsquo|lsquo|rdquo|ldquo|hellip|copy|reg|trade);|&#(?:x[\da-f]+|\d+);/gi, (entity) => {
      const named: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ', '&mdash;': '—', '&ndash;': '–', '&bull;': '•', '&rsquo;': '’', '&lsquo;': '‘', '&rdquo;': '”', '&ldquo;': '“', '&hellip;': '…', '&copy;': '©', '&reg;': '®', '&trade;': '™' };
      if (named[entity.toLowerCase()] !== undefined) return named[entity.toLowerCase()];
      const number = entity.slice(2, -1);
      const code = number[0].toLowerCase() === 'x' ? parseInt(number.slice(1), 16) : parseInt(number, 10);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : ' ';
    });
  }
  return text
    .replace(/<!--[^]*?(?:-->|$)/g, ' ')
    .replace(/<(script|style|noscript|template|code)\b[^>]*>[^]*?(?:<\/\1\s*>|$)/gi, ' ')
    .replace(/```[^]*?(?:```|$)/g, ' ')
    .replace(/<\/?(?:p|div|li|ul|ol|h[1-6]|br|section|article|tr)\b[^>]*>/gi, '\n')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .split(/\r?\n/)
    .filter(line => !/(?:\b(?:function|const|let|var)\s+\w+\s*[=(]|=>|\{[^}]*[;:]|\b(?:document|window)\.|(?:class|style|data-\w+)\s*=)/i.test(line))
    .map(line => line.replace(/[\t \u00a0]+/g, ' ').trim())
    .filter(Boolean).join('\n');
}
