import AppText from "@/components/text/AppText";
import Tag from "@/components/ui/Tag";
import { Colors, FontSizes, Spacing } from "@/constants/theme";
import Feather from "@expo/vector-icons/Feather";
import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

interface Props {
    /** Where the back link goes. */
    href: Href,
    label?: string,
    /** Optional chip on the right, naming the section you're in. */
    tag?: string
}

/**
 * The row of secondary navigation that sits directly under the app `Header`: a back
 * link on the left, and an optional chip naming the current section on the right.
 */
export default function BackBar({ href, label = 'Terug', tag }: Props) {
    return (
        <View style={styles.container}>
            <Link href={href} asChild>
                <Pressable style={styles.back}>
                    <Feather
                        name='arrow-left'
                        size={16}
                        color={Colors.light.textSecondary}
                    />

                    <AppText style={styles.backText}>{label}</AppText>
                </Pressable>
            </Link>

            {tag && <Tag text={tag} />}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%'
    },
    back: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.one + 2
    },
    backText: {
        fontSize: FontSizes.sm,
        fontWeight: 600,
        color: Colors.light.textSecondary
    }
})
