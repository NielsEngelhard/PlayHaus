import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { useEntrance } from "@/components/ui/useEntrance";
import { Brand, FontSizes, Radii, Spacing } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import { usePhrase, useT } from "@/features/i18n/LanguageContext";
import OouBand from "@/features/one-of-us/components/OouBand";
import { OneOfUsRole } from "@/features/one-of-us/models";
import { faceOf } from "@/features/one-of-us/roles";
import type { Seat } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { Animated, Easing, View } from "react-native";

interface Props {
    /** The round about to start. */
    nextRound: number
    onLeave: () => void
    onNext: () => void
    person: Seat
    remaining: number
    role: OneOfUsRole
    // The round that just ended.
    round: number
}

const AVATAR = 88;
const STAMP_DELAY_MS = 350;
const STAMP_MS = 380;
const STAMP_SCALE = 1.6;

// What the table learns about the player it just sent away, told in the third person.
const VERDICTS: Record<OneOfUsRole, { name: TranslationKey, why: TranslationKey }> = {
    [OneOfUsRole.Civilian]: {
        name: 'oneOfUs.play.elimination.role.civilian.name',
        why: 'oneOfUs.play.elimination.role.civilian.why'
    },
    [OneOfUsRole.Imposter]: {
        name: 'oneOfUs.play.elimination.role.imposter.name',
        why: 'oneOfUs.play.elimination.role.imposter.why'
    },
    [OneOfUsRole.Nitwit]: {
        name: 'oneOfUs.play.elimination.role.nitwit.name',
        why: 'oneOfUs.play.elimination.role.nitwit.why'
    }
};

export default function EliminationScreen({
    nextRound,
    onLeave,
    onNext,
    person,
    remaining,
    role,
    round
}: Props) {
    const t = useT();
    const phrase = usePhrase();
    const styles = useStyles();

    // The real role, not what the phone showed them: this is the moment the table finds out.
    const face = faceOf(role);
    const verdict = VERDICTS[role] ?? VERDICTS[OneOfUsRole.Civilian];

    // Brought down like a stamp, landing with a thump.
    const stamp = useEntrance({ delayMs: STAMP_DELAY_MS, durationMs: STAMP_MS, easing: Easing.out(Easing.back(2.2)) });

    return (
        <View style={styles.screen}>
            <OouBand
                onClose={onLeave}
                closeLabel={t('oneOfUs.play.close')}
                label={t('oneOfUs.play.elimination.bandLabel', { round })}
                count={t('oneOfUs.play.vote.inCount', { count: remaining })}
                title={t('oneOfUs.play.elimination.title', { name: person.name })}
            />

            <View style={styles.middle}>
                <View style={styles.card}>
                    <View style={styles.sticker}>
                        <AppText style={styles.stickerText}>{t('oneOfUs.play.elimination.sticker')}</AppText>
                    </View>

                    <SeatAvatar seat={person} size={AVATAR} />

                    <AppText style={styles.was}>{t('oneOfUs.play.elimination.was', { name: person.name })}</AppText>

                    <Animated.View
                        style={[
                            styles.role,
                            { backgroundColor: face.fill },
                            {
                                opacity: stamp.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
                                transform: [
                                    { scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [STAMP_SCALE, 1] }) },
                                    { rotate: stamp.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '0deg'] }) }
                                ]
                            }
                        ]}
                    >
                        <AppText style={styles.roleName}>{t(verdict.name)}</AppText>
                        <AppText style={styles.roleWhy}>{phrase({ key: verdict.why, values: { name: person.name } })}</AppText>
                    </Animated.View>
                </View>

                <AppText style={styles.remaining}>
                    {t('oneOfUs.play.elimination.left', { count: remaining })}
                </AppText>
            </View>

            <ActionButton
                text={t('oneOfUs.play.elimination.next', { round: nextRound })}
                onPress={onNext}
            />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    screen: {
        flex: 1,
        width: '100%'
    },
    middle: {
        flex: 1,
        justifyContent: 'center',
        gap: Spacing.four,
        paddingTop: Spacing.five,
        paddingBottom: Spacing.three
    },
    card: {
        alignItems: 'center',
        gap: Spacing.three,
        paddingTop: Spacing.five,
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.four,
        borderRadius: Radii.band,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardLarge
    },
    // The scheme's own ink, so it inverts to paper in the dark.
    sticker: {
        position: 'absolute',
        top: -Spacing.three,
        right: Spacing.four,
        paddingVertical: Spacing.one,
        paddingHorizontal: Spacing.three,
        borderRadius: Radii.md,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.text,
        transform: [{ rotate: '8deg' }]
    },
    stickerText: {
        fontSize: FontSizes.lg,
        fontWeight: 900,
        letterSpacing: 2,
        color: theme.colors.background
    },
    was: {
        fontSize: FontSizes.xxxl,
        lineHeight: FontSizes.xxxl,
        fontWeight: 900,
        letterSpacing: -1.2,
        textAlign: 'center',
        color: theme.colors.text
    },
    // A brand fill, so its outline and text are ink in both schemes.
    role: {
        alignSelf: 'stretch',
        gap: Spacing.one,
        padding: Spacing.three,
        borderRadius: Radii.xl,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink
    },
    roleName: {
        fontSize: FontSizes.xxl,
        fontWeight: 900,
        letterSpacing: -1,
        color: Brand.ink
    },
    roleWhy: {
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.5,
        fontWeight: 500,
        color: Brand.ink
    },
    remaining: {
        fontSize: FontSizes.md,
        fontWeight: 700,
        textAlign: 'center',
        color: theme.colors.textSecondary
    }
}))
