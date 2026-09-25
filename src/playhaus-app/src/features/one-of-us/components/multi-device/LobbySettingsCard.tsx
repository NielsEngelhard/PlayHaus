import type { OOULobbySettings } from '@/api/calls/one-of-us-lobby';
import BottomSheet from '@/components/ui/BottomSheet';
import LanguageSelect from '@/components/ui/LanguageSelect';
import LobbySettings, { LobbySettingLink, LobbySettingSwitch } from '@/components/ui/LobbySettings';
import { Spacing } from '@/constants/theme';
import { useT } from '@/features/i18n/LanguageContext';
import RolesSettingRow from '@/features/one-of-us/components/RolesSettingRow';
import { MULTI_DEVICE_TOGGLEABLE_ROLES, toggleRole } from '@/features/one-of-us/oou-settings';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { useState } from 'react';
import { View } from 'react-native';

interface Props {
    onChange: (settings: OOULobbySettings) => void
    settings: OOULobbySettings
}

// What the host is about to start a game on. The role list is too long for a row, so it opens in a sheet.
export default function LobbySettingsCard({ onChange, settings }: Props) {
    const t = useT();
    const styles = useStyles();

    const [rolesOpen, setRolesOpen] = useState(false);

    return (
        <LobbySettings title={t('oneOfUs.multiDevice.lobby.settingsTitle')}>
            <LobbySettingSwitch
                value={settings.wordOnly}
                label={t('oneOfUs.settings.wordsOnly.title')}
                description={t('oneOfUs.settings.wordsOnly.description')}
                onChange={wordOnly => onChange({ ...settings, wordOnly })}
            />

            <LobbySettingLink
                label={t('oneOfUs.settings.roles.title')}
                summary={t('oneOfUs.settings.roles.count', {
                    enabled: settings.enabledRoles.length,
                    total: MULTI_DEVICE_TOGGLEABLE_ROLES.length
                })}
                onPress={() => setRolesOpen(true)}
            />

            <LanguageSelect
                variant='pill'
                value={settings.locale}
                onChange={locale => onChange({ ...settings, locale })}
            />

            <BottomSheet visible={rolesOpen} onClose={() => setRolesOpen(false)}>
                <View style={styles.sheet}>
                    <RolesSettingRow
                        enabled={settings.enabledRoles}
                        roles={MULTI_DEVICE_TOGGLEABLE_ROLES}
                        onToggle={role => onChange({
                            ...settings,
                            enabledRoles: toggleRole(settings.enabledRoles, role)
                        })}
                    />
                </View>
            </BottomSheet>
        </LobbySettings>
    )
}

const useStyles = createThemedStyles(() => ({
    sheet: {
        paddingVertical: Spacing.two
    }
}))
