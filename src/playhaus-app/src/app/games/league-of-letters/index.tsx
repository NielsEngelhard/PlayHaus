import BackBar from "@/components/layout/BackBar";
import JoinLeagueOfLettersGameCard from "@/components/league-of-letters/JoinLeagueOfLettersGameCard";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import SimpleNavigationCard from "@/components/ui/SimpleNavigationCard";
import ValueCard from "@/components/ui/ValueCard";
import { ROUTES } from "@/constants/routes";
import { Colors, Spacing } from "@/constants/theme";
import { StyleSheet, View } from "react-native";

// TODO: replace with the player's real name once accounts/profiles exist.
const PLAYER_NAME = 'Magpie54';

export default function LeagueOfLettersIndexPage() {
    return (
        <View style={styles.container}>
            <BackBar href={ROUTES.home} tag='League of Letters' />

            <View style={styles.body}>
                <SimpleTextHero
                    title='League of Letters'
                    description='Raad het 5-letter woord in 6 beurten. Groen = goed, oranje = juiste letter verkeerde plek.'
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
                        title='Maak een kamer'
                        description='Live race tegen een vriend. Deel de code en gaan.'
                        navigationUrl={ROUTES.leagueOfLettersCreateRoom}
                    />
                </View>

                <JoinLeagueOfLettersGameCard />
            </View>
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
