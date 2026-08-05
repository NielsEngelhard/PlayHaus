import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import { Colors, FontSizes, Spacing } from "@/constants/theme";
import Feather from "@expo/vector-icons/Feather";
import { StyleSheet, View } from "react-native";

interface Props {
    label: string,
    value: string,
    icon?: keyof typeof Feather.glyphMap
}

/** A card that shows one labelled, read-only value. */
export default function ValueCard({ label, value, icon }: Props) {
    return (
        <Card>
            <AppText style={styles.label}>{label}</AppText>

            <View style={styles.row}>
                {icon && (
                    <Feather
                        name={icon}
                        size={20}
                        color={Colors.light.textSecondary}
                    />
                )}

                <AppText style={styles.value}>{value}</AppText>
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
    row: {
        marginTop: Spacing.two,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },
    value: {
        flex: 1,
        fontSize: FontSizes.lg,
        fontWeight: 700,
        color: Colors.light.text
    }
})
