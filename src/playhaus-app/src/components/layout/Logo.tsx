import AppText from "@/components/text/AppText"
import { APP_NAME } from "@/constants/global-constants"
import { Brand, Spacing, withAlpha } from "@/constants/theme"
import { createThemedStyles } from "@/features/theme/createThemedStyles"
import { View } from "react-native"

interface Props {
    includeAppName: boolean
}

/**
 * The wordmark, as a pill: a lemon initial tile followed by the app name in caps.
 *
 * Sits at the left of the header on every page. Inside a game the name drops away and
 * only the tile is left — the game is the headline there.
 */
export default function Logo({ includeAppName }: Props) {
    const styles = useStyles();

    return (
        <View style={[styles.pill, !includeAppName && styles.pillTight]}>
            <View style={styles.iconTile}>
                <AppText style={styles.iconText}>{APP_NAME[0]}</AppText>
            </View>

            {includeAppName && (
                <AppText style={styles.appName}>{APP_NAME}</AppText>
            )}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        paddingLeft: 6,
        paddingRight: Spacing.three - 4,
        paddingVertical: 5,
        // A hard offset with a soft one under it, so the pill is both cut out and
        // floating. Both cast into `shadow`, which is ink on paper and a near-black one
        // step under the canvas in dark.
        boxShadow: `2px 2px 0 0 ${theme.colors.shadow}, 0 6px 14px -8px ${withAlpha(theme.colors.shadow, 0.5)}`
    },
    // With no name beside it the tile would be sitting in a lopsided capsule.
    pillTight: {
        paddingRight: 6
    },
    iconTile: {
        width: 22,
        height: 22,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.scheme === 'dark' ? 0 : theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.lemon
    },
    iconText: {
        fontSize: 12,
        fontWeight: 900,
        color: Brand.ink
    },
    appName: {
        fontSize: 13,
        fontWeight: 900,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: theme.colors.text
    }
}))
