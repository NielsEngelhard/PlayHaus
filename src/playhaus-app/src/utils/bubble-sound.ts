import { createSoundEffect } from "@/utils/sound-effect";

// The bubble that pops under a finger, shared by every button and key in the app.
export const playBubble = createSoundEffect(require('@/assets/sounds/bubble.wav'));
