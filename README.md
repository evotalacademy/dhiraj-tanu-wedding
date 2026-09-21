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

Navigation is tap-anywhere-to-continue (with a subtle "tap to continue"
hint) plus a small Back button top-right. Buttons, links and phone numbers
never trigger page navigation themselves. A small music mute/unmute toggle
appears once the card has been opened; it mutes rather than stops the
track, so playback position is never lost.

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
