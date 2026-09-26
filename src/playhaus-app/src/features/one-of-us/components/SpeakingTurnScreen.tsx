import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import { Brand, FontSizes, Gradients, Radii, ShadowReach, Spacing, hardShadow, withAlpha } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import OouBand from "@/features/one-of-us/components/OouBand";
import TableStrip from "@/features/one-of-us/components/TableStrip";
import type { Seat } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    /** 1-based position in this round's shuffled order. */
    number: number
    nextUp: Seat | null
    onLeave: () => void
    onNext: () => void
    // Seats voted out in an earlier round.
    out: Set<number>
    round: number
    speaker: Seat
    // Seats that have already had their turn this round.
    spoken: Set<number>
    // Everybody at the table in seating order, whether still in or not.
    table: Seat[]
    total: number
}

const AVATAR = 96;
const DASH_WIDTH = 24;
const DASH_HEIGHT = 8;

// Whose turn it is to say something.
export default function SpeakingTurnScreen({
    number,
    nextUp,
    onLeave,
    onNext,
    out,
    round,
    speaker,
    spoken,
    table,
    total
}: Props) {
    const t = useT();
    const styles = useStyles();

    const last = number === total;
    const ink = speaker.swatch.foreground;

    return (
        <View style={styles.screen}>
            <OouBand
                onClose={onLeave}
                closeLabel={t('oneOfUs.play.close')}
                label={t('oneOfUs.play.speak.bandLabel', { round })}
                count={`${number}/${total}`}
                title={t('oneOfUs.play.speak.title')}
            >
                <TableStrip
                    seats={table}
                    markOf={seat => seat.seat === speaker.seat
                        ? 'focus'
                        : out.has(seat.seat) ? 'out' : spoken.has(seat.seat) ? 'done' : 'default'}
                />
            </OouBand>

            <View style={styles.middle}>
                <View style={[styles.card, { backgroundColor: speaker.swatch.color }]}>
                    <AppText style={[styles.label, { color: withAlpha(ink, 0.72) }]}>
                        {t('oneOfUs.play.speak.nowSpeaking')}
                    </AppText>

                    <View style={styles.avatar}>
                        <AppText style={styles.initials}>{speaker.initials}</AppText>
                    </View>

                    <AppText style={[styles.name, { color: ink }]} numberOfLines={2}>
                        {speaker.name}
                    </AppText>

                    <AppText style={[styles.hint, { color: ink }]}>
                        {t('oneOfUs.play.speak.hint')}
                    </AppText>
                </View>

                <View
                    style={styles.dashes}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                >
                    {Array.from({ length: total }, (_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dash,
                                index < number - 1 && styles.dashDone,
                                index === number - 1 && styles.dashNow
                            ]}
                        />
                    ))}
                </View>
            </View>

            <ActionButton
                icon={last ? 'message-circle' : 'arrow-right'}
                text={last || nextUp === null
                    ? t('oneOfUs.play.speak.lastNext')
                    : t('oneOfUs.play.speak.next', { name: nextUp.name })}
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
        paddingVertical: Spacing.four
    },
    // Wears the speaker's own swatch, which is a brand fill, so its outline is ink in both schemes.
    card: {
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: Spacing.five,
        paddingHorizontal: Spacing.four,
        borderRadius: Radii.band,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        ...hardShadow(ShadowReach.hardLarge, theme.colors.shadow)
    },
    label: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        letterSpacing: 2,
        textTransform: 'uppercase',
        textAlign: 'center'
    },
    // Paper whatever the swatch, so the initials are ink on every speaker.
    avatar: {
        width: AVATAR,
        height: AVATAR,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.textOnAccent,
        ...hardShadow(ShadowReach.hard, Brand.ink)
    },
    initials: {
        fontSize: FontSizes.xxxl,
        fontWeight: 900,
        color: Brand.ink
    },
    name: {
        fontSize: FontSizes.huge,
        lineHeight: FontSizes.huge,
        fontWeight: 900,
        letterSpacing: -1.6,
        textAlign: 'center'
    },
    hint: {
        fontSize: FontSizes.md,
        lineHeight: FontSizes.md * 1.5,
        fontWeight: 500,
        textAlign: 'center'
    },
    dashes: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.one
    },
    dash: {
        width: DASH_WIDTH,
        height: DASH_HEIGHT,
        borderRadius: Radii.full,
        backgroundColor: theme.colors.boardEmptyBorder
    },
    dashDone: {
        backgroundColor: theme.colors.text
    },
    dashNow: {
        backgroundColor: Gradients.violet[2]
    }
}))
