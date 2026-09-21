(function () {
  "use strict";

  var SCENES = ["lang", "seal", "couple", "manas", "mehndi", "haldi", "wedding", "stars", "final"];
  var TAPPABLE = {
    lang: false, seal: false, couple: true, manas: true,
    mehndi: true, haldi: true, wedding: true, stars: true, final: false
  };

  // Language is intentionally NOT persisted across page loads — every
  // fresh open/reload of the invitation must start at Page 1 (language
  // selection), per spec. state.lang only tracks the current session's
  // in-memory choice while the page stays open.
  var state = {
    lang: null,
    index: 0,
    sealOpened: false
  };

  var els = {
    scenes: {},
    backBtn: document.getElementById("backBtn"),
    musicToggle: document.getElementById("musicToggle"),
    music: document.getElementById("bgMusic"),
    inviteCard: document.getElementById("inviteCard")
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

    // event fields — falls back to the shared home address when an event
    // doesn't carry its own (Manas Path, Mehndi & Sangeet, Haldi are all
    // "At Home").
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

    // home-address placeholders used directly on Manas / Mehndi / Haldi
    document.querySelectorAll('[data-address="home"]').forEach(function (node) {
      node.textContent = WEDDING_CONFIG.homeAddress[lang];
    });

    // parents line — Page 3 (couple reveal)
    var parents = WEDDING_CONFIG.parents[lang];
    document.querySelectorAll("[data-parent]").forEach(function (node) {
      var who = node.getAttribute("data-parent");
      node.textContent = who === "groom" ? parents.groomLine : parents.brideLine;
    });

    els.backBtn.querySelector(".back-btn__label").textContent = copy.back;
    document.documentElement.setAttribute("lang", lang === "hi" ? "hi" : "en");

    // Little Stars — two lines of three names each, joined with a middle dot
    var namesList = lang === "hi" ? WEDDING_CONFIG.littleStars.namesHi : WEDDING_CONFIG.littleStars.names;
    var starsNode = document.getElementById("starsNames");
    if (starsNode && namesList && namesList.length >= 6) {
      var line1 = namesList.slice(0, 3).join(" \u00B7 ");
      var line2 = namesList.slice(3, 6).join(" \u00B7 ");
      starsNode.textContent = line1 + "\n" + line2;
    }

    // Contact line (final scene) — tel: links, no form.
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
     SCENE NAVIGATION
  ------------------------------------------------------------ */
  function goTo(index) {
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

    els.backBtn.hidden = index <= 1; // hidden on language + sealed-invitation scenes
  }

  function indexOf(key) { return SCENES.indexOf(key); }
  function next() { if (state.index < SCENES.length - 1) goTo(state.index + 1); }
  function prev() {
    if (state.index <= 0) return;
    var target = state.index - 1;
    // Once the sealed invitation has played its one-time opening
    // animation, it can't be shown "closed" again — skip straight back
    // to the language screen instead of landing on a spent seal.
    if (target === indexOf("seal") && state.sealOpened) {
      target = indexOf("lang");
      // Reset the seal so it's ready to open again if the visitor
      // reselects a language and taps back through to it.
      state.sealOpened = false;
      if (els.inviteCard) els.inviteCard.classList.remove("is-opening");
    }
    goTo(target);
  }

  /* Tap-anywhere-to-advance, but never when tapping an interactive control. */
  document.getElementById("app").addEventListener("click", function (e) {
    var key = SCENES[state.index];
    if (!TAPPABLE[key]) return;
    if (e.target.closest("button") || e.target.closest("a")) return;
    next();
  });

  els.backBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    prev();
  });

  /* Language selection — navigation only. Music does not start here;
     it starts on the sealed-invitation tap (Page 2), per spec. */
  document.querySelectorAll(".lang-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var lang = btn.getAttribute("data-lang");
      state.lang = lang;
      applyLanguage(lang);
      goTo(indexOf("seal"));
    });
  });

  /* ------------------------------------------------------------
     SEALED INVITATION — the single tap that opens the card is the
     same user gesture that starts the music (required for iOS/
     Safari autoplay rules), so both happen inside this one handler.
     The card plays its open animation, then the couple-reveal scene
     is shown once the animation completes — no second tap needed.
  ------------------------------------------------------------ */
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
     MUSIC — starts on the sealed-invitation tap (a real user
     gesture, so iOS/Safari's autoplay block doesn't apply). Loops
     continuously via the `loop` attribute, with an `ended` listener
     as a second, more reliable fallback on mobile browsers. Never
     restarted by scene changes, since it lives entirely outside the
     scene-navigation logic. The control button MUTES (audio keeps
     playing, silently, position keeps advancing) rather than
     pausing — muting never touches playback position.
  ------------------------------------------------------------ */
  var musicRequested = false; // true once a play() call has been issued
  function startMusic() {
    if (musicRequested || !els.music) return;
    musicRequested = true;
    els.music.volume = 0.4;
    els.music.muted = false; // default state is always ON, per spec
    var playPromise = els.music.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.then(function () {
        setMusicToggleState(false); // false = not muted
      }).catch(function () {
        // Autoplay blocked, file missing, or format unsupported — the
        // invitation must keep working regardless. Resetting the flag
        // lets the visitor's next tap on the toggle try again as a
        // fresh user gesture.
        musicRequested = false;
        setMusicToggleState(true); // show the "silent" state honestly
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
      if (!musicRequested) {
        startMusic();
        return;
      }
      els.music.muted = !els.music.muted;
      setMusicToggleState(els.music.muted);
    });
  }

  /* ------------------------------------------------------------
     GOOGLE MAPS — opens the supplied venue share link directly.
  ------------------------------------------------------------ */
  function openMaps() {
    window.open(WEDDING_CONFIG.venueMapUrl, "_blank", "noopener");
  }
  var mapsBtnFinal = document.getElementById("mapsBtnFinal");
  if (mapsBtnFinal) mapsBtnFinal.addEventListener("click", function (e) { e.stopPropagation(); openMaps(); });

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
     Page 1, language selection. No stored language is ever read on
     load, so there is nothing to skip forward from.
  ------------------------------------------------------------ */
  function init() {
    applyLanguage("en"); // default text underneath the language scene itself
    goTo(0);
  }
  init();
})();
