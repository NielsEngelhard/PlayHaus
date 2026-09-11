import {
    getTournament,
    myEntry,
    myLiveMatch,
    myStageMatch,
    readyUp,
    startStage,
    type Tournament,
    type TournamentMatch,
    type TournamentPlayer
} from '@/api/calls/league-of-letters-tournament';
import { apiErrorCode } from '@/api/client';
import { lolRoom, type ServerEvent, type SocketStatus } from '@/api/socket';
import { useAuth } from '@/features/auth/useAuth';
import type { TranslationKey } from '@/features/i18n/keys';
import { tournamentErrorMessage } from '@/features/league-of-letters/game-errors';
import { useRoomSocket } from '@/features/realtime/useRoomSocket';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface TournamentState {
    /** The bracket, or null while the room is still filling up. */
    tournament: Tournament | null
    /** True until the first read has come back, one way or the other. */
    loading: boolean
    /** The bracket could not be read. There is nothing to show. */
    error: TranslationKey | null
    /** A ready press was refused. The bracket is still on screen. */
    actionError: TranslationKey | null
    /** Whether this device is live. Your own dot. */
    connection: SocketStatus
    /** Who is watching the bracket right now, by user id. */
    online: Set<string>
    /** The match this player still has to go and play, or null when there is nothing to return to. */
    myMatch: TournamentMatch | null
    /** The match this player is drawn into this round, played or not, so a pending one shows too. */
    myDraw: TournamentMatch | null
    /** This player's record in the bracket, absent for somebody who only ever watched. */
    me: TournamentPlayer | null
    /** Whether this device belongs to the host, who opens each round's rooms. */
    isHost: boolean
    /** Whether this player has already readied for the stage on the table. */
    ready: boolean
    readying: boolean
    readyUp: () => Promise<void>
    starting: boolean
    startStage: () => Promise<void>
    reload: () => void
}

export function useTournament(code: string | undefined): TournamentState {
    const { user, status } = useAuth();
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<TranslationKey | null>(null);
    const [actionError, setActionError] = useState<TranslationKey | null>(null);
    const [readying, setReadying] = useState(false);
    const [starting, setStarting] = useState(false);

    // Nothing may touch state after unmount.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const signedIn = status === 'signedIn';
    const userId = user?.id;

    const load = useCallback(async () => {
        if (!signedIn || code === undefined) return;

        try {
            const read = await getTournament(code);
            if (!mounted.current) return;

            setError(null);
            setTournament(read);
        } catch (failure) {
            if (!mounted.current) return;

            // No bracket yet is the ordinary state of a room that is still filling up, not a failure.
            if (apiErrorCode(failure) === 'tournament_not_found') {
                setError(null);
                setTournament(null);
            } else {
                setError(tournamentErrorMessage(failure));
            }
        } finally {
            if (mounted.current) setLoading(false);
        }
    }, [signedIn, code]);

    useEffect(() => {
        // set-state-in-effect: reading the bracket on mount and storing it is the whole job.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    const onEvent = useCallback((event: ServerEvent) => {
        if (!mounted.current) return;

        switch (event.type) {
            case 'state': {
                // A room still filling up sends no bracket, so an absent one is left alone rather than cleared.
                if (event.data.tournament !== undefined) setTournament(event.data.tournament);
                return;
            }

            case 'tournament': {
                setTournament(event.data.tournament);
                return;
            }

            default:
                return;
        }
    }, []);

    const { status: connection, online } = useRoomSocket({
        room: code === undefined ? undefined : lolRoom(code),
        enabled: signedIn,
        onEvent
    });

    const me = tournament === null ? null : myEntry(tournament, userId);

    const send = useCallback(async () => {
        if (code === undefined || readying) return;

        setReadying(true);
        setActionError(null);

        try {
            const answered = await readyUp(code);
            if (mounted.current) setTournament(answered);
        } catch (failure) {
            if (mounted.current) setActionError(tournamentErrorMessage(failure));
        } finally {
            if (mounted.current) setReadying(false);
        }
    }, [code, readying]);

    const open = useCallback(async () => {
        if (code === undefined || starting) return;

        setStarting(true);
        setActionError(null);

        try {
            const answered = await startStage(code);
            if (mounted.current) setTournament(answered);
        } catch (failure) {
            if (mounted.current) setActionError(tournamentErrorMessage(failure));
        } finally {
            if (mounted.current) setStarting(false);
        }
    }, [code, starting]);

    const reload = useCallback(() => {
        setError(null);
        void load();
    }, [load]);

    return {
        tournament,
        loading,
        error,
        actionError,
        connection,
        online,
        myMatch: tournament === null ? null : myLiveMatch(tournament, userId),
        myDraw: tournament === null ? null : myStageMatch(tournament, userId),
        me,
        isHost: tournament !== null && tournament.hostId === userId,
        ready: me?.ready ?? false,
        readying,
        readyUp: send,
        starting,
        startStage: open,
        reload
    };
}
