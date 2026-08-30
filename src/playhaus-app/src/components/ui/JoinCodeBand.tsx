import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import PopupModal from "@/components/ui/PopupModal";
import QrCode from "@/components/ui/QrCode";
import TextButton from "@/components/ui/TextButton";
import { accentOf, type Game } from "@/constants/games";
import { Brand, FontSizes, Spacing, accentInkColor, linearGradient, withAlpha } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { TranslationKey } from "@/features/i18n/keys";
import { joinLink } from "@/features/join/join-link";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { shareLink, type ShareOutcome } from "@/utils/share";
import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";

interface Props {
    /** Whose room this is. Supplies the fill, the ink on it, the mark and the join link. */
    game: Game,
    /** The join code, as the server issued it. Drawn one character to a tile. */
    code: string,
    /** For layout only — the page decides how far the band reaches. See `LobbyPageBase`. */
    style?: StyleProp<ViewStyle>
}

/** How long a line about what just happened stays up. Long enough to read once. */
const NOTE_MS = 2200;

const MARK_SIZE = 30;

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
 * The code, as big as the page can afford, on a slab of the game's own colour.
 *
 * This is what a host's screen is *for*. Everything else on it — who has arrived, what
 * the game is set to — is something you check; the code is something you read out across
 * a table, and at 30pt a tile you can do that without leaning in. The band is what makes
 * it the loudest thing on the page and, incidentally, the answer to "which game is this
 * room for" — the same job `GameIndexPage`'s slab does one screen earlier.
 *
 * Nothing here is League of Letters. The fill, the mark and the link all come off the
 * `Game` it is handed, so a second lobby's band is its own colour for free.
 *
 * The tiles do not follow the theme into the dark: the band is bright in both schemes, so
 * paper tiles with an ink line and an ink shadow are right on it either way.
 */
export default function JoinCodeBand({ game, code, style }: Props) {
    const styles = useStyles();
    const t = useT();

    const accent = accentOf(game);
    const ink = accentInkColor(accent.ink);

    /**
     * The one thing on the band allowed to be a different colour from the rest.
     *
     * The share control is the only control here — everything else is something to read —
     * so it gets the lemon that the app spends on "this one is tappable". A pale band is
     * already carrying ink, and lemon on it would be the quietest thing rather than the
     * loudest, so there the emphasis is weight alone.
     */
    const highlight = accent.ink === 'paper' ? Brand.lemon : Brand.ink;

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
    const joinUrl = joinLink(game, code);

    async function share() {
        setNote(noteFor(await shareLink(joinUrl, t('lobby.shareTitle'))));
    }

    return (
        <View style={[styles.band, linearGradient(accent.gradient), style]}>
            <View style={styles.lockup}>
                <Image
                    source={game.icon}
                    style={styles.mark}
                    accessibilityRole='image'
                    accessibilityLabel={game.name}
                />

                <AppText style={[styles.eyebrow, { color: withAlpha(ink, 0.85) }]}>
                    {t('lobby.joinCode')}
                </AppText>
            </View>

            {/* The code and the machine-readable version of it, on one line. The QR is one
                more tile in the row rather than a block of its own, because it is a
                convenience beside the code and not an alternative to it — the row still
                reads left to right as "here is the code". */}
            <View style={styles.codeRow}>
                <View
                    style={styles.tiles}
                    accessibilityRole='text'
                    accessibilityLabel={t('lobby.codeSpoken', { characters: characters.join(' ') })}
                >
                    {characters.map((character, index) => (
                        <View
                            key={index}
                            style={[
                                styles.tile,
                                // The row ends on the app's own highlight rather than
                                // trailing off in four identical tiles.
                                index === characters.length - 1 && styles.tileLast
                            ]}
                        >
                            <AppText style={styles.character}>{character}</AppText>
                        </View>
                    ))}
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
                    accessibilityLabel={t('lobby.qrLabel')}
                >
                    <QrCode value={joinUrl} size={TILE_HEIGHT - QR_INSET * 2} />
                </PopPressable>
            </View>

            <View style={styles.row}>
                <AppText style={[styles.aside, { color: withAlpha(ink, 0.85) }]}>
                    {note === null ? t('lobby.readAloud') : t(note)}
                </AppText>

                <Pressable
                    onPress={() => void share()}
                    accessibilityRole='button'
                    accessibilityLabel={t('lobby.shareLinkLabel')}
                    style={styles.share}
                >
                    <Feather name='share-2' size={15} color={highlight} />

                    <AppText style={[styles.shareLabel, { color: highlight }]}>
                        {t('lobby.shareLink')}
                    </AppText>
                </Pressable>
            </View>

            <PopupModal
                visible={enlarged}
                title={t('lobby.qrTitle')}
                message={t('lobby.qrCopy')}
                onRequestClose={() => setEnlarged(false)}
            >
                <View style={styles.qrStage}>
                    <QrCode value={joinUrl} size={QR_LARGE} />
                </View>

                {/* The code again, under the grid. A camera that will not focus, a screen
                    with a glare across it, a guest whose phone is flat — the characters
                    are the fallback for all of them, and cost one line here. */}
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
    if (outcome === 'copied') return 'lobby.linkCopied';
    if (outcome === 'failed') return 'lobby.shareFailed';

    return null;
}

const useStyles = createThemedStyles(theme => ({
    band: {
        gap: 11,
        // The sides match the page's own gutters, so the code lines up with everything
        // under it even though the fill has reached out past them. A page that reaches
        // further still — `LobbyPageBase` on a desktop window — widens this to match
        // through `style`, which lands after this.
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.three,
        paddingBottom: 18,
        borderBottomWidth: theme.borderWidth,
        borderBottomColor: theme.colors.border
    },
    lockup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    mark: {
        width: MARK_SIZE,
        height: MARK_SIZE,
        flexShrink: 0,
        // The SVG draws its own ground, border and glyph; this only rounds the corner off
        // to the same radius it is cut with.
        borderRadius: 8
    },
    eyebrow: {
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8
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
    tile: {
        flex: 1,
        height: TILE_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        borderWidth: 2,
        // Ink and paper in both schemes. The band under these is the game's gradient
        // whatever the canvas is doing, so there is nothing here for the theme to answer.
        borderColor: Brand.ink,
        backgroundColor: Brand.textOnAccent,
        boxShadow: '3px 3px 0 0 #0F0D12'
    },
    tileLast: {
        backgroundColor: Brand.lemon
    },
    character: {
        fontSize: 30,
        fontWeight: 900,
        // Outfit Black is wide; without pulling it in, a full tile touches its own border.
        letterSpacing: -1,
        color: Brand.ink
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
        borderWidth: 2,
        borderColor: Brand.ink,
        // Paper in both schemes, matching the code it holds — see the note in `QrCode`
        // about why this one tile does not follow the theme into the dark.
        backgroundColor: Brand.textOnAccent,
        boxShadow: '3px 3px 0 0 #0F0D12'
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.two
    },
    aside: {
        flexShrink: 1,
        fontSize: 12,
        fontWeight: 600
    },
    share: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7
    },
    shareLabel: {
        fontSize: 13,
        fontWeight: 800
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
