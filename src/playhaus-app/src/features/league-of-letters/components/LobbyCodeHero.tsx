import AppText from "@/components/text/AppText";
import Label from "@/components/text/Label";
import { ROUTES } from "@/constants/routes";
import { Brand, Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { shareLink, type ShareOutcome } from "@/utils/share";
import Feather from "@expo/vector-icons/Feather";
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

interface Props {
    /** The join code, as the server issued it. Drawn one character to a tile. */
    code: string
}

/** How long a line about what just happened stays up. Long enough to read once. */
const NOTE_MS = 2200;

/**
 * The link's own blue, which is not a palette token.
 *
 * `focus` is the app's answer to a pointer and in dark that is the lemon — the exact
 * colour the code tiles above this are wearing, which would make the link read as one
 * more of them. So the cobalt is kept in both schemes and only lifted far enough off the
 * dark canvas to stay legible.
 */
const LINK_DARK = '#8B97FF';

const TILE_HEIGHT = 76;

/**
 * The code, as big as the page can afford, plus the one other way to hand it over.
 *
 * This is what the host's screen is *for*. Everything else on it — who has arrived, what
 * the game is set to — is something you check; the code is something you read out across
 * a table, and at 30pt a tile you can do that without leaning in. The last tile takes the
 * lemon so the row ends on the game's own accent rather than trailing off.
 */
export default function LobbyCodeHero({ code }: Props) {
    const theme = useTheme();
    const styles = useStyles();

    const link = theme.scheme === 'dark' ? LINK_DARK : theme.colors.secondary;

    /**
     * What the share control just did, in words.
     *
     * Not `useCooldown`: that answers whether a control is resting, and there are three
     * different things to say here — the phone shared, the browser copied, or neither
     * worked. The text is the state, so the text is what is held.
     */
    const [note, setNote] = useState<string | null>(null);

    useEffect(() => {
        if (note === null) return;

        const timer = setTimeout(() => setNote(null), NOTE_MS);
        return () => clearTimeout(timer);
    }, [note]);

    const characters = [...code];

    async function share() {
        /*
         * Built rather than hardcoded, so the link points back at wherever this build
         * runs: the deployed origin on web, the `playhausapp://` scheme on a phone. The
         * native link only opens for somebody who already has the app — which is the
         * common case for the people you invite, and the code below it covers the rest.
         */
        const url = Linking.createURL(ROUTES.leagueOfLettersRoom(code));

        setNote(noteFor(await shareLink(url, 'Kom in mijn kamer')));
    }

    return (
        <View>
            <Label label="Kamercode" />

            <View
                style={styles.tiles}
                accessibilityRole='text'
                // Spelled out one character at a time: read as a word, a code comes out
                // of a screen reader as noise.
                accessibilityLabel={`Kamercode: ${characters.join(' ')}`}
            >
                {characters.map((character, index) => {
                    const last = index === characters.length - 1;

                    return (
                        <View key={index} style={[styles.tile]}>
                            <AppText style={[styles.character, last && styles.characterAccent]}>
                                {character}
                            </AppText>
                        </View>
                    )
                })}
            </View>

            <View style={styles.row}>
                <AppText style={styles.aside}>{note ?? 'Lees hem voor, of'}</AppText>

                <Pressable
                    onPress={() => void share()}
                    accessibilityRole='button'
                    accessibilityLabel='Deel de link naar deze kamer'
                    style={styles.share}
                >
                    <Feather name='share-2' size={15} color={link} />

                    <AppText style={styles.shareLabel}>Deel de link</AppText>
                </Pressable>
            </View>
        </View>
    )
}

/**
 * The one line that says what happened, or nothing when the platform already has.
 *
 * A share sheet that was opened and closed again is not a failure and gets no message —
 * the player saw it and decided. A copy has nothing to show for itself, so it says so.
 */
function noteFor(outcome: ShareOutcome): string | null {
    if (outcome === 'copied') return 'Link gekopieerd';
    if (outcome === 'failed') return 'Delen lukte niet';

    return null;
}

const useStyles = createThemedStyles(theme => ({
    label: {
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },
    tiles: {
        flexDirection: 'row',
        gap: 6,
        paddingRight: 3
    },
    tile: {
        flex: 1,
        height: TILE_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.borderStrong : theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        // Light stands the tiles up off the page the way every other card does. Dark
        // cannot — ink on near-black is nothing — so they glow in their own lemon instead.
        boxShadow: theme.scheme === 'dark'
            ? '0 0 22px -8px rgba(255, 229, 56, 0.3)'
            : '3px 3px 0 0 #0F0D12, 0 14px 24px -16px rgba(15, 13, 18, 0.55)'
    },
    character: {
        fontSize: 30,
        fontWeight: 900,
        // Outfit Black is wide; without pulling it in, a full tile touches its own border.
        letterSpacing: -1,
        color: theme.scheme === 'dark' ? theme.colors.lemon : theme.colors.text
    },
    characterAccent: {
        // Ink in both schemes: this one is sitting on the lemon now, not beside it.
        color: Brand.ink
    },
    row: {
        marginTop: 11,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.two
    },
    aside: {
        flexShrink: 1,
        fontSize: 12,
        fontWeight: 600,
        color: theme.colors.textSecondary
    },
    share: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7
    },
    shareLabel: {
        fontSize: 13,
        fontWeight: 800,
        color: theme.scheme === 'dark' ? LINK_DARK : theme.colors.secondary
    }
}))
