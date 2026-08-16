import LoadingPage from "@/components/layout/LoadingPage";
import AppText from "@/components/text/AppText";
import { Colors, FontSizes, Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import LogoutCard from "@/features/settings/components/LogoutCard";
import ProfileAvatarColorPickerCard from "@/features/settings/components/ProfileAvatarColorPickerCard";
import ProfileCard from "@/features/settings/components/ProfileCard";
import ProfileNameCard from "@/features/settings/components/ProfileNameCard";
import ProfileSettingsCard from "@/features/settings/components/ProfileSettingsCard";
import type { SettingKey } from "@/features/settings/profile";
import { useProfile } from "@/features/settings/useProfile";
import { StyleSheet, View } from "react-native";

// The cards sit a hair off-square, the way they do in the design.
const tilt = (degrees: string) => ({ transform: [{ rotate: degrees }] });

/**
 * Your name, avatar and preferences, as the account actually holds them.
 *
 * Every edit on this page is a write: the name on `Opslaan`, the colour and the
 * toggles the moment they move. All of them wait for the server before the
 * control moves, and while one is in the air the rest are greyed out — a
 * profile is small enough that a second write on top of the first is a mistake
 * rather than something to queue up.
 */
export default function ProfilePage() {
    const { logout } = useAuth();
    const {
        profile,
        saving,
        saveError,
        updateUsername,
        updateColor,
        updateEnableSounds,
        updateEnableMusic,
        updateEnableVibration
    } = useProfile();

    // Only while the session is being restored, or once it has ended — the auth
    // gate is already standing over the page in the second case, so this is just
    // what sits behind it rather than a failure worth reporting.
    if (!profile) {
        return <LoadingPage message='Profiel laden…' />;
    }

    const toggle: Record<SettingKey, (value: boolean) => void> = {
        enableSounds: updateEnableSounds,
        enableMusic: updateEnableMusic,
        enableVibration: updateEnableVibration
    };

    return (
        <View style={styles.container}>
            <View style={tilt('-0.5deg')}>
                <ProfileCard name={profile.name} color={profile.color} />
            </View>

            {/* Keyed on the name so the card's internal draft restarts from it once a
                save lands. A refused one keeps its draft — the key has not moved —
                so you can fix the name rather than retype it. */}
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

            {/* Nothing moved, so this is what says why — otherwise a refused save
                looks like a missed tap. */}
            {saveError && <AppText style={styles.saveError}>{saveError}</AppText>}

            <View style={tilt('-0.3deg')}>
                {/* Revokes the session and drops the stored token, which brings the
                    auth gate straight back up over this page. */}
                <LogoutCard onLogout={() => { void logout(); }} />
            </View>

            <AppText style={styles.footer}>Playhaus · alles blijft op je eigen apparaat</AppText>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        gap: Spacing.four
    },
    saveError: {
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.4,
        color: Colors.light.destructive
    },
    footer: {
        marginTop: Spacing.four,
        textAlign: 'center',
        fontSize: FontSizes.xs,
        color: Colors.light.textSecondary
    }
})
