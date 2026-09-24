import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import { accentOf, type Game } from "@/constants/games";
import { Brand, accentInkColor, withAlpha } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { TranslationKey } from "@/features/i18n/keys";
import { joinLink } from "@/features/join/join-link";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { shareLink, type ShareOutcome } from "@/utils/share";
import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { View } from "react-native";

interface Props {
    /** Whose room this is. Supplies the fill, the ink on it and the join link. */
    game: Game,
    /** The join code, as the server issued it. Drawn as one headline. */
    code: string
}

/** How long a line about what just happened stays up. Long enough to read once. */
const NOTE_MS = 2200;

// The code as a headline, on a card of the game's own colour.
export default function JoinCodeHero({ game, code }: Props) {
    const styles = useStyles();
    const t = useT();

    const accent = accentOf(game);
    const ink = accentInkColor(accent.ink);

    // The share pill is the loudest control on the card, so it gets the lemon that the app spends on "this one is tappable".
    const shareFill = accent.ink === 'paper' ? Brand.lemon : Brand.ink;
    const shareInk = accent.ink === 'paper' ? Brand.ink : Brand.textOnAccent;

    // What the share control just did, in words.
    const [note, setNote] = useState<TranslationKey | null>(null);

    useEffect(() => {
        if (note === null) return;

        const timer = setTimeout(() => setNote(null), NOTE_MS);
        return () => clearTimeout(timer);
    }, [note]);

    const joinUrl = joinLink(game, code);

    async function share() {
        setNote(noteFor(await shareLink(joinUrl, t('lobby.shareTitle'))));
    }

    return (
        <View style={[
            styles.card,
            // The fill flat rather than shaded, and the glow in the same colour.
            { backgroundColor: accent.color, boxShadow: `0 16px 30px -18px ${accent.color}` }
        ]}>
            <View style={styles.lockup}>
                <AppText style={[styles.eyebrow, { color: withAlpha(ink, 0.8) }]}>
                    {t('lobby.joinCode')}
                </AppText>

                <AppText
                    style={[styles.code, { color: ink }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    accessibilityLabel={t('lobby.codeSpoken', { characters: [...code].join(' ') })}
                >
                    {code}
                </AppText>

                <View style={styles.pills}>
                    <PopPressable
                        onPress={() => void share()}
                        accessibilityRole='button'
                        accessibilityLabel={t('lobby.shareLinkLabel')}
                        style={[styles.pill, { backgroundColor: shareFill }]}
                    >
                        <Feather name='share-2' size={13} color={shareInk} />

                        <AppText style={[styles.pillLabel, { color: shareInk }]}>
                            {t('lobby.shareLink')}
                        </AppText>
                    </PopPressable>
                </View>

                {/* One reserved line, so the card does not jump when a share has something to say and settle again when it stops. */}
                <AppText style={[styles.note, { color: withAlpha(ink, 0.85) }]}>
                    {note === null ? '' : t(note)}
                </AppText>
            </View>
        </View>
    )
}

// The one line that says what happened, or nothing when the platform already has.
function noteFor(outcome: ShareOutcome): TranslationKey | null {
    if (outcome === 'copied') return 'lobby.linkCopied';
    if (outcome === 'failed') return 'lobby.shareFailed';

    return null;
}

const useStyles = createThemedStyles(() => ({
    // The fill and the glow land inline, from the game's accent.
    card: {
        padding: 18,
        borderRadius: 26
    },
    lockup: {
        minWidth: 0
    },
    eyebrow: {
        fontSize: 10.5,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 2
    },
    code: {
        marginTop: 4,
        fontSize: 52,
        lineHeight: 52,
        fontWeight: 900,
        letterSpacing: 2
    },
    pills: {
        marginTop: 10,
        flexDirection: 'row',
        gap: 7
    },
    pill: {
        height: 30,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999
    },
    pillLabel: {
        fontSize: 12,
        fontWeight: 900
    },
    note: {
        marginTop: 8,
        minHeight: 15,
        fontSize: 11,
        fontWeight: 700
    }
}))
