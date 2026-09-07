import AppText from "@/components/text/AppText";
import { Brand } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

interface Props {
    /**
     * `tile` is the square that shares a row with its twin — icon over name over one
     * line. `row` is the full-width version of the same card, laid on its side with a
     * chevron at the end, for a choice that stands alone.
     *
     * Same object at two sizes, not two components: a page with one alternative and a
     * page with two should not be drawn by different code.
     */
    layout?: 'tile' | 'row',
    icon: keyof typeof Feather.glyphMap,
    /** The icon tile's fill. A `Brand` hue — see `FeatureModeCard`'s `fill`. */
    tint: string,
    title: string,
    description: string,
    /** Where tapping this goes, for a choice that is a real destination. */
    href?: Href,
    /** What tapping this does instead, for one that is not a page yet. */
    onPress?: () => void
}

const TILE_SIZE = 36;
const TILE_SIZE_ROW = 40;

/**
 * One of the quieter ways to play, under the loud one — see `FeatureModeCard`.
 *
 * Paper rather than accent, with the colour kept to the icon tile: there are two of these
 * on the solo page and one on the multiplayer page, and none of them should compete with
 * the card above. That is the same trade `ModeCard` makes between its quiet and `solid`
 * designs, one level further in.
 *
 * Not a variant of `ModeCard` itself, though. That card is a 186dp column with a gradient
 * tile, a chip and an action row, built to be one of a pair on a game's front page; these
 * two share none of its geometry, and folding them in would be a third and fourth design
 * inside a component that already carries two.
 */
export default function ModeOptionCard({
    layout = 'tile',
    icon,
    tint,
    title,
    description,
    href,
    onPress
}: Props) {
    const theme = useTheme();
    const styles = useStyles();

    const row = layout === 'row';

    // The same two lines either way. The row layout has to box them, because there they
    // sit beside the chevron and have to take the room it leaves; the tile layout must
    // not, because there they are two of the three things the card's own gap spaces out.
    const text = (
        <>
            <AppText style={[styles.title, row && styles.titleRow]}>{title}</AppText>

            <AppText style={[styles.description, row && styles.descriptionRow]}>
                {description}
            </AppText>
        </>
    );

    const card = (
        <Pressable
            onPress={onPress}
            accessibilityRole={href === undefined ? 'button' : 'link'}
            accessibilityLabel={`${title}. ${description}`}
            // Flattened: `Link asChild` clones this onto the anchor it renders, and a
            // style array does not survive that trip.
            style={StyleSheet.flatten([styles.card, row && styles.cardRow])}
        >
            <View
                style={[
                    styles.tile,
                    row && styles.tileRow,
                    { backgroundColor: tint }
                ]}
            >
                <Feather name={icon} size={row ? 18 : 17} color={Brand.ink} />
            </View>

            {row ? <View style={styles.rowText}>{text}</View> : text}

            {row && (
                <Feather
                    name='chevron-right'
                    size={16}
                    color={theme.colors.textMuted}
                />
            )}
        </Pressable>
    );

    return href === undefined ? card : <Link href={href} asChild>{card}</Link>;
}

const useStyles = createThemedStyles(theme => ({
    card: {
        // Sized by the row it is in rather than by its contents, so a pair of these come
        // out the same height whichever of them says more.
        flex: 1,
        flexBasis: 0,
        minWidth: 0,
        padding: 13,
        gap: 7,
        borderRadius: 20,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.popShadow(theme.colors.shadow)
    },
    // Laid on its side, and no longer sharing a row with anything — so the `flex` above
    // stops being what sizes it and the card simply hugs its own contents.
    cardRow: {
        flex: 0,
        flexBasis: 'auto',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },

    // Ink and paper in both schemes, like `ModeCard`'s solid tile: the tile is a chip of
    // the game's colour rather than a surface of the app's, so it does not follow the
    // canvas.
    tile: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Brand.ink
    },
    tileRow: {
        width: TILE_SIZE_ROW,
        height: TILE_SIZE_ROW,
        borderRadius: 13
    },

    rowText: {
        flex: 1,
        minWidth: 0
    },

    title: {
        fontSize: 14.5,
        fontWeight: 900,
        letterSpacing: -0.3,
        color: theme.colors.text
    },
    titleRow: {
        fontSize: 15
    },

    description: {
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 11 * 1.35,
        color: theme.colors.textSecondary
    },
    descriptionRow: {
        marginTop: 2,
        fontSize: 11.5
    }
}))
