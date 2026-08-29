import type { LobbySettings } from "@/api/calls/league-of-letters-lobby";
import CollapsibleCard from "@/components/ui/CollapsibleCard";
import LanguageSelect from "@/components/ui/LanguageSelect";
import ToggleRow from "@/components/ui/ToggleRow";
import { languageByCode } from "@/constants/languages";
import { useT } from "@/features/i18n/LanguageContext";
import SecondsPerGuessSelect from "@/features/league-of-letters/components/TimePerRoundSelect";
import WordLengthCard from "@/features/league-of-letters/components/WordLengthCard";

interface Props {
    settings: LobbySettings,
    onChange: (settings: LobbySettings) => void
}

/**
 * What the host is about to start a game on, folded away until they want it.
 *
 * Shut by default, which is a claim about what this screen is for: a lobby is mostly
 * spent watching people arrive, and four rows of controls between the code and the start
 * button push both of those off a phone. The settings already have sensible values and
 * most rooms never touch them — so they are one line here until somebody asks, and the
 * line says what they are set to, so asking is a choice rather than the only way to check.
 */
export default function LobbySettingsCard({ settings, onChange }: Props) {
    const t = useT();

    return (
        <CollapsibleCard
            title={t('lol.lobby.settingsTitle')}
            summary={summaryOf(settings, t)}
        >
            {/* One child per ruled section, the same shape `SettingsPageBase` uses. */}
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
                flush
                value={settings.hardMode}
                onChange={value => onChange({ ...settings, hardMode: value })}
                label={t('lol.settings.hardMode.label')}
                description={t('lol.settings.hardMode.description')}
                icon='zap'
            />

            <LanguageSelect
                variant='row'
                value={settings.locale}
                onChange={locale => onChange({ ...settings, locale })}
            />
        </CollapsibleCard>
    )
}

/**
 * The four settings as one line — "5 letters · 30s · Normal · Nederlands".
 *
 * In the order the rows are in, so the line and the open card read the same way round.
 * The language is the only one not translated: a language's name is written in its own
 * language wherever it appears, which is `LANGUAGES`' rule and not this card's.
 */
function summaryOf(settings: LobbySettings, t: ReturnType<typeof useT>): string {
    return [
        t('lol.settings.wordLengthOption', { letters: settings.wordLength }),
        t('lol.settings.summary.seconds', { seconds: settings.secondsPerGuess }),
        settings.hardMode ? t('lol.settings.summary.hardOn') : t('lol.settings.summary.hardOff'),
        languageByCode(settings.locale).label
    ].join(' · ');
}
