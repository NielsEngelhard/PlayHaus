import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme";
import { AVATAR_COLORS, type AvatarColor } from "@/features/settings/mock-profile";
import Feather from "@expo/vector-icons/Feather";
import { Pressable, StyleSheet, View } from "react-native";

interface Props {
    value: string,
    onChange: (avatarColorId: string) => void
}

const COLUMNS = 6;

/** Split a flat list into fixed-width rows — React Native has no CSS grid to lean on. */
function intoRows<T>(items: T[], perRow: number): T[][] {
    const rows: T[][] = [];

    for (let index = 0; index < items.length; index += perRow) {
        rows.push(items.slice(index, index + perRow));
    }

    return rows;
}

/** Pick the fill behind your initials. The chosen swatch is the one wearing the check. */
export default function ProfileAvatarColorPickerCard({ value, onChange }: Props) {
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
    onPress: () => void
}

function Swatch({ avatar, selected, onPress }: SwatchProps) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole='radio'
            accessibilityLabel={avatar.label}
            accessibilityState={{ selected }}
            style={[
                styles.swatch,
                { backgroundColor: avatar.color },
                selected ? styles.swatchSelected : styles.swatchUnselected
            ]}
        >
            {selected && (
                <Feather name='check' size={20} color={avatar.foreground} />
            )}
        </Pressable>
    )
}

const styles = StyleSheet.create({
    label: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        color: Colors.light.textSecondary
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
        borderColor: Colors.light.border,
        borderRadius: 14
    },
    swatchSelected: {
        ...Shadows.hardLarge
    },
    // The unselected ones sit back a step: shallower shadow, a touch of the page showing through.
    swatchUnselected: {
        opacity: 0.8,
        ...Shadows.hardSmall
    }
})
