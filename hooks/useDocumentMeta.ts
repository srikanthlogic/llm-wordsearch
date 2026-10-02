import { useEffect } from 'react';

import { WordKeyConfig } from '../types';

// v2 reposition spec §3.1: page title/og/meta follow the instance config.
// Config values win only when non-empty — an unconfigured deployment keeps
// the static v1 meta from index.html. Meta elements are created if missing
// so hosts serving minimal HTML still get full instance identity.
function setMeta(selector: string, attrs: { name?: string; property?: string }, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    if (attrs.name) el.setAttribute('name', attrs.name);
    if (attrs.property) el.setAttribute('property', attrs.property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function useDocumentMeta(config: WordKeyConfig): void {
  const { title, blurb } = config;
  useEffect(() => {
    if (title) {
      document.title = title;
      setMeta('meta[property="og:title"]', { property: 'og:title' }, title);
      setMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, title);
    }
    if (blurb) {
      setMeta('meta[name="description"]', { name: 'description' }, blurb);
      setMeta('meta[property="og:description"]', { property: 'og:description' }, blurb);
      setMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, blurb);
    }
  }, [title, blurb]);
}
