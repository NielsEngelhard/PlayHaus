package api

import (
	"encoding/json"
	"net/http"
	"testing"

	"playhaus-api/internal/pubquizr"
)

// Rounds 3 and 4 over HTTP.
//
// Driven by playing a real evening rather than by writing rows into the database, which
// costs twenty-odd requests and buys the thing worth having: whatever the deal, the
// ordering and the round boundaries actually do is what these tests meet.

func verdictPath(sessionID string) string {
	return singleDeviceSessionPath(sessionID) + "/verdict"
}

func closestPath(sessionID string) string {
	return singleDeviceSessionPath(sessionID) + "/closest"
}

func describePath(sessionID string) string {
	return singleDeviceSessionPath(sessionID) + "/describe"
}

// playOutRound posts correct verdicts until the session leaves the round it is in.
//
// Only good for the hot seat rounds, which is all it is asked for: it is the way to get a
// real session as far as round 3 without reaching past the API to write the rows by hand.
func playOutRound(t *testing.T, h http.Handler, token string, session quizSessionResponse) quizSessionResponse {
	t.Helper()

	round := session.CurrentRound
	for turn := 0; session.CurrentRound == round; turn++ {
		if turn > 200 {
			t.Fatalf("round %d would not end", round)
		}
		if len(session.TurnQuestionIDs) != 1 {
			t.Fatalf("round %d turn %d offered %d questions, want 1",
				round, turn, len(session.TurnQuestionIDs))
		}

		rec := do(t, h, http.MethodPost, verdictPath(session.ID),
			verdictBody(t, session.TurnQuestionIDs[0], true), token)
		if rec.Code != http.StatusOK {
			t.Fatalf("round %d turn %d: status = %d (body: %s)", round, turn, rec.Code, rec.Body)
		}
		session = decodeBody[quizSessionResponse](t, rec)
	}

	return session
}

// atRoundThree is a real session played as far as the first closest-guess question.
func atRoundThree(t *testing.T, players int) (http.Handler, string, quizSessionResponse) {
	t.Helper()

	h, _ := newQuizServer(t)
	guest := newGuestSession(t, h)
	quiz := aQuiz(t, h, guest.Token, "locale=nl")

	session := startedQuiz(t, h, guest.Token, quiz.ID, tableOf(players)...)
	session = playOutRound(t, h, guest.Token, session) // round 1
	session = playOutRound(t, h, guest.Token, session) // round 2

	if got, want := session.CurrentRound, pubquizr.RoundClosest; got != want {
		t.Fatalf("currentRound = %d, want %d", got, want)
	}

	return h, guest.Token, session
}

func closestBody(t *testing.T, req closestGuessesRequest) string {
	t.Helper()

	body, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("marshal closest guesses: %v", err)
	}
	return string(body)
}

// Nobody is "being asked" in round 3 -- the whole table guesses at once -- and the app
// has to be told that rather than left to infer it from a seat that means nothing.
func TestRoundThreeAsksTheWholeTable(t *testing.T) {
	_, _, session := atRoundThree(t, 4)

	if session.AnsweringSeat != nil {
		t.Errorf("answeringSeat = %d, want null in round 3", *session.AnsweringSeat)
	}
	if session.DescriberSeat != nil {
		t.Errorf("describerSeat = %d, want null outside round 4", *session.DescriberSeat)
	}
	if got, want := len(session.TurnQuestionIDs), 1; got != want {
		t.Errorf("turnQuestionIds = %d, want %d", got, want)
	}
	// Every shipped quiz carries two closest questions, and the round deals what the
	// quiz has rather than one per player.
	if got, want := session.TurnsInRound, 2; got != want {
		t.Errorf("turnsInRound = %d, want %d", got, want)
	}
}

func TestClosestGuessesScoreTheNearest(t *testing.T) {
	h, token, session := atRoundThree(t, 4)

	reader := session.QuizMasterSeat
	guessers := []int{}
	for _, player := range session.Players {
		if player.Seat != reader {
			guessers = append(guessers, player.Seat)
		}
	}

	before := map[int]int{}
	for _, player := range session.Players {
		before[player.Seat] = player.Score
	}

	// Wildly apart, so which of them is nearest does not depend on the question.
	rec := do(t, h, http.MethodPost, closestPath(session.ID), closestBody(t, closestGuessesRequest{
		SessionQuestionID: session.TurnQuestionIDs[0],
		Guesses: []seatGuessRequest{
			{Seat: guessers[0], Value: 0},
			{Seat: guessers[1], Value: 1_000_000},
			{Seat: guessers[2], Value: 2_000_000},
		},
	}), token)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	settled := decodeBody[quizSessionResponse](t, rec)

	scored := 0
	for _, player := range settled.Players {
		if gained := player.Score - before[player.Seat]; gained != 0 {
			if gained != pubquizr.ClosestPoints {
				t.Errorf("seat %d gained %d, want %d", player.Seat, gained, pubquizr.ClosestPoints)
			}
			scored++
		}
	}
	if scored != 1 {
		t.Errorf("%d players scored, want 1", scored)
	}

	// The reading moves one seat on whether anybody scored or not.
	if got, want := settled.QuizMasterSeat, (reader+1)%len(settled.Players); got != want {
		t.Errorf("quizMasterSeat = %d, want %d", got, want)
	}
}

func TestClosestGuessesRefusals(t *testing.T) {
	table := []struct {
		name string
		body func(session quizSessionResponse) closestGuessesRequest
		code int
		want string
	}{
		{
			name: "two players on the same number",
			body: func(s quizSessionResponse) closestGuessesRequest {
				a, b := otherSeats(s, 2)
				return closestGuessesRequest{
					SessionQuestionID: s.TurnQuestionIDs[0],
					Guesses:           []seatGuessRequest{{Seat: a, Value: 7}, {Seat: b, Value: 7}},
				}
			},
			code: http.StatusConflict,
			want: "duplicate_guess",
		},
		{
			name: "the quizmaster guessing",
			body: func(s quizSessionResponse) closestGuessesRequest {
				return closestGuessesRequest{
					SessionQuestionID: s.TurnQuestionIDs[0],
					Guesses:           []seatGuessRequest{{Seat: s.QuizMasterSeat, Value: 7}},
				}
			},
			code: http.StatusConflict,
			want: "quizmaster_cannot_guess",
		},
		{
			name: "a seat that is not at this table",
			body: func(s quizSessionResponse) closestGuessesRequest {
				return closestGuessesRequest{
					SessionQuestionID: s.TurnQuestionIDs[0],
					Guesses:           []seatGuessRequest{{Seat: 99, Value: 7}},
				}
			},
			code: http.StatusConflict,
			want: "unknown_seat",
		},
		{
			name: "a question the table has moved past",
			body: func(s quizSessionResponse) closestGuessesRequest {
				a, _ := otherSeats(s, 2)
				return closestGuessesRequest{
					SessionQuestionID: "11111111-1111-1111-1111-111111111111",
					Guesses:           []seatGuessRequest{{Seat: a, Value: 7}},
				}
			},
			code: http.StatusConflict,
			want: "stale_turn",
		},
	}

	for _, row := range table {
		t.Run(row.name, func(t *testing.T) {
			h, token, session := atRoundThree(t, 4)

			rec := do(t, h, http.MethodPost, closestPath(session.ID),
				closestBody(t, row.body(session)), token)

			if rec.Code != row.code {
				t.Fatalf("status = %d, want %d (body: %s)", rec.Code, row.code, rec.Body)
			}
			if got := errorCode(t, rec); got != row.want {
				t.Errorf("code = %q, want %q", got, row.want)
			}
		})
	}
}

// Naming both, or neither, is a screen that has disagreed with itself.
func TestClosestGuessesNeedsExactlyOneOfTheTwoWaysIn(t *testing.T) {
	h, token, session := atRoundThree(t, 4)
	a, b := otherSeats(session, 2)

	for _, body := range []closestGuessesRequest{
		{
			SessionQuestionID: session.TurnQuestionIDs[0],
			Guesses:           []seatGuessRequest{{Seat: a, Value: 7}},
			WinningSeats:      []int{b},
		},
		{SessionQuestionID: session.TurnQuestionIDs[0]},
	} {
		rec := do(t, h, http.MethodPost, closestPath(session.ID), closestBody(t, body), token)

		if rec.Code != http.StatusUnprocessableEntity {
			t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusUnprocessableEntity, rec.Body)
		}
	}
}

// A body with a key the server does not know is a client and a server that disagree
// about the game, which is worth a refusal rather than a silent ignore.
func TestClosestGuessesRefusesAnUnknownField(t *testing.T) {
	h, token, session := atRoundThree(t, 4)

	rec := do(t, h, http.MethodPost, closestPath(session.ID),
		`{"sessionQuestionId":"`+session.TurnQuestionIDs[0]+`","guesses":[],"winner":2}`, token)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusBadRequest, rec.Body)
	}
}

func TestClosestGuessesRequiresAuth(t *testing.T) {
	h, _, session := atRoundThree(t, 4)

	rec := do(t, h, http.MethodPost, closestPath(session.ID), `{}`, "")

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusUnauthorized, rec.Body)
	}
}

// --- round 4 --------------------------------------------------------------

// atRoundFour is a real session played all the way to the first thirty seconds.
func atRoundFour(t *testing.T, players int) (http.Handler, string, quizSessionResponse) {
	t.Helper()

	h, token, session := atRoundThree(t, players)

	for session.CurrentRound == pubquizr.RoundClosest {
		winner, _ := otherSeats(session, 1)

		rec := do(t, h, http.MethodPost, closestPath(session.ID), closestBody(t, closestGuessesRequest{
			SessionQuestionID: session.TurnQuestionIDs[0],
			WinningSeats:      []int{winner},
		}), token)
		if rec.Code != http.StatusOK {
			t.Fatalf("settle round 3: status = %d (body: %s)", rec.Code, rec.Body)
		}
		session = decodeBody[quizSessionResponse](t, rec)
	}

	if got, want := session.CurrentRound, pubquizr.RoundDescribe; got != want {
		t.Fatalf("currentRound = %d, want %d", got, want)
	}

	return h, token, session
}

func describeBody(t *testing.T, req describeAwardsRequest) string {
	t.Helper()

	body, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("marshal describe awards: %v", err)
	}
	return string(body)
}

// Round 4 is one turn per player and several words inside each, so the turn has to name
// its own words -- the position on the session counts turns and would find the wrong ones.
func TestRoundFourNamesTheDescriberAndTheirWords(t *testing.T) {
	_, _, session := atRoundFour(t, 4)

	if session.DescriberSeat == nil {
		t.Fatal("describerSeat = null in round 4")
	}
	if got, want := *session.DescriberSeat, session.QuizMasterSeat; got != want {
		t.Errorf("describerSeat = %d, want %d -- the describer holds the phone", got, want)
	}
	if got, want := session.TurnsInRound, len(session.Players); got != want {
		t.Errorf("turnsInRound = %d, want %d -- one turn each", got, want)
	}

	words := session.TurnQuestionIDs
	if len(words) < pubquizr.MinDescribeWordsPerTurn || len(words) > pubquizr.DescribeWordsPerTurn {
		t.Fatalf("the turn holds %d words, want between %d and %d",
			len(words), pubquizr.MinDescribeWordsPerTurn, pubquizr.DescribeWordsPerTurn)
	}

	// And they really are the describer's own.
	mine := map[string]bool{}
	for _, question := range session.Questions {
		if question.Round == pubquizr.RoundDescribe &&
			question.AssignedSeat != nil && *question.AssignedSeat == *session.DescriberSeat {
			mine[question.ID] = true
		}
	}
	for _, word := range words {
		if !mine[word] {
			t.Errorf("word %s is not the describer's", word)
		}
	}
}

func TestDescribeAwardsPayTheDescriberAndTheGuessers(t *testing.T) {
	h, token, session := atRoundFour(t, 4)

	describer := *session.DescriberSeat
	guesser, _ := otherSeats(session, 1)

	before := map[int]int{}
	for _, player := range session.Players {
		before[player.Seat] = player.Score
	}

	// The first word lands, the rest do not.
	awards := make([]wordAwardRequest, 0, len(session.TurnQuestionIDs))
	for i, word := range session.TurnQuestionIDs {
		awarded := wordAwardRequest{SessionQuestionID: word}
		if i == 0 {
			awarded.Seats = []int{guesser}
		}
		awards = append(awards, awarded)
	}

	rec := do(t, h, http.MethodPost, describePath(session.ID), describeBody(t, describeAwardsRequest{
		DescriberSeat: describer,
		Awards:        awards,
	}), token)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}

	settled := decodeBody[quizSessionResponse](t, rec)
	for _, player := range settled.Players {
		gained := player.Score - before[player.Seat]

		want := 0
		switch player.Seat {
		case describer:
			want = pubquizr.DescribeWordPoints
		case guesser:
			want = pubquizr.DescribeGuessPoints
		}
		if gained != want {
			t.Errorf("seat %d gained %d, want %d", player.Seat, gained, want)
		}
	}

	// And the phone moves on to the next describer.
	if got, want := *settled.DescriberSeat, (describer+1)%len(settled.Players); got != want {
		t.Errorf("describerSeat = %d, want %d", got, want)
	}
}

func TestDescribeAwardsRefusals(t *testing.T) {
	table := []struct {
		name string
		body func(session quizSessionResponse) describeAwardsRequest
		code int
		want string
	}{
		{
			name: "guessing your own word",
			body: func(s quizSessionResponse) describeAwardsRequest {
				seat := *s.DescriberSeat
				return describeAwardsRequest{
					DescriberSeat: *s.DescriberSeat,
					Awards:        allWords(s, &seat),
				}
			},
			code: http.StatusConflict,
			want: "describer_cannot_guess",
		},
		{
			name: "a seat that is not at this table",
			body: func(s quizSessionResponse) describeAwardsRequest {
				seat := 99
				return describeAwardsRequest{
					DescriberSeat: *s.DescriberSeat,
					Awards:        allWords(s, &seat),
				}
			},
			code: http.StatusConflict,
			want: "unknown_seat",
		},
		{
			name: "somebody else's turn",
			body: func(s quizSessionResponse) describeAwardsRequest {
				return describeAwardsRequest{
					DescriberSeat: (*s.DescriberSeat + 1) % len(s.Players),
					Awards:        allWords(s, nil),
				}
			},
			code: http.StatusConflict,
			want: "stale_turn",
		},
		{
			name: "a word left unruled",
			body: func(s quizSessionResponse) describeAwardsRequest {
				return describeAwardsRequest{
					DescriberSeat: *s.DescriberSeat,
					Awards:        allWords(s, nil)[:1],
				}
			},
			code: http.StatusUnprocessableEntity,
			want: "invalid_input",
		},
	}

	for _, row := range table {
		t.Run(row.name, func(t *testing.T) {
			h, token, session := atRoundFour(t, 4)

			rec := do(t, h, http.MethodPost, describePath(session.ID),
				describeBody(t, row.body(session)), token)

			if rec.Code != row.code {
				t.Fatalf("status = %d, want %d (body: %s)", rec.Code, row.code, rec.Body)
			}
			if got := errorCode(t, rec); got != row.want {
				t.Errorf("code = %q, want %q", got, row.want)
			}
		})
	}
}

// allWords rules on every word of the turn, crediting all of them to one seat (or to
// nobody when it is nil).
func allWords(session quizSessionResponse, seat *int) []wordAwardRequest {
	var seats []int
	if seat != nil {
		seats = []int{*seat}
	}

	awards := make([]wordAwardRequest, 0, len(session.TurnQuestionIDs))
	for _, word := range session.TurnQuestionIDs {
		awards = append(awards, wordAwardRequest{SessionQuestionID: word, Seats: seats})
	}
	return awards
}

// otherSeats is `want` seats that are not the quizmaster, in table order.
func otherSeats(session quizSessionResponse, want int) (int, int) {
	var found []int
	for _, player := range session.Players {
		if player.Seat != session.QuizMasterSeat {
			found = append(found, player.Seat)
		}
	}
	if len(found) < want || len(found) < 2 {
		return -1, -1
	}
	return found[0], found[1]
}
