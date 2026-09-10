import { finalStandings, type Tournament, type TournamentPlayer } from "@/api/calls/league-of-letters-tournament";
import AppText from "@/components/text/AppText";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import BackButton from "@/components/ui/BackButton";
import Card from "@/components/ui/Card";
import Confetti from "@/components/ui/Confetti";
import { initialsFor } from "@/components/ui/lobby-seat";
import { ROUTES } from "@/constants/routes";
import { Brand, FontSizes, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { avatarColorById } from "@/utils/color-utils";
import { View } from "react-native";

interface Props {
    tournament: Tournament,
    /** Whose screen this is, so the paper falls for the right person. */
    userId: string | undefined
}

const AVATAR_SIZE = 30;

// How a tournament ends: a champion, and everybody else in the order they went out.
export default function TournamentChampion({ tournament, userId }: Props) {
    const styles = useStyles();
    const t = useT();

    const standings = finalStandings(tournament);
    const champion = standings[0];
    const youWon = champion !== undefined && champion.userId === userId;

    return (
        <View style={styles.page}>
            <View style={styles.body}>
                <SimpleTextHero
                    title={t('lol.tournament.champion.title')}
                    description={youWon
                        ? t('lol.tournament.champion.you')
                        : t('lol.tournament.champion.player', { name: champion?.name ?? '' })}
                />

                <Card style={styles.card}>
                    {standings.map((player, index) => (
                        <StandingLine
                            key={player.userId}
                            player={player}
                            place={player.placement ?? index + 1}
                            you={player.userId === userId}
                            divided={index > 0}
                        />
                    ))}
                </Card>

                <BackButton
                    href={ROUTES.leagueOfLettersIndex}
                    label={t('common.backToGames')}
                    variant='neutral'
                    style={styles.back}
                />
            </View>

            {/* Last, so it falls in front of everything. */}
            <Confetti active={youWon} />
        </View>
    )
}

interface StandingLineProps {
    player: TournamentPlayer,
    place: number,
    you: boolean,
    divided: boolean
}

function StandingLine({ player, place, you, divided }: StandingLineProps) {
    const styles = useStyles();
    const t = useT();

    const avatar = avatarColorById(player.avatarColorId);

    return (
        <View style={[styles.line, divided && styles.divided]}>
            <AppText style={styles.place}>{place}</AppText>

            <View style={[styles.avatar, { backgroundColor: avatar.color }]}>
                <AppText style={[styles.initials, { color: avatar.foreground }]}>
                    {initialsFor(player.name)}
                </AppText>
            </View>

            <AppText style={styles.name} numberOfLines={1}>
                {you ? t('lol.tournament.you') : player.name}
            </AppText>

            <AppText style={styles.losses}>
                {player.losses === 1
                    ? t('lol.tournament.lossOne')
                    : t('lol.tournament.lossMany', { losses: player.losses })}
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    page: {
        width: '100%',
        overflow: 'visible'
    },
    body: {
        marginTop: Spacing.four,
        gap: Spacing.four,
        overflow: 'visible'
    },
    card: {
        gap: 0
    },
    line: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 9
    },
    divided: {
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderSubtle
    },
    place: {
        width: 20,
        flexShrink: 0,
        fontSize: 13,
        fontWeight: 900,
        fontVariant: ['tabular-nums'],
        color: theme.colors.textMuted
    },
    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: theme.scheme === 'dark' ? theme.colors.borderStrong : Brand.ink
    },
    initials: {
        fontSize: 11,
        fontWeight: 900
    },
    name: {
        flex: 1,
        minWidth: 0,
        fontSize: FontSizes.sm,
        fontWeight: 800,
        color: theme.colors.text
    },
    losses: {
        flexShrink: 0,
        fontSize: 11,
        fontWeight: 700,
        color: theme.colors.textMuted
    },
    // Trimmed back from the margin the button carries by default.
    back: {
        marginVertical: 0,
        alignSelf: 'stretch'
    }
}))
