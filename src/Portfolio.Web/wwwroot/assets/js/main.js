/* Portfolio Nicolas Lafuente
   Effets : intro, lettres animées, révélations au scroll, curseur, boutons magnétiques,
   aperçus live des projets (qui défilent au survol), inclinaison 3D, barre de progression,
   navigation qui se masque, horloge, formulaire relié à l'API C#. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var clamp = function (v, min, max) { return Math.min(max, Math.max(min, v)); };

  /* ---------------------------------------------------------------- Lettres */
  function splitText() {
    document.querySelectorAll('[data-split]').forEach(function (el) {
      var text = el.textContent;
      el.setAttribute('aria-label', text);
      el.textContent = '';
      var i = 0;
      text.split(' ').forEach(function (word, w, words) {
        var wordSpan = document.createElement('span');
        wordSpan.style.display = 'inline-block';
        wordSpan.style.whiteSpace = 'nowrap';
        wordSpan.setAttribute('aria-hidden', 'true');
        Array.from(word).forEach(function (ch) {
          var c = document.createElement('span');
          c.className = 'char';
          c.textContent = ch;
          c.style.setProperty('--i', i++);
          wordSpan.appendChild(c);
        });
        el.appendChild(wordSpan);
        if (w < words.length - 1) el.appendChild(document.createTextNode(' '));
      });
    });
    var second = document.querySelector('.hero__title .line--indent');
    if (second) second.style.setProperty('--base', '180ms');
  }

  /* ---------------------------------------------------------------- Intro */
  function runIntro(done) {
    var intro = document.getElementById('intro');
    var seen = false;
    try { seen = sessionStorage.getItem('intro-seen') === '1'; } catch (e) { /* ignore */ }

    if (!intro || seen || reduceMotion) {
      if (intro) intro.classList.add('is-gone');
      done();
      return;
    }

    var count = document.getElementById('intro-count');
    var start = performance.now();
    var duration = 1300;
    (function tick(now) {
      var p = clamp((now - start) / duration, 0, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      if (count) count.textContent = String(Math.round(eased * 100)).padStart(2, '0');
      if (p < 1) { requestAnimationFrame(tick); return; }
      intro.classList.add('is-done');
      setTimeout(done, 350);
      setTimeout(function () { intro.classList.add('is-gone'); }, 1100);
      try { sessionStorage.setItem('intro-seen', '1'); } catch (e) { /* ignore */ }
    })(start);
  }

  /* ---------------------------------------------------------------- Révélations */
  function initReveal() {
    var targets = document.querySelectorAll('[data-reveal], .contact__title');
    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (t) { t.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* ---------------------------------------------------------------- Navigation */
  function initNav() {
    var nav = document.getElementById('nav');
    var bar = document.getElementById('progress');
    var lastY = window.scrollY;
    var ticking = false;

    function update() {
      var y = window.scrollY;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
      nav.classList.toggle('is-scrolled', y > 30);
      var goingDown = y > lastY + 4;
      var goingUp = y < lastY - 4;
      if (goingDown && y > 300) nav.classList.add('is-hidden');
      else if (goingUp) nav.classList.remove('is-hidden');
      lastY = y;
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ---------------------------------------------------------------- Horloge */
  function initClock() {
    var el = document.getElementById('clock');
    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
    if (!el) return;
    var fmt;
    try { fmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }); }
    catch (e) { fmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
    function tick() { el.textContent = fmt.format(new Date()); }
    tick();
    setInterval(tick, 15000);
  }

  /* ---------------------------------------------------------------- Curseur + halo */
  function initPointerEffects() {
    var orb = document.getElementById('orb');
    var cursor = document.querySelector('.cursor');
    var dot = cursor && cursor.querySelector('.cursor__dot');
    var ring = cursor && cursor.querySelector('.cursor__ring');
    var label = cursor && cursor.querySelector('.cursor__label');

    var mx = window.innerWidth * 0.7, my = window.innerHeight * 0.3;
    var rx = mx, ry = my, ox = mx, oy = my;
    var useCursor = finePointer && !reduceMotion && cursor;

    if (useCursor) document.body.classList.add('has-cursor');

    window.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (useCursor) {
        dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
        cursor.classList.remove('is-hidden');
      }
    }, { passive: true });
    document.addEventListener('pointerleave', function () { if (useCursor) cursor.classList.add('is-hidden'); });

    if (useCursor) {
      document.addEventListener('pointerover', function (e) {
        var view = e.target.closest('[data-cursor]');
        var hover = e.target.closest('a, button, [data-magnetic], input, textarea, label');
        cursor.classList.toggle('is-view', !!view);
        cursor.classList.toggle('is-hover', !view && !!hover);
        if (view && label) label.textContent = view.getAttribute('data-cursor') || 'Voir';
      });
    }

    if (reduceMotion) return;
    (function loop() {
      if (useCursor) {
        rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18);
        ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      }
      if (orb) {
        ox = lerp(ox, mx, 0.05); oy = lerp(oy, my + window.scrollY * 0.25, 0.05);
        orb.style.transform = 'translate3d(' + ox + 'px,' + oy + 'px,0)';
      }
      requestAnimationFrame(loop);
    })();
  }

  /* ---------------------------------------------------------------- Boutons magnétiques */
  function initMagnetic() {
    if (!finePointer || reduceMotion) return;
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      var strength = el.classList.contains('btn') ? 0.28 : 0.4;
      el.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1)';
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) * strength;
        var y = (e.clientY - (r.top + r.height / 2)) * strength;
        el.style.transition = 'transform .15s linear';
        el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      });
      el.addEventListener('pointerleave', function () {
        el.style.transition = 'transform .8s cubic-bezier(.16,1,.3,1)';
        el.style.transform = '';
      });
    });
  }

  /* ---------------------------------------------------------------- Aperçus live des projets */
  function initPreviews() {
    var screens = document.querySelectorAll('[data-preview]');
    var BASE_W = 1440;

    function fit(screen) {
      var frame = screen.querySelector('iframe');
      if (!frame) return;
      var scale = screen.clientWidth / BASE_W;
      frame.style.setProperty('--scale', scale);
      frame.style.height = Math.ceil(screen.clientHeight / scale) + 'px';
    }

    function load(screen) {
      if (screen.dataset.loaded) return;
      screen.dataset.loaded = '1';
      var sk = document.createElement('div');
      sk.className = 'skeleton';
      screen.appendChild(sk);
      var frame = document.createElement('iframe');
      frame.src = screen.getAttribute('data-preview');
      frame.title = 'Aperçu du site';
      frame.setAttribute('tabindex', '-1');
      frame.setAttribute('aria-hidden', 'true');
      frame.setAttribute('loading', 'lazy');
      frame.addEventListener('load', function () {
        frame.classList.add('is-loaded');
        setTimeout(function () { sk.remove(); }, 800);
      });
      screen.appendChild(frame);
      fit(screen);
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { load(en.target); io.unobserve(en.target); } });
      }, { rootMargin: '300px 0px' });
      screens.forEach(function (s) { io.observe(s); });
    } else {
      screens.forEach(load);
    }

    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(function (entries) { entries.forEach(function (en) { fit(en.target); }); });
      screens.forEach(function (s) { ro.observe(s); });
    } else {
      window.addEventListener('resize', function () { screens.forEach(fit); });
    }

    // Au survol, l'aperçu défile doucement pour montrer toute la page d'accueil.
    if (reduceMotion) return;
    document.querySelectorAll('.project__shot').forEach(function (shot) {
      var screen = shot.querySelector('[data-preview]');
      var raf = null, target = 0, current = 0;

      function win() {
        var f = screen && screen.querySelector('iframe');
        try { return f && f.contentWindow && f.contentWindow.document ? f.contentWindow : null; }
        catch (e) { return null; } // page ouverte sans serveur : on ignore
      }
      function step() {
        var w = win();
        if (!w) { raf = null; return; }
        current = lerp(current, target, 0.035);
        w.scrollTo(0, current);
        if (Math.abs(current - target) > 0.5) raf = requestAnimationFrame(step);
        else raf = null;
      }
      function go(toBottom) {
        var w = win();
        if (!w) return;
        var doc = w.document.documentElement;
        current = w.scrollY;
        target = toBottom ? Math.max(0, doc.scrollHeight - w.innerHeight) * 0.55 : 0;
        if (!raf) raf = requestAnimationFrame(step);
      }
      shot.addEventListener('pointerenter', function () { go(true); });
      shot.addEventListener('pointerleave', function () { go(false); });
    });
  }

  /* ---------------------------------------------------------------- Inclinaison 3D */
  function initTilt() {
    if (!finePointer || reduceMotion) return;
    document.querySelectorAll('.project__shot').forEach(function (shot) {
      var frame = shot.querySelector('.frame');
      shot.addEventListener('pointermove', function (e) {
        var r = shot.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        frame.style.setProperty('--ry', (px * 6).toFixed(2) + 'deg');
        frame.style.setProperty('--rx', (-py * 5).toFixed(2) + 'deg');
      });
      shot.addEventListener('pointerleave', function () {
        frame.style.setProperty('--ry', '0deg');
        frame.style.setProperty('--rx', '0deg');
      });
    });
  }

  /* ---------------------------------------------------------------- Copier */
  function initCopy() {
    document.querySelectorAll('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy');
        function ok() {
          btn.textContent = 'Copié';
          setTimeout(function () { btn.textContent = 'Copier'; }, 1600);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(ok, function () { btn.textContent = 'Sélectionnez le texte'; });
        } else {
          btn.textContent = 'Sélectionnez le texte';
        }
      });
    });
  }

  /* ---------------------------------------------------------------- Formulaire */
  function initForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;
    var status = document.getElementById('form-status');
    var button = form.querySelector('button[type="submit"]');
    var label = button.querySelector('.btn__label');

    var rules = {
      name: function (v) { return v.length >= 2 && v.length <= 80 ? '' : 'Indiquez votre nom (2 à 80 caractères).'; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Cette adresse email ne semble pas valide.'; },
      message: function (v) { return v.length >= 10 && v.length <= 3000 ? '' : 'Votre message doit faire entre 10 et 3 000 caractères.'; }
    };

    function setError(name, msg) {
      var slot = form.querySelector('[data-error="' + name + '"]');
      var field = slot && slot.closest('.field');
      if (slot) slot.textContent = msg || '';
      if (field) field.classList.toggle('has-error', !!msg);
    }
    function setStatus(msg, kind) {
      status.textContent = msg;
      status.className = 'form__status' + (kind ? ' is-' + kind : '');
    }

    Object.keys(rules).forEach(function (name) {
      form.elements[name].addEventListener('blur', function () {
        if (this.value.trim()) setError(name, rules[name](this.value.trim()));
      });
      form.elements[name].addEventListener('input', function () { setError(name, ''); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        message: form.elements.message.value.trim(),
        website: form.elements.website.value
      };

      var hasError = false;
      Object.keys(rules).forEach(function (name) {
        var msg = rules[name](data[name]);
        setError(name, msg);
        if (msg) hasError = true;
      });
      if (hasError) { setStatus('Vérifiez les champs en rouge.', 'error'); return; }

      button.disabled = true;
      button.classList.add('is-loading');
      label.textContent = 'Envoi en cours';
      setStatus('', '');

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          if (res.ok) return { ok: true };
          return res.json().catch(function () { return {}; }).then(function (body) {
            return { ok: false, status: res.status, body: body };
          });
        })
        .then(function (result) {
          if (result.ok) {
            form.reset();
            setStatus('Merci, votre message est bien arrivé. Je vous réponds très vite.', 'success');
            label.textContent = 'Message envoyé';
            return;
          }
          if (result.status === 400 && result.body && result.body.errors) {
            Object.keys(result.body.errors).forEach(function (k) {
              setError(k.toLowerCase(), result.body.errors[k][0]);
            });
            setStatus('Vérifiez les champs en rouge.', 'error');
          } else if (result.status === 429) {
            setStatus('Trop de messages envoyés. Réessayez dans quelques minutes, ou écrivez-moi directement par email.', 'error');
          } else {
            setStatus("Le message n'a pas pu être envoyé. Écrivez-moi directement à lafuentenicolas1@gmail.com.", 'error');
          }
          label.textContent = 'Envoyer le message';
        })
        .catch(function () {
          setStatus("Le serveur ne répond pas. Écrivez-moi directement à lafuentenicolas1@gmail.com.", 'error');
          label.textContent = 'Envoyer le message';
        })
        .then(function () {
          button.disabled = false;
          button.classList.remove('is-loading');
        });
    });
  }

  /* ---------------------------------------------------------------- Démarrage */
  splitText();
  initNav();
  initClock();
  initPointerEffects();
  initMagnetic();
  initPreviews();
  initTilt();
  initCopy();
  initForm();
  runIntro(function () {
    root.classList.add('is-ready');
    initReveal();
  });
})();
