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

  // Hero film: starts by itself, silent (browsers only allow silent autoplay).
  // Tapping it loads the full player with sound (handled above).
  var heroFilm = document.querySelector('a.yt[data-autoplay]');
  var saveData = navigator.connection && navigator.connection.saveData;
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (heroFilm && !saveData && !calm) {
    var id = heroFilm.dataset.yt;
    var bg = document.createElement('iframe');
    bg.className = 'yt-bg';
    bg.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&mute=1&controls=0&loop=1&playlist=' + id + '&playsinline=1&rel=0&modestbranding=1&disablekb=1&iv_load_policy=3&enablejsapi=1';
    bg.allow = 'autoplay; encrypted-media';
    bg.setAttribute('tabindex', '-1');
    bg.setAttribute('aria-hidden', 'true');
    bg.title = '';
    heroFilm.insertBefore(bg, heroFilm.querySelector('.yt-play'));
    heroFilm.classList.add('has-bg');

    // Sound: browsers only allow it after the visitor touches the page,
    // so we switch it on at the very first tap anywhere.
    var say = function (func, args) {
      if (!bg.isConnected || !bg.contentWindow) return;
      bg.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: args || [] }), '*');
    };
    var wantSound = false, heroVisible = true;
    var label = heroFilm.querySelector('.yt-label');
    var applySound = function () {
      if (wantSound && heroVisible) { say('unMute'); say('setVolume', [100]); say('playVideo'); }
      else { say('mute'); }
    };
    var firstTouch = function (e) {
      ['click', 'touchend', 'keydown'].forEach(function (t) { document.removeEventListener(t, firstTouch, true); });
      var t = e.target;
      if (t && t.closest && t.closest('a.yt, video')) return; // they chose a film themselves: let that one play
      wantSound = true;
      applySound();
      if (label) label.textContent = 'Tap for the full film';
    };
    ['click', 'touchend', 'keydown'].forEach(function (t) { document.addEventListener(t, firstTouch, true); });
    // Quiet again once the film is scrolled off the screen, or another film is started.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { heroVisible = en[0].isIntersecting; applySound(); }, { threshold: 0.25 }).observe(heroFilm);
    }
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a.yt, video[controls]')) { wantSound = false; applySound(); }
    }, true);
  }

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
  // ---------- Review widgets (Trustindex) ----------
  // We cannot edit the widget itself, so we tidy it after it loads. This works whether
  // the widget sits in the page or inside a shadow root, and does not rely on its class names.
  var REVIEWS = 'https://search.google.com/local/reviews?placeid=ChIJKTmjqG7PExMRBcpVudgLpWw';
  var mainEl = document.querySelector('main');

  var walk = function (root, cb) {
    var all = root.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      cb(all[i]);
      if (all[i].shadowRoot) walk(all[i].shadowRoot, cb);
    }
  };
  var up = function (el) { return el.parentElement || (el.getRootNode && el.getRootNode().host) || null; };
  var hide = function (el) { el.style.setProperty('display', 'none', 'important'); };
  var inBadge = function (el) {
    var top = el, p;
    while ((p = up(top)) && p !== document.body) {
      if (p.classList && p.classList.contains('reviews-badge')) return true;
      if (p.classList && p.classList.contains('reviews-list')) return false;
      top = p;
    }
    return !!(mainEl && !mainEl.contains(top) && (mainEl.compareDocumentPosition(top) & Node.DOCUMENT_POSITION_FOLLOWING));
  };

  var tidyReviews = function () {
    walk(document, function (el) {
      if (el.children.length || !/^\s*write\s+a\s+review\s*$/i.test(el.textContent || '')) return;
      if (el.closest('main > section:not(#reviews), header, footer')) return; // never touch our own page text
      // 1. Hide the "Write a review" button itself.
      var btn = el.closest('a, button') || el;
      hide(btn);
      // 2. Find the small summary box around it ("5.0 · Excellent · 659 reviews").
      var box = btn, p;
      while ((p = box.parentElement) && (p.textContent || '').trim().length < 160 && !/reviews-(list|badge|widget)/.test(p.className || '')) box = p;
      if (box === btn) return;
      if (inBadge(box)) {
        // Bottom of the page: keep only the summary box, centered.
        var node = box;
        while ((p = node.parentElement) && !/reviews-badge/.test(p.className || '') && p !== document.body) {
          Array.prototype.forEach.call(p.children, function (sib) { if (sib !== node && !/^(STYLE|LINK|SCRIPT)$/.test(sib.tagName)) hide(sib); });
          node = p;
        }
        box.style.setProperty('margin', '0 auto', 'important');
        box.style.setProperty('text-align', 'center', 'important');
      } else {
        // Reviews section: show the reviews without the summary box.
        hide(box);
      }
    });
  };
  if (document.querySelector('.reviews-widget')) {
    var tries = 0;
    var timer = setInterval(function () { tidyReviews(); if (++tries > 60) clearInterval(timer); }, 500);
    if ('MutationObserver' in window) {
      var pending = false;
      new MutationObserver(function () {
        if (pending) return; pending = true;
        setTimeout(function () { pending = false; tidyReviews(); }, 200);
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  // Any link that would go to Trustindex opens our Google reviews (to read) instead.
  document.addEventListener('click', function (e) {
    var path = e.composedPath ? e.composedPath() : [e.target];
    for (var i = 0; i < path.length; i++) {
      var n = path[i];
      if (n && n.tagName === 'A' && /trustindex/i.test((n.getAttribute('href') || '') + (n.getAttribute('data-href') || ''))) {
        e.preventDefault();
        e.stopPropagation();
        window.open(REVIEWS, '_blank', 'noopener');
        return;
      }
    }
  }, true);
})();
