import AppText from '@/components/text/AppText';
import { FontSizes, Radii, Spacing } from '@/constants/theme';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import type { ReactNode } from 'react';
import { View } from 'react-native';

interface Props {
    // A short reading at the far end of the label's line, such as a count.
    aside?: string,
    children: ReactNode,
    title: string
}

// A labelled card for one part of a setup screen: the players, or the settings.
export default function SectionCard({ aside, children, title }: Props) {
    const styles = useStyles();

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <AppText style={styles.label}>{title}</AppText>

                {aside !== undefined && <AppText style={styles.aside}>{aside}</AppText>}
            </View>

            {children}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        gap: Spacing.three,
        padding: Spacing.three,
        borderRadius: Radii.xl,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hard
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },
    label: {
        flex: 1,
        fontSize: FontSizes.xs,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 2,
        color: theme.colors.textSecondary
    },
    aside: {
        fontSize: FontSizes.sm,
        fontWeight: 900,
        // The left-hand digit changes as people arrive; without this the label twitches.
        fontVariant: ['tabular-nums'],
        color: theme.colors.text
    }
}))
