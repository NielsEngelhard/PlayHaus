import AppText from "@/components/text/AppText";
import { useT } from "@/features/i18n/LanguageContext";
import TableFinalists from "@/features/pubquizr/components/table/TableFinalists";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import type { ReactNode } from "react";
import { View } from "react-native";

interface Props {
    /** The round at length: what happens, who does what, and what it pays. */
    brief: string
    // Whatever else the round's screen has to add: a clock, a count of what has been credited.
    children?: ReactNode
    /** The two players the round is between, for the finale and nothing else. */
    finalists?: [Seat, Seat] | null
    /** What the round is called, e.g. "Closest guess". */
    kind: string
    /** Whoever is running it, and null until the turn names one. */
    quizmaster?: Seat | null
    /** 1-based, and the number the table calls the round by. */
    round: number
    /** The shared screen's type scale -- see `table-scale.ts`. */
    scale: number
    totalRounds: number
}

// A round, stated. Round 4 is played entirely off this: the words are the describer's secret, so the rules are all the table gets.
export default function TableRoundIntro({
    brief,
    children,
    finalists = null,
    kind,
    quizmaster = null,
    round,
    scale,
    totalRounds
}: Props) {
    const styles = useStyles();
    const t = useT();

    return (
        <View style={[styles.stage, { gap: Math.round(14 * scale), maxWidth: Math.round(860 * scale) }]}>
            <AppText style={[styles.kicker, { fontSize: Math.round(11 * scale) }]}>
                {t('pubquizr.play.intro.round', { round })}
                {' '}
                {t('pubquizr.play.intro.of', { total: totalRounds })}
            </AppText>

            <AppText style={[styles.kind, { fontSize: Math.round(40 * scale) }]}>{kind}</AppText>

            {finalists !== null && <TableFinalists finalists={finalists} scale={scale} />}

            {quizmaster !== null && (
                <AppText style={[styles.quizmaster, { fontSize: Math.round(18 * scale) }]}>
                    {t('pubquizr.play.intro.quizmaster', { name: quizmaster.name })}
                </AppText>
            )}

            <AppText
                style={[
                    styles.brief,
                    { fontSize: Math.round(17 * scale), lineHeight: Math.round(25 * scale) }
                ]}
            >
                {brief}
            </AppText>

            {children}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    stage: {
        alignItems: 'center'
    },
    kicker: {
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },
    kind: {
        fontWeight: 900,
        letterSpacing: -1.2,
        textAlign: 'center',
        color: theme.colors.text
    },
    quizmaster: {
        fontWeight: 800,
        textAlign: 'center',
        color: theme.colors.text
    },
    brief: {
        fontWeight: 600,
        textAlign: 'center',
        color: theme.colors.textSecondary
    }
}))
