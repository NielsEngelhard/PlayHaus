import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import { Brand, fontFamilyForWeight, hardShadow } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { JOIN_CODE_LENGTH, resolveJoinCode, sanitize } from "@/features/join/join-code";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { RelativePathString, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { TextInput, View } from "react-native";

const HEIGHT = 46;
const BUTTON_WIDTH = 84;

// Somebody else's code, at the top of the home page: one field and a button.
export default function JoinCodeRow() {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();
    const router = useRouter();

    const field = useRef<TextInput>(null);

    const [code, setCode] = useState('');

    // A whole code that opened nothing, and the line under the row saying so.
    const [rejected, setRejected] = useState(false);

    // Whether this row has already sent someone off with the code it holds.
    const sent = useRef(false);

    const target = resolveJoinCode(code);

    function join(value: string) {
        if (sent.current) return;

        const resolved = resolveJoinCode(value);
        if (resolved.kind === 'incomplete') return;

        if (resolved.kind === 'rejected') {
            setRejected(true);
            return;
        }

        sent.current = true;
        setRejected(false);
        // The room draws its own chrome, and an open keyboard would sit on top of it.
        field.current?.blur();

        router.push(resolved.href as RelativePathString);
    }

    function change(text: string) {
        const next = sanitize(text);

        // Editing back down to an incomplete code is the signal that this is a fresh attempt, so the next completion is allowed to travel.
        if (next.length < JOIN_CODE_LENGTH) {
            sent.current = false;
            setRejected(false);
        }

        setCode(next);
        join(next);
    }

    return (
        <View>
            <View style={styles.row}>
                <TextInput
                    ref={field}
                    value={code}
                    onChangeText={change}
                    maxLength={JOIN_CODE_LENGTH}
                    placeholder={t('home.join.placeholder')}
                    placeholderTextColor={theme.colors.textFaint}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    // The keyboard's own key does what the button does, because a code typed out in full has already said what it is for.
                    returnKeyType="go"
                    onSubmitEditing={() => join(code)}
                    accessibilityLabel={t('home.join.label')}
                    style={styles.field}
                />

                <PopPressable
                    onPress={() => join(code)}
                    // Half-strength until there is a whole code to send.
                    disabled={target.kind === 'incomplete'}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: target.kind === 'incomplete' }}
                    style={[styles.button, target.kind === 'incomplete' && styles.buttonDisabled]}
                >
                    <AppText style={styles.buttonText}>{t('home.join.action')}</AppText>
                </PopPressable>
            </View>

            {rejected && <AppText style={styles.rejected}>{t('join.rejected')}</AppText>}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    row: {
        flexDirection: 'row',
        gap: 9
    },

    field: {
        flex: 1,
        minWidth: 0,
        height: HEIGHT,
        paddingHorizontal: 12,
        borderRadius: 14,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        // A card's fill rather than the sunken one every other field wears.
        backgroundColor: theme.colors.backgroundSecondary,
        fontSize: 17,
        // A `TextInput` gets no help from `AppText`, so the weight has to be named as a family — see `fontFamilyForWeight`.
        fontFamily: fontFamilyForWeight(900),
        // Wide enough that the characters read as a code being spelled out rather than as a word.
        letterSpacing: 4,
        color: theme.colors.text
    },

    button: {
        width: BUTTON_WIDTH,
        height: HEIGHT,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        // The lemon in both schemes rather than the scheme's loudest neutral an `ActionButton` takes.
        backgroundColor: theme.colors.lemon,
        // The field beside it is flat to the page and this is not.
        ...hardShadow(2, theme.colors.shadow)
    },

    buttonDisabled: {
        opacity: 0.5
    },

    buttonText: {
        fontSize: 13.5,
        fontWeight: 900,
        // Ink on the lemon in both schemes, because the fill is the same in both.
        color: Brand.ink
    },

    rejected: {
        marginTop: 8,
        fontSize: 12,
        fontWeight: 700,
        color: Brand.destructive
    }
}))
