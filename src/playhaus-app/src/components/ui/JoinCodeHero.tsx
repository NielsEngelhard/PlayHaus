import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import { accentOf, type Game } from "@/constants/games";
import { Brand, ShadowReach, accentInkColor, hardShadow, withAlpha } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { joinLink } from "@/features/join/join-link";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useCooldown } from "@/hooks/useCooldown";
import { canShareLink, copyText, shareLink } from "@/utils/share";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    /** Whose room this is. Supplies the fill, the ink on it and the join link. */
    game: Game,
    /** The join code, as the server issued it. Drawn as one headline. */
    code: string
}

/** How long the copy button reads its confirmed state. Long enough to notice, short enough to forget. */
const COPIED_MS = 1600;

// The code as a headline, on a card of the game's own colour.
export default function JoinCodeHero({ game, code }: Props) {
    const styles = useStyles();
    const t = useT();

    const accent = accentOf(game);
    const ink = accentInkColor(accent.ink);

    // The share button is the loudest control on the card, so it gets the lemon that the app spends on "this one is tappable".
    const shareFill = accent.ink === 'paper' ? Brand.lemon : Brand.ink;
    const shareInk = accent.ink === 'paper' ? Brand.ink : Brand.textOnAccent;

    const [copied, confirmCopied] = useCooldown(COPIED_MS);

    const joinUrl = joinLink(game, code);
    // A bare host and path read better here than a scheme nobody typed.
    const displayUrl = joinUrl.replace(/^[a-z]+:\/\//, '');

    async function copy() {
        // Only a real copy is worth confirming.
        if (await copyText(joinUrl) === 'copied') confirmCopied();
    }

    return (
        <View style={[
            styles.card,
            // The fill flat rather than shaded, and the glow in the same colour.
            { backgroundColor: accent.color, boxShadow: `0 16px 30px -18px ${accent.color}` }
        ]}>
            <View style={styles.invite}>
                <Feather name='users' size={15} color={ink} />

                <AppText style={[styles.inviteText, { color: ink }]}>
                    {t('lobby.shareCodeInvite')}
                </AppText>
            </View>

            <AppText
                style={[styles.code, { color: ink }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                accessibilityLabel={t('lobby.codeSpoken', { characters: [...code].join(' ') })}
            >
                {code}
            </AppText>

            <View style={styles.link}>
                <Feather name='link' size={12} color={withAlpha(ink, 0.8)} />

                <AppText style={[styles.linkText, { color: withAlpha(ink, 0.8) }]} numberOfLines={1}>
                    {displayUrl}
                </AppText>
            </View>

            <View style={styles.buttons}>
                <PopPressable
                    onPress={() => void copy()}
                    accessibilityRole='button'
                    accessibilityLabel={t('lobby.copyLinkLabel')}
                    style={[
                        styles.button,
                        copied
                            ? { backgroundColor: Brand.mint, borderColor: Brand.ink }
                            : { backgroundColor: 'transparent', borderColor: withAlpha(ink, 0.55) }
                    ]}
                >
                    <Feather name={copied ? 'check' : 'copy'} size={15} color={copied ? Brand.ink : ink} />

                    <AppText style={[styles.buttonLabel, { color: copied ? Brand.ink : ink }]}>
                        {copied ? t('lobby.copied') : t('lobby.copyLink')}
                    </AppText>
                </PopPressable>

                {/* A browser with no share sheet has nothing for this button to open. */}
                {canShareLink() && (
                    <PopPressable
                        onPress={() => void shareLink(joinUrl, t('lobby.shareTitle'))}
                        accessibilityRole='button'
                        accessibilityLabel={t('lobby.shareLinkLabel')}
                        style={[
                            styles.button,
                            styles.shareButton,
                            { backgroundColor: shareFill, ...hardShadow(ShadowReach.hardSmall, Brand.ink) }
                        ]}
                    >
                        <Feather name='share-2' size={15} color={shareInk} />

                        <AppText style={[styles.buttonLabel, { color: shareInk }]}>
                            {t('lobby.shareLink')}
                        </AppText>
                    </PopPressable>
                )}
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    // The fill and the glow land inline, from the game's accent.
    card: {
        paddingVertical: 16,
        paddingHorizontal: 18,
        borderRadius: 26,
        gap: 10
    },
    invite: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    inviteText: {
        fontSize: 12.5,
        fontWeight: 800
    },
    code: {
        fontSize: 56,
        lineHeight: 56,
        fontWeight: 900,
        letterSpacing: 4
    },
    link: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minWidth: 0
    },
    linkText: {
        flex: 1,
        minWidth: 0,
        fontSize: 11.5,
        fontWeight: 700
    },
    buttons: {
        flexDirection: 'row',
        gap: 8
    },
    button: {
        flex: 1,
        height: 42,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: 13,
        borderWidth: 2
    },
    shareButton: {
        borderColor: Brand.ink
    },
    buttonLabel: {
        fontSize: 13,
        fontWeight: 900
    }
}))
