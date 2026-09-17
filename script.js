(function () {
  "use strict";

  var SCENES = ["lang", "opening", "mehndi", "haldi", "wedding", "venue", "final"];
  var TAPPABLE = { lang: false, final: true, opening: true, mehndi: true, haldi: true, wedding: true, venue: true };

  var state = {
    lang: sessionStorage.getItem("wi_lang") || null,
    index: 0
  };

  var els = {
    scenes: {},
    backBtn: document.getElementById("backBtn"),
    musicToggle: document.getElementById("musicToggle"),
    music: document.getElementById("bgMusic")
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

    // simple copy strings
    document.querySelectorAll("[data-text]").forEach(function (node) {
      var key = node.getAttribute("data-text");
      if (copy[key] !== undefined) node.textContent = copy[key];
    });

    // names
    document.querySelectorAll("[data-text-name]").forEach(function (node) {
      var who = node.getAttribute("data-text-name"); // "groom" | "bride"
      var value = lang === "hi"
        ? (who === "groom" ? WEDDING_CONFIG.couple.groomHi : WEDDING_CONFIG.couple.brideHi)
        : (who === "groom" ? WEDDING_CONFIG.couple.groom : WEDDING_CONFIG.couple.bride);
      node.textContent = value;
    });

    // event fields
    document.querySelectorAll("[data-event]").forEach(function (node) {
      var evKey = node.getAttribute("data-event");
      var field = node.getAttribute("data-field");
      var ev = WEDDING_CONFIG.events[evKey];
      if (ev && ev[field]) node.textContent = ev[field][lang];
    });

    els.backBtn.querySelector(".back-btn__label").textContent = copy.back;
    document.documentElement.setAttribute("lang", lang === "hi" ? "hi" : "en");

    // Family blessing line (opening scene) — built from config.families
    // rather than hard-coded, so a name change in config.js is enough.
    var famEl = document.getElementById("familyLine");
    if (famEl) {
      var fam = WEDDING_CONFIG.families[lang];
      famEl.textContent = fam.groomParents + " " + copy.familyAnd + " " + fam.brideParents;
    }
  }

  /* ------------------------------------------------------------
     SCENE NAVIGATION
  ------------------------------------------------------------ */
  function goTo(index, opts) {
    opts = opts || {};
    index = Math.max(0, Math.min(SCENES.length - 1, index));
    var prevKey = SCENES[state.index];
    var nextKey = SCENES[index];

    if (prevKey !== nextKey) {
      els.scenes[prevKey].classList.remove("is-active");
      els.scenes[prevKey].classList.add("is-leaving");
      setTimeout(function () { els.scenes[prevKey].classList.remove("is-leaving"); }, 900);
    }
    els.scenes[nextKey].classList.add("is-active");
    state.index = index;

    els.backBtn.hidden = index <= 1; // hide on language + opening scenes
    if (els.musicToggle) els.musicToggle.hidden = index <= 1; // same reveal point as the back button
    if (nextKey === "venue") startCountdown();
  }

  function next() { if (state.index < SCENES.length - 1) goTo(state.index + 1); }
  function prev() { if (state.index > 0) goTo(state.index - 1); }

  /* Tap-anywhere-to-advance, but never when tapping an interactive control */
  document.getElementById("app").addEventListener("click", function (e) {
    var key = SCENES[state.index];
    if (!TAPPABLE[key]) return;
    if (e.target.closest("button")) return; // buttons handle their own actions
    if (key === "opening") startMusic(); // first tap on the opening scene = first real user gesture
    next();
  });

  els.backBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    prev();
  });

  /* Language selection */
  document.querySelectorAll(".lang-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var lang = btn.getAttribute("data-lang");
      state.lang = lang;
      sessionStorage.setItem("wi_lang", lang);
      applyLanguage(lang);
      goTo(1); // move to opening scene
    });
  });

  /* Replay */
  document.getElementById("replayBtn").addEventListener("click", function (e) {
    e.stopPropagation();
    goTo(1);
  });

  /* ------------------------------------------------------------
     COUNTDOWN
  ------------------------------------------------------------ */
  var countdownTimer = null;
  function startCountdown() {
    if (countdownTimer) return;
    var target = new Date(WEDDING_CONFIG.weddingDateTimeISTOffset).getTime();
    function tick() {
      var diff = target - Date.now();
      if (diff < 0) diff = 0;
      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      setText("cd-days", pad(d));
      setText("cd-hours", pad(h));
      setText("cd-minutes", pad(m));
    }
    tick();
    countdownTimer = setInterval(tick, 30000); // minute-level display, no need to tick every second
  }
  function pad(n) { return String(n).padStart(2, "0"); }
  function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }

  /* ------------------------------------------------------------
     MUSIC — starts only on the first tap on the opening scene (a
     real user gesture, so iOS/Safari's autoplay block doesn't apply).
     Loops continuously and is never restarted on scene changes,
     since it lives outside the scene-navigation logic entirely.
  ------------------------------------------------------------ */
  var musicRequested = false;
  function startMusic() {
    if (musicRequested || !els.music) return;
    musicRequested = true;
    els.music.volume = 0.4;
    var playPromise = els.music.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.then(function () {
        setMusicToggleState(true);
      }).catch(function () {
        // Autoplay blocked, file missing, or format unsupported — the
        // invitation must keep working regardless. Let the visitor
        // retry manually from the toggle; allow that retry by
        // resetting the flag rather than leaving it permanently stuck.
        musicRequested = false;
        setMusicToggleState(false);
      });
    } else {
      setMusicToggleState(true);
    }
  }

  function setMusicToggleState(isPlaying) {
    if (!els.musicToggle) return;
    els.musicToggle.classList.toggle("is-muted", !isPlaying);
    els.musicToggle.setAttribute("aria-label", isPlaying ? "Pause music" : "Play music");
  }

  if (els.musicToggle) {
    els.musicToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!els.music) return;
      if (els.music.paused) {
        musicRequested = true;
        els.music.play().then(function () {
          setMusicToggleState(true);
        }).catch(function () {
          musicRequested = false;
          setMusicToggleState(false);
        });
      } else {
        els.music.pause();
        setMusicToggleState(false);
      }
    });
  }

  /* ------------------------------------------------------------
     GOOGLE MAPS
  ------------------------------------------------------------ */
  function openMaps() {
    var q = encodeURIComponent(WEDDING_CONFIG.venueMapQuery);
    window.open("https://www.google.com/maps/search/?api=1&query=" + q, "_blank");
  }
  document.getElementById("mapsBtn").addEventListener("click", function (e) { e.stopPropagation(); openMaps(); });
  document.getElementById("mapsBtnFinal").addEventListener("click", function (e) { e.stopPropagation(); openMaps(); });

  /* ------------------------------------------------------------
     ADD TO CALENDAR — generates a .ics file client-side
     (works everywhere; no backend, no paid API)
  ------------------------------------------------------------ */
  function pad2(n) { return String(n).padStart(2, "0"); }
  function toICSDate(date) {
    return date.getUTCFullYear() +
      pad2(date.getUTCMonth() + 1) + pad2(date.getUTCDate()) + "T" +
      pad2(date.getUTCHours()) + pad2(date.getUTCMinutes()) + pad2(date.getUTCSeconds()) + "Z";
  }
  function downloadICS() {
    var start = new Date(WEDDING_CONFIG.weddingDateTimeISTOffset);
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
  document.getElementById("calendarBtn").addEventListener("click", function (e) { e.stopPropagation(); downloadICS(); });
  document.getElementById("calendarBtnFinal").addEventListener("click", function (e) { e.stopPropagation(); downloadICS(); });

  /* ------------------------------------------------------------
     INIT
  ------------------------------------------------------------ */
  function init() {
    if (state.lang) {
      applyLanguage(state.lang);
      goTo(1);
    } else {
      applyLanguage("en"); // default text underneath the language scene
      goTo(0);
    }
  }
  init();
})();
