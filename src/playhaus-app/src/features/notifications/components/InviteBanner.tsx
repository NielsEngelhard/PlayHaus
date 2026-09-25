import type { FriendInvite } from "@/api/calls/friends";
import { useChromelessValue, useFullScreenValue } from "@/components/layout/FullScreenContext";
import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import { initialsFor } from "@/components/ui/lobby-seat";
import type { Game } from "@/constants/games";
import { Brand, ContentWidth, FontSizes, Radii, Spacing, withAlpha } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { resolveJoinCode } from "@/features/join/join-code";
import { useFriendInvites } from "@/features/notifications/FriendInviteContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { avatarColorById } from "@/utils/color-utils";
import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import { router, type RelativePathString } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AVATAR_SIZE = 38;
const MARK_SIZE = 34;
const ACTION_HEIGHT = 46;

// Wider than Negeren on purpose: equal buttons read as an either/or, and joining is the point.
const JOIN_FLEX = 1.4;

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

    if (showing === undefined) return null;

    const { invite, href, game } = showing;
    const name = invite.from.name;
    const avatar = avatarColorById(invite.from.avatarColorId);
    const tournament = invite.kind === 'tournament';

    return (
        <View pointerEvents='box-none' style={[styles.wrapper, { paddingTop: Spacing.two + insets.top }]}>
            <View style={styles.banner}>
                <View style={styles.identity}>
                    <View style={[styles.avatar, { backgroundColor: avatar.color }]}>
                        <AppText style={[styles.initials, { color: avatar.foreground }]}>
                            {initialsFor(name)}
                        </AppText>
                    </View>

                    <View style={styles.heading}>
                        <AppText style={styles.eyebrow} numberOfLines={1}>
                            {t('notifications.inviteEyebrow')}
                        </AppText>

                        <AppText style={styles.headline} numberOfLines={2}>
                            {t('notifications.inviteHeadline', { name })}
                        </AppText>
                    </View>

                    {game.icon !== undefined && (
                        <Image
                            source={game.icon}
                            style={styles.mark}
                            accessibilityRole='image'
                            accessibilityLabel={game.name}
                        />
                    )}
                </View>

                <View style={styles.room}>
                    <Feather
                        name={tournament ? 'award' : 'users'}
                        size={FontSizes.xs}
                        color={theme.colors.textSecondary}
                    />

                    <AppText style={styles.roomText} numberOfLines={1}>
                        {tournament
                            ? t('notifications.inviteTournament', { game: game.name, name })
                            : t('notifications.inviteRoom', { game: game.name, name })}
                    </AppText>
                </View>

                <View style={styles.actions}>
                    <PopPressable
                        style={[styles.action, styles.ignore]}
                        onPress={() => dismiss(invite.id)}
                        accessibilityRole='button'
                    >
                        <AppText style={styles.ignoreLabel}>{t('notifications.ignore')}</AppText>
                    </PopPressable>

                    <PopPressable
                        style={[styles.action, styles.join]}
                        onPress={() => {
                            dismiss(invite.id);
                            router.push(href as RelativePathString);
                        }}
                        accessibilityRole='button'
                    >
                        <AppText style={styles.joinLabel}>{t('notifications.join')}</AppText>
                        <Feather name='arrow-right' size={FontSizes.md} color={Brand.lemon} />
                    </PopPressable>
                </View>
            </View>
        </View>
    )
}

interface Showing {
    invite: FriendInvite,
    href: string,
    game: Game
}

// The newest invite this build can actually open.
function firstOpenable(invites: FriendInvite[]): Showing | undefined {
    for (const invite of invites) {
        const target = resolveJoinCode(invite.code);

        if (target.kind === 'route') {
            return { invite, href: target.href, game: target.game };
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
        maxWidth: ContentWidth,
        flexDirection: 'column',
        gap: Spacing.two,
        padding: Spacing.two,
        borderRadius: Radii.lg,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hard
    },
    identity: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },
    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.borderStrong : Brand.ink
    },
    initials: {
        fontSize: FontSizes.sm,
        fontWeight: 900,
        letterSpacing: -0.3
    },
    heading: {
        flex: 1,
        minWidth: 0
    },
    eyebrow: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.3,
        color: theme.colors.textSecondary
    },
    headline: {
        fontSize: FontSizes.sm,
        fontWeight: 900,
        letterSpacing: -0.3,
        lineHeight: Math.round(FontSizes.sm * 1.2),
        color: theme.colors.text
    },
    mark: {
        width: MARK_SIZE,
        height: MARK_SIZE,
        flexShrink: 0,
        borderRadius: Radii.md
    },
    room: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.two,
        borderRadius: Radii.md,
        backgroundColor: withAlpha(theme.colors.text, 0.05)
    },
    // Slate all but disappears on the dark card.
    roomText: {
        flex: 1,
        minWidth: 0,
        fontSize: FontSizes.xs,
        fontWeight: 800,
        color: theme.scheme === 'dark' ? theme.colors.textSecondary : Brand.slate
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.two
    },
    action: {
        height: ACTION_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.two,
        borderRadius: Radii.md,
        borderWidth: theme.borderWidth
    },
    ignore: {
        flex: 1,
        backgroundColor: theme.colors.backgroundSecondary,
        borderColor: withAlpha(theme.colors.text, 0.3)
    },
    ignoreLabel: {
        fontSize: FontSizes.sm,
        fontWeight: 900,
        color: theme.colors.textSecondary
    },
    // Ink in both schemes: `text` turns to paper in dark and would swallow the label.
    join: {
        flex: JOIN_FLEX,
        backgroundColor: Brand.ink,
        borderColor: theme.scheme === 'dark' ? theme.colors.borderStrong : Brand.ink
    },
    joinLabel: {
        fontSize: FontSizes.sm,
        fontWeight: 900,
        color: Brand.textOnAccent
    }
}))
