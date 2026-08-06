import AppText from "@/components/text/AppText";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import TextButton from "@/components/ui/TextButton";
import { Colors, FontSizes, Spacing } from "@/constants/theme";
import { StyleSheet, View } from "react-native";

// TODO: list the rooms this player is still in and let them drop back into one.
export default function ReconnectPage() {
    function refresh() {
        console.log('TODO: reconnect refresh');
    }

    return (
        <View style={styles.container}>
            <SimpleTextHero
                title='Reconnect'
                description='Sprong je eruit? Pak de draad weer op waar je gebleven was.'
            />

            <TextButton
                fullWidth={true}
                text='Refresh'
                onPress={refresh}
            />

            <AppText style={styles.todo}>TODO</AppText>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        gap: Spacing.four
    },
    todo: {
        paddingHorizontal: Spacing.one,
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        color: Colors.light.textSecondary
    }
})
