(function () {
  'use strict';

  function enforceWarningBanner() {
    if (document.body && !document.body.classList.contains('fbi-banner-active')) {
      document.body.classList.add('fbi-banner-active');
    }
    var banner = document.getElementById('fbi-tiktok-warning-overlay');
    if (banner) {
      if (banner.style.display !== 'flex') {
        banner.style.setProperty('display', 'flex', 'important');
      }
      if (banner.style.visibility !== 'visible') {
        banner.style.setProperty('visibility', 'visible', 'important');
      }
      if (banner.style.opacity !== '1') {
        banner.style.setProperty('opacity', '1', 'important');
      }
    }
  }

  // Run on initial load and when DOM is interactive/complete
  enforceWarningBanner();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enforceWarningBanner);
  }

  // Prevent escape or keyboard dismissal
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
})();
