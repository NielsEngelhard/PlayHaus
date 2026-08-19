import type { LobbySettings } from "@/api/calls/league-of-letters-lobby";
import AppText from "@/components/text/AppText";
import LanguageSelect from "@/components/ui/LanguageSelect";
import { Spacing } from "@/constants/theme";
import WordLengthCard from "@/features/league-of-letters/components/WordLengthCard";
import { SOLO_MAX_GUESSES } from "@/features/league-of-letters/solo-settings";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    settings: LobbySettings,
    /** Takes the whole object, the way `useLobby` does: a save carries both knobs. */
    onChange: (settings: LobbySettings) => void
}

/**
 * What the host has decided the game will be, as controls rather than as a summary.
 *
 * The design had a read-only chip list here with an `Edit` link off to another screen.
 * These are the same two knobs the solo setup screen carries, and there is nowhere for
 * that link to go — so the knobs themselves live here, in `inline` form: the tiles and
 * the language field with their own cards and labels taken off, named by the rows above
 * them instead. That is the whole reason `variant` exists on both components.
 *
 * Deliberately the same components solo uses and not a copy of them: the word length a
 * room plays at and the word length one player plays at are the same setting, and a
 * second implementation of it is a second thing to keep in step with the backend.
 */
export default function LobbySettingsCard({ settings, onChange }: Props) {
    const styles = useStyles();

    return (
        <View style={styles.card}>
            <AppText style={styles.label}>Spelinstellingen</AppText>

            <AppText style={styles.row}>Woordlengte</AppText>

            <WordLengthCard
                variant='inline'
                value={settings.wordLength}
                onChange={wordLength => onChange({ ...settings, wordLength })}
            />

            <AppText style={styles.row}>Taal</AppText>

            <LanguageSelect
                variant='inline'
                value={settings.locale}
                onChange={locale => onChange({ ...settings, locale })}
            />

            {/*
              * The two facts about a round that nobody gets to choose. The number of
              * rounds is not among them on purpose: the backend works that out from how
              * many players there are, so it is not settled until the game starts and a
              * figure printed here would be a guess.
              */}
            <AppText style={styles.footnote}>
                {SOLO_MAX_GUESSES} pogingen per ronde · eerste letter gegeven
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    // The house card, one notch tighter: this is the third thing on a busy screen, and
    // the standing 16pt of padding around two rows of controls reads as slack.
    card: {
        padding: 14,
        borderRadius: 20,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary,
        ...(theme.scheme === 'dark' ? {} : theme.popShadow(theme.colors.border))
    },
    label: {
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },
    // Names the control under it. Quieter than the card's own label — it is a row inside
    // a section, not another section.
    row: {
        marginTop: Spacing.two + 2,
        marginBottom: 6,
        fontSize: 12,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },
    footnote: {
        marginTop: 10,
        fontSize: 11.5,
        fontWeight: 600,
        color: theme.colors.textMuted
    }
}))
