import { describe, it, expect } from 'vitest';
import { getRepositoryUrl, parsePurl } from './purl';

describe('purl utilities', () => {
  describe('parsePurl', () => {
    it('should parse valid npm purl', () => {
      const result = parsePurl('pkg:npm/react@18.2.0');
      expect(result).toEqual({
        type: 'npm',
        namespace: '',
        name: 'react',
        version: '18.2.0',
        qualifiers: '',
        subpath: ''
      });
    });

    it('should parse scoped npm purl', () => {
      const result = parsePurl('pkg:npm/%40babel/core@7.20.0');
      expect(result).toEqual({
        type: 'npm',
        namespace: '@babel',
        name: 'core',
        version: '7.20.0',
        qualifiers: '',
        subpath: ''
      });
    });

    it('should parse github purl', () => {
      const result = parsePurl('pkg:github/actions/checkout@v3');
      expect(result).toEqual({
        type: 'github',
        namespace: 'actions',
        name: 'checkout',
        version: 'v3',
        qualifiers: '',
        subpath: ''
      });
    });
  });

  describe('getRepositoryUrl', () => {
    it('should resolve npm urls', () => {
      expect(getRepositoryUrl('pkg:npm/react@18.2.0')).toBe('https://www.npmjs.com/package/react');
      expect(getRepositoryUrl('pkg:npm/%40babel/core@7.20.0')).toBe('https://www.npmjs.com/package/@babel/core');
    });

    it('should resolve github urls', () => {
      expect(getRepositoryUrl('pkg:github/actions/checkout')).toBe('https://github.com/actions/checkout');
      expect(getRepositoryUrl('pkg:github/actions/setup-go@v4')).toBe('https://github.com/actions/setup-go');
      expect(getRepositoryUrl('pkg:github/google/go-cmp')).toBe('https://github.com/google/go-cmp');
    });

    it('should resolve golang urls', () => {
      expect(getRepositoryUrl('pkg:golang/github.com/google/go-cmp@v0.5.9')).toBe('https://github.com/google/go-cmp');
    });

    it('should return null for unknown types', () => {
      expect(getRepositoryUrl('pkg:unknown/something')).toBeNull();
    });
  });
});
