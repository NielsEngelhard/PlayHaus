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
}

export default function WordLengthSelect({
    value,
    onChange,
    variant = "card"
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
            variant={variant}
            compact={variant === "inline"}
        />
    );
}