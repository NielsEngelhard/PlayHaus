import type { TournamentMatch } from "@/api/calls/league-of-letters-tournament";
import AppText from "@/components/text/AppText";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import MatchCell from "@/features/league-of-letters/components/tournament/MatchCell";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    match: TournamentMatch,
    /** Whose screen this is, so their own line reads as theirs. */
    userId: string | undefined,
    /** The round this match belongs to, counting from 1. */
    stage: number
}

// Your own matchup, lifted out of the columns while the table reads the draw.
export default function StagePreview({ match, userId, stage }: Props) {
    const styles = useStyles();
    const t = useT();

    return (
        <View style={styles.card}>
            <AppText style={styles.kicker}>
                {t('lol.tournament.matchup.title', { stage })}
            </AppText>

            <MatchCell match={match} userId={userId} />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        gap: Spacing.two
    },
    kicker: {
        fontSize: 10.5,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: theme.colors.textMuted
    }
}))
