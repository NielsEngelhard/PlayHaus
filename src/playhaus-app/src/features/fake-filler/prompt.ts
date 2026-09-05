import { FILL_PLACEHOLDER } from '@/api/calls/fake-filler';

/**
 * Taking a prompt apart at its blanks.
 *
 * The server sends the line with its `[FILL]` markers still in and the fills kept apart
 * from it, so that one prompt can be rendered three different ways — as inputs to write
 * into, as somebody's answer, as an unanswered gap — without three copies of the
 * sentence. Putting them back together is this file, and it is the only parsing the app
 * does on anything the API sends.
 *
 * Pure and separate from the components for that reason: three screens do it, and a
 * split that lived inside one of them would end up copied into the other two.
 */

/** One piece of a prompt: the words between two blanks, or a blank. */
export type PromptPart =
    | { kind: 'text', text: string }
    | { kind: 'blank', index: number };

/**
 * A line, cut into text and blanks in the order they appear.
 *
 * Blanks are numbered from zero in reading order, which is also the order the API wants
 * `fills` in — the nth fill goes in the nth blank — so a component can render straight
 * from this and read straight back into an array without keeping a second count.
 *
 * A line with no placeholder at all comes back as a single text part. That should not
 * happen (the backend refuses such a line when it parses the data file) but it renders as
 * the sentence rather than as nothing, which is the better way to be wrong.
 */
export function splitPrompt(line: string): PromptPart[] {
    const parts: PromptPart[] = [];

    let rest = line;
    let index = 0;

    for (;;) {
        const at = rest.indexOf(FILL_PLACEHOLDER);
        if (at === -1) break;

        // Skipped when two placeholders touch, or one opens the line: an empty text part
        // would be a component rendering nothing, with the gap its margins leave.
        if (at > 0) parts.push({ kind: 'text', text: rest.slice(0, at) });

        parts.push({ kind: 'blank', index });
        index += 1;

        rest = rest.slice(at + FILL_PLACEHOLDER.length);
    }

    if (rest.length > 0) parts.push({ kind: 'text', text: rest });

    return parts;
}

/**
 * The line with its blanks filled in, as one string.
 *
 * For the places that want the finished sentence rather than something to lay out — the
 * reveal reads three of these one under the other, and a sentence broken into parts there
 * would wrap at every seam.
 *
 * A fill that is missing leaves the placeholder standing rather than collapsing the gap,
 * so a mismatch between a line and its fills shows up as an obviously unfinished sentence
 * instead of a plausible wrong one.
 */
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

/**
 * Whether every blank has something in it that is worth sending.
 *
 * The server applies the same rule and answers `invalid_answer` — a fill that is empty or
 * only whitespace is not an answer — so checking here is about not making somebody wait
 * for a round trip to be told they left a gap.
 */
export function fillsComplete(fills: string[], blanks: number): boolean {
    return fills.length === blanks && fills.every(fill => fill.trim().length > 0);
}

/** The fills as the API wants them: trimmed, in blank order. */
export function normaliseFills(fills: string[]): string[] {
    return fills.map(fill => fill.trim());
}
