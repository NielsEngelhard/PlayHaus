import { useHeaderTag } from "@/components/layout/HeaderTagContext";
import JoinLeagueOfLettersGameCard from "@/components/league-of-letters/JoinLeagueOfLettersGameCard";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import BackButton from "@/components/ui/BackButton";
import SimpleNavigationCard from "@/components/ui/SimpleNavigationCard";
import ValueCard from "@/components/ui/ValueCard";
import { LEAGUE_OF_LETTERS_NAME } from "@/constants/games";
import { ROUTES } from "@/constants/routes";
import { Colors, Spacing } from "@/constants/theme";
import { StyleSheet, View } from "react-native";

// TODO: replace with the player's real name once accounts/profiles exist.
const PLAYER_NAME = 'Magpie54';

export default function LeagueOfLettersIndexPage() {
    useHeaderTag(LEAGUE_OF_LETTERS_NAME);

    return (
        <View style={styles.container}>            
            <View style={styles.body}>
                <SimpleTextHero
                    title={LEAGUE_OF_LETTERS_NAME}
                    description='Raad het woord. Groen = goed, oranje = juiste letter verkeerde plek.'
                />

                <ValueCard label='Je naam' value={PLAYER_NAME} icon='user' />

                <View style={styles.options}>
                    <SimpleNavigationCard
                        icon='cpu'
                        color={Colors.light.lemon}
                        title='Solo'
                        description='Random woord, jij kiest lengte en taal.'
                        navigationUrl={ROUTES.leagueOfLettersSoloSettings}
                    />

                    <SimpleNavigationCard
                        icon='users'
                        color={Colors.light.primary}
                        iconColor={Colors.light.textOnAccent}
                        title='Multiplayer'
                        description='Play against your friends (or foes)'
                        navigationUrl={ROUTES.leagueOfLettersCreateRoom}
                    />
                </View>

                <JoinLeagueOfLettersGameCard />
            </View>

            <BackButton href={ROUTES.home} />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: '100%'
    },
    body: {
        marginTop: Spacing.three,
        gap: Spacing.four
    },
    options: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: Spacing.three
    }
})
