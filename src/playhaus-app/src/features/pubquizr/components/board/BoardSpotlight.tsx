import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { FontSizes, Spacing } from "@/constants/theme";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import type { ReactNode } from "react";
import { View } from "react-native";

const AVATAR = 80;
const MESSAGE_MAX_WIDTH = 280;

interface Props {
    children?: ReactNode
    message?: string
    seat: Seat | null
    title: string
}

// The middle of a phone with nothing to press: whose move it is, big, and what happens next.
export default function BoardSpotlight({ children, message, seat, title }: Props) {
    const styles = useStyles();

    return (
        <View style={styles.stage}>
            {seat !== null && <SeatAvatar seat={seat} size={AVATAR} raised />}

            <AppText style={styles.title}>{title}</AppText>

            {message !== undefined && <AppText style={styles.message}>{message}</AppText>}

            {children}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    stage: {
        flex: 1,
        minHeight: 0,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.three
    },

    title: {
        fontSize: FontSizes.xl,
        fontWeight: 900,
        letterSpacing: -0.8,
        textAlign: 'center',
        color: theme.colors.text
    },

    message: {
        maxWidth: MESSAGE_MAX_WIDTH,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        fontWeight: 700,
        textAlign: 'center',
        color: theme.colors.textSecondary
    }
}))
