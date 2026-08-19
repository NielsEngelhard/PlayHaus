import ContextPill, { useContextPillStyles } from "@/components/layout/ContextPill";
import AppText from "@/components/text/AppText";
import { Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Animated, Easing, Platform, Pressable, View } from "react-native";

interface Props {
    /**
     * Opens the leave confirm. Never navigates on its own — walking off this screen
     * throws a room away, which is `LobbyView`'s question to ask.
     */
    onBack: () => void,
    /** The host's corner is about them; a guest's is about the room they are sitting in. */
    isHost: boolean,
    code: string,
    /** Whether this device's socket is open. Only read on the guest's pill. */
    live: boolean
}

/** The design's row: tall enough to clear the notch, short enough to spend on chrome. */
const BAR_HEIGHT = 62;
const CHIP_SIZE = 36;

// react-native-web has no native animation module, so asking for one there is a
// console warning and nothing else. Opacity is driver-safe everywhere else.
const useNativeDriver = Platform.OS !== 'web';

/** Half a breath. The dot fades out over this, then back in over it. */
const PULSE_MS = 1000;

/**
 * The room's own top row, drawn by the page rather than by `Header`.
 *
 * The global header is hidden on these routes (see `header-context.ts`) for one reason:
 * its back chip is a `Link`, and here going back deletes a room. A link that did that
 * without asking would be the one control in the app you cannot middle-click safely, so
 * the way out has to be a `Pressable` that opens a question — which means it cannot live
 * in the shared chrome. The cost is the theme toggle, which these two screens do without.
 *
 * The chip is a copy of `BackChip`'s look for the same reason it is not `BackChip`.
 */
export default function LobbyBar({ onBack, isHost, code, live }: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const pill = usePillStyles();

    return (
        <View style={styles.bar}>
            <Pressable
                onPress={onBack}
                accessibilityRole='button'
                accessibilityLabel={isHost ? 'Kamer sluiten' : 'Kamer verlaten'}
                style={styles.chip}
            >
                <Feather name='arrow-left' size={17} color={theme.colors.text} />
            </Pressable>

            <View style={styles.spacer} />

            {isHost ? (
                // Filled, which the app saves for the pill that *is* the screen's
                // subject: this room is yours, and everything on the page follows from it.
                <ContextPill accent={theme.colors.lemon} label='Jij host' icon='star' filled />
            ) : (
                <View
                    style={pill.pill}
                    accessibilityRole='text'
                    accessibilityLabel={live
                        ? `Verbonden met kamer ${[...code].join(' ')}`
                        : 'Verbinding met de kamer kwijt'}
                >
                    {/*
                      * A guest's own dot. Worth a pill of its own here in a way it is not
                      * on the host's screen: everything that happens next happens on
                      * somebody else's phone, so "am I still listening" is the one thing
                      * this screen can tell you about itself.
                      */}
                    <PulseDot live={live} />

                    <AppText style={pill.label} numberOfLines={1}>Kamer {code}</AppText>
                </View>
            )}
        </View>
    )
}

/** The dot in the guest's pill: breathing while connected, flat and red once not. */
function PulseDot({ live }: { live: boolean }) {
    const theme = useTheme();
    const pill = usePillStyles();

    const [pulse] = useState(() => new Animated.Value(1));

    useEffect(() => {
        // A dropped connection holds still. A dot that kept breathing in red would read
        // as "working on it" at exactly the moment nothing is working.
        if (!live) {
            pulse.setValue(1);
            return;
        }

        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    toValue: 0.3,
                    duration: PULSE_MS,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver
                }),
                Animated.timing(pulse, {
                    toValue: 1,
                    duration: PULSE_MS,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver
                })
            ])
        );

        loop.start();

        return () => loop.stop();
    }, [live, pulse]);

    return (
        <Animated.View
            style={[
                pill.dot,
                { backgroundColor: live ? theme.colors.available : theme.colors.destructive },
                { opacity: pulse }
            ]}
        />
    )
}

const usePillStyles = useContextPillStyles;

const useStyles = createThemedStyles(theme => ({
    bar: {
        height: BAR_HEIGHT,
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two + 2
    },
    // `BackChip`'s chrome, kept in step with it by hand. See the note above for why this
    // is a button and not that link.
    chip: {
        width: CHIP_SIZE,
        height: CHIP_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...(theme.scheme === 'dark' ? {} : { boxShadow: '2px 2px 0 0 #0F0D12' })
    },
    // Pushes the pill to the far edge without either side having to know the other's width.
    spacer: {
        flex: 1
    }
}))
