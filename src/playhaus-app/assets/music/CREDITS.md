# Music credits

Every loop here is **CC0 1.0** (public domain). No attribution is legally required — this file
records where each file came from, and what was done to it, so the next person does not have to
guess.

| File | Scene | Track | Author | Source |
|---|---|---|---|---|
| `chill.m4a` | playing | Menu Chill Music | etrock | https://opengameart.org/content/menu-chill-music |
| `bossa.m4a` | lobby | Bossa Shop Theme (Lo-Fi cut) | SpringySpringo | https://opengameart.org/content/bossa-shop-theme-in-low-fi-and-hd |
| `zen.m4a` | playing | — (predates this file) | — | — |
| `sunny.m4a` | playing | Sunny Side Up | Pro Sensory (Alex McCulloch) | https://opengameart.org/content/sunny-side-up-updated-version |
| `adventure.m4a` | playing | Happy Adventure (Loop) | TinyWorlds | https://opengameart.org/content/happy-adventure-loop |
| `action.m4a` | playing | — (predates this file) | — | — |

## What was done to them

Sources arrived as WAV, OGG and MP3 of wildly different lengths and loudness. Each was turned into
a loop the same way:

1. **Cut to one repeating musical period.** Found by spectral self-similarity rather than by
   counting bars — the period is where the music genuinely comes back around, which is what a loop
   wants. Several sources are whole pieces with an intro and a fade-out; those parts are gone.
2. **The tail folded back over the head.** The material that naturally *follows* the loop is
   crossfaded (equal-power) over its first seconds, so the last sample leads into the first and
   `AudioPlayer.loop` has nothing to stumble on.
3. **A 5 ms fade at each edge.** AAC's encoder delay means a decoder's idea of "the first sample"
   is not exact; landing on true zero gives the imprecision nothing to click on.
4. **Normalised to −18.8 LUFS** (two-pass, linear — a constant gain, so each loop keeps its own
   dynamics). One `VOLUME` constant covers all six, so they have to agree on loudness.
5. **Encoded AAC 64 kbps / 44.1 kHz**, for the reason in `src/features/audio/music-player.ts`:
   `loop` is not gapless and mp3's encoder padding widens the seam into something audible.

`zen.m4a` and `action.m4a` predate this and were rebuilt the same way — `zen` carried 0.9 s of
silence at its head and 6.6 s at its tail, so it fell silent for over seven seconds every time it
wrapped; `action` wrapped on a step of 0.118 full-scale, which is a click. Both are re-encodes of
the shipped AAC (no original was available), so they carry one generation of loss.
