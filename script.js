(function () {
  "use strict";

  var SCENES = ["lang", "seal", "couple", "manas", "mehndi", "haldi", "wedding", "stars", "final"];

  // Scenes that carry a one-time, 2–3s entrance particle shower (Mehndi
  // leaves, Haldi powder, Shubh Vivah petals). Always fires strictly
  // AFTER the page transition has finished arriving — never during it.
  var EFFECT_SCENES = { mehndi: "leaf", haldi: "powder", wedding: "petal" };

  var reducedMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    fx: document.getElementById("fx")
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
     STATIC SCENES + OVERLAY TRANSITIONS
     Scenes never animate. A valid command builds a temporary
     full-screen overlay (#fx) that covers the current scene, swaps
     the active scene underneath while fully covered, uncovers the
     stationary destination, then is torn down.
  ------------------------------------------------------------ */
  var EASE = "cubic-bezier(.65,0,.25,1)";
  var K = { ivory: "#FBF3E7", maroon: "#5E1A28", gold: "#B8863F", glow: "#E9CB8E", green: "#4F6B3A", leaf: "#7A9A56", haldi: "#D99B2B", rose: "#B23A55" };
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function box(p, css, html) {
    var e = document.createElement("div");
    e.style.cssText = "position:absolute;" + css;
    if (html) e.innerHTML = html;
    p.appendChild(e);
    return e;
  }
  function go(e, kf, ms, delay) { return e.animate(kf, { duration: ms, delay: delay || 0, easing: "linear", fill: "both" }); }
  function T(x, y, r) { return "translate(" + Math.round(x) + "px," + Math.round(y) + "px) rotate(" + Math.round(r || 0) + "deg)"; }
  function leaf(c) { return '<svg viewBox="0 0 40 20" width="100%" height="100%"><path d="M1 10C10-4 30-4 39 10 30 24 10 24 1 10Z" fill="' + c + '"/><path d="M3 10H37" stroke="rgba(255,255,255,.4)" stroke-width=".7"/></svg>'; }
  function pulse(e, ms, peak, delay) { return go(e, [{ opacity: 0, easing: EASE }, { opacity: peak || 1, offset: .5, easing: EASE }, { opacity: 0 }], ms, delay); }

  /* Full-screen cover that is fully opaque from 42%–58% of the run
     (the swap window). "drop" = descends and exits downward. */
  function veil(p, bg, ms, drop) {
    var v = box(p, "inset:0;background:" + bg + (drop ? ";box-shadow:0 0 44px 8px rgba(184,134,63,.35)" : ""));
    go(v, drop
      ? [{ transform: "translateY(-100%)", easing: EASE }, { transform: "translateY(0)", offset: .44 }, { transform: "translateY(0)", offset: .56, easing: EASE }, { transform: "translateY(100%)" }]
      : [{ opacity: 0, easing: EASE }, { opacity: 1, offset: .42 }, { opacity: 1, offset: .58, easing: EASE }, { opacity: 0 }], ms);
    return v;
  }
  function glowDisc(p, W, ms, rgb) {
    var s = Math.round(W * 1.6);
    var g = box(p, "left:50%;top:50%;width:" + s + "px;height:" + s + "px;margin:-" + s / 2 + "px 0 0 -" + s / 2 + "px;border-radius:50%;background:radial-gradient(circle,rgba(" + rgb + ",.95),rgba(233,203,142,.4) 38%,transparent 68%)");
    go(g, [{ opacity: 0, transform: "scale(.3)", easing: EASE }, { opacity: 1, transform: "scale(1)", offset: .5, easing: EASE }, { opacity: 0, transform: "scale(1.2)" }], ms);
  }
  function garland(W) {
    var s = '<svg viewBox="0 0 400 34" width="' + W + '" height="' + Math.round(W * .085) + '">';
    for (var i = 0; i <= 22; i++) {
      var x = i * 400 / 22, y = 15 + 8 * Math.sin(i / 22 * Math.PI * 4);
      s += '<circle cx="' + x + '" cy="' + y + '" r="7.5" fill="' + [K.haldi, K.rose, "#E8A93A"][i % 3] + '"/><circle cx="' + x + '" cy="' + y + '" r="2.6" fill="rgba(255,240,200,.85)"/>';
    }
    return s + "</svg>";
  }

  var FX = {
    /* 1. Royal curtain: seven pleated drapes fall centre-outward, meet at a gold seam, then drop away. */
    curtain: function (p, W, H, ms) {
      for (var i = 0; i < 7; i++) {
        var s = box(p, "top:0;height:100%;left:" + i * 100 / 7 + "%;width:" + (100 / 7 + .4) + "%;background:linear-gradient(90deg,#45101d," + K.maroon + " 45%,#7a2a34 72%,#45101d);border-right:1px solid rgba(233,203,142,.5)");
        go(s, [{ transform: "translateY(-100%)", easing: EASE }, { transform: "translateY(0)", offset: .45 }, { transform: "translateY(0)", offset: .56, easing: EASE }, { transform: "translateY(100%)" }], ms * .82, Math.abs(i - 3) * .03 * ms);
      }
      var l = box(p, "left:50%;top:0;width:3px;height:100%;margin-left:-1px;background:linear-gradient(transparent," + K.glow + ",transparent);filter:blur(1px)");
      pulse(l, ms);
    },
    /* 2. Physical invitation: two gold-edged cover leaves hinged at the outer edges open from a central seam onto inner golden light. Reverse closes them. */
    card: function (p, W, H, ms, dir) {
      var g = box(p, "inset:0;background:radial-gradient(ellipse at 50% 50%,#FFF3D2 0%," + K.glow + " 40%,rgba(233,203,142,0) 75%)");
      pulse(g, ms);
      [0, 1].forEach(function (i) {
        var d = box(p, "top:0;height:100%;width:50.2%;" + (i ? "right:0;transform-origin:100% 50%" : "left:0;transform-origin:0 50%") +
          ";background:linear-gradient(" + (i ? "270deg" : "90deg") + ",#f7ead2,#efd9b0 82%,#d9b676);border:1.5px solid " + K.gold + ";box-shadow:inset 0 0 40px rgba(94,26,40,.22),0 0 30px rgba(94,26,40,.35);backface-visibility:hidden");
        var shut = "rotateY(0deg)", open = "rotateY(" + (i ? 96 : -96) + "deg)";
        var kf = [{ transform: shut, opacity: 0, offset: 0, easing: EASE }, { transform: shut, opacity: 1, offset: .3 }, { transform: shut, opacity: 1, offset: .5, easing: EASE }, { transform: open, opacity: 1, offset: .96 }, { transform: open, opacity: 0, offset: 1 }];
        if (dir < 0) kf = kf.map(function (k) { return Object.assign({}, k, { offset: 1 - k.offset }); }).reverse();
        go(d, kf, ms);
      });
    },
    /* 3. Sacred light: warm ivory veil descends, a golden sun blooms in layers, faint vertical rays. */
    sacred: function (p, W, H, ms) {
      veil(p, "linear-gradient(180deg,#FFF6E6,#F6E4C3)", ms, 1);
      glowDisc(p, W, ms, "255,232,170");
      for (var i = 0; i < 5; i++) {
        var r = box(p, "top:0;height:100%;left:" + (12 + i * 19) + "%;width:2px;background:linear-gradient(180deg,transparent,rgba(233,203,142,.9),transparent)");
        pulse(r, ms * .8, .75, i * .04 * ms);
      }
    },
    /* 4. Botanical curtain: a layered mass of leaves of varied size sweeps in from the upper corners/sides, then settles downward. */
    botanical: function (p, W, H, ms) {
      veil(p, "linear-gradient(180deg,#F3EFD9,#E2EAC8)", ms);
      for (var i = 0; i < 18; i++) {
        var s = 90 + rnd() * 150, x = rnd() * (W - s * .5), y = rnd() * H * .95, side = x < W / 2 ? -1 : 1, r = rnd() * 140 - 70;
        var e = box(p, "left:" + Math.round(x) + "px;top:" + Math.round(y) + "px;width:" + Math.round(s) + "px;height:" + Math.round(s / 2) + "px;opacity:0" + (i % 4 ? "" : ";filter:blur(1.5px)"), leaf(i % 3 ? K.leaf : K.green));
        go(e, [{ opacity: 0, transform: T(side * W * .6, -H * .45, r - 50), easing: EASE }, { opacity: 1, transform: T(0, 0, r), offset: .5 }, { opacity: 1, transform: T(0, 0, r), offset: .58, easing: EASE }, { opacity: 0, transform: T(-side * 40, H * 1.1, r + 35) }], ms * (.6 + rnd() * .14), rnd() * .26 * ms);
      }
    },
    /* 5. Mehndi swirl: 7 leaves trace curved, always-descending arcs over a veil warming from mehndi green to haldi gold. */
    swirl: function (p, W, H, ms) {
      veil(p, "linear-gradient(170deg,#E4EBCB 0%,#F3DFA4 100%)", ms);
      for (var i = 0; i < 7; i++) {
        var s = 70 + rnd() * 70, ph = i / 7 * 6.28, kf = [];
        var e = box(p, "left:50%;top:0;width:" + Math.round(s) + "px;height:" + Math.round(s / 2) + "px;margin-left:-" + Math.round(s / 2) + "px", leaf(i % 2 ? K.leaf : "#C9962B"));
        for (var k = 0; k <= 8; k++) {
          var t = k / 8;
          kf.push({ offset: t, opacity: t < .12 ? t / .12 : t > .86 ? (1 - t) / .14 : 1, transform: T(Math.sin(ph + t * 3.8) * W * .4 * (1 - .3 * t), -.12 * H + t * 1.3 * H, 40 + Math.cos(ph + t * 3.8) * 55) });
        }
        go(e, kf, ms * .9, i * .03 * ms);
      }
    },
    /* 6. Haldi powder bloom: soft irregular blurred powder clouds expand from the centre with fine particles, then drift down. */
    powder: function (p, W, H, ms) {
      veil(p, "radial-gradient(circle at 50% 46%,#FFE29A,#EBB646 62%,#D99B2B)", ms);
      var shapes = ["58% 42% 61% 39% / 47% 55% 45% 53%", "42% 58% 37% 63% / 60% 40% 57% 43%", "63% 37% 54% 46% / 38% 62% 41% 59%"];
      for (var i = 0; i < 7; i++) {
        var s = Math.round(W * (.7 + rnd() * .55));
        var c = box(p, "left:" + Math.round(W / 2 + (rnd() - .5) * W * .5 - s / 2) + "px;top:" + Math.round(H * .46 + (rnd() - .5) * H * .35 - s / 2) + "px;width:" + s + "px;height:" + s + "px;border-radius:" + shapes[i % 3] + ";filter:blur(12px);background:radial-gradient(circle at 40% 38%,rgba(255,220,110,.9),rgba(217,155,43,.55) 46%,rgba(217,155,43,0) 72%)");
        go(c, [{ opacity: 0, transform: "scale(.15)", easing: EASE }, { opacity: .95, transform: "scale(1)", offset: .48, easing: EASE }, { opacity: 0, transform: T(0, H * .32, 0) + " scale(1.25)" }], ms * .9, i * .035 * ms);
      }
      for (var j = 0; j < 44; j++) {
        var z = 1.5 + rnd() * 3, dx = (rnd() - .5) * W * 1.1, dy = (rnd() - .5) * H * .8;
        var d = box(p, "left:" + Math.round(W / 2) + "px;top:" + Math.round(H * .46) + "px;width:" + z.toFixed(1) + "px;height:" + z.toFixed(1) + "px;border-radius:50%;background:rgba(255,206,96,.95);opacity:0" + (j % 3 ? "" : ";filter:blur(.7px)"));
        go(d, [{ opacity: 0, transform: T(0, 0), easing: "cubic-bezier(.2,.7,.3,1)" }, { opacity: 1, transform: T(dx, dy), offset: .5, easing: EASE }, { opacity: 0, transform: T(dx * 1.1, dy + H * .5) }], ms * (.7 + rnd() * .3), rnd() * .2 * ms);
      }
    },
    /* 7. Royal wedding: deep maroon veil edged in antique gold, two flower garlands and rose petals descending, warm central light. */
    royal: function (p, W, H, ms) {
      var v = veil(p, "linear-gradient(180deg,rgba(94,26,40,.97),rgba(66,14,28,.98))", ms, 1);
      var band = "left:0;width:100%;height:10px;background:repeating-linear-gradient(90deg," + K.gold + " 0 7px,transparent 7px 11px);opacity:.9";
      box(v, "top:0;" + band); box(v, "bottom:0;" + band);
      glowDisc(p, W * .8, ms, "255,206,120");
      [0, 1].forEach(function (i) {
        var g = box(p, "left:0;top:0;width:100%", garland(W));
        go(g, [{ transform: T(0, -70 - i * 30) , easing: EASE }, { transform: T(0, H + 90) }], ms * .78, i * .2 * ms);
      });
      for (var j = 0; j < 9; j++) {
        var x = rnd() * W, d = (rnd() - .5) * 90, pt = box(p, "left:" + Math.round(x) + "px;top:0;width:13px;height:17px;border-radius:80% 0 80% 0;opacity:0;background:" + (j % 3 ? K.rose : "#E8A0A8"));
        go(pt, [{ opacity: 0, transform: T(0, -30, 0) }, { opacity: .9, transform: T(d / 2, H * .35, 120), offset: .3 }, { opacity: 0, transform: T(d, H + 30, 300) }], ms * (.6 + rnd() * .3), rnd() * .3 * ms);
      }
    },
    /* 8. Final reveal: slow ivory veil settles, an antique-gold frame and corner ornaments appear and rest, then everything clears. */
    final: function (p, W, H, ms) {
      veil(p, "linear-gradient(180deg,#FFF9EE,#F8EBD3)", ms, 1);
      glowDisc(p, W * .7, ms, "255,240,205");
      var f = box(p, "inset:14px;border:1.5px solid " + K.glow + ";border-radius:18px;box-shadow:0 0 26px rgba(233,203,142,.35)");
      go(f, [{ opacity: 0, easing: EASE }, { opacity: 1, offset: .5 }, { opacity: 1, offset: .66, easing: EASE }, { opacity: 0 }], ms);
      [["top:22px;left:22px", ""], ["top:22px;right:22px", "scaleX(-1)"], ["bottom:22px;left:22px", "scaleY(-1)"], ["bottom:22px;right:22px", "rotate(180deg)"]].forEach(function (c, i) {
        var e = box(p, c[0] + ";width:66px;height:66px;color:" + K.gold, '<svg viewBox="0 0 66 66" width="66" height="66" style="transform:' + c[1] + '"><use href="#art-corner-flourish"/></svg>');
        go(e, [{ opacity: 0, transform: "translateY(-10px)", easing: EASE }, { opacity: 1, transform: "translateY(0)", offset: .55 }, { opacity: 1, transform: "translateY(0)", offset: .68, easing: EASE }, { opacity: 0, transform: "translateY(6px)" }], ms, i * .02 * ms);
      });
    }
  };

  var TR = {
    "lang>seal": ["curtain", 1000], "seal>couple": ["card", 1100], "couple>manas": ["sacred", 1000], "manas>mehndi": ["botanical", 1050],
    "mehndi>haldi": ["swirl", 1050], "haldi>wedding": ["powder", 1200], "wedding>stars": ["royal", 1100], "stars>final": ["final", 1000]
  };

  function runFX(name, dir, ms, swap, done) {
    var fx = els.fx, W = window.innerWidth, H = window.innerHeight, swapped = false;
    function doSwap() { if (!swapped) { swapped = true; swap(); } }
    if (!fx || !fx.animate) { doSwap(); done(); return; }
    fx.innerHTML = "";
    fx.style.display = "block";
    fx.style.transform = (dir < 0 && name !== "card") ? "scaleY(-1)" : "";  // reverse = mirrored (rising) choreography
    fx.style.perspective = name === "card" ? "1400px" : "";
    try {
      if (reducedMotion) veil(fx, K.ivory, ms); else FX[name](fx, W, H, ms, dir);
    } catch (err) { doSwap(); fx.style.display = "none"; done(); return; }
    setTimeout(doSwap, ms * 0.5);
    setTimeout(function () {
      doSwap();
      fx.innerHTML = "";
      fx.style.display = "none";
      fx.style.transform = "";
      done();
    }, ms + 80);
  }

  /* State machine: IDLE -> (validated command) -> LOCKED/RUNNING -> IDLE.
     While isTransitioning, every command is ignored. */
  function goTo(index, onSwap) {
    index = Math.max(0, Math.min(SCENES.length - 1, index));
    if (index === state.index || state.isTransitioning) return;
    var from = state.index, dir = index > from ? 1 : -1, lo = Math.min(from, index);
    var t = TR[SCENES[lo] + ">" + SCENES[lo + 1]];
    var cur = els.scenes[SCENES[from]], nxt = els.scenes[SCENES[index]];
    state.isTransitioning = true;
    touch.on = false;
    runFX(t[0], dir, reducedMotion ? 260 : t[1], function swap() {
      if (onSwap) onSwap();
      cur.classList.remove("is-active");
      nxt.classList.add("is-active");
      state.index = index;
      state.sealOpened = index > 1;   // returning to Page 2 re-arms Tap to Open
      var inner = nxt.querySelector(".scene__inner");
      if (inner) inner.scrollTop = 0;
      els.backBtn.hidden = index <= 1;
    }, function done() {
      state.isTransitioning = false;
      playSceneEffect(SCENES[index]);
    });
  }

  function indexOf(key) { return SCENES.indexOf(key); }
  function next() { if (state.index < SCENES.length - 1) goTo(state.index + 1); }
  function prev() { if (state.index > 0) goTo(state.index - 1); }

  els.backBtn.addEventListener("click", function (e) { e.stopPropagation(); prev(); });

  document.querySelectorAll(".lang-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (state.isTransitioning) return;
      var lang = btn.getAttribute("data-lang");
      state.lang = lang;
      goTo(indexOf("seal"), function () { applyLanguage(lang); });
    });
  });

  /* Page 2: ONE tap starts the music and the card-opening transition. */
  if (els.inviteCard) {
    els.inviteCard.addEventListener("click", function (e) {
      e.stopPropagation();
      if (state.sealOpened || state.isTransitioning) return;
      startMusic();
      if (els.musicToggle) els.musicToggle.hidden = false;
      goTo(indexOf("couple"));
    });
  }

  /* ------------------------------------------------------------
     SWIPE = COMMAND. Nothing here ever moves, transforms or scrolls
     a scene. touchmove only records the finger and (at a boundary or
     on a fixed page) cancels the browser's native scroll/bounce.
     Only touchend decides; it needs >= 90px, vertical dominance
     >= 1.5x, no velocity shortcut, and an idle state machine.
  ------------------------------------------------------------ */
  var SWIPE_EXCLUDED = { lang: true, seal: true };
  var MIN_SWIPE = 90, DOMINANCE = 1.5, EDGE = 4;
  var touch = { on: false, x: 0, y: 0, dx: 0, dy: 0, fit: true, top: true, bot: true };

  function markSwiped() { document.documentElement.classList.add("has-swiped"); }

  function touchStart(e) {
    touch.on = false;
    if (state.isTransitioning || e.touches.length > 1) return;
    if (e.target.closest("button, a, input, textarea, select, [role=button], .invite-card")) return;
    var key = SCENES[state.index];
    if (SWIPE_EXCLUDED[key]) return;
    var t = e.touches[0], se = els.scenes[key].querySelector(".scene__inner");
    var sh = se ? se.scrollHeight : 0, ch = se ? se.clientHeight : 0, st = se ? se.scrollTop : 0;
    touch.on = true; touch.x = t.clientX; touch.y = t.clientY; touch.dx = 0; touch.dy = 0;
    touch.fit = sh <= ch + 2;                 // whole scene fits: fully fixed poster
    touch.top = st <= EDGE;
    touch.bot = st + ch >= sh - EDGE;
  }
  function touchMove(e) {
    if (!touch.on) return;
    if (e.touches.length > 1) { touch.on = false; return; }
    var t = e.touches[0];
    touch.dx = t.clientX - touch.x; touch.dy = t.clientY - touch.y;
    if (e.cancelable && (touch.fit || (touch.dy < 0 ? touch.bot : touch.top))) e.preventDefault();
  }
  function touchEnd(e) {
    if (!touch.on) return;
    touch.on = false;
    if (state.isTransitioning) return;
    var c = e.changedTouches && e.changedTouches[0];
    var dx = c ? c.clientX - touch.x : touch.dx, dy = c ? c.clientY - touch.y : touch.dy;
    if (Math.abs(dy) < MIN_SWIPE || Math.abs(dy) < Math.abs(dx) * DOMINANCE) return;
    if (dy < 0 && (touch.fit || touch.bot)) { markSwiped(); next(); }
    else if (dy > 0 && (touch.fit || touch.top)) { markSwiped(); prev(); }
  }
  els.app.addEventListener("touchstart", touchStart, { passive: true });
  els.app.addEventListener("touchmove", touchMove, { passive: false });
  els.app.addEventListener("touchend", touchEnd, { passive: true });
  els.app.addEventListener("touchcancel", function () { touch.on = false; }, { passive: true });

  document.addEventListener("keydown", function (e) {
    if (e.target && e.target.closest && e.target.closest("button, a, input, textarea, select")) return;
    if ((e.key === "ArrowDown" || e.key === "PageDown") && !SWIPE_EXCLUDED[SCENES[state.index]]) { e.preventDefault(); next(); }
    else if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); prev(); }
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
