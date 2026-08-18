import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import { FontSizes, Spacing, fontFamilyForWeight } from "@/constants/theme";
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH, randomName } from "@/features/settings/profile";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";

interface Props {
    name: string,
    onSave: (name: string) => void,
    /** The save this card started is still in the air. */
    saving?: boolean
}

/**
 * Edit the name other players see. The field holds a draft so a half-typed name never
 * reaches the rest of the page — only `Opslaan` commits it.
 *
 * A save is a round trip, so the button waits it out with a spinner rather than
 * snapping back to normal and leaving you unsure whether the tap registered.
 */
export default function ProfileNameCard({ name, onSave, saving = false }: Props) {
    const theme = useTheme();
    const styles = useStyles();

    const [draft, setDraft] = useState(name);

    // Trimmed, because that is what the backend stores and validates against —
    // padding is not a name, and " Bob " is not a change to "Bob".
    const trimmed = draft.trim();
    const canSave = !saving && trimmed !== name && trimmed.length >= NAME_MIN_LENGTH;

    function save() {
        if (!canSave) return;

        onSave(trimmed);
    }

    return (
        <Card>
            <AppText style={styles.label}>Speelnaam</AppText>

            <View style={styles.field}>
                <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    onSubmitEditing={save}
                    placeholder='Jouw naam'
                    placeholderTextColor={theme.colors.textSecondary}
                    autoCorrect={false}
                    editable={!saving}
                    maxLength={NAME_MAX_LENGTH}
                    returnKeyType='done'
                    style={styles.input}
                />

                <View style={styles.buttons}>
                    <Pressable
                        onPress={save}
                        disabled={!canSave}
                        accessibilityRole='button'
                        accessibilityState={{ disabled: !canSave, busy: saving }}
                        style={[styles.saveButton, !canSave && styles.buttonDisabled]}
                    >
                        {saving
                            ? <ActivityIndicator size='small' color={theme.colors.textOnAccent} />
                            : <AppText style={styles.saveText}>Opslaan</AppText>}
                    </Pressable>

                    <Pressable
                        onPress={() => setDraft(randomName())}
                        disabled={saving}
                        accessibilityRole='button'
                        accessibilityLabel='Willekeurige naam'
                        style={[styles.diceButton, saving && styles.buttonDisabled]}
                    >
                        <Feather name='shuffle' size={20} color={theme.colors.text} />
                    </Pressable>
                </View>
            </View>

            <AppText style={styles.hint}>
                Min {NAME_MIN_LENGTH}, max {NAME_MAX_LENGTH} tekens. Dit is wat medespelers zien in een room.
            </AppText>
        </Card>
    )
}

const BUTTON_HEIGHT = 46;

const useStyles = createThemedStyles(theme => ({
    label: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        color: theme.colors.textSecondary
    },
    field: {
        marginTop: Spacing.three,
        gap: Spacing.two
    },
    input: {
        height: BUTTON_HEIGHT,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 14,
        backgroundColor: theme.colors.backgroundInput,
        paddingHorizontal: Spacing.three,
        fontSize: FontSizes.lg,
        // A TextInput isn't an `AppText`, so the Outfit family is applied by hand.
        fontFamily: fontFamilyForWeight(700),
        color: theme.colors.text
    },
    buttons: {
        flexDirection: 'row',
        gap: Spacing.two
    },
    saveButton: {
        flex: 1,
        height: BUTTON_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 14,
        backgroundColor: theme.colors.primary,
        ...theme.shadows.hard
    },
    buttonDisabled: {
        opacity: 0.5
    },
    saveText: {
        fontSize: FontSizes.sm,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: theme.colors.textOnAccent
    },
    diceButton: {
        width: BUTTON_HEIGHT,
        height: BUTTON_HEIGHT,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 14,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hard
    },
    hint: {
        marginTop: Spacing.three,
        fontSize: FontSizes.xs,
        lineHeight: FontSizes.xs * 1.45,
        color: theme.colors.textSecondary
    }
}))
