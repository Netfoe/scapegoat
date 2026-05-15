/**
 * Utilities for parsing and working with Package URLs (PURL).
 * Spec: https://github.com/package-url/purl-spec
 */

export interface ParsedPurl {
  type: string;
  namespace: string;
  name: string;
  version: string;
  qualifiers: string;
  subpath: string;
}

export function parsePurl(purl: string): ParsedPurl | null {
  if (!purl || !purl.startsWith('pkg:')) return null;

  let remainder = purl.substring(4);

  let subpath = '';
  const hashIndex = remainder.indexOf('#');
  if (hashIndex !== -1) {
    subpath = remainder.substring(hashIndex + 1);
    remainder = remainder.substring(0, hashIndex);
  }

  let qualifiers = '';
  const questionIndex = remainder.indexOf('?');
  if (questionIndex !== -1) {
    qualifiers = remainder.substring(questionIndex + 1);
    remainder = remainder.substring(0, questionIndex);
  }

  let version = '';
  const atIndex = remainder.lastIndexOf('@');
  if (atIndex !== -1) {
    version = remainder.substring(atIndex + 1);
    remainder = remainder.substring(0, atIndex);
  }

  const parts = remainder.split('/');
  if (parts.length < 2) return null;

  const type = parts[0];
  const name = parts[parts.length - 1];
  const namespaceParts = parts.slice(1, parts.length - 1);
  const namespace = namespaceParts
    .map(p => decodeURIComponent(p))
    .join('/');

  return {
    type,
    namespace,
    name: decodeURIComponent(name),
    version: version ? decodeURIComponent(version) : '',
    qualifiers,
    subpath
  };
}

export function getRepositoryUrl(purl: string): string | null {
  const parsed = parsePurl(purl);
  if (!parsed) return null;

  const { type, namespace, name } = parsed;

  switch (type.toLowerCase()) {
    case 'npm':
      return namespace
        ? `https://www.npmjs.com/package/${namespace}/${name}`
        : `https://www.npmjs.com/package/${name}`;
    case 'pypi':
      return `https://pypi.org/project/${name}/`;
    case 'composer':
      return namespace
        ? `https://packagist.org/packages/${namespace}/${name}`
        : `https://packagist.org/packages/${name}`;
    case 'maven':
      return `https://mvnrepository.com/artifact/${namespace}/${name}`;
    case 'golang':
      if (namespace) {
        return `https://${namespace}/${name}`;
      }
      return `https://${name}`;
    case 'cargo':
      return `https://crates.io/crates/${name}`;
    case 'gem':
      return `https://rubygems.org/gems/${name}`;
    case 'nuget':
      return `https://www.nuget.org/packages/${name}`;
    case 'deb':
      return `https://tracker.debian.org/pkg/${name}`;
    case 'alpine':
      return `https://pkgs.alpinelinux.org/packages?name=${name}`;
    case 'rpm':
      return `https://pkgs.org/search/?q=${name}`;
    case 'github':
      return namespace
        ? `https://github.com/${namespace}/${name}`
        : `https://github.com/${name}`;
    default:
      return null;
  }
}
