import CountryFlag from "@/components/ui/CountryFlag";
import SelectInput, { type SelectOption } from "@/components/ui/SelectInput";
import { LANGUAGES, type LanguageCode } from "@/constants/languages";
import { useT } from "@/features/i18n/LanguageContext";
import { useMemo } from "react";

interface Props {
    value: LanguageCode,
    onChange: (value: LanguageCode) => void,
    // Defaults to the catalogue's word for "language".
    label?: string,
    disabled?: boolean,
    /** Passed straight through. See `SelectInput` for what `inline` and `row` drop. */
    variant?: 'card' | 'inline' | 'row'
}

// The language picker, wherever a language is picked: a game's settings, a multiplayer room, the profile.
export default function LanguageSelect({
    value,
    onChange,
    label,
    disabled = false,
    variant = 'card'
}: Props) {
    const t = useT();

    // Memoised on `t` rather than built at module scope, which is where it used to live.
    const options: SelectOption<LanguageCode>[] = useMemo(() => LANGUAGES.map(language => ({
        value: language.code,
        label: language.label,
        description: t(language.descriptionKey),
        icon: <CountryFlag code={language.flag} width={24} />
    })), [t]);

    return (
        <SelectInput
            label={label ?? t('common.language')}
            value={value}
            options={options}
            onChange={onChange}
            disabled={disabled}
            variant={variant}
        />
    )
}
