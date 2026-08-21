# Audio credits

Everything the app plays is either CC0 or made here. Nothing in this folder needs
attribution in the app itself — this file exists so the next person does not have to
go looking for where a track came from before they dare ship it.

## Music

`music/zen.m4a` — the menu loop.
- *Calm Ambient 1 (Synthwave 4k)* by cynicmusic (The Cynic Project).
- Source: https://opengameart.org/content/calm-ambient-1 (`001_Synthwave_4k.mp3`).
- Licence: **CC0** (public domain dedication). No attribution required.
- Re-encoded here to AAC 64 kbps stereo with a −1 dB gain trim.

`music/action.m4a` — the League of Letters board loop.
- *5 Action Chiptunes*, track "Level 1", by Juhani Junkala.
- Source: https://opengameart.org/content/5-chiptunes-action — the pack's own
  `INFO.txt` reads "These music tracks have been released under CC0 creative
  commons license".
- Licence: **CC0**. No attribution required.
- Re-encoded here to AAC 64 kbps mono with a −10.9 dB gain trim.

Both files were levelled to roughly −19 LUFS so that the one `VOLUME` constant in
`src/features/audio/music-player.ts` suits either of them. Keep that in mind before
dropping in a replacement: a track mastered louder will arrive louder, and the app has
no per-track gain to correct it with.

AAC rather than mp3 on purpose — `AudioPlayer.loop` is not gapless, and an mp3's
encoder padding turns the seam at the loop point into an audible gap.

## Sound effects

`sounds/bubble.wav` — every press in the app, from a keyboard key to a menu card.
- Synthesised for this project, not sampled: a rising sine sweep under a fast
  exponential decay, which is roughly what a bubble's Minnaert resonance does.
- 44.1 kHz mono 16-bit, 130 ms.
- Levelled to match the `click.wav` it replaced, so the app got a new sound and not a
  louder one.
