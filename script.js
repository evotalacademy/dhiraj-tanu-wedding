(function () {
  "use strict";

  var SCENES = ["lang", "seal", "couple", "manas", "mehndi", "haldi", "wedding", "stars", "final"];

  // Scenes that carry a one-time, 2–3s entrance particle shower (Mehndi
  // leaves, Haldi powder, Shubh Vivah petals). Always fires strictly
  // AFTER the page transition has finished arriving — never during it.
  var EFFECT_SCENES = { mehndi: "leaf", haldi: "powder", wedding: "petal" };

  var reducedMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------
     TRANSITION LIBRARY
     ------------------------------------------------------------
     One named, distinct cinematic transition per page-to-page pair
     (assigned once, always the same in both directions). Each name
     maps to a duration (800–1200ms) and, for the two pairs that use
     one, a brief particle flourish. The actual visual character of
     every transition lives in the #transitionFX overlay (see the
     CSS) — script.js's only job here is to time it and, for the
     flourish transitions, spawn a small burst of particles into the
     right scene's own effect-layer. The scene itself never does more
     than a plain crossfade (see .scene.is-transitioning in the CSS),
     so nothing here can ever look like the page being dragged.
  ------------------------------------------------------------ */
  var PAIR_TRANSITION = {
    "lang>seal": "curtain",
    "seal>couple": "cardReveal",
    "couple>manas": "royalDissolve",
    "manas>mehndi": "floralReveal",
    "mehndi>haldi": "softSwirl",
    "haldi>wedding": "haldiGolden",
    "wedding>stars": "royalReveal",
    "stars>final": "finalReveal"
  };
  var TRANSITION_DEFS = {
    curtain:       { ms: 950 },
    cardReveal:    { ms: 1000 },
    royalDissolve: { ms: 900 },
    floralReveal:  { ms: 850,  flourish: "leaf-enter" },
    softSwirl:     { ms: 900 },
    haldiGolden:   { ms: 1000 },
    royalReveal:   { ms: 1100, flourish: "petal-exit" },
    finalReveal:   { ms: 950 }
  };

  function transitionNameFor(fromKey, toKey) {
    var fi = SCENES.indexOf(fromKey), ti = SCENES.indexOf(toKey);
    var loKey = fi < ti ? fromKey : toKey;
    var hiKey = fi < ti ? toKey : fromKey;
    return PAIR_TRANSITION[loKey + ">" + hiKey] || "royalDissolve";
  }

  // Language is intentionally NOT persisted across page loads — every
  // fresh open/reload of the invitation must start at Page 1 (language
  // selection), per spec. state.lang only tracks the current session's
  // in-memory choice while the page stays open.
  var state = {
    lang: null,
    index: 0,
    sealOpened: false,
    isTransitioning: false
  };

  var els = {
    scenes: {},
    app: document.getElementById("app"),
    backBtn: document.getElementById("backBtn"),
    musicToggle: document.getElementById("musicToggle"),
    music: document.getElementById("bgMusic"),
    inviteCard: document.getElementById("inviteCard"),
    fx: document.getElementById("transitionFX")
  };
  SCENES.forEach(function (key) {
    els.scenes[key] = document.querySelector('[data-scene="' + key + '"]');
  });

  /* ------------------------------------------------------------
     TEXT POPULATION — reads WEDDING_CONFIG, writes into DOM
     (unchanged from before — no content logic touched)
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
     Every page-to-page change plays its own named recipe (see the
     library above), but all of them go through this one engine:
       1. the incoming scene is placed at its (invisible, no-motion)
          starting point instantly — nothing has appeared yet
       2. next frame: both scenes crossfade to their resting state
          (a plain opacity/hairline-scale/blur tween — never a slide),
          while the #transitionFX overlay plays that pair's own named
          choreography on top
       3. once everything finishes, classes are cleared and the
          post-arrival effect (Mehndi/Haldi/Vivah shower) fires
     Crucially: nothing here is ever driven by touchmove deltas. The
     gesture is recognized once, on touchend, and only THEN does this
     function run — the page itself never visibly follows a finger,
     and it never visibly slides even once the transition starts.
  ------------------------------------------------------------ */
  var DIR_CLASSES = ["enter-below", "enter-above", "exit-up", "exit-down"];

  function clearSceneClasses(el) {
    el.classList.remove("is-transitioning");
    DIR_CLASSES.forEach(function (c) { el.classList.remove(c); });
    el.style.removeProperty("--tr-duration");
  }

  function goTo(index) {
    index = Math.max(0, Math.min(SCENES.length - 1, index));
    if (index === state.index || state.isTransitioning) return;

    var prevKey = SCENES[state.index];
    var nextKey = SCENES[index];
    var direction = index > state.index ? 1 : -1;
    var curEl = els.scenes[prevKey];
    var nextEl = els.scenes[nextKey];
    var trName = transitionNameFor(prevKey, nextKey);
    var def = TRANSITION_DEFS[trName] || { ms: 900 };
    var ms = reducedMotion ? 220 : def.ms;

    state.isTransitioning = true;
    state.index = index;
    els.backBtn.hidden = index <= 1; // hidden on language + sealed-invitation scenes

    clearSceneClasses(curEl);
    clearSceneClasses(nextEl);

    if (reducedMotion) {
      curEl.classList.remove("is-active");
      nextEl.classList.add("is-active");
      finishTransition(curEl, nextKey, ms);
      return;
    }

    var innerNext = nextEl.querySelector(".scene__inner");
    if (innerNext) innerNext.scrollTop = 0;

    curEl.style.setProperty("--tr-duration", ms + "ms");
    nextEl.style.setProperty("--tr-duration", ms + "ms");

    // Step 1: incoming scene at its invisible starting point, instantly.
    nextEl.classList.add(direction === 1 ? "enter-below" : "enter-above");
    void nextEl.offsetWidth; // commit the starting state before animating

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        curEl.classList.add("is-transitioning");
        nextEl.classList.add("is-transitioning");

        curEl.classList.remove("is-active");
        curEl.classList.add(direction === 1 ? "exit-up" : "exit-down");

        nextEl.classList.remove(direction === 1 ? "enter-below" : "enter-above");
        nextEl.classList.add("is-active");

        playOverlay(trName, ms);
        playFlourish(def, curEl, nextEl);
      });
    });

    setTimeout(function () { finishTransition(curEl, nextKey, ms); }, ms + 40);
  }

  function finishTransition(curEl, nextKey, ms) {
    clearSceneClasses(curEl);
    clearSceneClasses(els.scenes[nextKey]);
    state.isTransitioning = false;
    playSceneEffect(nextKey);
  }

  var overlayCleanupTimer = null;

  /* Activates the one named sub-layer set (see the .fx-mode-* rules in
     the CSS) that this transition uses, and nothing else — every other
     sub-layer stays inert. Cleaned up well after the transition ends
     so nothing lingers into the next one. */
  function playOverlay(trName, ms) {
    if (!els.fx || reducedMotion) return;
    if (overlayCleanupTimer) clearTimeout(overlayCleanupTimer);
    els.fx.className = "transition-fx fx-mode-" + trName;
    els.fx.style.setProperty("--tr-duration", ms + "ms");
    void els.fx.offsetWidth;
    els.fx.classList.add("is-active");
    overlayCleanupTimer = setTimeout(function () {
      els.fx.className = "transition-fx";
      els.fx.style.removeProperty("--tr-duration");
      overlayCleanupTimer = null;
    }, ms + 250);
  }

  /* A brief (~650ms) decorative burst used only for two specific
     transitions, layered UNDERNEATH the scene text (z-index below the
     UI, same as the main event showers) — distinct from, and always
     finished well before, the full 2–3s post-arrival effect on
     Mehndi/Haldi/Vivah. */
  function playFlourish(def, curEl, nextEl) {
    if (!def.flourish || reducedMotion) return;
    if (def.flourish === "leaf-enter") {
      spawnParticles(nextEl.querySelector(".effect-layer"), 8, ["leaf", "leaf-small"], 650);
    } else if (def.flourish === "petal-exit") {
      spawnParticles(curEl.querySelector(".effect-layer"), 8, ["petal", "rose"], 650);
    }
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

  /* Page 2 sealed invitation — entirely unchanged: one tap opens the
     card, starts the music, and after the card's own opening animation
     finishes, goTo() carries the visitor into the "cardReveal"
     transition on to Page 3. Swipe plays no part here. */
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
     SWIPE NAVIGATION — gesture is a COMMAND, not a drag
     ------------------------------------------------------------
     touchstart only records the gesture's origin and the active
     scene's scroll boundaries. touchmove NEVER touches any scene's
     transform — it only measures direction/distance to classify the
     gesture, and calls preventDefault() solely to stop the browser's
     own rubber-band scroll once a page-transition gesture has been
     confidently identified at the correct boundary. touchend is the
     ONLY place a navigation decision is made — one qualifying swipe
     produces exactly one next()/prev() call, which then plays the
     full committed transition. The page is never visibly dragged.

     Swipe up  -> next scene (or, on a tall scene with content still
                  below, plain vertical scrolling — untouched, native).
     Swipe down -> previous scene (mirrored: scrolls toward the top
                  first if not already there).
     Horizontal/diagonal movement is ignored outright. Page 1
     (language) and Page 2 (sealed invitation) opt out of swipe
     entirely — button/tap driven only, exactly as before.
  ------------------------------------------------------------ */
  var SWIPE_EXCLUDED = { lang: true, seal: true };
  var MOVE_THRESHOLD = 10;      // px before we commit to a direction at all
  var MIN_SWIPE_DISTANCE = 90;  // px — a deliberate, intentional swipe. This is a
                                 // HARD FLOOR: a fast flick under this distance
                                 // never triggers a page change, no matter how
                                 // quick it was. Velocity is never a substitute.
  var BOUNDARY_TOLERANCE = 14;  // px, accounts for mobile rounding
  var DOMINANCE_RATIO = 1.5;    // vertical movement must exceed 1.5x horizontal

  var touch = { active: false, mode: null, startX: 0, startY: 0, startT: 0, lastY: 0, lastX: 0 };

  function touchStart(e) {
    if (state.isTransitioning) { touch.mode = "ignore"; return; }
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
    touch.lastX = t.clientX;
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
    touch.lastX = t.clientX;
    touch.lastY = t.clientY;

    if (touch.mode === null) {
      if (Math.abs(dy) < MOVE_THRESHOLD && Math.abs(dx) < MOVE_THRESHOLD) return;
      if (Math.abs(dy) <= Math.abs(dx) * DOMINANCE_RATIO) { touch.mode = "ignore"; return; } // diagonal/horizontal
      if (dy < 0) {
        touch.mode = (touch.singleScreen || touch.atBottom) ? "transition-forward" : "scroll";
      } else {
        touch.mode = (touch.singleScreen || touch.atTop) ? "transition-backward" : "scroll";
      }
    }

    // NOTE: no transform is ever applied to any scene here. This only
    // suppresses the browser's native rubber-band bounce once we've
    // confidently classified the gesture as a page-transition swipe at
    // the correct boundary — the page itself stays completely static
    // until touchend decides whether to issue a navigation command.
    if (touch.mode === "transition-forward" || touch.mode === "transition-backward") {
      e.preventDefault();
    }
  }

  function touchEnd() {
    if (!touch.active) return;
    var dy = touch.lastY - touch.startY;
    var dx = touch.lastX - touch.startX;
    // Deliberately distance-gated, never velocity-gated: a fast 30–50px
    // flick must NOT change pages. Both conditions are required.
    var verticalDominant = Math.abs(dy) > Math.abs(dx) * DOMINANCE_RATIO;
    var qualifies = verticalDominant && Math.abs(dy) >= MIN_SWIPE_DISTANCE;

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
    document.documentElement.classList.add("has-swiped");
  }

  els.app.addEventListener("touchstart", touchStart, { passive: true });
  els.app.addEventListener("touchmove", touchMove, { passive: false });
  els.app.addEventListener("touchend", touchEnd, { passive: true });
  els.app.addEventListener("touchcancel", function () { touch.active = false; touch.mode = null; }, { passive: true });

  /* Keyboard fallback (desktop browsers, external keyboards) — mirrors
     the swipe gesture's own rules. Courtesy only; does not affect the
     mobile swipe behaviour. */
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
     PARTICLE HELPERS — shared by both the brief transition
     flourishes above and the full post-arrival showers below.
     Lightweight, DOM-based, self-cleaning.
  ------------------------------------------------------------ */
  function spawnParticles(layer, count, variants, durationMs, onDone) {
    if (!layer) return;
    for (var i = 0; i < count; i++) {
      var variant = variants[Math.floor(Math.random() * variants.length)];
      var span = document.createElement("span");
      span.className = "fx-particle fx-particle--" + variant + " fx-drift-" + (1 + (i % 4));

      var left = 3 + Math.random() * 92;
      var delay = (Math.random() * (durationMs > 900 ? 0.7 : 0.25)).toFixed(2);
      var duration = ((durationMs / 1000) * (0.75 + Math.random() * 0.4)).toFixed(2);
      span.style.left = left + "%";
      span.style.animationDelay = delay + "s";
      span.style.animationDuration = duration + "s";

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
    if (typeof onDone === "function") setTimeout(onDone, durationMs + 300);
  }

  /* ------------------------------------------------------------
     EVENT-SPECIFIC ENTRANCE EFFECTS (the full 2–3s showers)
     ------------------------------------------------------------
     Triggered only from finishTransition(), i.e. strictly AFTER the
     page transition has fully completed and the scene has arrived —
     never while a transition is still in flight.
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

    spawnParticles(layer, EFFECT_COUNT[key] || 14, TYPE_VARIANTS[kind], 2400);

    effectTimers[key] = setTimeout(function () {
      layer.innerHTML = "";
      effectTimers[key] = null;
    }, 3000);
  }

  /* ------------------------------------------------------------
     MUSIC — unchanged: starts on the sealed-invitation tap only,
     loops continuously, never restarts on scene changes (the
     transition engine and swipe gestures never touch it).
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
