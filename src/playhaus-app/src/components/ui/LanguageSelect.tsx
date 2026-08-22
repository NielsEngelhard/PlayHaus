import CountryFlag from "@/components/ui/CountryFlag";
import SelectInput, { type SelectOption } from "@/components/ui/SelectInput";
import { LANGUAGES, type LanguageCode } from "@/constants/languages";
import { useT } from "@/features/i18n/LanguageContext";
import { useMemo } from "react";

interface Props {
    value: LanguageCode,
    onChange: (value: LanguageCode) => void,
    /**
     * Defaults to the catalogue's word for "language". The profile screen says what the
     * language is *for*, since there it belongs to the account rather than to the game
     * in front of you.
     */
    label?: string,
    disabled?: boolean,
    /** Passed straight through. See `SelectInput` for what `inline` drops. */
    variant?: 'card' | 'inline'
}

/**
 * The language picker, wherever a language is picked: a game's settings, a
 * multiplayer room, the profile.
 *
 * One component rather than an options array each screen builds for itself, which
 * is what it used to be — three copies of the same `LANGUAGES.map` that would have
 * had to grow the flag independently. Everything about how a language looks lives
 * here and in `@/constants/languages`; a screen only says which one is picked.
 */
export default function LanguageSelect({
    value,
    onChange,
    label,
    disabled = false,
    variant = 'card'
}: Props) {
    const t = useT();

    /**
     * Memoised on `t` rather than built at module scope, which is where it used to
     * live: the descriptions are catalogue keys now, so the list cannot be assembled
     * before there is a language to assemble it in. Keyed on `t` and not rebuilt per
     * render, so `SelectInput` still gets the same options object, and the same flag
     * nodes, until the language actually changes.
     */
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
