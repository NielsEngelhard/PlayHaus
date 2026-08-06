import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import { ROUTES } from "@/constants/routes";
import { Colors, FontSizes, Shadows, Spacing, fontFamilyForWeight } from "@/constants/theme";
import { RelativePathString, useRouter } from "expo-router";
import { useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, TextInput, View } from "react-native";

const CODE_LENGTH = 6;

/** Rough width of one Outfit Black glyph, as a fraction of the font size. */
const GLYPH_RATIO = 0.65;
/** Tracking between the code characters, as a fraction of the font size. */
const TRACKING_RATIO = 0.35;
/** Horizontal chrome the code sits inside: `input` padding plus its two borders. */
const FIELD_CHROME = Spacing.three * 2 + 4;

/**
 * Pick the largest type that still fits `CODE_LENGTH` characters inside a field of
 * `width`. The field itself is `flex: 1` off a zero basis, so its width comes from the
 * row and never from this — sizing down here can't feed back into another layout pass.
 */
function codeFontSize(width: number): number {
    if (width <= 0) return FontSizes.xl;

    const perCharacter = (width - FIELD_CHROME) / CODE_LENGTH;
    const fitted = perCharacter / (GLYPH_RATIO + TRACKING_RATIO);

    return Math.max(FontSizes.md, Math.min(FontSizes.xl, fitted));
}

/** Enter a room code and join someone else's League of Letters game. */
export default function JoinLeagueOfLettersGameCard() {
    const router = useRouter();
    const [code, setCode] = useState('');
    const [fieldWidth, setFieldWidth] = useState(0);

    const canJoin = code.length > 0;
    const fontSize = codeFontSize(fieldWidth);

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
                    onLayout={(event: LayoutChangeEvent) => setFieldWidth(event.nativeEvent.layout.width)}
                    style={[styles.input, { fontSize, letterSpacing: fontSize * TRACKING_RATIO }]}
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
        // Flex items refuse to shrink below their content on web, which pushed the six
        // tracked-out capitals straight through the edge of the card. `fontSize` and
        // `letterSpacing` are measured per render, so they live on the element.
        minWidth: 0,
        borderWidth: 2,
        borderColor: Colors.light.border,
        borderRadius: 14,
        backgroundColor: Colors.light.backgroundInput,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two + Spacing.one,
        textAlign: 'center',
        // A TextInput isn't an `AppText`, so the Outfit family is applied by hand.
        fontFamily: fontFamilyForWeight(900),
        color: Colors.light.text
    },
    button: {
        // The field absorbs every bit of the shrinking; "Go" stays whole.
        flexShrink: 0,
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
