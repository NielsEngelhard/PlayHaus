import { StyleSheet, Text } from "react-native";

interface Props {
    /** ISO 3166-1 alpha-2 country code, e.g. `nl`. Case-insensitive. */
    code: string,
    size?: number
}

/** `a` -> `🇦`. The regional indicators sit 0x1F1E6 above lowercase `a` in Unicode. */
const REGIONAL_INDICATOR_A = 0x1F1E6;
const LOWERCASE_A = 'a'.charCodeAt(0);

function toFlagEmoji(code: string): string {
    return code
        .toLowerCase()
        .split('')
        .map(letter => String.fromCodePoint(letter.charCodeAt(0) - LOWERCASE_A + REGIONAL_INDICATOR_A))
        .join('');
}

/**
 * A country's flag, from its ISO code.
 *
 * Every flag in the app goes through here rather than through a literal emoji, so the
 * day this needs real artwork it is one file that changes. Worth knowing before then:
 * the emoji renders as a flag on iOS and Android, but Chrome on Windows has no glyph
 * for the pair and falls back to two boxed letters — legible, just not a flag.
 */
export default function CountryFlag({ code, size = 16 }: Props) {
    // Deliberately React Native's `Text` and not `AppText`, the one place in the app
    // that exception is right: `AppText` pins `fontFamily` to a cut of Outfit, which
    // has no emoji glyphs, and Android does not reliably fall back per-glyph from a
    // named family. Leaving the family unset lets the platform pick its emoji font.
    return (
        <Text style={[styles.flag, { fontSize: size, lineHeight: size * 1.35 }]}>
            {toFlagEmoji(code)}
        </Text>
    )
}

const styles = StyleSheet.create({
    flag: {
        // The glyph is wider than its advance on some platforms; this keeps the pair
        // from being clipped by a tight parent.
        includeFontPadding: false
    }
})
