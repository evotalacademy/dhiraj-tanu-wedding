# Dhiraj & Tanu — Wedding Invitation

A premium, cinematic, mobile-only digital wedding invitation. Static site,
no build step, no backend — ready to publish on GitHub Pages as-is.

## What's in this project

```
index.html    Markup for all 9 pages (scenes) + shared inline SVG artwork
style.css     All visual design — colours, type, layout, animation
script.js     Navigation, language switching, music, maps & calendar
config.js     ← the only file you should normally need to edit
assets/       couple-page3.jpg, couple-page7.jpg (the couple's actual photographs)
sahilmadan-wedding-invitation-421393.mp3   Background music
README.md     This file
```

## The experience

1. **Language** — Hindi / English, large buttons.
2. **Sealed invitation** — tap the card to open it. This single tap both
   plays the card-opening animation *and* starts the background music
   (required by iOS/Safari: audio can only start from a real tap).
3. **Couple reveal** — the couple's actual photograph (`couple-page3.jpg`), names, parents' names.
4. **Manas Path** — 29–30 November, no time shown, at home, with a small illustrated havan (sacred fire) scene.
5. **Mehndi & Sangeet** — 1 December, 5:30 PM, at home, with a small illustrated henna-hand scene in the round frame.
6. **Haldi** — 2 December, 10:30 AM, at home, with a small illustrated Haldi scene in a matching round frame.
7. **Shubh Vivah** — 2 December, 5:00 PM, Tejashvi Palace, the couple's actual photograph (`couple-page7.jpg`), and a line about the Barat's departure time from home.
8. **Our Little Stars** — all six children's names, with a small illustrated
   family composition.
9. **Final page** — a closing message, "View Venue" (opens the supplied
   Google Maps link) and "Add to Calendar" (downloads a .ics file), then
   the couple's signature and contact numbers. There is intentionally no
   countdown.

Navigation is swipe-based: swipe up for the next page, swipe down for the
previous one, plus a small Back button top-right. The gesture is read as a
command, never a drag — a full-screen page stays completely stationary
while you swipe; it only ever softens into a plain crossfade (opacity plus
a hairline scale/blur, never a slide) once a deliberate swipe has been
recognized on release, requiring both a minimum 90px of movement and a
clearly vertical direction (over 1.5x more vertical than horizontal) — a
fast short flick never counts, distance is never optional. If a page's
content is taller than the screen, the first swipes simply scroll it as
usual — only once you reach the bottom (or top, going back) does the next
swipe change the page. Movement is locked to the vertical axis everywhere
(`overflow-x: hidden`, `touch-action: pan-y`, and matching overscroll
guards on `html`, `body`, `#app` and every scene) — there is no sideways
or diagonal movement possible anywhere in the interaction.

Each of the eight page-to-page changes plays its own distinct cinematic
choreography — a curtain dissolving open, a warm card-reveal seam and
light bloom, a royal light dissolve, botanical corners blooming in, a
soft floral swirl, a golden powder bloom, a maroon/gold garland-and-rose
reveal, and a final frame settling into place — but none of that
choreography ever happens *to* the scene itself. The scene only ever
crossfades; all of the visual character lives in a separate fixed overlay
layer that plays briefly on top and is cleaned up immediately after, so
the underlying page never visibly moves, slides or drags no matter which
transition is playing. The same change always looks the same way forward
and backward. A subtle "swipe up" cue appears near the bottom of each
page and fades once you've swiped for the first time. Three pages (Mehndi
& Sangeet, Haldi, Shubh Vivah) play a short 2–3 second decorative particle
shower once they've fully arrived — never during the transition itself.
Buttons, links and phone numbers never trigger page navigation
themselves. A small music mute/unmute toggle appears once the card has
been opened; it mutes rather than stops the track, so playback position
is never lost. Visitors on a desktop browser (or with
"reduce motion" enabled) still get a simple, fully working crossfade.

## Editing content

Open `config.js`. Names, dates, times, venues, the home address, the
Google Maps link, the calendar event, the children's names, and every
piece of bilingual copy live there. You should not need to touch
`index.html`, `style.css` or `script.js` for a normal content change.

To swap a photograph, replace `couple-page3.jpg` or `couple-page7.jpg` in
`assets/` (keep the same filename), or update the `src` attribute on that
`<img>` in `index.html` if you use a different filename. Both images use
`alt=""` on purpose — the couple's names are already shown as text next
to each photo, so the image itself is decorative and doesn't need
duplicate alt text.

## Deploying to GitHub Pages

1. Create a new GitHub repository (or use an existing one).
2. Upload every file in this folder, keeping `assets/` as a subfolder.
3. In the repository's **Settings → Pages**, set the source to the branch
   you pushed to (root folder).
4. GitHub will publish the site at `https://<your-username>.github.io/<repo-name>/`.

No build step, no npm install, no backend, no paid APIs — everything runs
as static files.

## Notes on the music

- The `<audio>` element is a single, persistent element with `loop` set.
- Playback is only ever requested from the tap on the sealed invitation
  (Page 2) — never on page load and never on the language screen — so it
  works within iOS/Safari's autoplay restrictions.
- Muting toggles `audio.muted`; it never pauses or resets the track, so
  unmuting resumes exactly where the song was.
- If autoplay is blocked for any reason, the toggle honestly shows a
  "silent" state, and the visitor's next tap on it starts playback as a
  fresh gesture.

## Navigation & transitions (final architecture)

- **Scenes are static.** No scene, wrapper or background is ever transformed, scrolled or animated during navigation. `touchmove` never moves anything; it only records the finger.
- **Swipe = command.** Only `touchend` decides: vertical distance >= 90px AND vertical dominance >= 1.5x horizontal. Velocity never triggers navigation. One valid gesture = one page. Pages 1 and 2 are button/tap driven.
- **Tall scenes** (content taller than the screen, e.g. Shubh Vivah on small phones) scroll only their inner content; the next deliberate swipe at the top/bottom edge navigates.
- **Transitions live in `#fx`**, a temporary full-screen overlay built in `script.js` (`FX` table) with the Web Animations API. It covers the current scene, swaps the active scene underneath while fully covered, uncovers the stationary destination, then removes itself. Reverse navigation plays a mirrored (rising) choreography; the card opening plays as a closing.
- **State machine:** idle -> validated command -> locked/running -> idle. All input is ignored while a transition runs.
- `prefers-reduced-motion` swaps every transition for a short ivory fade.
