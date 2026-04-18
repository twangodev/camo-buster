import { describe, expect, it } from 'vitest';

import { extractCamoUrls } from '../src/extract';

describe('extractCamoUrls', () => {
  it('pulls camo URLs out of img src attributes', () => {
    const html = `
      <p>
        <img src="https://camo.githubusercontent.com/abc123/68747470733a2f2f666f6f2e6578616d706c652f62616467652e737667" />
      </p>
    `;
    expect(extractCamoUrls(html)).toEqual([
      'https://camo.githubusercontent.com/abc123/68747470733a2f2f666f6f2e6578616d706c652f62616467652e737667',
    ]);
  });

  it('deduplicates repeated URLs', () => {
    const html = `
      <img src="https://camo.githubusercontent.com/xxx/yyy">
      <img src="https://camo.githubusercontent.com/xxx/yyy">
    `;
    expect(extractCamoUrls(html)).toEqual(['https://camo.githubusercontent.com/xxx/yyy']);
  });

  it('decodes &amp; into &', () => {
    const html = `<img src="https://camo.githubusercontent.com/a/b?x=1&amp;y=2">`;
    expect(extractCamoUrls(html)).toEqual(['https://camo.githubusercontent.com/a/b?x=1&y=2']);
  });

  it('ignores non-camo images', () => {
    const html = `
      <img src="https://example.com/not-camo.png">
      <img src="https://camo.githubusercontent.com/real/one">
    `;
    expect(extractCamoUrls(html)).toEqual(['https://camo.githubusercontent.com/real/one']);
  });

  it('returns empty when no camo URLs are present', () => {
    expect(extractCamoUrls('<p>hello</p>')).toEqual([]);
  });

  it('handles camo URLs inside <source srcset> elements', () => {
    const html = `
      <picture>
        <source srcset="https://camo.githubusercontent.com/dark/one 1x, https://camo.githubusercontent.com/dark/two 2x">
        <img src="https://camo.githubusercontent.com/light/fallback">
      </picture>
    `;
    const urls = extractCamoUrls(html);
    expect(urls).toContain('https://camo.githubusercontent.com/dark/one');
    expect(urls).toContain('https://camo.githubusercontent.com/dark/two');
    expect(urls).toContain('https://camo.githubusercontent.com/light/fallback');
    expect(urls).toHaveLength(3);
  });
});
