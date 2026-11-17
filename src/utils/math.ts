import katex from 'katex';

/**
 * Render TeX math into static HTML at build time using KaTeX.
 */
export function renderKatex(tex: string, displayMode = false): string {
  return katex.renderToString(tex, {
    displayMode,
    throwOnError: false,
    strict: false,
  });
}
