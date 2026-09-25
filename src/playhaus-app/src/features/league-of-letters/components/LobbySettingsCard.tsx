import type { LobbySettings as LoLLobbySettings } from "@/api/calls/league-of-letters-lobby";
import LanguageSelect from "@/components/ui/LanguageSelect";
import LobbySettings, { LobbySettingSegment } from "@/components/ui/LobbySettings";
import { useT } from "@/features/i18n/LanguageContext";
import { TIME_PER_ROUND_OPTIONS } from "@/features/league-of-letters/components/TimePerRoundSelect";
import { WORD_LENGTHS } from "@/features/league-of-letters/solo-settings";

interface Props {
    settings: LoLLobbySettings,
    onChange: (settings: LoLLobbySettings) => void
}

// What the host is about to start a game on.
export default function LobbySettingsCard({ settings, onChange }: Props) {
    const t = useT();

    return (
        <LobbySettings title={t('lol.lobby.settingsTitle')}>
            <LobbySettingSegment
                label={t('lol.settings.wordLength')}
                options={WORD_LENGTHS}
                value={settings.wordLength}
                getLabel={length => String(length)}
                getAccessibilityLabel={length => t('lol.settings.wordLengthOption', { letters: length })}
                valueLabel={t('lol.settings.wordLengthOption', { letters: settings.wordLength })}
                onChange={wordLength => onChange({ ...settings, wordLength })}
            />

            <LobbySettingSegment
                label={t('lol.lobby.timePerTurn')}
                options={TIME_PER_ROUND_OPTIONS}
                value={settings.secondsPerTurn}
                getLabel={seconds => `${seconds}s`}
                getAccessibilityLabel={seconds => t('lol.lobby.timePerTurnOption', { seconds })}
                onChange={secondsPerTurn => onChange({ ...settings, secondsPerTurn })}
            />

            {/* No hard mode here, unlike the solo settings page. */}
            <LanguageSelect
                variant='pill'
                value={settings.locale}
                onChange={locale => onChange({ ...settings, locale })}
            />
        </LobbySettings>
    )
}
