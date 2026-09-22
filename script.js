(function () {
  "use strict";

  var SCENES = ["lang", "seal", "couple", "manas", "mehndi", "haldi", "wedding", "stars", "final"];

  // Scenes that carry a one-time entrance particle effect (Mehndi leaves,
  // Haldi powder, Shubh Vivah petals). Re-plays every time the scene is
  // freshly entered, forward or backward — never continuously.
  var EFFECT_SCENES = { mehndi: "leaf", haldi: "powder", wedding: "petal" };

  var TRANSITION_MS = 900;              // matches the CSS transition duration below
  var reducedMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) TRANSITION_MS = 220;

  // Language is intentionally NOT persisted across page loads — every
  // fresh open/reload of the invitation must start at Page 1 (language
  // selection), per spec. state.lang only tracks the current session's
  // in-memory choice while the page stays open.
  var state = {
    lang: null,
    index: 0,
    sealOpened: false,
    transitioning: false
  };

  var els = {
    scenes: {},
    app: document.getElementById("app"),
    backBtn: document.getElementById("backBtn"),
    musicToggle: document.getElementById("musicToggle"),
    music: document.getElementById("bgMusic"),
    inviteCard: document.getElementById("inviteCard"),
    veil: document.getElementById("transitionVeil")
  };
  SCENES.forEach(function (key) {
    els.scenes[key] = document.querySelector('[data-scene="' + key + '"]');
  });

  /* ------------------------------------------------------------
     TEXT POPULATION — reads WEDDING_CONFIG, writes into DOM
  ------------------------------------------------------------ */
  function applyLanguage(lang) {
    document.documentElement.setAttribute("data-lang", lang);
    var copy = WEDDING_CONFIG.copy[lang];

    document.querySelectorAll("[data-text]").forEach(function (node) {
      var key = node.getAttribute("data-text");
      if (copy[key] !== undefined) node.textContent = copy[key];
    });

    document.querySelectorAll("[data-text-name]").forEach(function (node) {
      var who = node.getAttribute("data-text-name");
      var value = lang === "hi"
        ? (who === "groom" ? WEDDING_CONFIG.couple.groomHi : WEDDING_CONFIG.couple.brideHi)
        : (who === "groom" ? WEDDING_CONFIG.couple.groom : WEDDING_CONFIG.couple.bride);
      node.textContent = value;
    });

    document.querySelectorAll("[data-event]").forEach(function (node) {
      var evKey = node.getAttribute("data-event");
      var field = node.getAttribute("data-field");
      var ev = WEDDING_CONFIG.events[evKey];
      if (!ev) return;
      if (field === "address") {
        var addr = ev.address ? ev.address[lang] : WEDDING_CONFIG.homeAddress[lang];
        node.textContent = addr;
      } else if (ev[field] !== undefined) {
        node.textContent = ev[field][lang];
      }
    });

    document.querySelectorAll('[data-address="home"]').forEach(function (node) {
      node.textContent = WEDDING_CONFIG.homeAddress[lang];
    });

    var parents = WEDDING_CONFIG.parents[lang];
    document.querySelectorAll("[data-parent]").forEach(function (node) {
      var who = node.getAttribute("data-parent");
      node.textContent = who === "groom" ? parents.groomLine : parents.brideLine;
    });

    els.backBtn.querySelector(".back-btn__label").textContent = copy.back;
    document.documentElement.setAttribute("lang", lang === "hi" ? "hi" : "en");

    var namesList = lang === "hi" ? WEDDING_CONFIG.littleStars.namesHi : WEDDING_CONFIG.littleStars.names;
    var starsNode = document.getElementById("starsNames");
    if (starsNode && namesList && namesList.length >= 6) {
      var line1 = namesList.slice(0, 3).join(" \u00B7 ");
      var line2 = namesList.slice(3, 6).join(" \u00B7 ");
      starsNode.textContent = line1 + "\n" + line2;
    }

    (WEDDING_CONFIG.contacts || []).forEach(function (person, i) {
      var row = document.getElementById("contactRow" + i);
      if (!row) return;
      row.innerHTML = "";
      var link = document.createElement("a");
      link.href = "tel:" + person.phone.replace(/\s+/g, "");
      link.textContent = person.name + " \u00B7 " + person.phone;
      link.addEventListener("click", function (e) { e.stopPropagation(); });
      row.appendChild(link);
    });
  }

  /* ------------------------------------------------------------
     CINEMATIC SCENE TRANSITIONS
     ------------------------------------------------------------
     Forward (direction 1): current scene lifts up + fades + softens;
     next scene rises in from below, sharpening into focus.
     Backward (direction -1): mirrored — previous scene settles in from
     above, current scene eases down and out.
     A brief light veil sweeps across the screen partway through, and
     (only on the relevant event scenes) a short decorative particle
     effect plays once the new scene has arrived.
  ------------------------------------------------------------ */
  var DIR_CLASSES = ["enter-below", "enter-above", "exit-up", "exit-down"];

  function clearDirClasses(el) {
    el.classList.remove("is-transitioning");
    DIR_CLASSES.forEach(function (c) { el.classList.remove(c); });
  }

  function goTo(index, opts) {
    index = Math.max(0, Math.min(SCENES.length - 1, index));
    if (index === state.index || state.transitioning) return;

    var prevKey = SCENES[state.index];
    var nextKey = SCENES[index];
    var direction = index > state.index ? 1 : -1;
    var curEl = els.scenes[prevKey];
    var nextEl = els.scenes[nextKey];

    state.transitioning = true;
    state.index = index;
    els.backBtn.hidden = index <= 1; // hidden on language + sealed-invitation scenes

    clearDirClasses(curEl);
    clearDirClasses(nextEl);

    if (reducedMotion) {
      // Simple, fast crossfade — navigation stays fully usable, just
      // without the elaborate depth/blur choreography.
      curEl.classList.remove("is-active");
      nextEl.classList.add("is-active");
      finishTransition(curEl, nextKey, direction);
      return;
    }

    // Reset any inner scroll position on the incoming scene so it always
    // opens from its top, never mid-scroll from a previous visit.
    var innerNext = nextEl.querySelector(".scene__inner");
    if (innerNext) innerNext.scrollTop = 0;

    // Step 1: place the incoming scene at its off-screen starting point,
    // instantly (no transition), so the animated step that follows has
    // something to animate *from*.
    nextEl.classList.add(direction === 1 ? "enter-below" : "enter-above");
    // Force layout so the browser commits the starting transform before
    // we flip to the animated end-state on the next frame.
    void nextEl.offsetWidth;

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        curEl.classList.add("is-transitioning");
        nextEl.classList.add("is-transitioning");

        curEl.classList.remove("is-active");
        curEl.classList.add(direction === 1 ? "exit-up" : "exit-down");

        nextEl.classList.remove(direction === 1 ? "enter-below" : "enter-above");
        nextEl.classList.add("is-active");

        sweepVeil();
      });
    });

    setTimeout(function () { finishTransition(curEl, nextKey, direction); }, TRANSITION_MS + 40);
  }

  function finishTransition(curEl, nextKey, direction) {
    clearDirClasses(curEl);
    els.scenes[nextKey].classList.remove("is-transitioning");
    state.transitioning = false;
    playSceneEffect(nextKey);
  }

  function sweepVeil() {
    if (!els.veil) return;
    els.veil.classList.remove("is-active");
    void els.veil.offsetWidth;
    els.veil.classList.add("is-active");
  }

  function indexOf(key) { return SCENES.indexOf(key); }
  function next() { if (state.index < SCENES.length - 1) goTo(state.index + 1); }
  function prev() {
    if (state.index <= 0) return;
    var target = state.index - 1;
    if (target === indexOf("seal") && state.sealOpened) {
      target = indexOf("lang");
      state.sealOpened = false;
      if (els.inviteCard) els.inviteCard.classList.remove("is-opening");
    }
    goTo(target);
  }

  els.backBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    prev();
  });

  document.querySelectorAll(".lang-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var lang = btn.getAttribute("data-lang");
      state.lang = lang;
      applyLanguage(lang);
      goTo(indexOf("seal"));
    });
  });

  if (els.inviteCard) {
    els.inviteCard.addEventListener("click", function (e) {
      e.stopPropagation();
      if (state.sealOpened) return;
      state.sealOpened = true;
      startMusic();
      if (els.musicToggle) els.musicToggle.hidden = false;
      els.inviteCard.classList.add("is-opening");
      setTimeout(function () { goTo(indexOf("couple")); }, 900);
    });
  }

  /* ------------------------------------------------------------
     SWIPE NAVIGATION
     ------------------------------------------------------------
     Swipe up  -> next scene (or, on a tall scene, scroll its content
                  first; only transitions once already at the bottom).
     Swipe down -> previous scene (mirrored: scrolls up first if not
                  already at the top).
     A gesture is only ever treated as a page-transition gesture once
     we've confirmed (a) the movement is clearly vertical, not
     horizontal, and (b) the active scene is already at the relevant
     scroll boundary (or has no internal scroll at all). Until that's
     confirmed, native scrolling is left completely alone.
     Page 1 (language) and Page 2 (sealed invitation) opt out entirely
     — those are button/tap driven only, unchanged from before.
  ------------------------------------------------------------ */
  var SWIPE_EXCLUDED = { lang: true, seal: true };
  var MOVE_THRESHOLD = 10;   // px before we commit to a direction
  var COMMIT_DISTANCE = 64;  // px — a "deliberate" swipe
  var COMMIT_VELOCITY = 0.5; // px/ms
  var BOUNDARY_TOLERANCE = 14; // px, accounts for mobile rounding

  var touch = { active: false, mode: null, startX: 0, startY: 0, startT: 0, lastY: 0 };

  function touchStart(e) {
    if (state.transitioning) { touch.mode = "ignore"; return; }
    if (e.target.closest("button, a, input, textarea, select")) { touch.mode = "ignore"; return; }
    var key = SCENES[state.index];
    if (SWIPE_EXCLUDED[key]) { touch.mode = "ignore"; return; }

    var t = e.touches[0];
    var scrollEl = els.scenes[key].querySelector(".scene__inner");
    var sh = scrollEl ? scrollEl.scrollHeight : 0;
    var ch = scrollEl ? scrollEl.clientHeight : 0;
    var st = scrollEl ? scrollEl.scrollTop : 0;

    touch.active = true;
    touch.mode = null;
    touch.startX = t.clientX;
    touch.startY = t.clientY;
    touch.lastY = t.clientY;
    touch.startT = Date.now();
    touch.singleScreen = sh <= ch + 2;
    touch.atTop = st <= BOUNDARY_TOLERANCE;
    touch.atBottom = st + ch >= sh - BOUNDARY_TOLERANCE;
  }

  function touchMove(e) {
    if (!touch.active || touch.mode === "ignore") return;
    var t = e.touches[0];
    var dx = t.clientX - touch.startX;
    var dy = t.clientY - touch.startY;
    touch.lastY = t.clientY;

    if (touch.mode === null) {
      if (Math.abs(dy) < MOVE_THRESHOLD && Math.abs(dx) < MOVE_THRESHOLD) return;
      if (Math.abs(dx) > Math.abs(dy) * 1.2) { touch.mode = "ignore"; return; } // horizontal drag
      if (dy < 0) {
        touch.mode = (touch.singleScreen || touch.atBottom) ? "transition-forward" : "scroll";
      } else {
        touch.mode = (touch.singleScreen || touch.atTop) ? "transition-backward" : "scroll";
      }
    }

    if (touch.mode === "transition-forward" || touch.mode === "transition-backward") {
      // Confirmed page-transition gesture at the correct boundary — stop
      // the browser's own rubber-band scroll for the rest of this touch.
      e.preventDefault();
    }
    // mode === "scroll": do nothing; native scrolling proceeds untouched.
  }

  function touchEnd() {
    if (!touch.active) return;
    var dy = touch.lastY - touch.startY;
    var dt = Math.max(1, Date.now() - touch.startT);
    var velocity = Math.abs(dy) / dt;
    var qualifies = Math.abs(dy) > COMMIT_DISTANCE || velocity > COMMIT_VELOCITY;

    if (touch.mode === "transition-forward" && qualifies && dy < 0) {
      markSwiped();
      next();
    } else if (touch.mode === "transition-backward" && qualifies && dy > 0) {
      markSwiped();
      prev();
    }
    touch.active = false;
    touch.mode = null;
  }

  function markSwiped() {
    // Once the visitor has successfully swiped anywhere, the subtle
    // "swipe up" cues fade — they've learned the gesture.
    document.documentElement.classList.add("has-swiped");
  }

  els.app.addEventListener("touchstart", touchStart, { passive: true });
  els.app.addEventListener("touchmove", touchMove, { passive: false });
  els.app.addEventListener("touchend", touchEnd, { passive: true });
  els.app.addEventListener("touchcancel", function () { touch.active = false; touch.mode = null; }, { passive: true });

  /* Keyboard fallback (desktop browsers, external keyboards) — mirrors
     the swipe gesture's own rules: arrow/page keys move forward or back,
     but not past Page 1/2, which stay button-driven only. This is a
     courtesy for anyone previewing the invitation off a touchscreen; it
     does not change the mobile swipe behaviour at all. */
  document.addEventListener("keydown", function (e) {
    if (e.target && e.target.closest && e.target.closest("button, a, input, textarea, select")) return;
    var key = SCENES[state.index];
    if (e.key === "ArrowDown" || e.key === "PageDown") {
      if (!SWIPE_EXCLUDED[key]) { e.preventDefault(); next(); }
    } else if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault(); prev();
    }
  });

  /* ------------------------------------------------------------
     EVENT-SPECIFIC ENTRANCE EFFECTS
     ------------------------------------------------------------
     Lightweight, DOM-based, self-cleaning. Only ever triggered from
     goTo() when that exact scene becomes the active one — never on
     scroll, never continuously. Each effect mixes a couple of small
     shape variants (rather than one repeated shape) and a spread of
     size/blur so a few pieces read as foreground and a few as soft
     background depth.
  ------------------------------------------------------------ */
  var EFFECT_COUNT = { mehndi: 17, haldi: 16, wedding: 18 };
  var TYPE_VARIANTS = {
    leaf:   ["leaf", "leaf", "leaf", "leaf-small", "petal-tiny"],
    powder: ["dot", "dot", "dot", "dot-fine", "blob"],
    petal:  ["petal", "petal", "petal-small", "rose", "garland"]
  };
  var effectTimers = {};

  function playSceneEffect(key) {
    var kind = EFFECT_SCENES[key];
    if (!kind || reducedMotion) return;
    var layer = els.scenes[key].querySelector(".effect-layer");
    if (!layer) return;

    if (effectTimers[key]) { clearTimeout(effectTimers[key]); }
    layer.innerHTML = "";

    var variants = TYPE_VARIANTS[kind];
    var count = EFFECT_COUNT[key] || 14;

    for (var i = 0; i < count; i++) {
      var variant = variants[Math.floor(Math.random() * variants.length)];
      var span = document.createElement("span");
      span.className = "fx-particle fx-particle--" + variant + " fx-drift-" + (1 + (i % 4));

      var left = 3 + Math.random() * 92;
      var delay = (Math.random() * 0.7).toFixed(2);
      var duration = (1.9 + Math.random() * 0.9).toFixed(2);
      span.style.left = left + "%";
      span.style.animationDelay = delay + "s";
      span.style.animationDuration = duration + "s";

      // A third of the pieces sit slightly further "back": smaller,
      // softer and a touch blurred, giving the shower some depth
      // instead of every piece reading at the same distance.
      var isBackground = Math.random() < 0.35;
      var scale = isBackground
        ? (0.55 + Math.random() * 0.35).toFixed(2)
        : (0.85 + Math.random() * 0.55).toFixed(2);
      var rot = Math.round(Math.random() * 150 - 75);

      var inner = document.createElement("i");
      inner.style.transform = "rotate(" + rot + "deg) scale(" + scale + ")";
      inner.style.opacity = isBackground
        ? (0.35 + Math.random() * 0.25).toFixed(2)
        : (0.65 + Math.random() * 0.3).toFixed(2);
      if (isBackground) inner.style.filter = "blur(" + (0.6 + Math.random() * 0.9).toFixed(1) + "px)";

      span.appendChild(inner);
      layer.appendChild(span);
    }

    effectTimers[key] = setTimeout(function () {
      layer.innerHTML = "";
      effectTimers[key] = null;
    }, 3000);
  }

  /* ------------------------------------------------------------
     MUSIC — unchanged from before: starts on the sealed-invitation
     tap only, loops continuously, never restarts on scene changes
     (scene transitions and swipe gestures never touch it).
  ------------------------------------------------------------ */
  var musicRequested = false;
  function startMusic() {
    if (musicRequested || !els.music) return;
    musicRequested = true;
    els.music.volume = 0.4;
    els.music.muted = false;
    var playPromise = els.music.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.then(function () {
        setMusicToggleState(false);
      }).catch(function () {
        musicRequested = false;
        setMusicToggleState(true);
      });
    } else {
      setMusicToggleState(false);
    }
  }

  if (els.music) {
    els.music.addEventListener("ended", function () {
      els.music.currentTime = 0;
      var p = els.music.play();
      if (p && typeof p.catch === "function") p.catch(function () {});
    });
  }

  function setMusicToggleState(isMuted) {
    if (!els.musicToggle) return;
    els.musicToggle.classList.toggle("is-muted", isMuted);
    els.musicToggle.setAttribute("aria-label", isMuted ? "Unmute music" : "Mute music");
  }

  if (els.musicToggle) {
    els.musicToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!els.music) return;
      if (!musicRequested) { startMusic(); return; }
      els.music.muted = !els.music.muted;
      setMusicToggleState(els.music.muted);
    });
  }

  /* ------------------------------------------------------------
     GOOGLE MAPS
  ------------------------------------------------------------ */
  function openMaps() {
    window.open(WEDDING_CONFIG.venueMapUrl, "_blank", "noopener");
  }
  var mapsBtnFinal = document.getElementById("mapsBtnFinal");
  if (mapsBtnFinal) mapsBtnFinal.addEventListener("click", function (e) { e.stopPropagation(); openMaps(); });

  /* ------------------------------------------------------------
     ADD TO CALENDAR
  ------------------------------------------------------------ */
  function pad2(n) { return String(n).padStart(2, "0"); }
  function toICSDate(date) {
    return date.getUTCFullYear() +
      pad2(date.getUTCMonth() + 1) + pad2(date.getUTCDate()) + "T" +
      pad2(date.getUTCHours()) + pad2(date.getUTCMinutes()) + pad2(date.getUTCSeconds()) + "Z";
  }
  function downloadICS() {
    var start = new Date(WEDDING_CONFIG.calendarEvent.startISTOffset);
    var end = new Date(start.getTime() + WEDDING_CONFIG.calendarEvent.durationHours * 3600000);
    var ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Dhiraj & Tanu Wedding//Invitation//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:" + Date.now() + "@dhiraj-tanu-wedding",
      "DTSTAMP:" + toICSDate(new Date()),
      "DTSTART:" + toICSDate(start),
      "DTEND:" + toICSDate(end),
      "SUMMARY:" + WEDDING_CONFIG.calendarEvent.title,
      "LOCATION:" + WEDDING_CONFIG.calendarEvent.location,
      "DESCRIPTION:We would be honoured by your presence.",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    var blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "Dhiraj-Tanu-Wedding.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  var calendarBtnFinal = document.getElementById("calendarBtnFinal");
  if (calendarBtnFinal) calendarBtnFinal.addEventListener("click", function (e) { e.stopPropagation(); downloadICS(); });

  /* ------------------------------------------------------------
     INIT — every fresh load (including a reload) always starts at
     Page 1, language selection.
  ------------------------------------------------------------ */
  function init() {
    applyLanguage("en");
    els.scenes.lang.classList.add("is-active");
  }
  init();
})();
