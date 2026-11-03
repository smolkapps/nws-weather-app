/* Website pageviews only. Input data and extension behavior are outside this module. */
(() => {
  'use strict';
  const hosts = {
  "nws-weather-app.apps.smolkin.org": "/"
};
  const pages = {
  "": "PlainWeather",
  "index.html": "PlainWeather",
  "privacy.html": "PlainWeather website privacy"
};
  const host = window.location.hostname;
  const prefix = hosts[host];
  if (window.location.protocol !== 'https:' || prefix === undefined) return;
  const pathname = window.location.pathname;
  if (!pathname.startsWith(prefix)) return;
  const key = pathname.slice(prefix.length);
  if (!Object.prototype.hasOwnProperty.call(pages, key)) return;
  if (navigator.globalPrivacyControl === true || ['1', 'yes'].includes(String(navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack))) return;
  try { if (localStorage.getItem('umami.disabled')) return; } catch (_) { /* Storage is optional. */ }
  // Referrer suppression belongs only to the tracking requests.
  if (window.umami || window.websitePageviewLoaded) return;
  window.websitePageviewLoaded = true;
  let accepted = false;
  window.websitePageviewBeforeSend = (type, payload) => {
    if (accepted || type !== 'event' || !payload || payload.name !== undefined) return false;
    accepted = true;
    return {
      website: '0ee0e19b-b29b-4c98-b3f6-a92a43b4ba5a',
      hostname: host,
      url: 'https://' + host + prefix + (key === 'index.html' ? '' : key),
      title: pages[key],
      referrer: ''
    };
  };
  const script = document.createElement('script');
  script.src = prefix + 'umami-pageview-sdk.js';
  script.integrity = 'sha384-eUvX2TuFyDHbvlGBu7oFKB/wBHKpuqrr9uVmulFcbAwLVHxJy4H6udPJWulcUIzS';
  script.crossOrigin = 'anonymous';
  script.referrerPolicy = 'no-referrer';
  script.async = true;
  for (const [name, value] of Object.entries({
    'website-id': '0ee0e19b-b29b-4c98-b3f6-a92a43b4ba5a',
    'host-url': 'https://umami.smolkin.org',
    'auto-track': 'false', 'auto-pageview': 'false', 'performance': 'false',
    'exclude-search': 'true', 'exclude-hash': 'true', 'do-not-track': 'true',
    'fetch-credentials': 'omit', 'before-send': 'websitePageviewBeforeSend'
  })) script.setAttribute('data-' + name, value);
  script.onload = () => { if (window.umami) window.umami.track(); };
  document.head.appendChild(script);
})();
