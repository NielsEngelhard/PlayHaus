import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import { FontSizes, Spacing } from "@/constants/theme";
import { AVATAR_COLORS, type AvatarColor } from "@/features/settings/profile";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { intoRows } from "@/utils/rows";
import Feather from "@expo/vector-icons/Feather";
import { Pressable, View } from "react-native";

interface Props {
    value: string,
    onChange: (color: string) => void,
    /** A save is in the air, so no swatch takes a second one until it lands. */
    disabled?: boolean
}

const COLUMNS = 6;

/** Pick the fill behind your initials. The chosen swatch is the one wearing the check. */
export default function ProfileAvatarColorPickerCard({ value, onChange, disabled = false }: Props) {
    const styles = useStyles();

    return (
        <Card>
            <AppText style={styles.label}>Avatarkleur</AppText>

            <View style={styles.grid}>
                {intoRows(AVATAR_COLORS, COLUMNS).map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.row}>
                        {row.map(avatar => (
                            <Swatch
                                key={avatar.id}
                                avatar={avatar}
                                selected={avatar.id === value}
                                disabled={disabled}
                                onPress={() => onChange(avatar.id)}
                            />
                        ))}
                    </View>
                ))}
            </View>
        </Card>
    )
}

interface SwatchProps {
    avatar: AvatarColor,
    selected: boolean,
    disabled: boolean,
    onPress: () => void
}

function Swatch({ avatar, selected, disabled, onPress }: SwatchProps) {
    const styles = useStyles();

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole='radio'
            accessibilityLabel={avatar.label}
            accessibilityState={{ selected, disabled }}
            style={[
                styles.swatch,
                { backgroundColor: avatar.color },
                selected ? styles.swatchSelected : styles.swatchUnselected,
                disabled && styles.swatchDisabled
            ]}
        >
            {selected && (
                <Feather name='check' size={20} color={avatar.foreground} />
            )}
        </Pressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    label: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        color: theme.colors.textSecondary
    },
    grid: {
        marginTop: Spacing.three,
        gap: Spacing.two
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.two,

    },
    swatch: {
        flex: 1,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 14
    },
    swatchSelected: {
        ...theme.shadows.hardLarge
    },
    // The unselected ones sit back a step: shallower shadow, a touch of the page showing through.
    swatchUnselected: {
        opacity: 0.8,
        ...theme.shadows.hardSmall
    },
    // Applied last, so it wins the opacity over `swatchUnselected` above.
    swatchDisabled: {
        opacity: 0.5
    }
}))
