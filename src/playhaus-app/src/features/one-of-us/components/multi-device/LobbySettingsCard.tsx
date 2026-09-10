import type { OOULobbySettings } from '@/api/calls/one-of-us-lobby';
import CollapsibleCard from '@/components/ui/CollapsibleCard';
import LanguageSelect from '@/components/ui/LanguageSelect';
import ToggleRow from '@/components/ui/ToggleRow';
import { languageByCode } from '@/constants/languages';
import { useT } from '@/features/i18n/LanguageContext';
import RolesSettingRow from '@/features/one-of-us/components/RolesSettingRow';
import { toggleRole, TOGGLEABLE_ROLES } from '@/features/one-of-us/oou-settings';
import { View } from 'react-native';

interface Props {
    onChange: (settings: OOULobbySettings) => void
    settings: OOULobbySettings
}

// What the host is about to start a game on, folded away until they want it.
export default function LobbySettingsCard({ onChange, settings }: Props) {
    const t = useT();

    const roles = t('oneOfUs.settings.roles.count', {
        enabled: settings.enabledRoles.length,
        total: TOGGLEABLE_ROLES.length
    });

    return (
        <CollapsibleCard
            title={t('oneOfUs.multiDevice.lobby.settingsTitle')}
            // The language is the only half not translated.
            summary={`${roles} · ${languageByCode(settings.locale).label}`}
        >
            {/* One child per ruled section, the same shape SettingsPageBase uses. */}
            <View>
                <ToggleRow
                    flush
                    value={settings.wordOnly}
                    label={t('oneOfUs.settings.wordsOnly.title')}
                    description={t('oneOfUs.settings.wordsOnly.description')}
                    onChange={wordOnly => onChange({ ...settings, wordOnly })}
                />
            </View>

            <RolesSettingRow
                enabled={settings.enabledRoles}
                onToggle={role => onChange({
                    ...settings,
                    enabledRoles: toggleRole(settings.enabledRoles, role)
                })}
            />

            <LanguageSelect
                variant='row'
                value={settings.locale}
                onChange={locale => onChange({ ...settings, locale })}
            />
        </CollapsibleCard>
    )
}
