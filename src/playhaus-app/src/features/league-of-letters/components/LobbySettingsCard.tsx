import type { LobbySettings } from "@/api/calls/league-of-letters-lobby";
import CollapsibleCard from "@/components/ui/CollapsibleCard";
import LanguageSelect from "@/components/ui/LanguageSelect";
import { languageByCode } from "@/constants/languages";
import { useT } from "@/features/i18n/LanguageContext";
import TimerPerRoundSelect from "@/features/league-of-letters/components/TimePerRoundSelect";
import WordLengthInput from "@/features/league-of-letters/components/WordLengthInput";

interface Props {
    settings: LobbySettings,
    onChange: (settings: LobbySettings) => void
}

/**
 * What the host is about to start a game on, folded away until they want it.
 *
 * Shut by default, which is a claim about what this screen is for: a lobby is mostly
 * spent watching people arrive, and rows of controls between the code and the start
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
            <WordLengthInput
                variant='inline'
                value={settings.wordLength}
                onChange={wordLength => onChange({ ...settings, wordLength })}
            />

            <TimerPerRoundSelect
                variant='inline'
                value={settings.secondsPerTurn}
                onChange={secondsPerGuess => onChange({ ...settings, secondsPerTurn: secondsPerGuess })}
            />

            {/* No hard mode here, unlike the solo settings page: a room always draws
                from the common list — `multiplayerCommonWordsOnly` in the API's
                `rules.go` — so the switch that used to sit here moved nothing. */}
            <LanguageSelect
                variant='row'
                value={settings.locale}
                onChange={locale => onChange({ ...settings, locale })}
            />
        </CollapsibleCard>
    )
}

/**
 * The three settings as one line — "5 letters · 30s · Nederlands".
 *
 * In the order the rows are in, so the line and the open card read the same way round.
 * The language is the only one not translated: a language's name is written in its own
 * language wherever it appears, which is `LANGUAGES`' rule and not this card's.
 */
function summaryOf(settings: LobbySettings, t: ReturnType<typeof useT>): string {
    return [
        t('lol.settings.wordLengthOption', { letters: settings.wordLength }),
        t('lol.settings.summary.seconds', { seconds: settings.secondsPerTurn }),
        languageByCode(settings.locale).label
    ].join(' · ');
}
