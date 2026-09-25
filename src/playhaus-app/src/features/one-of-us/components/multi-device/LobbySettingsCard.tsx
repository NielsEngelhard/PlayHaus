import type { OOULobbySettings } from '@/api/calls/one-of-us-lobby';
import LanguageSelect from '@/components/ui/LanguageSelect';
import SectionCard from '@/components/ui/SectionCard';
import { SettingSwitch } from '@/components/ui/SettingRows';
import { useT } from '@/features/i18n/LanguageContext';
import RolesSettingLink from '@/features/one-of-us/components/RolesSettingLink';
import { MULTI_DEVICE_TOGGLEABLE_ROLES, toggleRole } from '@/features/one-of-us/oou-settings';

interface Props {
    onChange: (settings: OOULobbySettings) => void
    settings: OOULobbySettings
}

// What the host is about to start a game on.
export default function LobbySettingsCard({ onChange, settings }: Props) {
    const t = useT();

    return (
        <SectionCard title={t('oneOfUs.multiDevice.lobby.settingsTitle')}>
            <SettingSwitch
                value={settings.wordOnly}
                label={t('oneOfUs.settings.wordsOnly.title')}
                description={t('oneOfUs.settings.wordsOnly.description')}
                onChange={wordOnly => onChange({ ...settings, wordOnly })}
            />

            <RolesSettingLink
                enabled={settings.enabledRoles}
                roles={MULTI_DEVICE_TOGGLEABLE_ROLES}
                onToggle={role => onChange({
                    ...settings,
                    enabledRoles: toggleRole(settings.enabledRoles, role)
                })}
            />

            <LanguageSelect
                variant='pill'
                value={settings.locale}
                onChange={locale => onChange({ ...settings, locale })}
            />
        </SectionCard>
    )
}
