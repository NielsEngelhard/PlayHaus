import { MaxContentWidth, Spacing, withAlpha } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useEffect, useState } from "react";
import {
    Animated,
    Easing,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    useWindowDimensions,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { QuizListItem } from "../pubquizr-quizzes";
import QuizBrowser from "./QuizBrowser";

// react-native-web has no native animation module, so asking for one there is a
// console warning and nothing else. Transforms and opacity are driver-safe elsewhere.
const useNativeDriver = Platform.OS !== 'web';

/** Matches `PopupModal`: in quicker than out. Arriving is prompt, leaving unhurried. */
const OPEN_MS = 220;
const CLOSE_MS = 160;

/**
 * How much of the window the sheet takes.
 *
 * Not all of it. The strip of dimmed page left above the sheet is what says this is a
 * layer over the screen you were on rather than a screen you have navigated to — and it
 * is somewhere to tap to get back, which a sheet that reached the top would not have.
 */
const SHEET_HEIGHT = 0.92;

interface Props {
    visible: boolean,
    onClose: () => void,
    /** Picks a quiz. Left out on the index, where a row goes to the setup screen. */
    onSelect?: (quiz: QuizListItem) => void,
    /**
     * What a row does on the index, where picking is not what it is for.
     *
     * It cannot be the plain link the same row is on the page: a `Modal` is its own root
     * on native, so a route pushed from inside one leaves the sheet standing over
     * whatever it landed on. The caller closes this and navigates itself.
     */
    onNavigate?: (quiz: QuizListItem) => void,
    /** The quiz already chosen, ticked wherever it turns up in the rows. */
    selectedQuizId?: string
}

/**
 * The browse, over whatever asked for it.
 *
 * Both places you can pick a quiz open this: the index page, where the rows are links
 * into the setup screen, and step 2 of the one-device setup, where they are the choice
 * itself. That is the point of it — the shelf used to be a small box embedded in two
 * different pages, each with a page-worth of scrolling above it, and looking for a quiz
 * meant scrolling to the list and then scrolling the list.
 *
 * A sheet rather than a route, because picking a quiz is not somewhere you go: it is a
 * question asked about the page you are on, and the answer belongs back on that page
 * with nothing having moved. There is no navigator in this app to give it a modal
 * presentation — `app/_layout.tsx` renders a bare `Slot` — so this is built the way the
 * app's other overlays are, on React Native's own `Modal`.
 *
 * It is the first bottom-anchored one. The mechanics are `PopupModal`'s, unchanged: a
 * `present` flag raised during render so the panel outlives `visible`, one
 * `Animated.Value` for both directions, and the animation dropping the panel at the end
 * rather than `visible` tearing it away mid-flight. Only the geometry differs — this
 * comes up from the edge it is attached to instead of growing from the middle.
 */
export default function QuizSheet({ visible, onClose, onSelect, onNavigate, selectedQuizId }: Props) {
    const t = useT();
    const styles = useStyles();
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();

    /**
     * The modal has to outlive `visible`, or closing it would tear the sheet off screen
     * with the animation meant to see it out still to play. Raised during render rather
     * than in an effect so the first frame is already the one the animation starts from,
     * and dropped again by the animation itself once there is nothing left to show.
     */
    const [present, setPresent] = useState(visible);
    if (visible && !present) setPresent(true);

    /** 0 fully gone, 1 fully arrived. Both directions are the same journey. */
    const [open] = useState(() => new Animated.Value(visible ? 1 : 0));

    useEffect(() => {
        const move = Animated.timing(open, {
            toValue: visible ? 1 : 0,
            duration: visible ? OPEN_MS : CLOSE_MS,
            // No overshoot on the way in. A panel that knocks is a small object landing;
            // a sheet this size doing it reads as the whole screen bouncing.
            easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
            useNativeDriver
        });

        move.start(({ finished }) => {
            // Interrupted means `visible` changed again and the next run owns the sheet.
            if (finished && !visible) setPresent(false);
        });

        return () => move.stop();
    }, [visible, open]);

    if (!present) return null;

    // Travels its own height, so it is fully off screen at 0 whatever the window is.
    const travel = windowHeight * SHEET_HEIGHT;

    return (
        <Modal
            visible
            transparent
            // The arrival is animated here, in one place, rather than half here and half
            // in whatever each platform's own transition happens to be.
            animationType='none'
            statusBarTranslucent
            // Android's back button and the web's Escape. Unlike the running-quiz panel
            // on the setup screen, this one is an offer rather than a decision: there is
            // always a way out of a browse without picking anything.
            onRequestClose={onClose}
        >
            <View style={styles.stage}>
                <Animated.View style={[styles.backdropLayer, { opacity: open }]}>
                    <Pressable
                        style={styles.backdrop}
                        onPress={onClose}
                        accessibilityRole='button'
                        accessibilityLabel={t('common.close')}
                    />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            height: travel,
                            paddingBottom: insets.bottom + Spacing.two,
                            transform: [{
                                translateY: open.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [travel, 0]
                                })
                            }]
                        }
                    ]}
                >
                    {/* Set dressing, the same as the one on every settings screen:
                        nothing drags, it just says "this is a sheet" the way a sheet
                        does. */}
                    <View style={styles.grabber} />

                    {/* The search field is at the top of the browser and the rows run
                        under it, so a keyboard coming up must shorten the sheet rather
                        than cover the list it is filtering. */}
                    <KeyboardAvoidingView
                        style={styles.body}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                        <QuizBrowser
                            onSelect={onSelect}
                            onNavigate={onNavigate}
                            selectedQuizId={selectedQuizId}
                            onClose={onClose}
                        />
                    </KeyboardAvoidingView>
                </Animated.View>
            </View>
        </Modal>
    )
}

const useStyles = createThemedStyles(theme => ({
    stage: {
        flex: 1,
        // The sheet is attached to the bottom edge; on a wide window it is still a sheet
        // rather than the page, so it is centred and capped at the app's own column.
        alignItems: 'center',
        justifyContent: 'flex-end'
    },

    backdropLayer: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        // The page behind stays legible through it: the sheet is a question about that
        // page, and blacking it out would make it a question about nothing.
        backgroundColor: theme.colors.scrim
    },

    backdrop: {
        flex: 1
    },

    sheet: {
        width: '100%',
        maxWidth: MaxContentWidth,
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        paddingHorizontal: 14,
        // Clips the rows to the rounded corners as they scroll under them.
        overflow: 'hidden',
        backgroundColor: theme.colors.background,
        borderTopWidth: theme.borderWidth,
        borderColor: theme.colors.border
    },

    grabber: {
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 8,
        width: 44,
        height: 5,
        borderRadius: 999,
        backgroundColor: theme.scheme === 'dark'
            ? withAlpha(theme.colors.text, 0.15)
            : withAlpha(theme.colors.border, 0.15)
    },

    body: {
        flex: 1,
        minHeight: 0
    }
}));
