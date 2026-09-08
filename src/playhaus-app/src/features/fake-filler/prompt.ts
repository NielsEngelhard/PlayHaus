import { FILL_PLACEHOLDER } from '@/api/calls/fake-filler';

// Taking a prompt apart at its blanks.

/** One piece of a prompt: the words between two blanks, or a blank. */
export type PromptPart =
    | { kind: 'text', text: string }
    | { kind: 'blank', index: number };

// A line, cut into text and blanks in the order they appear.
export function splitPrompt(line: string): PromptPart[] {
    const parts: PromptPart[] = [];

    let rest = line;
    let index = 0;

    for (;;) {
        const at = rest.indexOf(FILL_PLACEHOLDER);
        if (at === -1) break;

        // Skipped when two placeholders touch, or one opens the line.
        if (at > 0) parts.push({ kind: 'text', text: rest.slice(0, at) });

        parts.push({ kind: 'blank', index });
        index += 1;

        rest = rest.slice(at + FILL_PLACEHOLDER.length);
    }

    if (rest.length > 0) parts.push({ kind: 'text', text: rest });

    return parts;
}

// The line with its blanks filled in, as one string.
export function fillPrompt(line: string, fills: string[]): string {
    let index = 0;

    return splitPrompt(line)
        .map(part => {
            if (part.kind === 'text') return part.text;

            const fill = fills[index];
            index += 1;

            return fill ?? FILL_PLACEHOLDER;
        })
        .join('');
}

// Whether every blank has something in it that is worth sending.
export function fillsComplete(fills: string[], blanks: number): boolean {
    return fills.length === blanks && fills.every(fill => fill.trim().length > 0);
}

/** The fills as the API wants them: trimmed, in blank order. */
export function normaliseFills(fills: string[]): string[] {
    return fills.map(fill => fill.trim());
}
