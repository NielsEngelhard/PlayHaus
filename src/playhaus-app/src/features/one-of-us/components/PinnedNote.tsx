import { Brand } from '@/constants/theme';
import { tiltFor, type NoteTone } from '@/features/one-of-us/board-notes';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

interface Props {
    accessibilityLabel?: string
    children: ReactNode
    disabled?: boolean
    /** Which way it hangs. Its position on the board, not an angle. */
    index?: number
    onPress?: () => void
    /** For layout only — how the note sits among its siblings. The look lives here. */
    style?: StyleProp<ViewStyle>
    tone?: NoteTone
}

// One briefje on the board: torn paper, a hard edge, and never quite straight.
export default function PinnedNote({
    accessibilityLabel,
    children,
    disabled = false,
    index = 0,
    onPress,
    style,
    tone = 'paper'
}: Props) {
    const styles = useStyles();

    const look = [
        styles.note,
        tone === 'picked' && styles.picked,
        tone === 'out' && styles.out,
        tone === 'mine' && styles.mine,
        { transform: [{ rotate: tiltFor(index) }] },
        style
    ];

    if (onPress === undefined) {
        return <View style={look}>{children}</View>;
    }

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole='button'
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ disabled }}
            style={[look, disabled && tone === 'paper' && styles.dimmed]}
        >
            {children}
        </Pressable>
    )
}

// The drawing pin through the top of a note. Fog is the one neutral no game accent claims.
export function NotePin({ size = 14 }: { size?: number }) {
    const styles = useStyles();

    return (
        <View
            style={[styles.pin, { width: size, height: size }]}
            accessibilityElementsHidden
            importantForAccessibility='no-hide-descendants'
        />
    )
}

const useStyles = createThemedStyles(theme => ({
    // Barely rounded: paper is cut, not moulded.
    note: {
        borderRadius: 5,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hard
    },

    // The pale fills need the ink outline in both schemes — the scheme's own border would vanish into them.
    picked: {
        borderColor: Brand.ink,
        backgroundColor: Brand.violet
    },

    out: {
        borderColor: Brand.ink,
        backgroundColor: Brand.mint
    },

    // Your own briefje, which is on the board but is not a thing you may pick.
    mine: {
        borderStyle: 'dashed',
        borderColor: theme.colors.borderDashed,
        backgroundColor: theme.colors.boardEmpty,
        boxShadow: 'none'
    },

    // Only plain paper dims when the board stops answering: a note you picked has to stay readable.
    dimmed: {
        opacity: 0.55
    },

    pin: {
        flexShrink: 0,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: Brand.fog
    }
}))
