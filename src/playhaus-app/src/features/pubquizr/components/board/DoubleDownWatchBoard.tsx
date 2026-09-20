import AppText from "@/components/text/AppText";
import TextHint from "@/components/text/TextHint";
import { FontSizes, Radii, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import BoardSpotlight from "@/features/pubquizr/components/board/BoardSpotlight";
import { EASY_POINTS, HARD_POINTS } from "@/features/pubquizr/round-six";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    answering: Seat
}

// Round 6 on every phone but the chooser's, before there is a question to show.
export default function DoubleDownWatchBoard({ answering }: Props) {
    const t = useT();
    const styles = useStyles();

    const sides = [
        { label: t('pubquizr.board.easy'), points: EASY_POINTS },
        { label: t('pubquizr.board.hard'), points: HARD_POINTS }
    ];

    return (
        <View style={styles.board}>
            <BoardSpotlight seat={answering} title={t('pubquizr.board.choosing', { name: answering.name })}>
                <View style={styles.sides}>
                    {sides.map(side => (
                        <View key={side.label} style={styles.side}>
                            <AppText style={styles.sideLabel}>{side.label}</AppText>

                            <AppText style={styles.sidePoints}>
                                {side.points === 1
                                    ? t('pubquizr.board.onePoint')
                                    : t('pubquizr.board.pointsWorth', { points: side.points })}
                            </AppText>
                        </View>
                    ))}
                </View>

                <TextHint text={t('pubquizr.board.choiceAppears')} />
            </BoardSpotlight>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    board: {
        marginTop: Spacing.three,
        flex: 1,
        minHeight: 0
    },

    sides: {
        flexDirection: 'row',
        gap: Spacing.two
    },

    side: {
        alignItems: 'center',
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.three,
        borderRadius: Radii.md,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundSecondary
    },

    sideLabel: {
        fontSize: FontSizes.sm,
        fontWeight: 900,
        color: theme.colors.text
    },

    sidePoints: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        color: theme.colors.textSecondary
    }
}))
