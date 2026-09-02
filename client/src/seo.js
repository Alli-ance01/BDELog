const SITE_NAME = 'BDELog';
const DEFAULT_DESCRIPTION = 'BDELog is the daily field reporting desk for BDE and ESO teams, with clean submissions, monthly mobilisation targets, and export-ready regional intelligence.';

function upsertMeta(attribute, value, content) {
  let element = document.head.querySelector(`meta[${attribute}="${value}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, value);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

export function syncPublicSeo() {
  if (typeof window === 'undefined' || !document.head) return;
  const canonicalUrl = `${window.location.origin}${window.location.pathname === '/' ? '/' : window.location.pathname}`;
  const canonical = document.head.querySelector('link[rel="canonical"]') || document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'canonical' }));
  canonical.href = canonicalUrl;
  upsertMeta('property', 'og:url', canonicalUrl);
  upsertMeta('property', 'twitter:url', canonicalUrl);

  const structuredData = document.getElementById('bdelog-structured-data');
  if (structuredData) {
    structuredData.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: SITE_NAME,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: DEFAULT_DESCRIPTION,
      url: canonicalUrl,
    });
  }
}
