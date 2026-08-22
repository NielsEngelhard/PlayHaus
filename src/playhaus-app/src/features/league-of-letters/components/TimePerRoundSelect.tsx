import HorizontalButtonSelect from "@/components/ui/HorizontalButtonSelect";
import { useT } from "@/features/i18n/LanguageContext";

const TIME_PER_ROUND_OPTIONS = [20, 35, 60, 100] as const;

interface Props {
    value: number;
    onChange: (seconds: number) => void;
    variant?: "card" | "inline";
}

export default function SecondsPerGuessSelect({
    value,
    onChange,
    variant = "card"
}: Props) {
    const t = useT();

    return (
        <HorizontalButtonSelect
            options={TIME_PER_ROUND_OPTIONS}
            value={value}
            onChange={onChange}
            getLabel={seconds => `${seconds}s`}
            getAccessibilityLabel={seconds => t('lol.lobby.timePerTurnOption', { seconds })}
            label={t('lol.lobby.timePerTurn')}
            variant={variant}
            compact={variant === "inline"}
        />
    );
}