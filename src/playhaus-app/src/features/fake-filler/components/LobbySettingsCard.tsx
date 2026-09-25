import type { FFGameMode, FFLobbySettings } from "@/api/calls/fake-filler-lobby";
import LanguageSelect from "@/components/ui/LanguageSelect";
import LobbySettings, { LobbySettingSegment } from "@/components/ui/LobbySettings";
import { useT } from "@/features/i18n/LanguageContext";

interface Props {
    maxAnswersPerPlayer: number,
    minAnswersPerPlayer: number,
    settings: FFLobbySettings,
    onChange: (settings: FFLobbySettings) => void
}

/** In the order they are offered. `facts` is the server's default, so it leads. */
const MODES: readonly FFGameMode[] = ['facts', 'creative'];

// Every count the server will take, which is a handful of buttons rather than a stepper.
const countsBetween = (min: number, max: number): number[] => (
    Array.from({ length: Math.max(max - min + 1, 1) }, (_, index) => min + index)
);

// What the host is about to start a game on.
export default function LobbySettingsCard({ maxAnswersPerPlayer, minAnswersPerPlayer, settings, onChange }: Props) {
    const t = useT();

    const modeLabel = (mode: FFGameMode) => (
        mode === 'facts' ? t('fakeFiller.lobby.modeFacts') : t('fakeFiller.lobby.modeCreative')
    );

    return (
        <LobbySettings title={t('fakeFiller.lobby.settingsTitle')}>
            <LobbySettingSegment
                label={t('fakeFiller.lobby.mode')}
                options={MODES}
                value={settings.gameMode}
                getLabel={modeLabel}
                hint={settings.gameMode === 'facts'
                    ? t('fakeFiller.lobby.modeFactsHint')
                    : t('fakeFiller.lobby.modeCreativeHint')}
                onChange={gameMode => onChange({ ...settings, gameMode })}
            />

            <LobbySettingSegment
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
        </LobbySettings>
    )
}
