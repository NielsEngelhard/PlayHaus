import type { LobbySettings } from "@/api/calls/league-of-letters-lobby";
import TitleText from "@/components/text/TitleText";
import LanguageSelect from "@/components/ui/LanguageSelect";
import ToggleRow from "@/components/ui/ToggleRow";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import WordLengthCard from "@/features/league-of-letters/components/WordLengthCard";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";
import SecondsPerGuessSelect from "./TimePerRoundSelect";

interface Props {
    settings: LobbySettings,
    onChange: (settings: LobbySettings) => void
}

export default function LobbySettingsCard({ settings, onChange }: Props) {
    const styles = useStyles();
    const t = useT();

    return (
        <View style={styles.card}>
            <TitleText title={t('lol.lobby.settingsTitle')} />

            <WordLengthCard
                variant='inline'
                value={settings.wordLength}
                onChange={wordLength => onChange({ ...settings, wordLength })}
            />

            <SecondsPerGuessSelect
                variant='inline'
                value={settings.secondsPerGuess}
                onChange={secondsPerGuess => onChange({ ...settings, secondsPerGuess })}                
            />

            <ToggleRow
                value={settings.hardMode}
                onChange={value => onChange({ ...settings, hardMode: value })}
                label={t('lol.settings.hardMode.label')}
                description={t('lol.settings.hardMode.description')}
                icon="zap"
            />            

            <LanguageSelect
                variant='inline'
                value={settings.locale}
                onChange={locale => onChange({ ...settings, locale })}
            />
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
        ...(theme.scheme === 'dark' ? {} : theme.popShadow(theme.colors.border)),
        gap: Spacing.three
    },
    label: {
        fontSize: 16,
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
