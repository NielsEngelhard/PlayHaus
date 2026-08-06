import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import Feather from "@expo/vector-icons/Feather";
import { Pressable, StyleSheet, View } from "react-native";

interface Props {
    onLogout: () => void
}

export default function LogoutCard({ onLogout }: Props) {
    return (
        <Card>
            <AppText style={styles.label}>Logout</AppText>

            <View style={styles.buttonRow}>
                <Pressable
                    onPress={onLogout}
                    accessibilityRole='button'
                    accessibilityLabel='Logout'
                    style={styles.button}
                >
                    <Feather name='log-out' size={16} color={Colors.light.textOnAccent} />
                    <AppText style={styles.buttonText}>Logout</AppText>
                </Pressable>
            </View>
        </Card>
    )
}

const styles = StyleSheet.create({
    label: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        color: Colors.light.textSecondary
    },
    // The button hugs its text rather than filling the card, so it needs a row to sit
    // at the start of.
    buttonRow: {
        marginTop: Spacing.three,
        flexDirection: 'row'
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.two + Spacing.one,
        borderWidth: 2,
        borderColor: Colors.light.border,
        borderRadius: 14,
        backgroundColor: Colors.light.destructive,
        ...Shadows.hard
    },
    buttonText: {
        fontSize: FontSizes.sm,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: Colors.light.textOnAccent
    }
})
