import AppText from '@/components/text/AppText';
import { Brand, Gradients } from '@/constants/theme';
import PinnedNote, { NotePin } from '@/features/one-of-us/components/PinnedNote';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

interface Props {
    /** The line under the word — who else is holding what. */
    blurb: string
    coverHint: string
    coverLabel: string
    /** Skips the cover. For a board where nobody else can be looking at this screen. */
    initiallyRevealed?: boolean
    /** The micro-label on the note itself, e.g. "Jouw woord". */
    label: string
    onReveal?: () => void
    /** What to print for the player who was dealt a blank briefje. */
    whenBlank: string
    word: string | null
}

// The briefje you were dealt, still on the stack it was drawn from, face down until you take it.
export default function WordNote({
    blurb,
    coverHint,
    coverLabel,
    initiallyRevealed = false,
    label,
    onReveal,
    whenBlank,
    word
}: Props) {
    const styles = useStyles();

    const [revealed, setRevealed] = useState(initiallyRevealed);

    const text = word === null || word === '' ? whenBlank : word;

    function reveal() {
        setRevealed(true);
        if (onReveal !== undefined) onReveal();
    }

    return (
        <View style={styles.stack}>
            {/* The rest of the deal, still face down under yours. */}
            <View
                style={[styles.backing, styles.backingFar]}
                accessibilityElementsHidden
                importantForAccessibility='no-hide-descendants'
            />

            <View
                style={[styles.backing, styles.backingNear]}
                accessibilityElementsHidden
                importantForAccessibility='no-hide-descendants'
            />

            <PinnedNote index={1} style={styles.front}>
                <NotePin size={16} />

                {revealed ? (
                    <>
                        <AppText style={styles.label}>{label}</AppText>

                        <AppText style={[styles.word, { fontSize: wordSize(text) }]}>
                            {text}
                        </AppText>

                        <AppText style={styles.blurb}>{blurb}</AppText>
                    </>
                ) : (
                    <Pressable
                        onPress={reveal}
                        accessibilityRole='button'
                        accessibilityLabel={coverLabel}
                        style={styles.cover}
                    >
                        <View style={styles.eye}>
                            <Feather name='eye' size={18} color={Brand.ink} />
                        </View>

                        <AppText style={styles.coverLabel}>{coverLabel}</AppText>

                        <AppText style={styles.blurb}>{coverHint}</AppText>
                    </Pressable>
                )}
            </PinnedNote>
        </View>
    )
}

/** A briefje can hold a whole sentence, so the ink shrinks rather than the paper growing without end. */
function wordSize(text: string): number {
    if (text.length > 28) return 17;
    if (text.length > 16) return 21;

    return 26;
}

const NOTE_WIDTH = 224;

const useStyles = createThemedStyles(theme => ({
    stack: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center'
    },

    // Both backings sit behind the front note rather than in the flow, so the stack is only ever as tall as the note on top.
    // Inset rather than sized: a percentage height would collapse against the stack's own auto height on the web.
    backing: {
        position: 'absolute',
        top: -4,
        bottom: -4,
        width: NOTE_WIDTH - 8,
        borderRadius: 5,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border
    },

    backingFar: {
        backgroundColor: Gradients.violet[0],
        transform: [{ rotate: '6deg' }]
    },

    backingNear: {
        backgroundColor: theme.colors.backgroundSecondary,
        transform: [{ rotate: '-4deg' }]
    },

    front: {
        width: NOTE_WIDTH,
        alignItems: 'center',
        gap: 12,
        paddingVertical: 18,
        paddingHorizontal: 14,
        // A rung heavier than every other note: this is the one that was actually drawn.
        borderWidth: theme.borderWidth + 1,
        ...theme.shadows.hardLarge
    },

    label: {
        fontSize: 9.5,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        textAlign: 'center',
        color: theme.colors.textMuted
    },

    word: {
        fontWeight: 900,
        letterSpacing: -1,
        textAlign: 'center',
        color: theme.colors.text
    },

    blurb: {
        fontSize: 11.5,
        lineHeight: 11.5 * 1.45,
        fontWeight: 700,
        textAlign: 'center',
        color: theme.colors.textSecondary
    },

    cover: {
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10
    },

    // Lemon, the one warm thing on a note that is still face down.
    eye: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.lemon
    },

    coverLabel: {
        fontSize: 15,
        fontWeight: 900,
        letterSpacing: -0.3,
        textAlign: 'center',
        color: theme.colors.text
    }
}))
