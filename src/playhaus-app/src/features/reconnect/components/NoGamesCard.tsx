import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import { ROUTES } from "@/constants/routes";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { View } from "react-native";

/**
 * What the page is when there is nothing on it.
 *
 * Stacked rather than the side-by-side an `InlineNotification` draws: with no list
 * above it this panel *is* the page, so it gets a heading-sized title and a button
 * across the bottom instead of being a note in the margin of something else.
 */
export default function NoGamesCard() {
    const theme = useTheme();
    const styles = useStyles();

    const router = useRouter();

    return (
        <View style={styles.card}>
            <View style={styles.tile}>
                <Feather name='coffee' size={20} color={theme.colors.lemon} />
            </View>

            <AppText style={styles.title}>Geen spellen open</AppText>

            <AppText style={styles.message}>
                Alles wat je half gespeeld achterlaat komt hier terug te staan, solo of in een kamer.
            </AppText>

            <ActionButton
                text='Kies een spel'
                onPress={() => router.push(ROUTES.home)}
                style={styles.button}
            />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        borderRadius: 22,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary,
        padding: 20,
        // The one panel on the page, so it takes the same lift a card in a list gets
        // rather than sitting flat on the canvas.
        ...theme.popShadow(theme.colors.border)
    },
    tile: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        // A step off the card rather than a brand fill: nothing is wrong here, and a
        // saturated tile would make an empty page look like an alert.
        backgroundColor: theme.colors.backgroundSelected
    },
    title: {
        marginTop: 14,
        fontSize: 17,
        fontWeight: 900,
        letterSpacing: -0.4,
        color: theme.colors.text
    },
    message: {
        marginTop: 6,
        fontSize: 13.5,
        lineHeight: 13.5 * 1.5,
        color: theme.colors.textSecondary
    },
    button: {
        marginTop: 16,
        width: '100%'
    }
}))
