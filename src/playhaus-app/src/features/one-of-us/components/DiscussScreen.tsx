import SimpleTextHero from "@/components/text/SimpleTextHero";
import ActionButton from "@/components/ui/ActionButton";
import InlineNotification from "@/components/ui/InlineNotification";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import SeatRing from "@/features/one-of-us/components/SeatRing";
import type { Seat } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { ScrollView, View } from "react-native";

interface Props {
    /**
     * Who settles a tie, or null on a table dealt before the office existed. The note
     * under the ring is the last thing said before the vote opens, so it is the right
     * place to name them — and with nobody to name it falls back to the older wording,
     * which leaves the tie with the table.
     */
    mayor: Seat | null
    onVote: () => void
    /** Everybody still in, so the table can see who it is actually choosing between. */
    seats: Seat[]
}

export default function DiscussScreen({ mayor, onVote, seats }: Props) {
    const t = useT();
    const styles = useStyles();

    return (
        <ScrollView style={styles.screen}>
            <SeatRing
                seats={seats}
                headline={t('oneOfUs.play.discuss.ring')}
            />

            <SimpleTextHero
                title={t('oneOfUs.play.discuss.title')}
                description={t('oneOfUs.play.discuss.description')}
            />

            <View style={styles.footer}>
                <InlineNotification
                    icon="users"
                    message={mayor === null
                        ? t('oneOfUs.play.discuss.tieNote')
                        : t('oneOfUs.play.discuss.tieNoteMayor', { name: mayor.name })}
                />

                <ActionButton
                    size="large"
                    icon="arrow-right"
                    text={t('oneOfUs.play.discuss.action')}
                    onPress={onVote}
                />
            </View>
        </ScrollView>
    )
}

const useStyles = createThemedStyles(() => ({
    screen: {
        flex: 1,
        width: '100%',
        paddingTop: Spacing.three,
        gap: Spacing.four
    },

    footer: {
        marginTop: 'auto',
        paddingTop: Spacing.four,
        gap: Spacing.three
    }
}))
