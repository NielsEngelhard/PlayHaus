import { PQLobbyFullError } from '@/api/calls/pubquizr-lobby';
import { ApiError, apiErrorCode } from '@/api/client';
import type { TranslationKey } from '@/features/i18n/keys';
import { quizErrorMessage } from '@/features/pubquizr/pubquizr-errors';

// Turns a failed multi device room call into the key of a line worth showing a person.
export function pqLobbyErrorMessage(error: unknown): TranslationKey {
    if (error instanceof PQLobbyFullError) {
        return 'pubquizr.errors.lobbyFull';
    }

    switch (apiErrorCode(error)) {
        case 'lobby_full':
            return 'pubquizr.errors.lobbyFull';
        case 'lobby_started':
            return 'pubquizr.errors.alreadyStarted';
        case 'lobby_not_found':
            return 'pubquizr.errors.lobbyGone';
        case 'not_host':
            return 'pubquizr.errors.notHost';
        case 'not_at_this_table':
            return 'pubquizr.errors.notAtThisTable';
        case 'not_your_seat':
            return 'pubquizr.errors.notYourSeat';
    }

    if (error instanceof ApiError && error.status === 404) {
        // A code that is gone and a code that was never right are the same answer from the server.
        return 'pubquizr.errors.lobbyGone';
    }

    return quizErrorMessage(error);
}
