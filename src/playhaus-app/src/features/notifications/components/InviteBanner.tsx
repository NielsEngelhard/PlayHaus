import type { FriendInvite } from "@/api/calls/friends";
import { useChromelessValue, useFullScreenValue } from "@/components/layout/FullScreenContext";
import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import { initialsFor } from "@/components/ui/lobby-seat";
import { Brand, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { resolveJoinCode } from "@/features/join/join-code";
import { useFriendInvites } from "@/features/notifications/FriendInviteContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { avatarColorById } from "@/utils/color-utils";
import Feather from "@expo/vector-icons/Feather";
import { router, type RelativePathString } from "expo-router";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** How long an invite sits at the top before it stands down. The row keeps it either way. */
const BANNER_MS = 8000;

const AVATAR_SIZE = 34;

// A friend asking you into a room, over whatever page you happen to be on.
export default function InviteBanner() {
    const styles = useStyles();
    const theme = useTheme();
    const t = useT();
    const insets = useSafeAreaInsets();

    const { invites, dismiss } = useFriendInvites();

    // In-play screens claim the viewport and lobby screens take the chrome, which between them are exactly the places "already in a game" means.
    const fullScreen = useFullScreenValue();
    const chromeless = useChromelessValue();

    const showing = fullScreen || chromeless ? undefined : firstOpenable(invites);

    // The id rather than the invite: a fresh object every render would reset the timer forever and the banner would never stand down.
    const showingId = showing?.invite.id;

    useEffect(() => {
        if (showingId === undefined) return;

        const timer = setTimeout(() => dismiss(showingId), BANNER_MS);
        return () => clearTimeout(timer);
    }, [showingId, dismiss]);

    if (showing === undefined) return null;

    const { invite, href, game } = showing;
    const avatar = avatarColorById(invite.from.avatarColorId);

    return (
        <View pointerEvents='box-none' style={[styles.wrapper, { paddingTop: Spacing.two + insets.top }]}>
            <PopPressable
                style={[styles.banner, { borderColor: theme.colors.border }]}
                onPress={() => {
                    dismiss(invite.id);
                    router.push(href as RelativePathString);
                }}
                accessibilityRole='button'
            >
                <View style={[styles.avatar, { backgroundColor: avatar.color }]}>
                    <AppText style={[styles.initials, { color: avatar.foreground }]}>
                        {initialsFor(invite.from.name)}
                    </AppText>
                </View>

                <View style={styles.body}>
                    <AppText style={styles.message} numberOfLines={2}>
                        {t('notifications.invite', { name: invite.from.name, game })}
                    </AppText>

                    <AppText style={styles.action}>{t('notifications.join')}</AppText>
                </View>

                <Pressable
                    onPress={() => dismiss(invite.id)}
                    hitSlop={10}
                    accessibilityRole='button'
                    accessibilityLabel={t('notifications.dismiss')}
                >
                    <Feather name='x' size={18} color={theme.colors.textMuted} />
                </Pressable>
            </PopPressable>
        </View>
    )
}

interface Showing {
    invite: FriendInvite,
    href: string,
    game: string
}

// The newest invite this build can actually open. Sketch Off has no room screen, so a code for one is not offered.
function firstOpenable(invites: FriendInvite[]): Showing | undefined {
    for (const invite of invites) {
        const target = resolveJoinCode(invite.code);

        if (target.kind === 'route') {
            return { invite, href: target.href, game: target.game.name };
        }
    }

    return undefined;
}

const useStyles = createThemedStyles(theme => ({
    // A sibling of the scroller rather than a child, so it stays put while the page moves under it.
    wrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: Spacing.three
    },
    banner: {
        width: '100%',
        maxWidth: 600,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 18,
        borderWidth: 2,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
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
        fontSize: 13,
        fontWeight: 900,
        letterSpacing: -0.3
    },
    body: {
        flex: 1,
        minWidth: 0
    },
    message: {
        fontSize: 13.5,
        fontWeight: 800,
        color: theme.colors.text
    },
    action: {
        marginTop: 2,
        fontSize: 10.5,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        color: theme.colors.textSecondary
    }
}))
