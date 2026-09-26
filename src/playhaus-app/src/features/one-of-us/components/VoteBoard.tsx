import AppText from "@/components/text/AppText";
import BleedScrollView from "@/components/ui/BleedScrollView";
import InlineNotification from "@/components/ui/InlineNotification";
import PopPressable from "@/components/ui/PopPressable";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { Brand, FontSizes, Radii, Spacing } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import OouBand from "@/features/one-of-us/components/OouBand";
import type { Seat } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useState, type ReactNode } from "react";
import { View } from "react-native";

interface Props {
    chosen: number | null
    disabled?: boolean
    error?: TranslationKey | null
    // The one committing button under the grid.
    footer: ReactNode
    label: string
    // Who breaks a tie, or null for a table dealt before the office existed.
    mayor: Seat | null
    onChoose: (seat: number) => void
    onLeave: () => void
    // Everybody already voted out, drawn after the living as tiles nobody can pick.
    out: Seat[]
    // Everybody still in.
    seats: Seat[]
}

const AVATAR = 56;
const CHECK = 24;
const COLUMNS = 2;

// The table deciding together: one card per player still in, and the one they tap turns blue.
export default function VoteBoard({
    chosen,
    disabled = false,
    error = null,
    footer,
    label,
    mayor,
    onChoose,
    onLeave,
    out,
    seats
}: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const [gridWidth, setGridWidth] = useState(0);
    const cardWidth = gridWidth === 0 ? undefined : (gridWidth - Spacing.three * (COLUMNS - 1)) / COLUMNS;

    const pickedInk = theme.scheme === 'dark' ? Brand.ink : Brand.textOnAccent;

    return (
        <View style={styles.screen}>
            <OouBand
                onClose={onLeave}
                closeLabel={t('oneOfUs.play.close')}
                label={label}
                count={t('oneOfUs.play.vote.inCount', { count: seats.length })}
                title={t('oneOfUs.play.vote.title')}
            >
                <AppText style={styles.subline}>
                    {t('oneOfUs.play.vote.subline')}
                    {mayor !== null && t('oneOfUs.play.vote.sublineMayor', { name: mayor.name })}
                </AppText>
            </OouBand>

            <BleedScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {error !== null && (
                    <InlineNotification
                        icon="alert-triangle"
                        color={theme.colors.blush}
                        title={t('common.failed')}
                        message={t(error)}
                    />
                )}

                <View style={styles.grid} onLayout={event => setGridWidth(event.nativeEvent.layout.width)}>
                    {seats.map(seat => {
                        const picked = seat.seat === chosen;

                        return (
                            <PopPressable
                                key={seat.seat}
                                disabled={disabled}
                                onPress={() => onChoose(seat.seat)}
                                accessibilityRole="button"
                                accessibilityLabel={seat.name}
                                accessibilityState={{ selected: picked, disabled }}
                                style={[styles.card, { width: cardWidth }, picked && styles.cardPicked]}
                            >
                                <SeatAvatar seat={seat} size={AVATAR} />

                                <AppText
                                    style={[styles.name, picked && { color: pickedInk }]}
                                    numberOfLines={1}
                                >
                                    {seat.name}
                                </AppText>

                                {picked ? (
                                    <View style={styles.check}>
                                        <Feather name="check" size={FontSizes.xs} color={Brand.ink} />
                                    </View>
                                ) : mayor?.seat === seat.seat && (
                                    <View style={styles.mayor}>
                                        <AppText style={styles.mayorText}>{t('oneOfUs.play.vote.mayor')}</AppText>
                                    </View>
                                )}
                            </PopPressable>
                        )
                    })}

                    {out.map(seat => (
                        <View key={seat.seat} style={[styles.card, styles.gone, { width: cardWidth }]}>
                            <View style={styles.goneAvatar}>
                                <AppText style={styles.goneInitials}>{seat.initials}</AppText>
                            </View>

                            <AppText style={styles.goneName} numberOfLines={2}>
                                {t('oneOfUs.play.vote.outTile', { name: seat.name })}
                            </AppText>
                        </View>
                    ))}
                </View>
            </BleedScrollView>

            <View style={styles.footer}>{footer}</View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    screen: {
        flex: 1,
        width: '100%'
    },
    subline: {
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.4,
        fontWeight: 700,
        color: Brand.ink
    },
    scroll: {
        flex: 1
    },
    content: {
        flexGrow: 1,
        gap: Spacing.three,
        paddingTop: Spacing.four,
        paddingBottom: Spacing.three
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.three
    },
    card: {
        alignItems: 'center',
        gap: Spacing.two,
        padding: Spacing.three,
        borderRadius: Radii.xl,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hard
    },
    // Blue in the light, lemon in the dark: whatever the scheme lights a focus with.
    cardPicked: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.focus,
        ...theme.shadows.hardLarge
    },
    name: {
        maxWidth: '100%',
        fontSize: FontSizes.lg,
        fontWeight: 900,
        color: theme.colors.text
    },
    check: {
        position: 'absolute',
        top: Spacing.two,
        right: Spacing.two,
        width: CHECK,
        height: CHECK,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.textOnAccent
    },
    mayor: {
        position: 'absolute',
        top: Spacing.two,
        right: Spacing.two,
        paddingVertical: Spacing.half,
        paddingHorizontal: Spacing.two,
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.lemon
    },
    mayorText: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        color: Brand.ink
    },
    gone: {
        opacity: 0.7,
        borderStyle: 'dashed',
        borderColor: theme.colors.borderDashed,
        backgroundColor: 'transparent',
        boxShadow: 'none'
    },
    // Silver rather than red: being out is not a warning.
    goneAvatar: {
        width: AVATAR,
        height: AVATAR,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.silver
    },
    goneInitials: {
        fontSize: FontSizes.lg,
        fontWeight: 900,
        color: Brand.slate
    },
    goneName: {
        fontSize: FontSizes.sm,
        fontWeight: 700,
        textAlign: 'center',
        color: theme.colors.textSecondary
    },
    footer: {
        flexShrink: 0,
        paddingTop: Spacing.two
    }
}))
