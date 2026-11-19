// Slowlife Family Farm — small behaviours: menu, films, short clips.
(function () {
  // Menu button
  var btn = document.querySelector('[data-menu-button]');
  var menu = document.getElementById('menu');
  if (btn && menu) {
    var setOpen = function (open) {
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? 'Close ✕' : 'Menu ☰';
    };
    btn.addEventListener('click', function () { setOpen(menu.hidden); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
  }

  // YouTube films: show our own photo first, load the real player on tap.
  document.querySelectorAll('a.yt[data-yt]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var box = document.createElement('div');
      box.className = a.className + ' is-playing';
      box.style.aspectRatio = a.dataset.ratio || '16 / 9';
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + a.dataset.yt + '?autoplay=1&playsinline=1&rel=0';
      f.title = a.getAttribute('aria-label') || 'Film from Slowlife Family Farm';
      f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      box.appendChild(f);
      a.replaceWith(box);
    });
  });

  // Short silent clips: play only while on screen, so the page stays fast.
  var clips = document.querySelectorAll('video[data-clip]');
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (clips.length && 'IntersectionObserver' in window && !still) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else { v.pause(); }
      });
    }, { rootMargin: '200px 0px', threshold: 0.15 });
    clips.forEach(function (v) { v.muted = true; io.observe(v); });
  }
})();
