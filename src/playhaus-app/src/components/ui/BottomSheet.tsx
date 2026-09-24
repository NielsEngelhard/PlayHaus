import { MaxContentWidth, Spacing, withAlpha } from '@/constants/theme';
import { useT } from '@/features/i18n/LanguageContext';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { useEffect, useState, type ReactNode } from 'react';
import {
    Animated,
    Easing,
    Modal,
    Platform,
    Pressable,
    useWindowDimensions,
    View,
    type LayoutChangeEvent
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// react-native-web has no native animation module, so asking for one there is a console warning and nothing else.
const useNativeDriver = Platform.OS !== 'web';

/** Matches `PopupModal`: in quicker than out. Arriving is prompt, leaving unhurried. */
const OPEN_MS = 220;
const CLOSE_MS = 160;

// A sheet that sizes to its content still never swallows the whole window.
const CONTENT_CEILING = 0.92;

interface Props {
    children: ReactNode,
    /** How much of the window to take. Left out, the sheet is as tall as what is in it. */
    heightRatio?: number,
    onClose: () => void,
    visible: boolean
}

// The panel that rises from the bottom edge, with the scrim and the grabber that go with it.
export default function BottomSheet({ children, heightRatio, onClose, visible }: Props) {
    const t = useT();
    const styles = useStyles();
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();

    // The modal has to outlive `visible`, or closing it would tear the sheet off screen with the animation meant to see it out still to play.
    const [present, setPresent] = useState(visible);
    if (visible && !present) setPresent(true);

    /** 0 fully gone, 1 fully arrived. Both directions are the same journey. */
    const [open] = useState(() => new Animated.Value(visible ? 1 : 0));

    /** How tall the content turned out to be, and 0 until it has been laid out once. */
    const [measured, setMeasured] = useState(0);

    useEffect(() => {
        const move = Animated.timing(open, {
            toValue: visible ? 1 : 0,
            duration: visible ? OPEN_MS : CLOSE_MS,
            // No overshoot on the way in.
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

    const fixed = heightRatio === undefined ? null : windowHeight * heightRatio;

    // Travels its own height, so it is fully off screen at 0 whatever the window is.
    const travel = fixed ?? measured;

    function measure(event: LayoutChangeEvent) {
        setMeasured(event.nativeEvent.layout.height);
    }

    return (
        <Modal
            visible
            transparent
            // The arrival is animated here, in one place, rather than half here and half in whatever each platform's own transition happens to be.
            animationType='none'
            statusBarTranslucent
            // Android's back button and the web's Escape.
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
                    onLayout={fixed === null ? measure : undefined}
                    style={[
                        styles.sheet,
                        {
                            height: fixed ?? undefined,
                            maxHeight: windowHeight * CONTENT_CEILING,
                            paddingBottom: insets.bottom + Spacing.two,
                            // Held back until there is a distance to come from, or the first frame sits in its final place and then jumps.
                            opacity: fixed === null && measured === 0 ? 0 : 1,
                            transform: [{
                                translateY: open.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [travel, 0]
                                })
                            }]
                        }
                    ]}
                >
                    {/* Set dressing, the same as the one on every settings screen. */}
                    <View style={styles.grabber} />

                    {children}
                </Animated.View>
            </View>
        </Modal>
    )
}

const useStyles = createThemedStyles(theme => ({
    stage: {
        flex: 1,
        // The sheet is attached to the bottom edge.
        alignItems: 'center',
        justifyContent: 'flex-end'
    },

    backdropLayer: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        // The page behind stays legible through it.
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
    }
}));
