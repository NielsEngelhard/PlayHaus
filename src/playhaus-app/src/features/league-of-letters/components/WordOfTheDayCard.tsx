import AppText from "@/components/text/AppText";
import FeatureModeCard from "@/components/ui/FeatureModeCard";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { Brand, withAlpha } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { MOCK_FRIENDS_TODAY } from "@/features/league-of-letters/mock-solo-stats";
import { initialsOf } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { avatarColorById } from "@/utils/color-utils";
import { useEffect, useState } from "react";
import { View } from "react-native";

/** How often the countdown redraws. The minute is the smallest thing it shows. */
const TICK_MS = 1000;

// Today's word, at the top of the solo page.
export default function WordOfTheDayCard() {
    const styles = useStyles();
    const t = useT();

    return (
        <FeatureModeCard
            fill={Brand.lemon}
            eyebrow={t('lol.modes.solo.daily.eyebrow')}
            title={t('lol.modes.solo.daily.title')}
            aside={<ResetCountdown />}
            action={t('lol.modes.solo.daily.action')}
            // TODO: no daily word exists yet — see `mock-solo-stats.ts`.
            onPress={() => console.log('todo')}
        >
            <View style={styles.friends}>
                {MOCK_FRIENDS_TODAY.map(friend => (
                    <View key={friend.name} style={styles.friend}>
                        {/* The same avatar the real rows will wear. */}
                        <SeatAvatar
                            seat={{
                                seat: 0,
                                name: friend.name,
                                score: 0,
                                initials: initialsOf(friend.name),
                                swatch: avatarColorById(friend.avatarColorId)
                            }}
                            size={22}
                        />

                        <AppText style={styles.friendName}>{friend.name}</AppText>

                        <AppText style={styles.friendScore}>
                            {t('lol.modes.solo.daily.guesses', { guesses: friend.guesses })}
                        </AppText>
                    </View>
                ))}
            </View>
        </FeatureModeCard>
    )
}

// How long today's word has left, as `H:MM` over a label.
function ResetCountdown() {
    const styles = useStyles();
    const t = useT();

    const [left, setLeft] = useState(() => untilMidnight());

    useEffect(() => {
        const tick = setInterval(() => setLeft(untilMidnight()), TICK_MS);

        return () => clearInterval(tick);
    }, []);

    return (
        <View style={styles.aside}>
            <AppText style={styles.clock}>{left}</AppText>

            <AppText style={styles.clockLabel}>
                {t('lol.modes.solo.daily.reset')}
            </AppText>
        </View>
    )
}

/** The time to the next local midnight, as `H:MM`. */
function untilMidnight(): string {
    const now = new Date();

    // Built from the calendar date rather than by adding 24 hours.
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const minutes = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 60_000));

    return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

const useStyles = createThemedStyles(() => ({
    // Every colour here is drawn against the card's lemon, which does not follow the scheme — so neither may these.
    aside: {
        flexShrink: 0,
        alignItems: 'flex-end'
    },
    clock: {
        fontSize: 15,
        fontWeight: 900,
        color: Brand.ink
    },
    clockLabel: {
        fontSize: 8.5,
        fontWeight: 900,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: withAlpha(Brand.ink, 0.55)
    },

    panelLabel: {
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: withAlpha(Brand.ink, 0.55)
    },

    friends: {
        gap: 6
    },
    friend: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    // Takes the room between the avatar and the score.
    friendName: {
        flex: 1,
        minWidth: 0,
        fontSize: 12,
        fontWeight: 800,
        color: Brand.ink
    },
    friendScore: {
        fontSize: 12,
        fontWeight: 900,
        color: Brand.ink
    }
}))
