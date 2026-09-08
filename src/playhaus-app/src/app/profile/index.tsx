import LoadingPage from "@/components/layout/LoadingPage";
import AppText from "@/components/text/AppText";
import LanguageSelect from "@/components/ui/LanguageSelect";
import { ROUTES } from "@/constants/routes";
import { FontSizes, Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import { useT } from "@/features/i18n/LanguageContext";
import GuestAccountNotice from "@/features/settings/components/GuestAccountNotice";
import LogoutCard from "@/features/settings/components/LogoutCard";
import ProfileAvatarColorPickerCard from "@/features/settings/components/ProfileAvatarColorPickerCard";
import ProfileCard from "@/features/settings/components/ProfileCard";
import ProfileNameCard from "@/features/settings/components/ProfileNameCard";
import ProfileSettingsCard from "@/features/settings/components/ProfileSettingsCard";
import type { SettingKey } from "@/features/settings/profile";
import { useProfile } from "@/features/settings/useProfile";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { router } from "expo-router";
import { View } from "react-native";

// The cards sit a hair off-square, the way they do in the design.
const tilt = (degrees: string) => ({ transform: [{ rotate: degrees }] });

// Your name, avatar and preferences, as the account actually holds them.
export default function ProfilePage() {
    const styles = useStyles();
    const t = useT();

    const { logout } = useAuth();
    const {
        profile,
        saving,
        saveError,
        updateUsername,
        updateColor,
        updateLocale,
        updateEnableSounds,
        updateEnableMusic,
        updateEnableVibration
    } = useProfile();

    // Only while the session is being restored, or once it has ended.
    if (!profile) {
        return <LoadingPage message={t('profile.loading')} />;
    }

    const toggle: Record<SettingKey, (value: boolean) => void> = {
        enableSounds: updateEnableSounds,
        enableMusic: updateEnableMusic,
        enableVibration: updateEnableVibration
    };

    return (
        <View style={styles.container}>
            {/* First on the page, before the profile it is a warning about. */}
            {profile.isGuest ? (
                <GuestAccountNotice onUpgrade={() => router.push(ROUTES.upgradeAccount)} />
            ) : (
                <View style={tilt('-0.5deg')}>
                    <ProfileCard name={profile.name} color={profile.color} />
                </View>
            )}

            <View style={tilt('-0.2deg')}>
                <LanguageSelect
                    label={t('common.language')}
                    value={profile.locale}
                    onChange={updateLocale}
                    disabled={saving}
                />
            </View>        

            <ProfileNameCard
                key={profile.name}
                name={profile.name}
                onSave={updateUsername}
                saving={saving}
            />    

            <View style={tilt('0.4deg')}>
                <ProfileAvatarColorPickerCard
                    value={profile.color}
                    onChange={updateColor}
                    disabled={saving}
                />
            </View>

            <ProfileSettingsCard
                values={{
                    enableSounds: profile.enableSounds,
                    enableMusic: profile.enableMusic,
                    enableVibration: profile.enableVibration
                }}
                onChange={(key, value) => toggle[key](value)}
                disabled={saving}
            />

            {/* Nothing moved, so this is what says why — otherwise a refused save looks like a missed tap. */}
            {saveError && <AppText style={styles.saveError}>{t(saveError)}</AppText>}

            <View style={tilt('-0.3deg')}>
                {/* Revokes the session and drops the stored token, which brings the auth gate straight back up. */}
                <LogoutCard onLogout={() => { void logout().then(() => router.replace(ROUTES.home)); }} />
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    container: {
        width: '100%',
        gap: Spacing.four
    },
    saveError: {
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.4,
        color: theme.colors.destructive
    },
    footer: {
        marginTop: Spacing.four,
        textAlign: 'center',
        fontSize: FontSizes.xs,
        color: theme.colors.textSecondary
    }
}))
