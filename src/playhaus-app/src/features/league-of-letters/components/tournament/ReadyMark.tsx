import { Brand, Radii } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    ready: boolean
}

const MARK_SIZE = 16;
const GLYPH_SIZE = 11;

// Whether one player has pressed Ready for the next round: a check if so, a cross if not yet.
export default function ReadyMark({ ready }: Props) {
    const styles = useStyles();
    const t = useT();

    return (
        <View
            style={[styles.mark, ready ? styles.ready : styles.notReady]}
            accessible
            accessibilityLabel={ready ? t('lol.tournament.markReady') : t('lol.tournament.markNotReady')}
        >
            <Feather name={ready ? 'check' : 'x'} size={GLYPH_SIZE} color={Brand.textOnAccent} />
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    mark: {
        width: MARK_SIZE,
        height: MARK_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.full
    },
    ready: {
        backgroundColor: Brand.available
    },
    notReady: {
        backgroundColor: Brand.destructive
    }
}))
