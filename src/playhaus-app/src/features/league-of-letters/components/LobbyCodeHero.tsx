import AppText from "@/components/text/AppText";
import Label from "@/components/text/Label";
import PopPressable from "@/components/ui/PopPressable";
import PopupModal from "@/components/ui/PopupModal";
import QrCode from "@/components/ui/QrCode";
import TextButton from "@/components/ui/TextButton";
import { Brand, FontSizes, Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { LEAGUE_OF_LETTERS } from "@/constants/games";
import { joinLink } from "@/features/join/join-link";
import { shareLink, type ShareOutcome } from "@/utils/share";
import { useT } from "@/features/i18n/LanguageContext";
import type { TranslationKey } from "@/features/i18n/keys";
import Feather from "@expo/vector-icons/Feather";
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
 * How much of the QR tile the code itself gives up to the tile's own padding.
 *
 * A code needs a pale margin to resolve its own edge against, and the tile is that margin
 * — so the grid stops short of the border rather than running into it.
 */
const QR_INSET = 7;

/** The enlarged code, in the panel. Sized to be read across a table rather than squinted at. */
const QR_LARGE = 240;

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
    const t = useT();

    const link = theme.scheme === 'dark' ? LINK_DARK : theme.colors.secondary;

    /**
     * What the share control just did, in words.
     *
     * Not `useCooldown`: that answers whether a control is resting, and there are three
     * different things to say here — the phone shared, the browser copied, or neither
     * worked. The text is the state, so the text is what is held.
     */
    const [note, setNote] = useState<TranslationKey | null>(null);

    useEffect(() => {
        if (note === null) return;

        const timer = setTimeout(() => setNote(null), NOTE_MS);
        return () => clearTimeout(timer);
    }, [note]);

    /** Whether the code is being shown big enough to actually point a camera at. */
    const [enlarged, setEnlarged] = useState(false);

    const characters = [...code];

    // The same link the QR carries, so the two ways of handing this room over cannot come
    // apart. Built rather than hardcoded — see `joinLink`.
    const joinUrl = joinLink(LEAGUE_OF_LETTERS, code);

    async function share() {
        setNote(noteFor(await shareLink(joinUrl, t('lol.lobby.shareTitle'))));
    }

    return (
        <View>
            <Label label={t('lol.lobby.code')} />

            {/* The code and the machine-readable version of it, on one line. The QR is one
                more tile in the row rather than a block of its own, because it is a
                convenience beside the code and not an alternative to it — the row still
                reads left to right as "here is the code". */}
            <View style={styles.codeRow}>
                <View
                    style={styles.tiles}
                    accessibilityRole='text'
                    accessibilityLabel={t('lol.lobby.codeSpoken', { characters: characters.join(' ') })}
                >
                    {characters.map((character, index) => {
                        return (
                            <View key={index} style={[styles.tile]}>
                                <AppText style={[styles.character]}>
                                    {character}
                                </AppText>
                            </View>
                        )
                    })}
                </View>

                {/* Tappable because it has to be. At tile size a join link is a 33-module
                    grid at about 1.7 points per module — right in the row, and far too fine
                    to resolve under a camera. So the small one is the affordance, and the
                    panel behind it, where the same code gets 6.5 points a module, is the
                    thing that actually gets scanned. */}
                <PopPressable
                    style={styles.qrTile}
                    onPress={() => setEnlarged(true)}
                    accessibilityRole='button'
                    accessibilityLabel={t('lol.lobby.qrLabel')}
                >
                    <QrCode value={joinUrl} size={TILE_HEIGHT - QR_INSET * 2} />
                </PopPressable>
            </View>

            <View style={styles.row}>
                <AppText style={styles.aside}>{note === null ? t('lol.lobby.readAloud') : t(note)}</AppText>

                <Pressable
                    onPress={() => void share()}
                    accessibilityRole='button'
                    accessibilityLabel={t('lol.lobby.shareLinkLabel')}
                    style={styles.share}
                >
                    <Feather name='share-2' size={15} color={link} />

                    <AppText style={styles.shareLabel}>{t('lol.lobby.shareLink')}</AppText>
                </Pressable>
            </View>

            <PopupModal
                visible={enlarged}
                title={t('lol.lobby.qrTitle')}
                message={t('lol.lobby.qrCopy')}
                onRequestClose={() => setEnlarged(false)}
            >
                <View style={styles.qrStage}>
                    <QrCode value={joinUrl} size={QR_LARGE} />
                </View>

                {/* The code again, under the grid. A camera that will not focus, a screen
                    with a glare across it, a guest whose phone is flat — the four
                    characters are the fallback for all of them, and cost one line here. */}
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

/**
 * The one line that says what happened, or nothing when the platform already has.
 *
 * A share sheet that was opened and closed again is not a failure and gets no message:
 * the player saw it and decided. A copy has nothing to show for itself, so it says so.
 */
function noteFor(outcome: ShareOutcome): TranslationKey | null {
    if (outcome === 'copied') return 'lol.lobby.linkCopied';
    if (outcome === 'failed') return 'lol.lobby.shareFailed';

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
    codeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    tiles: {
        // Takes whatever the QR beside it does not, so the letters keep filling the line.
        flex: 1,
        flexDirection: 'row',
        gap: 6,
        paddingRight: 3
    },
    qrTile: {
        // Square and fixed, with the letters sharing out the rest. A QR that stretched
        // with the row would stop being square, and one that is not square does not scan.
        flexShrink: 0,
        width: TILE_HEIGHT,
        height: TILE_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.borderStrong : theme.colors.border,
        // Paper in both schemes, matching the code it holds — see the note in `QrCode`
        // about why this one tile does not follow the theme into the dark.
        backgroundColor: Brand.textOnAccent,
        boxShadow: theme.scheme === 'dark'
            ? '0 0 22px -8px rgba(255, 229, 56, 0.3)'
            : '3px 3px 0 0 #0F0D12, 0 14px 24px -16px rgba(15, 13, 18, 0.55)'
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
