
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
  if (typeof ResizeObserver !== 'undefined') {
    var start = function () {
      var nav = document.querySelector('.tab-bar');
      if (nav) new ResizeObserver(syncWalletTabBarHeight).observe(nav);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
    else start();
  }
})();
