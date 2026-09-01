package api

import (
	"net/http"
	"testing"
)

// A quiz the table has already had out of the box is marked on the shelf, so a host
// picking tonight's game can see which questions their table has already heard.
//
// The mark is deliberately not read off pq_sessions, and most of what is below is about
// why: a host keeps exactly one session, and starting a game deletes the last one. Every
// test here that survives a deleted session is testing the thing pq_quiz_plays exists
// for.

// playedIDs is the set of quizzes the shelf came back marked as played.
func playedIDs(t *testing.T, h http.Handler, token, query string) map[string]bool {
	t.Helper()

	played := map[string]bool{}
	for _, item := range listQuizzes(t, h, token, query).Items {
		if item.Played {
			played[item.ID] = true
		}
	}
	return played
}

// getQuiz is one quiz off its own endpoint, which is the other half of the shelf: the
// app fetches a quiz by id the moment somebody taps a row.
func getQuiz(t *testing.T, h http.Handler, token, quizID string) quizResponse {
	t.Helper()

	rec := do(t, h, http.MethodGet, quizPath(quizID), "", token)
	if rec.Code != http.StatusOK {
		t.Fatalf("get quiz: status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
	return decodeBody[quizResponse](t, rec)
}

func TestAQuizIsNotPlayedUntilAGameStartsOnIt(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)

	// A fresh phone has played nothing, and `omitempty` means the field is simply
	// absent rather than false -- either way it must not read as played.
	if played := playedIDs(t, h, session.Token, "locale=nl"); len(played) != 0 {
		t.Errorf("a new host has %d played quizzes, want none", len(played))
	}
}

func TestStartingAGameMarksThatQuizPlayed(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)
	quiz := aQuiz(t, h, session.Token, "locale=nl")

	// Marked on the way in rather than on the way out: a quiz is spoiled by being read
	// out, and this table has not answered a single question yet.
	startedQuiz(t, h, session.Token, quiz.ID, "Niels", "Sanne", "Tom")

	played := playedIDs(t, h, session.Token, "locale=nl")
	if !played[quiz.ID] {
		t.Errorf("quiz %q (%s) is not marked played after a game started on it", quiz.Slug, quiz.ID)
	}
	if len(played) != 1 {
		t.Errorf("%d quizzes are marked played, want only the one that was started", len(played))
	}
}

func TestAQuizStaysPlayedAfterTheSessionIsDeleted(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)
	quiz := aQuiz(t, h, session.Token, "locale=nl")

	started := startedQuiz(t, h, session.Token, quiz.ID, "Niels", "Sanne", "Tom")

	rec := do(t, h, http.MethodDelete, singleDeviceSessionPath(started.ID), "", session.Token)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("delete session: status = %d, want %d (body: %s)", rec.Code, http.StatusNoContent, rec.Body)
	}

	// The whole reason pq_quiz_plays is a table of its own. Throwing the evening away
	// does not un-hear the questions, so a mark derived from the session row would be
	// wrong the moment somebody abandoned a game.
	if played := playedIDs(t, h, session.Token, "locale=nl"); !played[quiz.ID] {
		t.Errorf("quiz %q stopped being played once its session was deleted", quiz.Slug)
	}
}

func TestStartingASecondGameKeepsTheFirstQuizPlayed(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)

	list := listQuizzes(t, h, session.Token, "locale=nl")
	if len(list.Items) < 2 {
		t.Fatalf("only %d quizzes on the nl shelf, need two to tell them apart", len(list.Items))
	}
	first, second := list.Items[0], list.Items[1]

	startedQuiz(t, h, session.Token, first.ID, "Niels", "Sanne", "Tom")
	// A table plays one evening at a time, so this deletes the session above -- see
	// DeleteSessionsByOwnerID. The mark it left behind has to outlive it.
	startedQuiz(t, h, session.Token, second.ID, "Niels", "Sanne", "Tom")

	played := playedIDs(t, h, session.Token, "locale=nl")
	if !played[first.ID] {
		t.Errorf("quiz %q was forgotten when the next game started", first.Slug)
	}
	if !played[second.ID] {
		t.Errorf("quiz %q is not marked played", second.Slug)
	}
}

func TestPlayingTheSameQuizTwiceIsNotAnError(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)
	quiz := aQuiz(t, h, session.Token, "locale=nl")

	// One row per host per quiz is the primary key, so the second start has to be an
	// upsert that does nothing rather than a duplicate key blowing up a real game.
	startedQuiz(t, h, session.Token, quiz.ID, "Niels", "Sanne", "Tom")
	startedQuiz(t, h, session.Token, quiz.ID, "Niels", "Sanne", "Tom")

	if played := playedIDs(t, h, session.Token, "locale=nl"); !played[quiz.ID] {
		t.Errorf("quiz %q is not marked played after being started twice", quiz.Slug)
	}
}

func TestOneHostsPlayedQuizzesAreNotAnothers(t *testing.T) {
	h, _ := newQuizServer(t)

	host := newGuestSession(t, h)
	stranger := newGuestSession(t, h)
	quiz := aQuiz(t, h, host.Token, "locale=nl")

	startedQuiz(t, h, host.Token, quiz.ID, "Niels", "Sanne", "Tom")

	// The shelf is the same shelf for everybody; only the marks on it are personal.
	if played := playedIDs(t, h, stranger.Token, "locale=nl"); len(played) != 0 {
		t.Errorf("another host sees %d played quizzes, want none", len(played))
	}
}

func TestQuizDetailReportsPlayed(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)
	quiz := aQuiz(t, h, session.Token, "locale=nl")

	before := getQuiz(t, h, session.Token, quiz.ID)
	if before.Played {
		t.Error("a quiz nobody has started came back played")
	}

	startedQuiz(t, h, session.Token, quiz.ID, "Niels", "Sanne", "Tom")

	// The app draws the chosen quiz with the same row as the shelf, fed from this
	// endpoint, so a mark that only the list knew about would vanish on the way to the
	// setup screen.
	after := getQuiz(t, h, session.Token, quiz.ID)
	if !after.Played {
		t.Errorf("quiz %q is not marked played on its own endpoint", quiz.Slug)
	}
}
