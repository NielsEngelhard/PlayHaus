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

/**
 * Somebody else's code, at the top of the home page: one field and a button.
 *
 * The short way in for the common case — you have been sent a code and want to be in that
 * room. `JoinCodeCard` over in `features/join` is the long way, with a box per character
 * and a camera beside it, and it stays where it is: it belongs to a page about getting
 * back into a game, while this is a line on a page about starting one.
 *
 * The button makes no decision of its own. `resolveJoinCode` reads the code's first
 * character and hands back the page that character named, and this pushes it — the same
 * dispatch `JoinCodeCard` makes, from the other end of the app. Nothing here is asked of
 * the server: the room screen is what joins the room, so a code that names a game but no
 * room of that game is refused on the way to the door rather than at it.
 */
export default function JoinCodeRow() {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();
    const router = useRouter();

    const field = useRef<TextInput>(null);

    const [code, setCode] = useState('');

    /**
     * A whole code that opened nothing, and the line under the row saying so.
     *
     * Cleared on the next keystroke rather than on the next press: the fix for a refused
     * code is a changed character, and a complaint still standing over a code that has
     * since been edited is a complaint about something that is no longer on screen.
     */
    const [rejected, setRejected] = useState(false);

    const target = resolveJoinCode(code);

    function join() {
        if (target.kind === 'incomplete') return;

        if (target.kind === 'rejected') {
            setRejected(true);
            return;
        }

        setRejected(false);
        // The room draws its own chrome, and an open keyboard would sit on top of it.
        field.current?.blur();

        router.push(target.href as RelativePathString);
    }

    return (
        <View>
            <View style={styles.row}>
                <TextInput
                    ref={field}
                    value={code}
                    onChangeText={text => {
                        setCode(sanitize(text));
                        setRejected(false);
                    }}
                    maxLength={JOIN_CODE_LENGTH}
                    placeholder={t('home.join.placeholder')}
                    placeholderTextColor={theme.colors.textFaint}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    // The keyboard's own key does what the button does, because a code
                    // typed out in full has already said what it is for.
                    returnKeyType="go"
                    onSubmitEditing={join}
                    accessibilityLabel={t('home.join.label')}
                    style={styles.field}
                />

                <PopPressable
                    onPress={join}
                    // Half-strength until there is a whole code to send, which is the
                    // same way every other blocked control in the app says so.
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
        // The lemon in both schemes rather than the scheme's loudest neutral an
        // `ActionButton` takes: this is the one filled control on a page otherwise made
        // of outlined cards, and it is the accent that says so on paper and on ink alike.
        backgroundColor: theme.colors.lemon,
        // The field beside it is flat to the page and this is not, which is the whole of
        // what says which half of the row is the control.
        ...(theme.scheme === 'dark' ? {} : hardShadow(2, theme.colors.border))
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
