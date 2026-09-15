import type { FFGamePlayer } from "@/api/calls/fake-filler";
import AppText from "@/components/text/AppText";
import { Brand, Spacing, withAlpha } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { initialsOf } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { avatarColorById } from "@/utils/color-utils";
import { View } from "react-native";

interface Props {
    voters: string[],
    players: FFGamePlayer[],
    userId: string,
    // Sitting on a brand surface, where the themed text colour would vanish in dark mode.
    onBrand?: boolean
}

const BUBBLE_SIZE = 30;

// Everyone who picked one option, as a swatch each with the name underneath.
export default function VoterBubbles({ voters, players, userId, onBrand = false }: Props) {
    const t = useT();
    const styles = useStyles();

    return (
        <View style={styles.row}>
            {voters.map(voterId => {
                const player = players.find(candidate => candidate.userId === voterId);
                const name = player?.name ?? '?';
                const swatch = avatarColorById(player?.avatarColorId ?? '');

                return (
                    <View key={voterId} style={styles.voter}>
                        <View style={[styles.bubble, { backgroundColor: swatch.color }]}>
                            <AppText style={[styles.initials, { color: swatch.foreground }]}>
                                {initialsOf(name)}
                            </AppText>
                        </View>

                        <AppText style={[styles.name, onBrand && styles.nameOnBrand]} numberOfLines={1}>
                            {voterId === userId ? t('common.you') : name}
                        </AppText>
                    </View>
                );
            })}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.two
    },
    voter: {
        width: 52,
        alignItems: 'center',
        gap: 3
    },
    bubble: {
        width: BUBBLE_SIZE,
        height: BUBBLE_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        borderWidth: 2,
        borderColor: Brand.ink
    },
    initials: {
        fontSize: 11,
        fontWeight: 900
    },
    name: {
        maxWidth: '100%',
        fontSize: 10.5,
        fontWeight: 800,
        color: theme.colors.textSecondary
    },
    nameOnBrand: {
        color: withAlpha(Brand.ink, 0.75)
    }
}))
