(function () {
  'use strict';

  function enforceWarningBanner() {
    document.body.classList.add('fbi-banner-active');
    var banner = document.getElementById('fbi-tiktok-warning-overlay');
    if (banner) {
      banner.style.setProperty('display', 'flex', 'important');
      banner.style.setProperty('visibility', 'visible', 'important');
      banner.style.setProperty('opacity', '1', 'important');
      banner.style.setProperty('z-index', '2147483647', 'important');
      banner.style.setProperty('pointer-events', 'auto', 'important');
    }
  }

  // Run immediately and when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enforceWarningBanner);
  } else {
    enforceWarningBanner();
  }

  // Prevent escape or keyboard dismissal
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
      e.preventDefault();
      e.stopPropagation();
      enforceWarningBanner();
    }
  }, true);

  // Re-enforce periodically and observe DOM in case of removal
  setInterval(enforceWarningBanner, 500);

  // MutationObserver to prevent any scripts from hiding or deleting the banner
  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function () {
      enforceWarningBanner();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden']
    });
  }
})();
