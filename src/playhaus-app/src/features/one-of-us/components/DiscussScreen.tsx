import SimpleTextHero from "@/components/text/SimpleTextHero";
import ActionButton from "@/components/ui/ActionButton";
import InlineNotification from "@/components/ui/InlineNotification";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    /** Everybody still in, so the table can see who it is actually choosing between. */
    seats: Seat[]
    onVote: () => void
}

/**
 * The argument, which the phone stays out of.
 *
 * No timer. One was available — pubquizr's `DescribeTimer` is fully generic and would
 * have dropped straight in — and it is deliberately not here: a countdown turns the one
 * part of this game that is purely social into something the table is losing at, and
 * cuts off the quiet player who was about to say the useful thing.
 *
 * The tie rule is stated and not enforced, for the same reason. When a vote ties the
 * table settles it out loud, so the app never needs to know a tie happened — it only
 * ever hears the single name that comes out the other side.
 */
export default function DiscussScreen({ seats, onVote }: Props) {
    const t = useT();
    const styles = useStyles();

    return (
        <View style={styles.screen}>
            <SimpleTextHero
                title={t('oneOfUs.play.discuss.title')}
                description={t('oneOfUs.play.discuss.description')}
            />

            {/* Who is left, as a row of faces rather than a list of names: this is a
                reminder of the shape of the table, not something to act on. */}
            <View style={styles.faces}>
                {seats.map(seat => (
                    <SeatAvatar key={seat.seat} seat={seat} size={44} />
                ))}
            </View>

            <View style={styles.footer}>
                <InlineNotification
                    icon="users"
                    message={t('oneOfUs.play.discuss.tieNote')}
                />

                <ActionButton
                    size="large"
                    icon="arrow-right"
                    text={t('oneOfUs.play.discuss.action')}
                    onPress={onVote}
                />
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    screen: {
        flex: 1,
        width: '100%',
        paddingTop: Spacing.three
    },

    faces: {
        marginTop: Spacing.four,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10
    },

    footer: {
        marginTop: 'auto',
        paddingTop: Spacing.four,
        gap: Spacing.three
    }
}))
