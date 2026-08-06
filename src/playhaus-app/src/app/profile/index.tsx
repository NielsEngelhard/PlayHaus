import AppText from "@/components/text/AppText";
import { Colors, FontSizes, Spacing } from "@/constants/theme";
import LogoutCard from "@/features/settings/components/LogoutCard";
import ProfileAvatarColorPickerCard from "@/features/settings/components/ProfileAvatarColorPickerCard";
import ProfileCard from "@/features/settings/components/ProfileCard";
import ProfileNameCard from "@/features/settings/components/ProfileNameCard";
import ProfileSettingsCard from "@/features/settings/components/ProfileSettingsCard";
import { MOCK_PROFILE, type SettingKey } from "@/features/settings/mock-profile";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

// The cards sit a hair off-square, the way they do in the design.
const tilt = (degrees: string) => ({ transform: [{ rotate: degrees }] });

/**
 * Your name, avatar and preferences. Everything here runs on `MOCK_PROFILE` and lives in
 * component state — there are no accounts yet, so nothing is persisted or sent anywhere.
 */
export default function ProfilePage() {
    const [profile, setProfile] = useState(MOCK_PROFILE);

    function setSetting(key: SettingKey, value: boolean) {
        setProfile(current => ({
            ...current,
            settings: { ...current.settings, [key]: value }
        }));
    }

    return (
        <View style={styles.container}>
            <View style={tilt('-0.5deg')}>
                <ProfileCard name={profile.name} avatarColorId={profile.avatarColorId} />
            </View>

            <ProfileNameCard
                name={profile.name}
                onSave={name => setProfile(current => ({ ...current, name }))}
            />

            <View style={tilt('0.4deg')}>
                <ProfileAvatarColorPickerCard
                    value={profile.avatarColorId}
                    onChange={avatarColorId => setProfile(current => ({ ...current, avatarColorId }))}
                />
            </View>

            <ProfileSettingsCard values={profile.settings} onChange={setSetting} />

            <View style={tilt('-0.3deg')}>
                {/* No account to end yet, so logging out has nowhere to go. */}
                <LogoutCard onLogout={() => { }} />
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
    footer: {
        marginTop: Spacing.four,
        textAlign: 'center',
        fontSize: FontSizes.xs,
        color: Colors.light.textSecondary
    }
})
