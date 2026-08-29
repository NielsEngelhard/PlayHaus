import HorizontalButtonSelect from "@/components/ui/HorizontalButtonSelect";
import { useT } from "@/features/i18n/LanguageContext";
import {
    WORD_LENGTHS,
    type WordLength
} from "@/features/league-of-letters/solo-settings";

interface Props {
    value: WordLength;
    onChange: (wordLength: WordLength) => void;
    variant?: "card" | "inline";
    /**
     * Spells the chosen length out beside the label — "5 letters" over a row of bare
     * numbers. Off by default: the lobby's card has no room for it.
     */
    showValue?: boolean;
}

export default function WordLengthSelect({
    value,
    onChange,
    variant = "card",
    showValue = false
}: Props) {
    const t = useT();

    return (
        <HorizontalButtonSelect
            options={WORD_LENGTHS}
            value={value}
            onChange={onChange}
            getLabel={length => String(length)}
            getAccessibilityLabel={length => t('lol.settings.wordLengthOption', { letters: length })}
            label={t('lol.settings.wordLength')}
            valueLabel={showValue ? t('lol.settings.wordLengthOption', { letters: value }) : undefined}
            variant={variant}
            compact={false}
        />
    );
}