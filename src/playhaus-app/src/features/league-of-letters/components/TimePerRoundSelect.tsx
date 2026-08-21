import HorizontalButtonSelect from "@/components/ui/HorizontalButtonSelect";

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
    return (
        <HorizontalButtonSelect
            options={TIME_PER_ROUND_OPTIONS}
            value={value}
            onChange={onChange}
            getLabel={seconds => `${seconds}s`}
            getAccessibilityLabel={seconds => `${seconds} seconds`}
            label="Tijd per ronde"
            variant={variant}
            compact={variant === "inline"}
        />
    );
}