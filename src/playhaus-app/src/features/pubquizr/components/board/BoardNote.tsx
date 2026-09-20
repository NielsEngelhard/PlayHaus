import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { Brand, FontSizes, Radii, Spacing } from "@/constants/theme";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import type { ReactNode } from "react";
import { View } from "react-native";

const AVATAR = 24;

export type BoardNoteTone = 'plain' | 'quiet' | 'blush' | 'lemon';

interface Props {
    seat: Seat | null
    text: string
    tone?: BoardNoteTone
    /** Whatever sits at the far right: a count, a dot. */
    trailing?: ReactNode
}

// One line about somebody, with their face on it: who has the answer, who missed it, who is not ready.
export default function BoardNote({ seat, text, tone = 'plain', trailing }: Props) {
    const styles = useStyles();

    return (
        <View style={[styles.note, styles[tone]]}>
            {seat !== null && <SeatAvatar seat={seat} size={AVATAR} />}

            <AppText style={[styles.text, (tone === 'blush' || tone === 'lemon') && styles.inkText]} numberOfLines={2}>
                {text}
            </AppText>

            {trailing}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    note: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.three,
        borderRadius: Radii.lg,
        borderWidth: theme.borderWidth
    },

    plain: {
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },

    quiet: {
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundElement
    },

    // Blush and lemon stay the same in both schemes, so the ink on them does too.
    blush: {
        borderColor: Brand.ink,
        backgroundColor: Brand.blush
    },

    lemon: {
        borderColor: Brand.ink,
        backgroundColor: Brand.lemon
    },

    text: {
        flex: 1,
        minWidth: 0,
        fontSize: FontSizes.xs,
        fontWeight: 800,
        color: theme.colors.text
    },

    inkText: {
        color: Brand.ink
    }
}))
