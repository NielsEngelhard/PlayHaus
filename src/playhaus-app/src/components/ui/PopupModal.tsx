import AppText from "@/components/text/AppText";
import { Brand, hardShadow, MaxContentWidth, Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, Modal, Platform, View } from "react-native";

// react-native-web has no native animation module, so asking for one there is a console warning and nothing else.
const useNativeDriver = Platform.OS !== 'web';

/** In quicker than out: arriving should feel prompt, leaving unhurried. */
const OPEN_MS = 180;
const CLOSE_MS = 130;

/** Where the panel comes from. Small on purpose — it should read as a step, not a slam. */
const FROM_SCALE = 0.94;
const FROM_LIFT = 14;

export type PopupTone = 'danger' | 'invite' | 'info';

// Each tone tilts its own way, so two panels in a row never look pinned by the same hand.
const TONES: Record<PopupTone, { pin: string, tilt: string }> = {
    danger: { pin: Brand.blush, tilt: '-1.2deg' },
    invite: { pin: Brand.violet, tilt: '1deg' },
    info: { pin: Brand.lemon, tilt: '-0.6deg' }
};

const noop = () => { };

interface Props {
    visible: boolean
    title: string
    /** The sentence under the title. Optional for a panel whose body says it all. */
    message?: string
    /** What sits above the dashed line — a list, a QR code, an error. */
    children?: ReactNode
    /** The buttons, below the dashed line. */
    actions: ReactNode
    /** The pin's colour and the panel's tilt. */
    tone?: PopupTone
    // Android's back button and the web's Escape.
    onRequestClose?: () => void
}

// A note pinned over a dimmed page, for a question that has to be answered before the screen behind it means anything.
export default function PopupModal({ visible, title, message, children, actions, tone = 'info', onRequestClose }: Props) {
    const styles = useStyles();

    // The modal has to outlive `visible`, or closing it would tear the panel off screen with the animation that was meant to see it out still to play.
    const [present, setPresent] = useState(visible);
    if (visible && !present) setPresent(true);

    /** 0 fully gone, 1 fully arrived. Both directions are the same journey. */
    const [open] = useState(() => new Animated.Value(visible ? 1 : 0));

    useEffect(() => {
        const move = Animated.timing(open, {
            toValue: visible ? 1 : 0,
            duration: visible ? OPEN_MS : CLOSE_MS,
            // Overshoots a hair on the way in.
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

    // The overshoot takes the panel a shade past 1, which is the point of it.
    const fade = open.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' });

    const { pin, tilt } = TONES[tone];

    return (
        <Modal
            visible
            transparent
            // The arrival is animated here, in one place, rather than half here and half in whatever each platform's own transition happens to be.
            animationType='none'
            statusBarTranslucent
            // Android warns about a modal it cannot dismiss with the back button.
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
                                { scale: open.interpolate({ inputRange: [0, 1], outputRange: [FROM_SCALE, 1] }) },
                                { rotate: tilt }
                            ]
                        }
                    ]}
                >
                    <View style={[styles.pin, { backgroundColor: pin }]} />

                    <AppText style={styles.title}>{title}</AppText>

                    {message && <AppText style={styles.message}>{message}</AppText>}

                    {children != null && <View style={styles.body}>{children}</View>}

                    <View style={styles.actions}>{actions}</View>
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
        // The page behind stays legible through it.
        backgroundColor: theme.colors.scrim
    },
    panel: {
        width: '100%',
        // Narrower than a page, so it still reads as a panel on a desktop browser rather than as the page itself having changed.
        maxWidth: MaxContentWidth / 2,
        gap: 11,
        paddingTop: 16,
        paddingHorizontal: 15,
        paddingBottom: 15,
        borderRadius: 6,
        borderWidth: 3,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...hardShadow(6, theme.colors.shadow)
    },
    // The pin fills are pale in both schemes, so its outline stays ink rather than following `border`.
    pin: {
        alignSelf: 'center',
        width: 15,
        height: 15,
        marginTop: -4,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink
    },
    title: {
        fontSize: 21,
        fontWeight: 900,
        letterSpacing: -0.7,
        lineHeight: 24,
        color: theme.colors.text
    },
    message: {
        fontSize: 13,
        lineHeight: 13 * 1.5,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },
    body: {
        gap: Spacing.two
    },
    actions: {
        gap: Spacing.two,
        paddingTop: 11,
        borderTopWidth: theme.borderWidth,
        borderStyle: 'dashed',
        borderColor: theme.colors.borderMuted
    }
}))
