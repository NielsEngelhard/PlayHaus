import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import { initialsFor } from "@/components/ui/lobby-seat";
import { Brand } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { avatarColorById } from "@/utils/color-utils";
import type { ReactNode } from "react";
import { View } from "react-native";

const AVATAR_SIZE = 32;

interface Props {
    name: string,
    avatarColorId: string,
    /** The word on the far side — a date on the friends page, the state of an invite in the modal. */
    right?: ReactNode,
    // Given only where a row leads somewhere; without it the row is a label.
    onPress?: () => void,
    disabled?: boolean
}

// One friend, drawn the way a lobby seat is, because that is where you met them.
export default function FriendRow({ name, avatarColorId, right, onPress, disabled }: Props) {
    const styles = useStyles();

    const avatar = avatarColorById(avatarColorId);

    const body = (
        <>
            <View style={[styles.avatar, { backgroundColor: avatar.color }]}>
                <AppText style={[styles.initials, { color: avatar.foreground }]}>
                    {initialsFor(name)}
                </AppText>
            </View>

            <AppText style={styles.name} numberOfLines={1}>{name}</AppText>

            {right}
        </>
    );

    if (!onPress) {
        return <View style={[styles.row, disabled && styles.rowDisabled]}>{body}</View>;
    }

    return (
        <PopPressable
            style={[styles.row, disabled && styles.rowDisabled]}
            onPress={onPress}
            disabled={disabled}
            accessibilityRole='button'
        >
            {body}
        </PopPressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: theme.scheme === 'dark'
            ? theme.colors.borderSubtle
            : 'rgba(15, 13, 18, 0.12)',
        backgroundColor: theme.colors.backgroundSecondary
    },
    // Somebody already sitting in the room, or one the invite has been sent to. Shown rather than hidden, so the list does not reshuffle.
    rowDisabled: {
        opacity: 0.55
    },
    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.borderStrong : Brand.ink
    },
    initials: {
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: -0.3
    },
    name: {
        flex: 1,
        minWidth: 0,
        fontSize: 13.5,
        fontWeight: 800,
        color: theme.colors.text
    }
}))
