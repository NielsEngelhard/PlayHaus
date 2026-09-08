import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import PopupModal from "@/components/ui/PopupModal";
import QrCode from "@/components/ui/QrCode";
import TextButton from "@/components/ui/TextButton";
import { accentOf, type Game } from "@/constants/games";
import { Brand, FontSizes, Spacing, accentInkColor, withAlpha } from "@/constants/theme";
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

/** The paper tile beside the code, and the grid inside it. */
const QR_TILE = 78;
const QR_SIZE = 62;

/** The enlarged code, in the panel. Sized to be read across a table rather than squinted at. */
const QR_LARGE = 240;

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

    /** Whether the code is being shown big enough to actually point a camera at. */
    const [enlarged, setEnlarged] = useState(false);

    // The same link the QR carries, so the two ways of handing this room over cannot come apart.
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

                    <PopPressable
                        onPress={() => setEnlarged(true)}
                        accessibilityRole='button'
                        accessibilityLabel={t('lobby.qrLabel')}
                        style={[styles.pill, { backgroundColor: withAlpha(Brand.ink, 0.22) }]}
                    >
                        <Feather name='grid' size={13} color={ink} />

                        {/* An initialism, not a word — the same two letters in every catalogue, so it is written here rather than translated. */}
                        <AppText style={[styles.pillLabel, { color: ink }]}>QR</AppText>
                    </PopPressable>
                </View>

                {/* One reserved line, so the card does not jump when a share has something to say and settle again when it stops. */}
                <AppText style={[styles.note, { color: withAlpha(ink, 0.85) }]}>
                    {note === null ? '' : t(note)}
                </AppText>
            </View>

            {/* Tappable because it has to be. */}
            <PopPressable
                onPress={() => setEnlarged(true)}
                accessible={false}
                importantForAccessibility='no-hide-descendants'
                style={styles.qrTile}
            >
                <QrCode value={joinUrl} size={QR_SIZE} />
            </PopPressable>

            <PopupModal
                visible={enlarged}
                title={t('lobby.qrTitle')}
                message={t('lobby.qrCopy')}
                onRequestClose={() => setEnlarged(false)}
            >
                <View style={styles.qrStage}>
                    <QrCode value={joinUrl} size={QR_LARGE} />
                </View>

                {/* The code again, under the grid. */}
                <AppText style={styles.qrCode}>{code}</AppText>

                <TextButton
                    text={t('common.close')}
                    variant='muted'
                    fullWidth
                    onPress={() => setEnlarged(false)}
                />
            </PopupModal>
        </View>
    )
}

// The one line that says what happened, or nothing when the platform already has.
function noteFor(outcome: ShareOutcome): TranslationKey | null {
    if (outcome === 'copied') return 'lobby.linkCopied';
    if (outcome === 'failed') return 'lobby.shareFailed';

    return null;
}

const useStyles = createThemedStyles(theme => ({
    // The fill and the glow land inline, from the game's accent.
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: 18,
        borderRadius: 26
    },
    lockup: {
        flex: 1,
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
    },
    // Paper in both schemes, matching the code it holds.
    qrTile: {
        flexShrink: 0,
        width: QR_TILE,
        height: QR_TILE,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
        backgroundColor: Brand.textOnAccent,
        boxShadow: '0 8px 18px -8px rgba(15, 13, 18, 0.8)'
    },
    qrStage: {
        alignItems: 'center',
        marginBottom: Spacing.three
    },
    qrCode: {
        marginBottom: Spacing.three,
        textAlign: 'center',
        fontSize: FontSizes.xl,
        fontWeight: 900,
        letterSpacing: 6,
        color: theme.colors.text
    }
}))
