package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"playhaus-api/internal/pubquizr"
)

const singleDevicePath = "/api/v1/pubquizr/single-device"

func singleDeviceSessionPath(sessionID string) string {
	return singleDevicePath + "/" + sessionID
}

func startBody(t *testing.T, quizID string, names ...string) string {
	t.Helper()

	body, err := json.Marshal(startSingleDeviceRequest{QuizID: quizID, PlayerNames: names})
	if err != nil {
		t.Fatalf("marshal request: %v", err)
	}
	return string(body)
}

// startedQuiz opens a game with the given table and hands back what the server said.
func startedQuiz(t *testing.T, h http.Handler, token, quizID string, names ...string) quizSessionResponse {
	t.Helper()

	rec := do(t, h, http.MethodPost, singleDevicePath, startBody(t, quizID, names...), token)
	if rec.Code != http.StatusCreated {
		t.Fatalf("start quiz: status = %d, want %d (body: %s)", rec.Code, http.StatusCreated, rec.Body)
	}
	return decodeBody[quizSessionResponse](t, rec)
}

// questionsIn are the dealt questions for one round, which is what the session
// actually plays.
func questionsIn(session quizSessionResponse, round int) []quizSessionQuestionResponse {
	var found []quizSessionQuestionResponse
	for _, question := range session.Questions {
		if question.Round == round {
			found = append(found, question)
		}
	}
	return found
}

func TestStartSingleDeviceQuizSeatsTheTableInOrder(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)
	quiz := aQuiz(t, h, session.Token, "locale=nl")

	// The order matters: this is where people are sitting, and the phone gets
	// turned round the table as the quiz master role moves.
	names := []string{"Niels", "Sanne", "Tom", "Eva"}
	started := startedQuiz(t, h, session.Token, quiz.ID, names...)

	if got, want := started.QuizID, quiz.ID; got != want {
		t.Errorf("quizId = %q, want %q", got, want)
	}
	if got, want := started.Mode, string(pubquizr.ModeSingleDevice); got != want {
		t.Errorf("mode = %q, want %q", got, want)
	}
	if got, want := started.Status, string(pubquizr.SessionInProgress); got != want {
		t.Errorf("status = %q, want %q", got, want)
	}
	if got, want := started.CurrentRound, pubquizr.RoundOpen; got != want {
		t.Errorf("currentRound = %d, want %d", got, want)
	}
	// The round opens on a seat drawn at random, so all this can say is that it is a
	// real seat and that the reading sits to its right. Which seat it landed on is
	// TestStartSingleDeviceQuizOpensOnARandomSeat's problem.
	if got := started.HotSeat; got < 0 || got >= len(names) {
		t.Errorf("hotSeat = %d, want a seat at a table of %d", got, len(names))
	}
	if got, want := started.QuizMasterSeat, pubquizr.ReaderFor(started.HotSeat, len(names)); got != want {
		t.Errorf("quizMasterSeat = %d, want %d -- the hot seat is read to from its right", got, want)
	}
	if got, want := started.HotSeatRun, 0; got != want {
		t.Errorf("hotSeatRun = %d, want %d -- nobody has taken anything yet", got, want)
	}

	if got, want := len(started.Players), len(names); got != want {
		t.Fatalf("players = %d, want %d", got, want)
	}
	for seat, name := range names {
		player := started.Players[seat]
		if player.Seat != seat {
			t.Errorf("players[%d].seat = %d, want %d", seat, player.Seat, seat)
		}
		if player.Name != name {
			t.Errorf("seat %d is %q, want %q", seat, player.Name, name)
		}
		if player.Score != 0 {
			t.Errorf("seat %d starts on %d points, want 0", seat, player.Score)
		}
		if player.Color == "" {
			t.Errorf("seat %d has no colour", seat)
		}
	}
}

// TestStartSingleDeviceQuizDealsOneChoiceQuestionEach is the length of round 2: one
// question per player at the table.
//
// They are dealt to nobody in particular, which is the part worth asserting. Round 2
// used to hand every player their own ABCD question; it now runs on the hot seat like
// round 1, where the reading moves round the table and the questions belong to it.
func TestStartSingleDeviceQuizDealsOneChoiceQuestionEach(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)
	quiz := aQuiz(t, h, session.Token, "locale=nl")

	for _, players := range []int{pubquizr.MinPlayers, 5, pubquizr.MaxPlayers} {
		t.Run(fmt.Sprintf("%d players", players), func(t *testing.T) {
			started := startedQuiz(t, h, session.Token, quiz.ID, tableOf(players)...)

			dealt := questionsIn(started, pubquizr.RoundChoice)
			if got, want := len(dealt), players; got != want {
				t.Fatalf("round 2 questions = %d, want %d", got, want)
			}

			for _, question := range dealt {
				if question.AssignedSeat != nil {
					t.Errorf("round 2 question %d was dealt to seat %d -- the round belongs to the table",
						question.Position, *question.AssignedSeat)
				}
			}
		})
	}
}

// TestStartSingleDeviceQuizDealsOneListQuestionEach covers round 5: one question per
// player, the same rule round 2 plays by -- every player reads once and starts as first
// guesser once, which only comes out even if the round is exactly as long as the table.
func TestStartSingleDeviceQuizDealsOneListQuestionEach(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)
	quiz := aQuiz(t, h, session.Token, "locale=nl")

	for _, players := range []int{pubquizr.MinPlayers, 5, pubquizr.MaxPlayers} {
		t.Run(fmt.Sprintf("%d players", players), func(t *testing.T) {
			started := startedQuiz(t, h, session.Token, quiz.ID, tableOf(players)...)

			dealt := questionsIn(started, pubquizr.RoundList)
			if got, want := len(dealt), players; got != want {
				t.Fatalf("round 5 questions = %d, want %d", got, want)
			}

			for _, question := range dealt {
				if question.AssignedSeat != nil {
					t.Errorf("round 5 question %d was dealt to seat %d -- the round belongs to the table",
						question.Position, *question.AssignedSeat)
				}
			}
		})
	}
}

// TestStartSingleDeviceQuizDealsTheWordsTheQuizHas covers round 4: you describe all of
// yours inside the same thirty seconds, so a player's words have to land on one seat --
// and everybody has to get the same number of them.
//
// How many that is depends on what the quiz carries. The round wants four each and
// settles for fewer rather than leaving the last seats with nothing, so what is asserted
// here is the shape: an equal share, somewhere in range. The clamp itself is arithmetic
// and tested as arithmetic in round_four_test.go.
func TestStartSingleDeviceQuizDealsTheWordsTheQuizHas(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)
	quiz := aQuiz(t, h, session.Token, "locale=nl")

	for _, players := range []int{pubquizr.MinPlayers, 6, pubquizr.MaxPlayers} {
		t.Run(fmt.Sprintf("%d players", players), func(t *testing.T) {
			started := startedQuiz(t, h, session.Token, quiz.ID, tableOf(players)...)

			dealt := questionsIn(started, pubquizr.RoundDescribe)

			perSeat := make([]int, players)
			for _, question := range dealt {
				if question.AssignedSeat == nil {
					t.Fatal("a round 4 word was dealt to nobody")
				}
				perSeat[*question.AssignedSeat]++
			}

			each := perSeat[0]
			if each < pubquizr.MinDescribeWordsPerTurn || each > pubquizr.DescribeWordsPerTurn {
				t.Fatalf("seat 0 got %d words, want between %d and %d",
					each, pubquizr.MinDescribeWordsPerTurn, pubquizr.DescribeWordsPerTurn)
			}
			for seat, got := range perSeat {
				if got != each {
					t.Errorf("seat %d got %d words, want %d -- everybody describes the same number", seat, got, each)
				}
			}
			if got, want := len(dealt), players*each; got != want {
				t.Errorf("round 4 words = %d, want %d", got, want)
			}
		})
	}
}

// TestStartSingleDeviceQuizLeavesTheFinaleUnassigned -- who plays it is not known
// until the other five rounds are done.
func TestStartSingleDeviceQuizLeavesTheFinaleUnassigned(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)
	quiz := aQuiz(t, h, session.Token, "locale=nl")

	started := startedQuiz(t, h, session.Token, quiz.ID, tableOf(4)...)

	for _, round := range []int{pubquizr.RoundOpen, pubquizr.RoundClosest, pubquizr.RoundList, pubquizr.RoundFinale} {
		dealt := questionsIn(started, round)
		if len(dealt) == 0 {
			t.Errorf("round %d was dealt nothing", round)
		}
		for _, question := range dealt {
			if question.AssignedSeat != nil {
				t.Errorf("round %d question was dealt to seat %d, want nobody", round, *question.AssignedSeat)
			}
		}
	}
}

func TestStartSingleDeviceQuizRefusesATableThatIsTheWrongSize(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)
	quiz := aQuiz(t, h, session.Token, "locale=nl")

	for _, players := range []int{0, 1, pubquizr.MinPlayers - 1, pubquizr.MaxPlayers + 1} {
		rec := do(t, h, http.MethodPost, singleDevicePath,
			startBody(t, quiz.ID, tableOf(players)...), session.Token)

		if rec.Code != http.StatusUnprocessableEntity {
			t.Errorf("%d players: status = %d, want %d (body: %s)",
				players, rec.Code, http.StatusUnprocessableEntity, rec.Body)
		}
	}
}

func TestStartSingleDeviceQuizRefusesTwoPlayersWithOneName(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)
	quiz := aQuiz(t, h, session.Token, "locale=nl")

	// Case-insensitively: as far as a room shouting answers is concerned, these
	// are one person.
	rec := do(t, h, http.MethodPost, singleDevicePath,
		startBody(t, quiz.ID, "Niels", "niels", "Tom", "Eva"), session.Token)

	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusConflict, rec.Body)
	}
	if got, want := errorCode(t, rec), "duplicate_player_name"; got != want {
		t.Errorf("code = %q, want %q", got, want)
	}
}

func TestStartSingleDeviceQuizRefusesABlankName(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)
	quiz := aQuiz(t, h, session.Token, "locale=nl")

	rec := do(t, h, http.MethodPost, singleDevicePath,
		startBody(t, quiz.ID, "Niels", "   ", "Tom"), session.Token)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusUnprocessableEntity, rec.Body)
	}
}

func TestStartSingleDeviceQuizRefusesAnUnknownQuiz(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)

	rec := do(t, h, http.MethodPost, singleDevicePath,
		startBody(t, "11111111-1111-1111-1111-111111111111", tableOf(4)...), session.Token)

	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusNotFound, rec.Body)
	}
}

func TestStartSingleDeviceQuizRequiresAuth(t *testing.T) {
	h, _ := newQuizServer(t)

	rec := do(t, h, http.MethodPost, singleDevicePath,
		startBody(t, "11111111-1111-1111-1111-111111111111", tableOf(4)...), "")

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusUnauthorized, rec.Body)
	}
}

func TestGetSingleDeviceSessionAnswersTheGameBack(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)
	quiz := aQuiz(t, h, session.Token, "locale=nl")

	started := startedQuiz(t, h, session.Token, quiz.ID, "Niels", "Sanne", "Tom")

	rec := do(t, h, http.MethodGet, singleDeviceSessionPath(started.ID), "", session.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	reloaded := decodeBody[quizSessionResponse](t, rec)
	if reloaded.ID != started.ID {
		t.Errorf("id = %q, want %q", reloaded.ID, started.ID)
	}
	if got, want := len(reloaded.Questions), len(started.Questions); got != want {
		t.Errorf("questions = %d, want %d -- the deal moved between the two reads", got, want)
	}
	if got, want := len(reloaded.Players), len(started.Players); got != want {
		t.Errorf("players = %d, want %d", got, want)
	}
}

// TestGetSingleDeviceSessionIsNotYoursToRead -- somebody else's phone is somebody
// else's game, and "not yours" gets the same answer as "no such game".
func TestGetSingleDeviceSessionIsNotYoursToRead(t *testing.T) {
	h, _ := newQuizServer(t)
	owner := newGuestSession(t, h)
	stranger := newGuestSession(t, h)

	quiz := aQuiz(t, h, owner.Token, "locale=nl")
	started := startedQuiz(t, h, owner.Token, quiz.ID, "Niels", "Sanne", "Tom")

	rec := do(t, h, http.MethodGet, singleDeviceSessionPath(started.ID), "", stranger.Token)
	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusNotFound, rec.Body)
	}
}

// TestReconnectListsAQuizStillOnTheTable is how the app finds its way back after a
// reload.
func TestReconnectListsAQuizStillOnTheTable(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)
	quiz := aQuiz(t, h, session.Token, "locale=nl")

	started := startedQuiz(t, h, session.Token, quiz.ID, "Niels", "Sanne", "Tom")

	rec := do(t, h, http.MethodGet, "/api/v1/reconnect-games", "", session.Token)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	games := decodeBody[[]ReconnectableGame](t, rec)
	for _, game := range games {
		if game.ID == started.ID && game.Type == PubquizRSingleDevice {
			return
		}
	}
	t.Errorf("session %s is not in the reconnect list (%+v)", started.ID, games)
}

// tableOf makes up n distinct names.
func tableOf(n int) []string {
	names := make([]string, n)
	for i := range names {
		names[i] = fmt.Sprintf("Player %d", i+1)
	}
	return names
}

// Round 1 no longer always opens on seat 0. It used to, which meant whoever typed
// their name into the setup form first was quiz master for the first question of every
// game they ever hosted.
//
// Started enough times that a table of four staying on one seat throughout is a one in
// four-to-the-twelfth coincidence rather than a flaky test.
func TestStartSingleDeviceQuizOpensOnARandomSeat(t *testing.T) {
	h, _ := newQuizServer(t)
	session := newGuestSession(t, h)
	quiz := aQuiz(t, h, session.Token, "locale=nl")

	names := []string{"Niels", "Sanne", "Tom", "Eva"}
	seen := map[int]bool{}

	for i := 0; i < 12; i++ {
		started := startedQuiz(t, h, session.Token, quiz.ID, names...)
		seen[started.HotSeat] = true
	}

	if len(seen) < 2 {
		t.Errorf("twelve games all opened on seat %v -- the opening seat is not being drawn", seen)
	}
}
