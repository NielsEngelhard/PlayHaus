import AppText from "@/components/text/AppText";
import LoadingPage from "@/components/layout/LoadingPage";
import Card from "@/components/ui/Card";
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import LogoutCard from "@/features/settings/components/LogoutCard";
import ProfileAvatarColorPickerCard from "@/features/settings/components/ProfileAvatarColorPickerCard";
import ProfileCard from "@/features/settings/components/ProfileCard";
import ProfileNameCard from "@/features/settings/components/ProfileNameCard";
import ProfileSettingsCard from "@/features/settings/components/ProfileSettingsCard";
import { useAuth } from "@/features/auth/useAuth";
import { useProfile } from "@/features/settings/useProfile";
import { Pressable, StyleSheet, View } from "react-native";

// The cards sit a hair off-square, the way they do in the design.
const tilt = (degrees: string) => ({ transform: [{ rotate: degrees }] });

/**
 * Your name, avatar and preferences, as the account actually holds them.
 *
 * Every edit on this page is a write: the name on `Opslaan`, the colour and the
 * toggles the moment they move. `useProfile` puts each change on screen straight
 * away and undoes it if the server refuses, so nothing here has to wait on a
 * round trip.
 */
export default function ProfilePage() {
    const { logout } = useAuth();
    const { profile, loading, error, saveError, reload, save } = useProfile();

    if (loading) {
        return <LoadingPage message='Profiel laden…' />;
    }

    // No profile and not loading means the fetch failed — there is nothing to
    // render the cards from, so the page offers the one useful action instead.
    if (!profile) {
        return <ProfileLoadFailed message={error} onRetry={reload} />;
    }

    return (
        <View style={styles.container}>
            <View style={tilt('-0.5deg')}>
                <ProfileCard name={profile.name} avatarColorId={profile.avatarColorId} />
            </View>

            {/* Keyed on the name so the card's internal draft restarts from it after a
                save lands, or after a refused one is rolled back. */}
            <ProfileNameCard
                key={profile.name}
                name={profile.name}
                onSave={name => save({ name })}
            />

            <View style={tilt('0.4deg')}>
                <ProfileAvatarColorPickerCard
                    value={profile.avatarColorId}
                    onChange={avatarColorId => save({ avatarColorId })}
                />
            </View>

            <ProfileSettingsCard
                values={{
                    soundEnabled: profile.soundEnabled,
                    vibrationEnabled: profile.vibrationEnabled
                }}
                onChange={(key, value) => save({ [key]: value })}
            />

            {/* Only after a rollback: the control has already snapped back, and this
                says why rather than leaving it looking like a missed tap. */}
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

function ProfileLoadFailed({ message, onRetry }: { message: string | null, onRetry: () => void }) {
    return (
        <View style={styles.container}>
            <View style={tilt('-0.5deg')}>
                <Card>
                    <AppText style={styles.failedTitle}>Profiel laden lukt niet</AppText>
                    <AppText style={styles.failedBody}>
                        {message ?? 'Er ging iets mis. Probeer het opnieuw.'}
                    </AppText>

                    <Pressable onPress={onRetry} style={styles.retryButton}>
                        <AppText style={styles.retryText}>Opnieuw proberen</AppText>
                    </Pressable>
                </Card>
            </View>
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
    failedTitle: {
        fontSize: FontSizes.xl,
        fontWeight: 900,
        lineHeight: FontSizes.xl * 1.1,
        letterSpacing: -0.7,
        color: Colors.light.text
    },
    failedBody: {
        marginTop: Spacing.two,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.4,
        color: Colors.light.textSecondary
    },
    retryButton: {
        marginTop: Spacing.four,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.light.border,
        borderRadius: 14,
        backgroundColor: Colors.light.primary,
        ...Shadows.hard
    },
    retryText: {
        fontSize: FontSizes.sm,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: Colors.light.textOnAccent
    },
    footer: {
        marginTop: Spacing.four,
        textAlign: 'center',
        fontSize: FontSizes.xs,
        color: Colors.light.textSecondary
    }
})
