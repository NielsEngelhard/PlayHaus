import type { LobbySettings as LoLLobbySettings } from "@/api/calls/league-of-letters-lobby";
import LanguageSelect from "@/components/ui/LanguageSelect";
import SectionCard from "@/components/ui/SectionCard";
import { SettingSegment } from "@/components/ui/SettingRows";
import { useT } from "@/features/i18n/LanguageContext";
import { WORD_LENGTHS } from "@/features/league-of-letters/solo-settings";

const TIME_PER_ROUND_OPTIONS = [20, 35, 60, 100] as const;

interface Props {
    settings: LoLLobbySettings,
    onChange: (settings: LoLLobbySettings) => void
}

// What the host is about to start a game on.
export default function LobbySettingsCard({ settings, onChange }: Props) {
    const t = useT();

    return (
        <SectionCard title={t('lol.lobby.settingsTitle')}>
            <SettingSegment
                label={t('lol.settings.wordLength')}
                options={WORD_LENGTHS}
                value={settings.wordLength}
                getLabel={length => String(length)}
                getAccessibilityLabel={length => t('lol.settings.wordLengthOption', { letters: length })}
                valueLabel={t('lol.settings.wordLengthOption', { letters: settings.wordLength })}
                onChange={wordLength => onChange({ ...settings, wordLength })}
            />

            <SettingSegment
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
        </SectionCard>
    )
}
