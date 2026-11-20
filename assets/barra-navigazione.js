
(function () {
  function syncWalletTabBarHeight() {
    var nav = document.querySelector('.tab-bar');
    if (nav) document.documentElement.style.setProperty('--wp-tabbar-height',
      Math.ceil(nav.getBoundingClientRect().height) + 'px');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncWalletTabBarHeight, {once:true});
  } else {
    syncWalletTabBarHeight();
  }
  window.addEventListener('resize', syncWalletTabBarHeight);
  // iOS Safari can move position:fixed controls to the top of the software keyboard.
  // During text entry in Aggiungi, keep the navigation dock at the page bottom,
  // behind the keyboard rather than floating over the input fields.
  function syncKeyboardDock() {
    var nav = document.querySelector('body > .tab-bar');
    var modal = document.getElementById('addModal');
    if (!nav) return;
    var viewport = window.visualViewport;
    var focus = document.activeElement;
    var textFocus = focus && (focus.matches('input:not([type=checkbox]):not([type=radio]), textarea, select') || focus.isContentEditable);
    if (!modal || !modal.classList.contains('open') || !textFocus || !modal.contains(focus) || !viewport) {
      nav.style.removeProperty('transform');
      return;
    }
    var obscured = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
    nav.style.transform = obscured > 90 ? 'translateY(' + Math.round(obscured) + 'px)' : '';
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncKeyboardDock);
    window.visualViewport.addEventListener('scroll', syncKeyboardDock);
  }
  document.addEventListener('focusin', syncKeyboardDock);
  document.addEventListener('focusout', function () { requestAnimationFrame(syncKeyboardDock); });
  document.addEventListener('click', function () { requestAnimationFrame(syncKeyboardDock); });

  if (typeof ResizeObserver !== 'undefined') {
    var start = function () {
      var nav = document.querySelector('.tab-bar');
      if (nav) new ResizeObserver(syncWalletTabBarHeight).observe(nav);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
    else start();
  }
})();
