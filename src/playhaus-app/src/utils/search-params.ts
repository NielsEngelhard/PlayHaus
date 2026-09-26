// Expo Router hands a repeated query key over as an array, and the first one wins.
export function firstParam(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
}

export function boolParam(value: string | string[] | undefined): boolean | undefined {
    const first = firstParam(value);
    return first === '1' ? true : first === '0' ? false : undefined;
}

export function toBoolParam(value: boolean): string {
    return value ? '1' : '0';
}
