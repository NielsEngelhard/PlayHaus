import type { ReconnectableGame } from "@/api/calls/reconnect";
import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import TextButton from "@/components/ui/TextButton";
import { FontSizes, Spacing } from "@/constants/theme";
import { startedAgo, type GameKind } from "@/features/reconnect/game-kinds";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { View } from "react-native";

interface Props {
    game: ReconnectableGame
    /** What this type of game is called and where its button goes. */
    kind: GameKind
}

/**
 * One game you can drop back into: what it is on the left, the way back in on
 * the right.
 *
 * The card itself is not tappable. Every row here is a jump straight back into a
 * game in progress, which is not something to do by brushing a card — so there is
 * one button, and it is the loudest thing on the row.
 */
export default function ReconnectableGameCard({ game, kind }: Props) {
    const theme = useTheme();
    const styles = useStyles();

    const router = useRouter();
    const started = startedAgo(game.createdAt);

    return (
        <Card style={styles.card}>
            <View style={styles.row}>
                <View style={[styles.iconTile, { backgroundColor: kind.color }]}>
                    <Feather name={kind.icon} size={20} color={theme.colors.text} />
                </View>

                <View style={styles.body}>
                    <AppText style={styles.title} numberOfLines={1}>{kind.title}</AppText>

                    <AppText style={styles.meta} numberOfLines={1}>
                        {started === null ? kind.mode : `${kind.mode} · gestart ${started}`}
                    </AppText>
                </View>

                <TextButton
                    text='Verder'
                    variant='primary'
                    onPress={() => router.push(kind.href(game))}
                    style={styles.button}
                />
            </View>
        </Card>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        // Tighter than a `Card`'s default: this is a row in a list, not a panel,
        // and the button already carries its own height.
        padding: Spacing.three
    },
    // The wrapper is a `Card`, which lays its children out in a column.
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three
    },
    iconTile: {
        width: 40,
        height: 40,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.hardSmall
    },
    body: {
        // Without this the text column refuses to shrink and pushes the button off
        // the card on a narrow screen.
        flex: 1,
        minWidth: 0
    },
    title: {
        fontSize: FontSizes.md,
        fontWeight: 900,
        color: theme.colors.text
    },
    meta: {
        marginTop: Spacing.half,
        fontSize: FontSizes.sm,
        color: theme.colors.textSecondary
    },
    button: {
        // `TextButton` sizes a label-width button by pinning itself to the start of
        // the cross axis, which in a row means the top. It belongs on the line.
        alignSelf: 'center',
        // The label is short, so the button would otherwise be too small to read as
        // the point of the row.
        minWidth: 108,
        paddingHorizontal: Spacing.three
    }
}))
