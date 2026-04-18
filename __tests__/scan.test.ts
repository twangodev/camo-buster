import { describe, expect, it } from 'vitest';

import { parseList } from '../src/scan';

describe('parseList', () => {
  it('splits on newlines', () => {
    expect(parseList('a\nb\nc')).toEqual(['a', 'b', 'c']);
  });

  it('splits on commas', () => {
    expect(parseList('a, b, c')).toEqual(['a', 'b', 'c']);
  });

  it('trims whitespace and drops empty entries', () => {
    expect(parseList('  a  \n\n ,b ,\n,c\n ')).toEqual(['a', 'b', 'c']);
  });

  it('returns an empty list for blank input', () => {
    expect(parseList('')).toEqual([]);
    expect(parseList('   \n , \n')).toEqual([]);
  });
});
