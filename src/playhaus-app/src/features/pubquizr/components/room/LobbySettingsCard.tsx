import type { PQLobbySetup } from "@/api/calls/pubquizr-lobby";
import LobbySettings, { LobbySettingSwitch } from "@/components/ui/LobbySettings";
import { useT } from "@/features/i18n/LanguageContext";

interface Props {
    onChange: (setup: Partial<Omit<PQLobbySetup, 'hostScreen'>>) => void,
    setup: PQLobbySetup
}

// How the evening is cut, beside the quiz the host picked.
export default function LobbySettingsCard({ onChange, setup }: Props) {
    const t = useT();

    return (
        <LobbySettings title={t('pubquizr.lobby.settingsTitle')}>
            {/* Trivia first, because it is the bigger cut of the two. */}
            <LobbySettingSwitch
                value={setup.triviaMode}
                // The two cuts cannot both be on, and trivia is the one that wins.
                onChange={trivia => onChange(trivia ? { triviaMode: true, zenMode: false } : { triviaMode: false })}
                label={t('pubquizr.oneDevice.triviaMode.label')}
                description={t('pubquizr.oneDevice.triviaMode.description')}
            />

            {!setup.triviaMode && (
                <LobbySettingSwitch
                    value={setup.zenMode}
                    onChange={zen => onChange({ zenMode: zen })}
                    label={t('pubquizr.oneDevice.zenMode.label')}
                    description={t('pubquizr.oneDevice.zenMode.description')}
                />
            )}
        </LobbySettings>
    )
}
