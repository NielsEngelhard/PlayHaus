import { FF_GAME_MODES, type FFGameMode, type FFLobbySettings } from "@/api/calls/fake-filler-lobby";
import LanguageSelect from "@/components/ui/LanguageSelect";
import SectionCard from "@/components/ui/SectionCard";
import { SettingSegment } from "@/components/ui/SettingRows";
import { useT } from "@/features/i18n/LanguageContext";

interface Props {
    maxAnswersPerPlayer: number,
    minAnswersPerPlayer: number,
    settings: FFLobbySettings,
    onChange: (settings: FFLobbySettings) => void
}

// Every count the server will take, which is a handful of buttons rather than a stepper.
const countsBetween = (min: number, max: number): number[] => (
    Array.from({ length: Math.max(max - min + 1, 1) }, (_, index) => min + index)
);

// What the host is about to start a game on.
export default function LobbySettingsCard({ maxAnswersPerPlayer, minAnswersPerPlayer, settings, onChange }: Props) {
    const t = useT();

    const modeLabel = (mode: FFGameMode) => (
        mode === 'facts' ? t('fakeFiller.lobby.modeFacts') : t('fakeFiller.lobby.modeDefinitions')
    );

    return (
        <SectionCard title={t('fakeFiller.lobby.settingsTitle')}>
            <SettingSegment
                label={t('fakeFiller.lobby.mode')}
                options={FF_GAME_MODES}
                value={settings.gameMode}
                getLabel={modeLabel}
                hint={settings.gameMode === 'facts'
                    ? t('fakeFiller.lobby.modeFactsHint')
                    : t('fakeFiller.lobby.modeDefinitionsHint')}
                onChange={gameMode => onChange({ ...settings, gameMode })}
            />

            <SettingSegment
                label={t('fakeFiller.lobby.answersPerPlayer')}
                options={countsBetween(minAnswersPerPlayer, maxAnswersPerPlayer)}
                value={settings.answersPerPlayer}
                getLabel={count => String(count)}
                hint={t('fakeFiller.lobby.answersPerPlayerHint')}
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
