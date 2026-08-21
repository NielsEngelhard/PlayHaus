import HorizontalButtonSelect from "@/components/ui/HorizontalButtonSelect";
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
    return (
        <HorizontalButtonSelect
            options={WORD_LENGTHS}
            value={value}
            onChange={onChange}
            getLabel={length => String(length)}
            getAccessibilityLabel={length => `${length} letters`}
            label="Woordlengte"
            variant={variant}
            compact={variant === "inline"}
        />
    );
}