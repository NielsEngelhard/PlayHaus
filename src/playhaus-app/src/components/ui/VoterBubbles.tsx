import AppText from "@/components/text/AppText";
import type { LobbySeat } from "@/components/ui/lobby-seat";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { useEntrance } from "@/components/ui/useEntrance";
import { Brand, Radii, ShadowReach, Spacing, withAlpha } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { initialsOf } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { avatarColorById } from "@/utils/color-utils";
import type { ReactNode } from "react";
import { Animated, Easing, ScrollView, View, type StyleProp, type ViewStyle } from "react-native";

interface Props {
    // When the first tag pops in; the rest follow one by one.
    delayMs?: number,
    voters: string[],
    players: LobbySeat[],
    // Said in place of the tags when nobody picked this one.
    emptyLabel: string,
    userId: string,
    /** What picking this card meant, which is not the same sentence on the truth as on a fake. */
    label?: string,
    // Sitting on a brand surface, where the themed text colour would vanish in dark mode.
    onBrand?: boolean
}

const AVATAR_SIZE = 26;

const POP_MS = 300;
const POP_STAGGER_MS = 70;

// How wide one voter's name may get before it is cut, so no single tag fills the scroller on its own.
const NAME_MAX_WIDTH = 132;

// Everyone who picked one option, named under a label that says what picking it meant.
export default function VoterBubbles({ delayMs = 0, voters, players, userId, label, emptyLabel, onBrand = false }: Props) {
    const t = useT();
    const styles = useStyles();

    return (
        <View style={styles.block}>
            {label && (
                <AppText style={[styles.label, onBrand && styles.labelOnBrand]}>{label}</AppText>
            )}

            {voters.length === 0 ? (
                <AppText style={[styles.none, onBrand && styles.noneOnBrand]}>
                    {emptyLabel}
                </AppText>
            ) : (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.scroll}
                    contentContainerStyle={styles.row}
                >
                    {voters.map((voterId, index) => {
                        const player = players.find(candidate => candidate.userId === voterId);
                        const name = player?.name ?? '?';

                        return (
                            <PopIn key={voterId} delayMs={delayMs + index * POP_STAGGER_MS} style={styles.tag}>
                                {/* Initials come off the real name, so your own swatch does not change letters. */}
                                <SeatAvatar
                                    size={AVATAR_SIZE}
                                    seat={{
                                        seat: 0,
                                        name,
                                        score: 0,
                                        initials: initialsOf(name),
                                        swatch: avatarColorById(player?.avatarColorId ?? '')
                                    }}
                                />

                                <AppText style={styles.name} numberOfLines={1}>
                                    {voterId === userId ? t('common.you') : name}
                                </AppText>
                            </PopIn>
                        );
                    })}
                </ScrollView>
            )}
        </View>
    )
}

// Grows out of nothing, a little past its size, and settles.
function PopIn({ delayMs, style, children }: { delayMs: number, style: StyleProp<ViewStyle>, children: ReactNode }) {
    const pop = useEntrance({ delayMs, durationMs: POP_MS, easing: Easing.out(Easing.back(2.2)) });

    return <Animated.View style={[style, { transform: [{ scale: pop }] }]}>{children}</Animated.View>;
}

const useStyles = createThemedStyles(theme => ({
    block: {
        gap: 7
    },
    label: {
        fontSize: 10.5,
        fontWeight: 900,
        letterSpacing: 1.1,
        textTransform: 'uppercase',
        color: theme.colors.textSecondary
    },
    labelOnBrand: {
        color: withAlpha(Brand.ink, 0.72)
    },
    none: {
        fontSize: 12.5,
        fontWeight: 800,
        color: theme.colors.textSecondary
    },
    noneOnBrand: {
        color: withAlpha(Brand.ink, 0.72)
    },
    // A horizontal ScrollView stretches to its content's height otherwise.
    scroll: {
        flexGrow: 0
    },
    // Scrolls rather than wraps: a second line of tags would cost the cards height a phone has not got.
    row: {
        flexDirection: 'row',
        gap: Spacing.two - Spacing.half,
        // Room for the hard shadow, which the scroller would otherwise cut off.
        paddingRight: ShadowReach.hardSmall,
        paddingBottom: ShadowReach.hardSmall
    },
    tag: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two - Spacing.half,
        paddingVertical: 3,
        paddingLeft: 3,
        paddingRight: 11,
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundElement,
        ...theme.shadows.hardSmall
    },
    name: {
        maxWidth: NAME_MAX_WIDTH,
        fontSize: 13,
        fontWeight: 900,
        letterSpacing: -0.1,
        color: theme.colors.text
    }
}))
