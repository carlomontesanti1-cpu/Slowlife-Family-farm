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
  // Only one film is ever heard at a time: a playing film pauses as soon as it scrolls off the
  // screen, and when the visitor starts another film.
  var tellYT = function (frame, func) {
    if (frame && frame.isConnected && frame.contentWindow) {
      frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: [] }), '*');
    }
  };
  var pauseOtherFilms = function (except) {
    document.querySelectorAll('.yt.is-playing iframe').forEach(function (fr) { if (fr !== except) tellYT(fr, 'pauseVideo'); });
  };
  var offScreenWatcher = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) tellYT(en.target.querySelector('iframe'), 'pauseVideo');
    });
  }, { threshold: 0.2 }) : null;
  document.querySelectorAll('a.yt[data-yt]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      pauseOtherFilms(null);
      var box = document.createElement('div');
      box.className = a.className + ' is-playing';
      box.style.aspectRatio = a.dataset.ratio || '16 / 9';
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + a.dataset.yt + '?autoplay=1&playsinline=1&rel=0&enablejsapi=1';
      f.title = a.getAttribute('aria-label') || 'Film from Slowlife Family Farm';
      f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      box.appendChild(f);
      a.replaceWith(box);
      if (offScreenWatcher) offScreenWatcher.observe(box);
    });
  });

  // Films that start by themselves (marked data-autoplay or data-autoplay-quiet).
  // They begin silent, because browsers only allow sound after the visitor touches the page.
  // From the first touch on, the film that is on screen plays its sound; the others stay quiet.
  // Tapping a film still opens the full player with sound and controls (handled above).
  var autoFilms = Array.prototype.slice.call(document.querySelectorAll('a.yt[data-autoplay], a.yt[data-autoplay-quiet]'));
  var saveData = navigator.connection && navigator.connection.saveData;
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (autoFilms.length && 'IntersectionObserver' in window && !saveData && !calm) {
    var soundOn = false;
    var seen = new Map(); // film link -> how much of it is on screen (0 to 1)
    var say = function (frame, func, args) {
      if (!frame || !frame.isConnected || !frame.contentWindow) return;
      frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: args || [] }), '*');
    };
    var applySound = function () {
      var best = null, bestRatio = 0.5;
      autoFilms.forEach(function (a) {
        var r = a.isConnected ? (seen.get(a) || 0) : 0;
        if (r >= bestRatio && a.querySelector('.yt-bg')) { best = a; bestRatio = r; }
      });
      autoFilms.forEach(function (a) {
        var fr = a.querySelector('.yt-bg');
        if (!fr) return;
        if (soundOn && a === best) { say(fr, 'unMute'); say(fr, 'setVolume', [100]); say(fr, 'playVideo'); }
        else {
          say(fr, 'mute');
          // on screen: keep playing quietly; scrolled past: stop
          if ((seen.get(a) || 0) > 0) say(fr, 'playVideo'); else say(fr, 'pauseVideo');
        }
      });
    };
    var startFilm = function (a) {
      if (!a.isConnected || a.querySelector('.yt-bg')) return;
      var id = a.dataset.yt, fr = document.createElement('iframe');
      fr.className = 'yt-bg';
      fr.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&mute=1&controls=0&loop=1&playlist=' + id + '&playsinline=1&rel=0&modestbranding=1&disablekb=1&iv_load_policy=3&enablejsapi=1';
      fr.allow = 'autoplay; encrypted-media';
      fr.setAttribute('tabindex', '-1');
      fr.setAttribute('aria-hidden', 'true');
      fr.title = '';
      fr.addEventListener('load', function () { [300, 1200, 2500].forEach(function (ms) { setTimeout(applySound, ms); }); });
      a.insertBefore(fr, a.querySelector('.yt-play'));
      a.classList.add('has-bg');
    };
    // Load each film shortly before it scrolls into view (the first one on the page loads at once).
    var loader = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { startFilm(en.target); loader.unobserve(en.target); } });
    }, { rootMargin: '300px 0px' });
    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { seen.set(en.target, en.isIntersecting ? en.intersectionRatio : 0); });
      applySound();
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    autoFilms.forEach(function (a) {
      if (a.hasAttribute('data-autoplay')) startFilm(a); else loader.observe(a);
      watcher.observe(a);
    });
    var firstTouch = function (e) {
      ['click', 'touchend', 'keydown'].forEach(function (t) { document.removeEventListener(t, firstTouch, true); });
      var t = e.target;
      if (t && t.closest && t.closest('a.yt, video')) return; // they chose a film themselves: let that one play
      soundOn = true;
      applySound();
      autoFilms.forEach(function (a) { var l = a.querySelector('.yt-label'); if (l && /tap for sound/i.test(l.textContent)) l.textContent = 'Tap for the full film'; });
    };
    ['click', 'touchend', 'keydown'].forEach(function (t) { document.addEventListener(t, firstTouch, true); });
    // If the visitor starts any film themselves, the automatic sound steps aside.
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a.yt, video[controls]')) { soundOn = false; applySound(); }
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

  // Footer Google rating: clear Google's gray box (also inside the widget's own shadow DOM), so it sits on white.
  (function () {
    var boxes = document.querySelectorAll('.reviews-badge'); if (!boxes.length) return;
    var clear = function (root) {
      var all = root.querySelectorAll('*');
      for (var i = 0; i < all.length; i++) {
        var el = all[i], bg = getComputedStyle(el).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && el.tagName !== 'IMG') {
          el.style.setProperty('background-color', 'transparent', 'important');
          el.style.setProperty('box-shadow', 'none', 'important');
        }
        if (el.shadowRoot) clear(el.shadowRoot);
      }
    };
    var n = 0, timer = setInterval(function () {
      boxes.forEach(clear);
      if (++n > 20) clearInterval(timer);
    }, 700);
  })();
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
      if (!el.closest('.reviews-widget') && el.closest('main > section:not(#reviews), header, footer')) return; // never touch our own page text
      // 1. Hide the "Write a review" button itself.
      var btn = el.closest('a, button') || el;
      hide(btn);
      // 2. Find the small summary box around it ("5.0 · Excellent · 659 reviews").
      var box = btn, p;
      while ((p = box.parentElement) && (p.textContent || '').trim().length < 160 && !/reviews-(list|badge|widget)/.test(p.className || '')) box = p;
      if (box === btn) return;
      var p0 = box, full = false;
      while ((p0 = up(p0)) && p0 !== document.body) { if (p0.classList && p0.classList.contains('reviews-full')) { full = true; break; } }
      if (full) {
        // Under the first Book Now: keep the summary (rating and number of reviews) and the reviews,
        // and make the summary a link to our Google reviews.
        if (!box.dataset.linked) {
          box.dataset.linked = '1';
          box.style.cursor = 'pointer';
          box.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); window.open(REVIEWS, '_blank', 'noopener'); }, true);
        }
        return;
      }
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

  // The Google rating boxes (top strip and footer) are clickable as a whole: they open our Google reviews.
  document.querySelectorAll('.reviews-badge, .top-rating').forEach(function (box) {
    box.style.cursor = 'pointer';
    box.setAttribute('role', 'link');
    box.setAttribute('tabindex', '0');
    var go = function () { window.open(REVIEWS, '_blank', 'noopener'); };
    box.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); go(); }, true);
    box.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
  });

  // Any link that would go to Trustindex opens our Google reviews (to read) instead.
  document.addEventListener('click', function (e) {
    var path = e.composedPath ? e.composedPath() : [e.target];
    for (var i = 0; i < path.length; i++) {
      var n = path[i];
      var isTiLink = n && n.tagName === 'A' && /trustindex/i.test((n.getAttribute('href') || '') + (n.getAttribute('data-href') || ''));
      // The "Verified by Trustindex" label stays visible, but a tap on it also goes to our Google reviews.
      var isVerified = n && n.nodeType === 1 && (n.textContent || '').length < 60 && /verified by trustindex/i.test(n.textContent || '');
      if (isTiLink || isVerified) {
        e.preventDefault();
        e.stopPropagation();
        window.open(REVIEWS, '_blank', 'noopener');
        return;
      }
    }
  }, true);
  // Our own clips that carry sound.
  // Browsers decide whether sound may start without a touch; a page cannot override that. So we
  // (1) try to start the first film with sound straight away, and if the browser refuses,
  // (2) keep trying at every touch, tap, click or key press until the sound is allowed.
  // From then on the clip that is on screen plays with sound and the others stay quiet.
  // Tapping a clip switches its own sound off and on.
  var soundClips = Array.prototype.slice.call(document.querySelectorAll('.clip-sound'));
  if (soundClips.length) {
    var allowed = false;                 // has the browser let us play sound yet?
    var state = new Map();               // box -> { visible, userMuted }
    var paint = function (box, on) {
      var label = box.querySelector('[data-sound-toggle]');
      if (!label) return;
      if (label.classList.contains('sound-icon')) {
        label.setAttribute('aria-label', on ? 'Mute the film' : 'Play the film with sound');
        label.classList.toggle('is-on', on);
      } else {
        label.textContent = on ? 'Sound on · tap to mute' : 'Tap for sound';
      }
    };
    var syncClip = function (box) {
      var v = box.querySelector('video'), st = state.get(box);
      var want = st.visible && !st.userMuted;
      if (!want) { v.muted = true; paint(box, false); return Promise.resolve(false); }
      v.muted = false;
      var p = v.play();
      if (!p || !p.then) { allowed = true; paint(box, true); return Promise.resolve(true); }
      return p.then(function () { allowed = true; paint(box, !v.muted); return true; })
              .catch(function () { v.muted = true; paint(box, false); var q = v.play(); if (q && q.catch) q.catch(function () {}); return false; });
    };
    var EVENTS = ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click', 'keydown'];
    var tryAll = function (e) {
      if (e && e.target && e.target.closest && e.target.closest('.clip-sound')) return; // the clip's own tap handles it
      var shown = soundClips.filter(function (b) { return state.get(b).visible; });
      if (!shown.length) return;
      Promise.all(shown.map(syncClip)).then(function () {
        if (allowed) EVENTS.forEach(function (t) { document.removeEventListener(t, tryAll, true); });
      });
    };
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a.yt')) { soundClips.forEach(function (b) { state.get(b).userMuted = true; syncClip(b); }); }
    }, true);
    soundClips.forEach(function (box) {
      state.set(box, { visible: false, userMuted: false });
      box.addEventListener('click', function () {
        var st = state.get(box), v = box.querySelector('video');
        if (typeof pauseOtherFilms === 'function') pauseOtherFilms(null);
        st.visible = true;
        st.userMuted = allowed ? !v.muted : false;
        syncClip(box);
      });
    });
    if ('IntersectionObserver' in window) {
      var sio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var st = state.get(en.target);
          st.visible = en.isIntersecting;
          if (!st.visible) { en.target.querySelector('video').muted = true; paint(en.target, false); }
          else { syncClip(en.target); }   // tries with sound; falls back to silent if the browser says no
        });
      }, { threshold: 0.5 });
      soundClips.forEach(function (box) { sio.observe(box); });
    }
    EVENTS.forEach(function (t) { document.addEventListener(t, tryAll, true); });
  }
  // Menu: mark the page the visitor is on.
  var here = (location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('.topbar .nav a, .menu a, .footer-nav a').forEach(function (a) {
    var href = a.getAttribute('href') || '';
    if (href.indexOf('#') === -1 && href === here) a.setAttribute('aria-current', 'page');
  });
})();

/* Old Table: choose a seat */
(function () {
  var wrap = document.querySelector('.seat-table');
  if (!wrap) return;
  var card = wrap.querySelector('.seat-card');
  var seats = wrap.querySelectorAll('.seat');
  seats.forEach(function (b) {
    b.addEventListener('click', function () {
      seats.forEach(function (o) { o.classList.remove('is-on'); o.setAttribute('aria-pressed', 'false'); });
      b.classList.add('is-on'); b.setAttribute('aria-pressed', 'true');
      card.querySelector('h3').textContent = b.getAttribute('data-title');
      card.querySelector('p').textContent = b.getAttribute('data-text');
      card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
    });
  });
})();
