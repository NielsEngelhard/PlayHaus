import { WW_GAME_MODES, type WWGameMode, type WWLobbySettings } from "@/api/calls/witty-wars-lobby";
import LanguageSelect from "@/components/ui/LanguageSelect";
import SectionCard from "@/components/ui/SectionCard";
import SelectInput from "@/components/ui/SelectInput";
import { SettingSegment } from "@/components/ui/SettingRows";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";

interface Props {
    maxAnswersPerPlayer: number,
    minAnswersPerPlayer: number,
    settings: WWLobbySettings,
    onChange: (settings: WWLobbySettings) => void
}

const MODE_KEYS: Record<WWGameMode, { label: TranslationKey, description: TranslationKey }> = {
    family: { label: 'wittyWars.modes.family.title', description: 'wittyWars.modes.family.description' },
    rude: { label: 'wittyWars.modes.rude.title', description: 'wittyWars.modes.rude.description' },
    caliente: { label: 'wittyWars.modes.caliente.title', description: 'wittyWars.modes.caliente.description' }
};

// Every count the server will take, which is a handful of buttons rather than a stepper.
const countsBetween = (min: number, max: number): number[] => (
    Array.from({ length: Math.max(max - min + 1, 1) }, (_, index) => min + index)
);

// What the host is about to start a game on.
export default function LobbySettingsCard({ maxAnswersPerPlayer, minAnswersPerPlayer, settings, onChange }: Props) {
    const t = useT();

    const modes = WW_GAME_MODES.map(mode => ({
        value: mode,
        label: t(MODE_KEYS[mode].label),
        description: t(MODE_KEYS[mode].description)
    }));

    return (
        <SectionCard title={t('wittyWars.lobby.settingsTitle')}>
            <SelectInput
                variant='pill'
                label={t('wittyWars.lobby.mode')}
                value={settings.gameMode}
                options={modes}
                onChange={gameMode => onChange({ ...settings, gameMode })}
            />

            <SettingSegment
                label={t('wittyWars.lobby.answersPerPlayer')}
                options={countsBetween(minAnswersPerPlayer, maxAnswersPerPlayer)}
                value={settings.answersPerPlayer}
                getLabel={count => String(count)}
                hint={t('wittyWars.lobby.answersPerPlayerHint')}
                onChange={answersPerPlayer => onChange({ ...settings, answersPerPlayer })}
            />

            <LanguageSelect
                variant='pill'
                value={settings.locale}
                onChange={locale => onChange({ ...settings, locale })}
            />
        </SectionCard>
    )
}
