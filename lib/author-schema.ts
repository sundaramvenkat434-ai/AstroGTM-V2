export const FALLBACK_AUTHOR_SLUG = 'venkat-sundaram';
export const FALLBACK_AUTHOR_NAME = 'Venkat Sundaram';
export const FALLBACK_AUTHOR_LINKEDIN = 'https://linkedin.com/in/srvenkat94';

export const AUTHOR_SCHEMA = {
  '@context': 'https://schema.org' as const,
  '@type': 'Person' as const,
  name: FALLBACK_AUTHOR_NAME,
  url: `/author/${FALLBACK_AUTHOR_SLUG}`,
  jobTitle: 'Senior Product Manager',
  sameAs: [FALLBACK_AUTHOR_LINKEDIN],
};

export function buildArticleSchema({
  headline,
  pageUrl,
  datePublished,
  dateModified,
}: {
  headline: string;
  pageUrl: string;
  datePublished?: string | null;
  dateModified?: string | null;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    author: {
      '@type': 'Person',
      name: FALLBACK_AUTHOR_NAME,
      url: `/author/${FALLBACK_AUTHOR_SLUG}`,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': pageUrl,
    },
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
  };
}
