import { createThemedStyles } from "@/features/theme/createThemedStyles";
import GB from "country-flag-icons/string/3x2/GB";
import NL from "country-flag-icons/string/3x2/NL";
import { Image } from "expo-image";
import { View } from "react-native";

// The flags the app can draw, by ISO 3166-1 alpha-2 country code.
const FLAGS: Record<string, string> = {
    nl: NL,
    gb: GB
};

/** 3:2 is the aspect the icons are drawn at, so height follows from width. */
const ASPECT = 2 / 3;

interface Props {
    /** ISO 3166-1 alpha-2 country code, e.g. `nl`. Case-insensitive. */
    code: string,
    width?: number
}

// A country's flag.
export default function CountryFlag({ code, width = 24 }: Props) {
    const styles = useStyles();

    const svg = FLAGS[code.toLowerCase()];
    if (svg === undefined) return null;

    const height = Math.round(width * ASPECT);

    return (
        <View style={[styles.frame, { width, height }]}>
            <Image
                source={{ uri: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` }}
                style={styles.flag}
                contentFit="cover"
            />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    frame: {
        borderRadius: 3,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
        // The flag is a rectangle; this is what rounds its corners to the frame.
        overflow: 'hidden'
    },
    flag: {
        width: '100%',
        height: '100%'
    }
}))
