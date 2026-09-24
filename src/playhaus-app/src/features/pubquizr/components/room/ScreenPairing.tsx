import type { PQLobby } from '@/api/calls/pubquizr-lobby';
import LobbyPageBase from '@/components/layout/LobbyPageBase';
import AppText from '@/components/text/AppText';
import ActionButton from '@/components/ui/ActionButton';
import InlineNotification from '@/components/ui/InlineNotification';
import { initialsFor } from '@/components/ui/lobby-seat';
import StartGameButton from '@/components/ui/StartGameButton';
import { PUBQUIZR } from '@/constants/games';
import { Brand, FontSizes, Radii, Spacing, withAlpha } from '@/constants/theme';
import { useT } from '@/features/i18n/LanguageContext';
import type { PQLobbyState } from '@/features/pubquizr/multi-device/useQuizLobby';
import { useCastTable } from '@/features/screen/cast';
import { screenUrl } from '@/features/screen/screen-url';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { useTheme } from '@/features/theme/ThemeContext';
import { avatarColorById } from '@/utils/color-utils';
import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';

// react-native-web has no native animation module, so asking for one there is a console warning and nothing else.
const useNativeDriver = Platform.OS !== 'web';

/** Half a breath, matching the lobby's own live dot. */
const PULSE_MS = 1000;

// One character of the code, at the size the design draws it.
const BOX_WIDTH = 46;
const BOX_HEIGHT = 56;

const TILE_SIZE = 44;
const STEP_SIZE = 22;
const AVATAR_SIZE = 26;

// How far the avatars in the waiting strip tuck under each other.
const AVATAR_OVERLAP = -8;

interface Props {
    lobby: PQLobby,
    /** Opens the close-the-room confirm. Owned by `QuizLobbyView`, which also acts on it. */
    onBack: () => void,
    state: PQLobbyState
}

// The step in front of a central-screen room: the host waits here until a television is actually watching.
export default function ScreenPairing({ lobby, onBack, state }: Props) {
    const styles = useStyles();
    const t = useT();
    const theme = useTheme();

    // What to read out to whoever is holding the television remote, and null on a build that knows no address.
    const screen = screenUrl();

    // Only a Chromecast build has anything to offer here; the browser fork always says no.
    const cast = useCastTable(lobby.code);

    // The host holds a seat of their own, so anybody past them is somebody waiting.
    const waiting = lobby.players.filter(player => player.userId !== lobby.hostId);

    return (
        <LobbyPageBase
            game={PUBQUIZR}
            title={t('pubquizr.lobby.pairing.title')}
            live={state.connection === 'open'}
            onBack={onBack}
            backLabel={t('lobby.close')}
            code={lobby.code}
            footer={
                <View>
                    {/* Shaped like the start button it stands in for, so the room reads as one step short of ready. */}
                    <StartGameButton disabled text={t('pubquizr.lobby.pairing.blocked')} onPress={() => undefined} />

                    <AppText style={styles.footnote}>{t('pubquizr.lobby.pairing.auto')}</AppText>
                </View>
            }
        >
            <Steps />

            <View style={styles.card}>
                <View style={styles.tile}>
                    <Feather name='monitor' size={21} color={Brand.ink} />
                </View>

                <AppText style={styles.cardTitle}>{t('pubquizr.lobby.pairing.cardTitle')}</AppText>

                {screen === null ? (
                    <AppText style={styles.instruction}>{t('pubquizr.lobby.pairing.openOnNoUrl')}</AppText>
                ) : (
                    <>
                        <AppText style={styles.instruction}>{t('pubquizr.lobby.pairing.openOn')}</AppText>

                        <AppText style={styles.address}>{screen}</AppText>
                    </>
                )}

                <AppText style={styles.micro}>{t('pubquizr.lobby.pairing.fillIn')}</AppText>

                <View style={styles.boxes}>
                    {[...lobby.code].map((character, index) => (
                        <View key={index} style={styles.box}>
                            <AppText style={styles.character}>{character}</AppText>
                        </View>
                    ))}
                </View>

                <WaitingPill />
            </View>

            {cast.available && (
                <ActionButton
                    icon='cast'
                    text={cast.connected ? t('pubquizr.lobby.cast.connected') : t('pubquizr.lobby.cast.action')}
                    onPress={cast.show}
                />
            )}

            {waiting.length > 0 && (
                <View style={styles.strip}>
                    <View style={styles.avatars}>
                        {waiting.map(player => {
                            const avatar = avatarColorById(player.avatarColorId);

                            return (
                                <View
                                    key={player.userId}
                                    style={[styles.avatar, { backgroundColor: avatar.color }]}
                                >
                                    <AppText style={[styles.initials, { color: avatar.foreground }]}>
                                        {initialsFor(player.name)}
                                    </AppText>
                                </View>
                            )
                        })}
                    </View>

                    <AppText style={styles.stripWords} numberOfLines={2}>
                        {waiting.length === 1
                            ? t('pubquizr.lobby.pairing.onePlayerWaiting', { code: lobby.code })
                            : t('pubquizr.lobby.pairing.playersWaiting', { code: lobby.code, count: waiting.length })}
                    </AppText>
                </View>
            )}

            {state.actionError !== null && (
                <InlineNotification
                    icon='alert-triangle'
                    color={theme.colors.blush}
                    title={t('common.failed')}
                    message={t(state.actionError)}
                />
            )}
        </LobbyPageBase>
    )
}

// Two steps, of which this is the first: the screen, and then the room.
function Steps() {
    const styles = useStyles();
    const t = useT();

    return (
        <View style={styles.steps}>
            <View style={styles.step}>
                <View style={[styles.stepNumber, styles.stepNumberActive]}>
                    <AppText style={[styles.stepDigit, styles.stepDigitActive]}>1</AppText>
                </View>

                <AppText style={[styles.stepWord, styles.stepWordActive]}>
                    {t('pubquizr.lobby.pairing.stepScreen')}
                </AppText>
            </View>

            <View style={styles.stepRule} />

            <View style={styles.step}>
                <View style={styles.stepNumber}>
                    <AppText style={styles.stepDigit}>2</AppText>
                </View>

                <AppText style={styles.stepWord}>{t('pubquizr.lobby.pairing.stepRoom')}</AppText>
            </View>
        </View>
    )
}

// Nothing to do but wait, so the waiting breathes.
function WaitingPill() {
    const styles = useStyles();
    const t = useT();
    const theme = useTheme();

    const [pulse] = useState(() => new Animated.Value(1));

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    toValue: 0.35,
                    duration: PULSE_MS,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver
                }),
                Animated.timing(pulse, {
                    toValue: 1,
                    duration: PULSE_MS,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver
                })
            ])
        );

        loop.start();

        return () => loop.stop();
    }, [pulse]);

    return (
        <Animated.View style={[styles.pill, { opacity: pulse }]}>
            <View style={[styles.dot, { backgroundColor: theme.colors.text }]} />

            <AppText style={styles.pillWord}>{t('pubquizr.lobby.pairing.waiting')}</AppText>
        </Animated.View>
    )
}

const useStyles = createThemedStyles(theme => ({
    footnote: {
        marginTop: 10,
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: 600,
        color: theme.colors.textMuted
    },

    steps: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.two
    },

    step: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.one
    },

    stepNumber: {
        width: STEP_SIZE,
        height: STEP_SIZE,
        borderRadius: Radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary
    },

    stepNumberActive: {
        backgroundColor: Brand.lemon
    },

    stepDigit: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        color: theme.colors.textMuted
    },

    stepDigitActive: {
        color: Brand.ink
    },

    stepWord: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        letterSpacing: 0.3,
        color: theme.colors.textMuted
    },

    stepWordActive: {
        color: theme.colors.text
    },

    stepRule: {
        width: Spacing.four,
        height: theme.borderWidth,
        backgroundColor: theme.colors.border
    },

    card: {
        alignItems: 'center',
        gap: Spacing.two,
        padding: Spacing.four,
        borderRadius: Radii.lg,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },

    tile: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        borderRadius: Radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: Brand.lemon
    },

    cardTitle: {
        textAlign: 'center',
        fontSize: FontSizes.lg,
        fontWeight: 900,
        letterSpacing: -0.3,
        color: theme.colors.text
    },

    instruction: {
        textAlign: 'center',
        fontSize: FontSizes.sm,
        color: theme.colors.textSecondary
    },

    address: {
        fontSize: FontSizes.md,
        fontWeight: 900,
        letterSpacing: 0.2,
        color: theme.colors.text
    },

    micro: {
        marginTop: Spacing.one,
        fontSize: FontSizes.xs,
        fontWeight: 900,
        letterSpacing: 1.2,
        color: theme.colors.textMuted
    },

    boxes: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.two
    },

    box: {
        width: BOX_WIDTH,
        height: BOX_HEIGHT,
        borderRadius: Radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background
    },

    character: {
        fontSize: FontSizes.xl,
        fontWeight: 900,
        color: theme.colors.text
    },

    pill: {
        marginTop: Spacing.one,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.three,
        borderRadius: Radii.full,
        backgroundColor: withAlpha(theme.colors.text, 0.08)
    },

    dot: {
        width: 7,
        height: 7,
        borderRadius: Radii.full
    },

    pillWord: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        color: theme.colors.text
    },

    strip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        padding: Spacing.three,
        borderRadius: Radii.md,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary
    },

    avatars: {
        flexDirection: 'row',
        flexShrink: 0
    },

    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        marginLeft: AVATAR_OVERLAP,
        borderRadius: Radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border
    },

    initials: {
        fontSize: 9,
        fontWeight: 900
    },

    stripWords: {
        flex: 1,
        minWidth: 0,
        fontSize: FontSizes.xs,
        fontWeight: 700,
        color: theme.colors.textSecondary
    }
}));
