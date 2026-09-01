import SimpleTextHero from "@/components/text/SimpleTextHero";
import ActionButton from "@/components/ui/ActionButton";
import InlineNotification from "@/components/ui/InlineNotification";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import SeatRing from "@/features/one-of-us/components/SeatRing";
import type { Seat } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    onVote: () => void
    /** Everybody still in, so the table can see who it is actually choosing between. */
    seats: Seat[]
}

export default function DiscussScreen({ onVote, seats }: Props) {
    const t = useT();
    const styles = useStyles();

    return (
        <View style={styles.screen}>
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
        paddingTop: Spacing.three,
        gap: Spacing.four
    },

    footer: {
        marginTop: 'auto',
        paddingTop: Spacing.four,
        gap: Spacing.three
    }
}))
