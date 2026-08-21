import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import { FontSizes, MaxContentWidth, Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, Modal, Platform, View } from "react-native";

// react-native-web has no native animation module, so asking for one there is a
// console warning and nothing else. Transforms and opacity are driver-safe elsewhere.
const useNativeDriver = Platform.OS !== 'web';

/** In quicker than out: arriving should feel prompt, leaving unhurried. */
const OPEN_MS = 180;
const CLOSE_MS = 130;

/** Where the panel comes from. Small on purpose — it should read as a step, not a slam. */
const FROM_SCALE = 0.94;
const FROM_LIFT = 14;

const noop = () => { };

interface Props {
    visible: boolean
    title: string
    /** The sentence under the title. Optional for a panel whose children say it all. */
    message?: string
    /** What sits under the message — the buttons, and anything they need to explain. */
    children: ReactNode
    /**
     * Android's back button and the web's Escape. Leave it out for a modal that is a
     * decision rather than an interruption: one with no way past it but its own actions.
     */
    onRequestClose?: () => void
}

/**
 * A panel over a dimmed page, for a question that has to be answered before the screen
 * behind it means anything.
 *
 * Deliberately not a notification: `InlineNotification` tells you something about the
 * page you are already on and lets you carry on reading it. This one stops everything,
 * so it is worth using only where carrying on would be the wrong thing to allow.
 *
 * The look is `Card`'s, unchanged, so a panel is recognisably made of the same stuff as
 * the rest of the app; all this adds is the backdrop and the way it arrives.
 */
export default function PopupModal({ visible, title, message, children, onRequestClose }: Props) {
    const styles = useStyles();

    /**
     * The modal has to outlive `visible`, or closing it would tear the panel off screen
     * with the animation that was meant to see it out still to play. Raised during render
     * rather than in an effect so the first frame is already the one the animation starts
     * from, and dropped again by the animation itself once there is nothing left to show.
     */
    const [present, setPresent] = useState(visible);
    if (visible && !present) setPresent(true);

    /** 0 fully gone, 1 fully arrived. Both directions are the same journey. */
    const [open] = useState(() => new Animated.Value(visible ? 1 : 0));

    useEffect(() => {
        const move = Animated.timing(open, {
            toValue: visible ? 1 : 0,
            duration: visible ? OPEN_MS : CLOSE_MS,
            // Overshoots a hair on the way in — the same knock the tiles and the buttons
            // land on — and just gets out of the way on the way back.
            easing: visible ? Easing.out(Easing.back(1.2)) : Easing.in(Easing.quad),
            useNativeDriver
        });

        move.start(({ finished }) => {
            // Interrupted means `visible` changed again and the next run owns the panel.
            if (finished && !visible) setPresent(false);
        });

        return () => move.stop();
    }, [visible, open]);

    if (!present) return null;

    // The overshoot takes the panel a shade past 1, which is the point of it; the backdrop
    // is clamped because there is no such thing as more than opaque.
    const fade = open.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' });

    return (
        <Modal
            visible
            transparent
            // The arrival is animated here, in one place, rather than half here and half
            // in whatever each platform's own transition happens to be.
            animationType='none'
            statusBarTranslucent
            // Android warns about a modal it cannot dismiss with the back button. A panel
            // that is a decision has nothing to do with that press, but it still has to
            // answer it.
            onRequestClose={onRequestClose ?? noop}
        >
            <View style={styles.stage}>
                <Animated.View style={[styles.backdrop, { opacity: fade }]} />

                <Animated.View
                    style={[
                        styles.panel,
                        {
                            opacity: fade,
                            transform: [
                                { translateY: open.interpolate({ inputRange: [0, 1], outputRange: [FROM_LIFT, 0] }) },
                                { scale: open.interpolate({ inputRange: [0, 1], outputRange: [FROM_SCALE, 1] }) }
                            ]
                        }
                    ]}
                >
                    <Card>
                        <AppText style={styles.title}>{title}</AppText>

                        {message && <AppText style={styles.message}>{message}</AppText>}

                        <View style={styles.actions}>{children}</View>
                    </Card>
                </Animated.View>
            </View>
        </Modal>
    )
}

const useStyles = createThemedStyles(theme => ({
    stage: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.four
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        // The page behind stays legible through it: the panel is a question about that
        // page, and blacking it out would make it a question about nothing.
        backgroundColor: theme.colors.scrim
    },
    panel: {
        width: '100%',
        // Narrower than a page, so it still reads as a panel on a desktop browser rather
        // than as the page itself having changed.
        maxWidth: MaxContentWidth / 2
    },
    title: {
        fontSize: FontSizes.xl,
        fontWeight: 900,
        color: theme.colors.text
    },
    message: {
        marginTop: Spacing.two,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.5,
        color: theme.colors.textSecondary
    },
    actions: {
        marginTop: Spacing.four,
        gap: Spacing.two
    }
}))
