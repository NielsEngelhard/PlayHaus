import type { FFGamePlayer } from "@/api/calls/fake-filler";
import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { Brand, Radii, Spacing, withAlpha } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { initialsOf } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { avatarColorById } from "@/utils/color-utils";
import { View } from "react-native";

interface Props {
    voters: string[],
    players: FFGamePlayer[],
    userId: string,
    /** What picking this card meant, which is not the same sentence on the truth as on a fake. */
    label: string,
    // Sitting on a brand surface, where the themed text colour would vanish in dark mode.
    onBrand?: boolean
}

const AVATAR_SIZE = 26;

// Everyone who picked one option, named under a label that says what picking it meant.
export default function VoterBubbles({ voters, players, userId, label, onBrand = false }: Props) {
    const t = useT();
    const styles = useStyles();

    return (
        <View style={[styles.block, onBrand ? styles.blockOnBrand : styles.blockThemed]}>
            <AppText style={[styles.label, onBrand && styles.labelOnBrand]}>{label}</AppText>

            {voters.length === 0 ? (
                <AppText style={[styles.none, onBrand && styles.noneOnBrand]}>
                    {t('fakeFiller.play.reveal.voters.none')}
                </AppText>
            ) : (
                <View style={styles.row}>
                    {voters.map(voterId => {
                        const player = players.find(candidate => candidate.userId === voterId);
                        const name = player?.name ?? '?';

                        return (
                            <View key={voterId} style={styles.tag}>
                                {/* Initials come off the real name, so your own swatch does not change letters. */}
                                <SeatAvatar
                                    size={AVATAR_SIZE}
                                    seat={{
                                        seat: 0,
                                        name,
                                        score: 0,
                                        initials: initialsOf(name),
                                        swatch: avatarColorById(player?.avatarColorId ?? '')
                                    }}
                                />

                                <AppText style={styles.name} numberOfLines={1}>
                                    {voterId === userId ? t('common.you') : name}
                                </AppText>
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    // Android draws a one-sided dashed border solid; everywhere else it is the seam the mock asks for.
    block: {
        gap: 7,
        paddingTop: 11,
        borderTopWidth: theme.borderWidth,
        borderStyle: 'dashed'
    },
    blockOnBrand: {
        borderTopColor: withAlpha(Brand.ink, 0.3)
    },
    blockThemed: {
        borderTopColor: theme.colors.borderDashed
    },
    label: {
        fontSize: 10.5,
        fontWeight: 900,
        letterSpacing: 1.1,
        textTransform: 'uppercase',
        color: theme.colors.textSecondary
    },
    labelOnBrand: {
        color: withAlpha(Brand.ink, 0.72)
    },
    none: {
        fontSize: 12.5,
        fontWeight: 800,
        color: theme.colors.textSecondary
    },
    noneOnBrand: {
        color: withAlpha(Brand.ink, 0.72)
    },
    // Six players is two lines, and that is the row working rather than failing.
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.two - Spacing.half
    },
    tag: {
        flexShrink: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two - Spacing.half,
        paddingVertical: 3,
        paddingLeft: 3,
        paddingRight: 11,
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundElement,
        ...theme.shadows.hardSmall
    },
    name: {
        flexShrink: 1,
        fontSize: 13,
        fontWeight: 900,
        letterSpacing: -0.1,
        color: theme.colors.text
    }
}))
