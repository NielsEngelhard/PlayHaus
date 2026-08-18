import AppText from "@/components/text/AppText";
import CountryFlag from "@/components/ui/CountryFlag";
import type { Language } from "@/constants/languages";
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import { StyleSheet, View } from "react-native";

interface Props {
    /** What the app is showing right now: the version, or the game you're inside. */
    label: string,
    /** Fill for the status dot. The current game's accent, or a resting colour. */
    accent: string,
    /**
     * The account's language, from `Header`. Passed in rather than read from the
     * session here, so this stays a component that renders what it is given.
     */
    language: Language
}

/**
 * The right-hand half of the app `Header`: one capsule split into a flag and the
 * current context.
 *
 * A single bordered pill rather than the loose chips this replaces — the app's chrome
 * is made of hard-bordered pills (`BottomBar`, `Logo`'s bubble) and two free-floating
 * tags read as debug output next to them.
 */
export default function HeaderStatus({ label, accent, language }: Props) {
    return (
        <View style={styles.capsule}>
            <View
                style={styles.flagSegment}
                accessibilityLabel={`Taal: ${language.label}`}
            >
                <CountryFlag code={language.flag} />
            </View>

            <View style={styles.contextSegment}>
                <View style={[styles.dot, { backgroundColor: accent }]} />

                <AppText style={styles.label} numberOfLines={1}>
                    {label}
                </AppText>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    capsule: {
        flexDirection: 'row',
        alignItems: 'stretch',
        minHeight: 34,
        borderWidth: 2,
        borderColor: Colors.light.border,
        borderRadius: 999,
        backgroundColor: Colors.light.backgroundSecondary,
        // Clips the lemon segment to the pill's left curve. The hard shadow is a
        // `boxShadow`, so it still paints outside this.
        overflow: 'hidden',
        // Only this side of the header gives ground when the two don't both fit.
        flexShrink: 1,
        // The house tilt: everything in this app sits a hair off-square.
        transform: [{ rotate: '0.5deg' }],
        ...Shadows.hard
    },
    flagSegment: {
        justifyContent: 'center',
        paddingHorizontal: Spacing.two,
        backgroundColor: Colors.light.lemon,
        borderRightWidth: 2,
        borderRightColor: Colors.light.border
    },
    contextSegment: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
        gap: Spacing.one + 2,
        paddingHorizontal: Spacing.two + 2
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 999
    },
    label: {
        flexShrink: 1,
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: Colors.light.text
    }
})
