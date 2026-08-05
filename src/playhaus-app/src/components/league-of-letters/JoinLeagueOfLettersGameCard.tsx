import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import { ROUTES } from "@/constants/routes";
import { Colors, FontSizes, Shadows, Spacing, fontFamilyForWeight } from "@/constants/theme";
import { RelativePathString, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

const CODE_LENGTH = 6;

/** Enter a room code and join someone else's League of Letters game. */
export default function JoinLeagueOfLettersGameCard() {
    const router = useRouter();
    const [code, setCode] = useState('');

    const canJoin = code.length > 0;

    function join() {
        if (!canJoin) return;

        router.push(ROUTES.leagueOfLettersRoom(code) as RelativePathString );
    }

    return (
        <Card>
            <AppText style={styles.label}>Of join een kamer</AppText>

            <View style={styles.row}>
                <TextInput
                    value={code}
                    // Room codes read as one block of capitals, so the field owns that
                    // rather than trusting every keyboard to honour `autoCapitalize`.
                    onChangeText={(text) => setCode(text.toUpperCase().trim())}
                    onSubmitEditing={join}
                    placeholder='CODE'
                    placeholderTextColor={Colors.light.textSecondary}
                    autoCapitalize='characters'
                    autoCorrect={false}
                    maxLength={CODE_LENGTH}
                    returnKeyType='go'
                    style={styles.input}
                />

                <Pressable
                    onPress={join}
                    disabled={!canJoin}
                    style={[styles.button, !canJoin && styles.buttonDisabled]}
                >
                    <AppText style={styles.buttonText}>Go</AppText>
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
    row: {
        marginTop: Spacing.three,
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: Spacing.two
    },
    input: {
        flex: 1,
        borderWidth: 2,
        borderColor: Colors.light.border,
        borderRadius: 14,
        backgroundColor: Colors.light.backgroundInput,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two + Spacing.one,
        textAlign: 'center',
        fontSize: FontSizes.xl,
        // A TextInput isn't an `AppText`, so the Outfit family is applied by hand.
        fontFamily: fontFamilyForWeight(900),
        letterSpacing: 8,
        color: Colors.light.text
    },
    button: {
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.light.border,
        borderRadius: 14,
        backgroundColor: Colors.light.secondary,
        paddingHorizontal: Spacing.four,
        ...Shadows.hard
    },
    buttonDisabled: {
        opacity: 0.5
    },
    buttonText: {
        fontSize: FontSizes.md,
        fontWeight: 900,
        textTransform: 'uppercase',
        color: Colors.light.textOnAccent
    }
})
