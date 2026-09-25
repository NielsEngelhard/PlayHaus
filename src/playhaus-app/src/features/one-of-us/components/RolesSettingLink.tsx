import BottomSheet from '@/components/ui/BottomSheet';
import { SettingLink } from '@/components/ui/SettingRows';
import { Spacing } from '@/constants/theme';
import { useT } from '@/features/i18n/LanguageContext';
import RolesSettingRow from '@/features/one-of-us/components/RolesSettingRow';
import { OneOfUsRole } from '@/features/one-of-us/models';
import { TOGGLEABLE_ROLES } from '@/features/one-of-us/oou-settings';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { useState } from 'react';
import { View } from 'react-native';

interface Props {
    disabled?: boolean,
    enabled: OneOfUsRole[],
    onToggle: (role: OneOfUsRole) => void,
    roles?: OneOfUsRole[]
}

// The role list is too long for a settings row, so the row opens it in a sheet.
export default function RolesSettingLink({ disabled = false, enabled, onToggle, roles = TOGGLEABLE_ROLES }: Props) {
    const t = useT();
    const styles = useStyles();

    const [open, setOpen] = useState(false);

    return (
        <>
            <SettingLink
                label={t('oneOfUs.settings.roles.title')}
                summary={t('oneOfUs.settings.roles.count', { enabled: enabled.length, total: roles.length })}
                onPress={() => setOpen(true)}
            />

            <BottomSheet visible={open} onClose={() => setOpen(false)}>
                <View style={styles.sheet}>
                    <RolesSettingRow enabled={enabled} roles={roles} onToggle={onToggle} disabled={disabled} />
                </View>
            </BottomSheet>
        </>
    )
}

const useStyles = createThemedStyles(() => ({
    sheet: {
        paddingVertical: Spacing.two
    }
}))
