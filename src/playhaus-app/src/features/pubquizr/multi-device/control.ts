// The phone's local stage is the only writer: a frame is a projection of it, emitted on transition and never read back.

/** How far through one question's ritual the authoring phone is. Rounds 1, 2 and 7 use the first four, exactly as `HotSeatBoard` does. */
export type PQStage = 'covered' | 'revealed' | 'judging' | 'passed' | 'running' | 'settling';

/** One tap on round 2's card, judged on the phone that made it. */
export interface PQPick {
    answerId: string
    correct: boolean
    seat: number
}

// What every frame carries, whatever it says.
interface PQFrameBase {
    /** Epoch ms, so a frame about a question the table has left can be told from one about the question it is on. */
    at: number
    /** The dealt question the frame is about. */
    questionId: string
    /** Who authored it. Stamped by the server, so a phone cannot claim another seat. */
    seat: number
}

export type PQControlFrame =
    // Where the authoring phone is in the question.
    | PQFrameBase & { kind: 'flow', stage: PQStage }
    // The whole table walk, always in full: "seats 3 and 1 have missed it and 4 is being asked".
    | PQFrameBase & { kind: 'walk', answeringSeat: number, missedSeats: number[] }
    /** The answer is out in the open, which unlike a stage does not go back. */
    | PQFrameBase & { kind: 'reveal', revealed: boolean }
    // Every option taken on this question so far, in the order they were taken.
    | PQFrameBase & { kind: 'pick', picks: PQPick[] }
    /** When the clock runs out, as epoch ms, so the screen and the phone agree to within a frame. */
    | PQFrameBase & { kind: 'timer', endsAt: number | null }
    // Round 5 sends the ids it has credited; round 4 sends the count alone, because the words are the describer's secret.
    | PQFrameBase & { kind: 'awards', awarded: number, ids: string[] }
    // The round has been opened by the phone that reads its questions: the table has read the rules and play can start.
    | PQFrameBase & { kind: 'gate', round: number };

// One frame as the phone that made it hands it over: the server stamps the seat and the clock is read on the way out.
type Authored<F> = F extends unknown ? Omit<F, 'at' | 'seat'> : never;

export type PQEmit = Authored<PQControlFrame>;

/** Every frame the room is holding, reduced. */
export interface ControlState {
    /** When the newest frame applied was authored. */
    at: number
    awarded: number
    awardedIds: string[]
    endsAt: number | null
    /** Which round the phone that reads the questions has opened, and null before it has opened any. */
    gate: number | null
    picks: PQPick[]
    /** Which question all of the above is about, and null before any frame has arrived. */
    questionId: string | null
    revealed: boolean
    stage: PQStage
    walk: { answeringSeat: number, missedSeats: number[] } | null
}

export const EMPTY_CONTROL: ControlState = {
    at: 0,
    awarded: 0,
    awardedIds: [],
    endsAt: null,
    gate: null,
    picks: [],
    questionId: null,
    revealed: false,
    stage: 'covered',
    walk: null
};

// A device applies frames only for data authored by other seats -- its own stage is already in its own state.
export function applyControl(state: ControlState, frame: PQControlFrame): ControlState {
    // The gate belongs to the round rather than to a question, so the walk moving on neither resets it nor ages it out.
    if (frame.kind === 'gate') return { ...state, gate: frame.round };

    const sameQuestion = frame.questionId === state.questionId;

    // Retained frames replay in the order their kinds were first kept, which is not the order they were authored, so age decides rather than arrival.
    if (!sameQuestion && frame.at < state.at) return state;

    const base: ControlState = sameQuestion
        ? { ...state, at: Math.max(state.at, frame.at) }
        : { ...EMPTY_CONTROL, questionId: frame.questionId, at: frame.at };

    switch (frame.kind) {
        case 'flow':
            return { ...base, stage: frame.stage };
        case 'walk':
            return {
                ...base,
                walk: { answeringSeat: frame.answeringSeat, missedSeats: frame.missedSeats }
            };
        case 'reveal':
            return { ...base, revealed: frame.revealed };
        case 'pick':
            return { ...base, picks: frame.picks };
        case 'timer':
            return { ...base, endsAt: frame.endsAt };
        case 'awards':
            return { ...base, awarded: frame.awarded, awardedIds: frame.ids };
    }
}

/** Everybody this question has already beaten, and empty when the frames are about another question. */
export function missedSeatsOf(state: ControlState, questionId: string): number[] {
    if (state.questionId !== questionId || state.walk === null) return [];

    return state.walk.missedSeats;
}

/** Who the question is with according to the phones, and null when nobody has said. */
export function answeringSeatOf(state: ControlState, questionId: string): number | null {
    if (state.questionId !== questionId || state.walk === null) return null;

    return state.walk.answeringSeat;
}

/** The picks taken on round 2's card, and empty when the frames are about another question. */
export function picksOf(state: ControlState, questionId: string): PQPick[] {
    if (state.questionId !== questionId) return [];

    return state.picks;
}

/** How many the phone settling this turn has credited, and 0 when the frames are about another question. */
export function awardedOn(state: ControlState, questionId: string): number {
    if (state.questionId !== questionId) return 0;

    return state.awarded;
}

/** Which answers have been credited, and empty for round 4, whose words are the describer's secret. */
export function awardedIdsOn(state: ControlState, questionId: string): string[] {
    if (state.questionId !== questionId) return [];

    return state.awardedIds;
}

/** When the turn's clock runs out, and null when there is no clock running on it. */
export function endsAtOn(state: ControlState, questionId: string): number | null {
    if (state.questionId !== questionId) return null;

    return state.endsAt;
}

/** Whether the round has been opened, which is what tells the rules the table is reading from the question it is about to be asked. */
export function roundOpenOn(state: ControlState, round: number): boolean {
    return state.gate === round;
}
