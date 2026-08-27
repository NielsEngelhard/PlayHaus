import AppText from "@/components/text/AppText";
import { fontFamilyForWeight, hardShadow } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { JOIN_CODE_LENGTH, sanitize } from "@/features/join/join-code";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useState } from "react";
import { TextInput, View } from "react-native";

const HEIGHT = 46;
const BUTTON_WIDTH = 84;

/**
 * Somebody else's code, at the top of the home page: one field and a button.
 *
 * The short way in for the common case — you have been sent a code and want to be in that
 * room. `JoinCodeCard` over in `features/join` is the long way, with a box per character
 * and a camera beside it, and it stays where it is: it belongs to a page about getting
 * back into a game, while this is a line on a page about starting one.
 *
 * Nothing is wired up yet. The field is real — it sanitises and stops at a code's length,
 * so what it holds is always a plausible code — but the button does nothing and is drawn
 * rather than pressable, because a control that answers a tap with silence is worse than
 * one that plainly is not ready. Wiring it is a `PopPressable` and the same
 * `resolveJoinCode` switch `JoinCodeCard` already makes; the route is not this file's to
 * pick, because the code's first character has already picked it.
 */
export default function JoinCodeRow() {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    const [code, setCode] = useState('');

    return (
        <View style={styles.row}>
            <TextInput
                value={code}
                onChangeText={text => setCode(sanitize(text))}
                maxLength={JOIN_CODE_LENGTH}
                placeholder={t('home.join.placeholder')}
                placeholderTextColor={theme.colors.textFaint}
                autoCapitalize="characters"
                autoCorrect={false}
                accessibilityLabel={t('home.join.label')}
                style={styles.field}
            />

            <View style={styles.button}>
                <AppText style={styles.buttonText}>{t('home.join.action')}</AppText>
            </View>
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
        // A card's fill rather than the sunken one every other field wears: this sits on
        // the open page rather than inside a panel, so it has to lift off the canvas.
        backgroundColor: theme.colors.backgroundSecondary,
        fontSize: 17,
        // A `TextInput` gets no help from `AppText`, so the weight has to be named as a
        // family — see `fontFamilyForWeight`.
        fontFamily: fontFamilyForWeight(900),
        // Wide enough that the characters read as a code being spelled out rather than
        // as a word.
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
        backgroundColor: theme.colors.backgroundSecondary,
        // The field beside it is flat to the page and this is not, which is the whole of
        // what says which half of the row is the control.
        ...(theme.scheme === 'dark' ? {} : hardShadow(2, theme.colors.border))
    },

    buttonText: {
        fontSize: 13.5,
        fontWeight: 900,
        color: theme.colors.text
    }
}))
