import AppText from '@/components/text/AppText';
import { useEntrance } from '@/components/ui/useEntrance';
import { Brand } from '@/constants/theme';
import { useT } from '@/features/i18n/LanguageContext';
import { OneOfUsRole, withCivilians } from '@/features/one-of-us/models';
import { faceOf } from '@/features/one-of-us/roles';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import Feather from '@expo/vector-icons/Feather';
import { Animated, Easing, View, type StyleProp, type ViewStyle } from 'react-native';

interface Props {
    // Held back so the stamp lands after whatever it passes judgement on.
    delayMs?: number
    name: string
    role: OneOfUsRole
    /** For layout only — how the card sits among its siblings. The look lives here. */
    style?: StyleProp<ViewStyle>
}

// What the table actually did: who it took off the board, and whether that was the imposter.
export default function RoleVerdict({ delayMs = STAMP_DELAY_MS, name, role, style }: Props) {
    const t = useT();
    const styles = useStyles();

    const face = faceOf(role);
    const caught = !withCivilians(role);

    // Brought down from above like a stamp, landing with a thump.
    const stamp = useEntrance({ delayMs, durationMs: STAMP_MS, easing: Easing.out(Easing.back(2.2)) });

    return (
        <Animated.View
            style={[
                styles.card,
                style,
                {
                    opacity: stamp.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
                    transform: [
                        { scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [STAMP_SCALE, 1] }) },
                        { rotate: stamp.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '0deg'] }) }
                    ]
                }
            ]}
        >
            <View style={[styles.mark, { backgroundColor: face.fill }]}>
                <Feather name={face.icon} size={14} color={Brand.ink} />
            </View>

            <AppText style={styles.text}>
                {t(role === OneOfUsRole.Nitwit
                    ? 'oneOfUs.play.elimination.nitwit'
                    : caught
                        ? 'oneOfUs.play.elimination.imposter'
                        : 'oneOfUs.play.elimination.civilian', { name })}

                <AppText style={styles.outcome}>
                    {` · ${t(caught ? 'oneOfUs.play.elimination.hit' : 'oneOfUs.play.elimination.miss')}`}
                </AppText>
            </AppText>
        </Animated.View>
    )
}

const STAMP_DELAY_MS = 350;
const STAMP_MS = 380;
const STAMP_SCALE = 1.6;

const useStyles = createThemedStyles(theme => ({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 11,
        paddingHorizontal: 12,
        borderRadius: 14,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },

    // A rounded square rather than a circle: the roles are not people.
    mark: {
        width: 28,
        height: 28,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 9,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink
    },

    text: {
        flex: 1,
        minWidth: 0,
        fontSize: 12.5,
        lineHeight: 12.5 * 1.4,
        fontWeight: 800,
        color: theme.colors.text
    },

    outcome: {
        fontWeight: 900,
        color: theme.colors.textMuted
    }
}))
