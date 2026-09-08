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

// What the host is about to start a game on, folded away until they want it.
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

            {/* No hard mode here, unlike the solo settings page. */}
            <LanguageSelect
                variant='row'
                value={settings.locale}
                onChange={locale => onChange({ ...settings, locale })}
            />
        </CollapsibleCard>
    )
}

// The three settings as one line — "5 letters · 30s · Nederlands".
function summaryOf(settings: LobbySettings, t: ReturnType<typeof useT>): string {
    return [
        t('lol.settings.wordLengthOption', { letters: settings.wordLength }),
        t('lol.settings.summary.seconds', { seconds: settings.secondsPerTurn }),
        languageByCode(settings.locale).label
    ].join(' · ');
}
