// CR-141: pure URL predicates shared between sw.js (via importScripts)
// and unit tests. Classic script - no module syntax so importScripts works.
// Unit tests import this file for its side effect: self.SwRules.
(function (root) {
  // Auth/API traffic is never intercepted: the server stays authoritative
  // and one child's session data can never enter a shared-device cache.
  function isApiPath(url) {
    return /\/(rest|auth|rpc|realtime|functions)\//.test(url.pathname);
  }

  function isBuildAsset(url, origin) {
    return url.origin === origin && url.pathname.startsWith('/assets/');
  }

  // Media allowlist (spec R2 + fonts ruling): only these public dirs and
  // only Supabase PUBLIC storage objects. Signed/authenticated URLs carry
  // tokens in the query - admitting them would persist credentials into
  // Cache Storage.
  function isMediaAsset(url, origin) {
    if (isApiPath(url)) return false;
    if (url.hostname.endsWith('.supabase.co')) {
      return url.pathname.startsWith('/storage/v1/object/public/');
    }
    return (
      url.origin === origin && /^\/(images|sfx|emoji|fonts)\//.test(url.pathname)
    );
  }

  // Navigation handling is limited to the installed app surface. / and
  // the marketing pages are proxied to an external site (vercel.json) and
  // must never fall back to the cached app shell. Only exact /app has a
  // vercel rewrite to app.html - deep paths 404 online, so the SW must
  // not pretend they exist offline.
  function isAppNav(url) {
    return url.pathname === '/app';
  }

  // Query strings may carry one-time tokens (?verify_email=...) - the
  // navigation cache key strips them so a token URL is never persisted.
  function shellCacheKey(url) {
    return url.origin + url.pathname;
  }

  root.SwRules = { isApiPath, isBuildAsset, isMediaAsset, isAppNav, shellCacheKey };
})(self);
