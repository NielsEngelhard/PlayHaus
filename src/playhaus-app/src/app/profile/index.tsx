import AppText from "@/components/text/AppText";
import { Colors, FontSizes, Spacing } from "@/constants/theme";
import LogoutCard from "@/features/settings/components/LogoutCard";
import ProfileAvatarColorPickerCard from "@/features/settings/components/ProfileAvatarColorPickerCard";
import ProfileCard from "@/features/settings/components/ProfileCard";
import ProfileNameCard from "@/features/settings/components/ProfileNameCard";
import ProfileSettingsCard from "@/features/settings/components/ProfileSettingsCard";
import { useAuth } from "@/features/auth/useAuth";
import { MOCK_PROFILE, type SettingKey } from "@/features/settings/mock-profile";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

// The cards sit a hair off-square, the way they do in the design.
const tilt = (degrees: string) => ({ transform: [{ rotate: degrees }] });

/**
 * Your name, avatar and preferences.
 *
 * Logging out is real. Everything else still runs on `MOCK_PROFILE` in component
 * state: the name arrives from the session so the page doesn't greet you as
 * somebody else, but saving it only updates this screen — there is no endpoint
 * behind it yet.
 */
export default function ProfilePage() {
    const { user, logout } = useAuth();
    const [profile, setProfile] = useState(MOCK_PROFILE);

    // `null` means "not edited on this screen yet", which lets the session's name
    // take over the moment it lands. Seeding state from `user` instead would stick
    // on the mock name forever: this page can mount while the session is still
    // being restored, and an initial value is only read once.
    const [editedName, setEditedName] = useState<string | null>(null);
    const name = editedName ?? user?.name ?? MOCK_PROFILE.name;

    function setSetting(key: SettingKey, value: boolean) {
        setProfile(current => ({
            ...current,
            settings: { ...current.settings, [key]: value }
        }));
    }

    return (
        <View style={styles.container}>
            <View style={tilt('-0.5deg')}>
                <ProfileCard name={name} avatarColorId={profile.avatarColorId} />
            </View>

            {/* Keyed on the name so the card's internal draft restarts from it when
                the session arrives after this page has already mounted. */}
            <ProfileNameCard
                key={name}
                name={name}
                onSave={setEditedName}
            />

            <View style={tilt('0.4deg')}>
                <ProfileAvatarColorPickerCard
                    value={profile.avatarColorId}
                    onChange={avatarColorId => setProfile(current => ({ ...current, avatarColorId }))}
                />
            </View>

            <ProfileSettingsCard values={profile.settings} onChange={setSetting} />

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
    footer: {
        marginTop: Spacing.four,
        textAlign: 'center',
        fontSize: FontSizes.xs,
        color: Colors.light.textSecondary
    }
})
