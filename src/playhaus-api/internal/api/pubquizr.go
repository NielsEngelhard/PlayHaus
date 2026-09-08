package api

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"playhaus-api/internal/pubquizr"

	"github.com/google/uuid"
)

// --- quiz -----------------------------------------------------------------

// quizSummaryResponse is a quiz on a shelf: enough to draw a card, and nothing anybody could play from.
type quizSummaryResponse struct {
	ID          string `json:"id"`
	Slug        string `json:"slug"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Locale      string `json:"locale"`
	PublishedAt string `json:"publishedAt,omitempty"`
	Played      bool   `json:"played,omitempty"`
}

type quizListResponse struct {
	Items    []quizSummaryResponse `json:"items"`
	Page     int                   `json:"page"`
	PageSize int                   `json:"pageSize"`
	Total    int64                 `json:"total"`
	HasMore  bool                  `json:"hasMore"`
}

// quizResponse is the whole quiz, answers included.
type quizResponse struct {
	quizSummaryResponse
	Rounds []quizRoundResponse `json:"rounds"`
}

type quizRoundResponse struct {
	Round     int                    `json:"round"`
	Kind      string                 `json:"kind"`
	Questions []quizQuestionResponse `json:"questions"`
}

type quizQuestionResponse struct {
	ID       string `json:"id"`
	Position int    `json:"position"`
	Prompt   string `json:"prompt"`
	Category string `json:"category,omitempty"`
	// NumericAnswer and Unit belong to a closest-guess question.
	NumericAnswer *float64             `json:"numericAnswer,omitempty"`
	Unit          string               `json:"unit,omitempty"`
	Explanation   string               `json:"explanation,omitempty"`
	Answers       []quizAnswerResponse `json:"answers"`
}

type quizAnswerResponse struct {
	ID       string `json:"id"`
	Position int    `json:"position"`
	Text     string `json:"text"`
	Correct  bool   `json:"correct"`
	// Alias is an accepted alternative wording.
	Alias bool `json:"alias,omitempty"`
}

func newQuizSummaryResponse(q *pubquizr.Quiz, played bool) quizSummaryResponse {
	summary := quizSummaryResponse{
		ID:          q.ID.String(),
		Slug:        q.Slug,
		Title:       q.Title,
		Description: q.Description,
		Category:    q.Category.String(),
		Locale:      q.Locale.String(),
		PublishedAt: q.CreatedAt.Format(time.RFC3339),
		Played:      played,
	}

	if q.PublishedAt != nil {
		summary.PublishedAt = q.PublishedAt.Format(timeFormat)
	}
	return summary
}

func newQuizResponse(q *pubquizr.Quiz, played bool) quizResponse {
	rounds := make([]quizRoundResponse, 0, pubquizr.Rounds)

	for number := 1; number <= pubquizr.Rounds; number++ {
		questions := q.QuestionsIn(number)
		if len(questions) == 0 {
			continue
		}

		mapped := make([]quizQuestionResponse, 0, len(questions))
		for _, question := range questions {
			mapped = append(mapped, newQuizQuestionResponse(question))
		}

		rounds = append(rounds, quizRoundResponse{
			Round:     number,
			Kind:      string(pubquizr.KindOf(number)),
			Questions: mapped,
		})
	}

	return quizResponse{
		quizSummaryResponse: newQuizSummaryResponse(q, played),
		Rounds:              rounds,
	}
}

func newQuizQuestionResponse(q pubquizr.Question) quizQuestionResponse {
	answers := make([]quizAnswerResponse, 0, len(q.Answers))
	for _, answer := range q.Answers {
		answers = append(answers, quizAnswerResponse{
			ID:       answer.ID.String(),
			Position: answer.Position,
			Text:     answer.Text,
			Correct:  answer.Correct,
			Alias:    answer.Alias,
		})
	}

	return quizQuestionResponse{
		ID:            q.ID.String(),
		Position:      q.Position,
		Prompt:        q.Prompt,
		Category:      Deref(q.Category, ""),
		NumericAnswer: q.NumericAnswer,
		Unit:          Deref(q.Unit, ""),
		Explanation:   Deref(q.Explanation, ""),
		Answers:       answers,
	}
}

// --- session --------------------------------------------------------------

type quizSessionPlayerResponse struct {
	Seat int    `json:"seat"`
	Name string `json:"name"`
	// Score is everything this player has taken all evening, round 6 included.
	Score int    `json:"score"`
	Color string `json:"color"`
}

type quizSessionQuestionResponse struct {
	ID         string `json:"id"`
	Round      int    `json:"round"`
	Position   int    `json:"position"`
	QuestionID string `json:"questionId"`
	// AssignedSeat is whose question this is in rounds 2 and 4, and null elsewhere.
	AssignedSeat *int   `json:"assignedSeat"`
	Status       string `json:"status"`
	Points       int    `json:"points"`
}

type quizSessionResponse struct {
	ID     string `json:"id"`
	QuizID string `json:"quizId"`
	Mode   string `json:"mode"`
	Locale string `json:"locale"`
	Status string `json:"status"`

	CurrentRound    int   `json:"currentRound"`
	CurrentPosition int   `json:"currentPosition"`
	QuizMasterSeat  int   `json:"quizMasterSeat"`
	TotalRounds     int   `json:"totalRounds"`
	Rounds          []int `json:"rounds"`
	// ZenMode and TriviaMode are the two toggles this evening was set up with.
	ZenMode    bool `json:"zenMode"`
	TriviaMode bool `json:"triviaMode"`
	// AnsweringSeat is whose turn it is to answer the current question, and null when nobody is being asked anything.
	AnsweringSeat *int `json:"answeringSeat"`
	// HotSeat is the seat the current question was first asked to.
	HotSeat int `json:"hotSeat"`
	// FinalistSeats are the two players round 6 is between, and null until the finale opens.
	FinalistSeats []int `json:"finalistSeats"`
	// HotSeatRun is how many questions in a row the hot seat has taken.
	HotSeatRun int `json:"hotSeatRun"`
	// TurnsInRound is how many goes this round holds.
	TurnsInRound int `json:"turnsInRound"`
	// DescriberSeat is who is describing in round 4, and null in every other round.
	DescriberSeat *int `json:"describerSeat"`
	// GuesserSeat is the one player being played to this turn.
	GuesserSeat *int `json:"guesserSeat"`
	// BonusSeats are the players who each get one guess at whatever the clock left behind, in the order their go comes round.
	BonusSeats []int `json:"bonusSeats"`
	// TurnQuestionIDs are the dealt questions this turn is about.
	TurnQuestionIDs []string `json:"turnQuestionIds"`

	Players   []quizSessionPlayerResponse   `json:"players"`
	Questions []quizSessionQuestionResponse `json:"questions"`

	CreatedAt string `json:"createdAt"`
}

// newQuizSessionResponse draws a session for the app. answeringSeat is passed in rather than worked out here because it needs the attempt count.
func newQuizSessionResponse(s *pubquizr.Session, answeringSeat int) quizSessionResponse {
	players := make([]quizSessionPlayerResponse, 0, len(s.Players))
	for _, player := range s.Players {
		players = append(players, quizSessionPlayerResponse{
			Seat:  player.Seat,
			Name:  player.Name,
			Score: player.Score,
			Color: player.Color,
		})
	}

	questions := make([]quizSessionQuestionResponse, 0, len(s.Questions))
	for _, question := range s.Questions {
		questions = append(questions, quizSessionQuestionResponse{
			ID:           question.ID.String(),
			Round:        question.Round,
			Position:     question.Position,
			QuestionID:   question.QuestionID.String(),
			AssignedSeat: question.AssignedSeat,
			Status:       string(question.Status),
			Points:       question.Points,
		})
	}

	var asked *int
	if answeringSeat >= 0 {
		asked = &answeringSeat
	}

	var describing *int
	if seat := s.Describer(); seat >= 0 {
		describing = &seat
	}

	var guesser *int
	if seat := s.TurnGuesser(); seat >= 0 {
		guesser = &seat
	}

	bonus := s.BonusSeats()
	if bonus == nil {
		bonus = []int{}
	}

	var finalists []int
	if a, b, ok := s.Finalists(); ok {
		finalists = []int{a, b}
	}

	// What this turn will accept a ruling on.
	turn := []string{}
	if s.Status == pubquizr.SessionInProgress {
		if describing != nil {
			for _, word := range s.WordsFor(*describing) {
				turn = append(turn, word.ID.String())
			}
		} else if current := s.QuestionAt(s.CurrentRound, s.CurrentPosition); current != nil {
			turn = append(turn, current.ID.String())
		}
	}

	order := pubquizr.RunningOrder(s.Modes())

	return quizSessionResponse{
		ID:              s.ID.String(),
		QuizID:          s.QuizID.String(),
		Mode:            string(s.Mode),
		Locale:          s.Locale.String(),
		Status:          string(s.Status),
		CurrentRound:    s.CurrentRound,
		CurrentPosition: s.CurrentPosition,
		QuizMasterSeat:  s.QuizMasterSeat,
		TotalRounds:     len(order),
		Rounds:          order,
		ZenMode:         s.ZenMode,
		TriviaMode:      s.TriviaMode,
		AnsweringSeat:   asked,
		HotSeat:         s.HotSeatOrFirst(),
		FinalistSeats:   finalists,
		HotSeatRun:      s.HotSeatRun,
		TurnsInRound:    s.TurnsInRound(s.CurrentRound),
		DescriberSeat:   describing,
		GuesserSeat:     guesser,
		BonusSeats:      bonus,
		TurnQuestionIDs: turn,
		Players:         players,
		Questions:       questions,
		CreatedAt:       s.CreatedAt.Format(timeFormat),
	}
}

// --- handlers -------------------------------------------------------------

func (s *Server) handleListQuizzes(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleListQuizzes reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	query := r.URL.Query()

	// The locale is not a nicety here.
	filter := pubquizr.QuizFilter{
		Locale:   localeFrom(query.Get("locale"), r),
		Category: pubquizr.Category(query.Get("category")),
		Page:     atoiOr(query.Get("page"), 1),
		PageSize: atoiOr(query.Get("pageSize"), pubquizr.DefaultPageSize),
	}

	page, err := s.pubquizr.ListQuizzes(r.Context(), ownerID, filter)
	if err != nil {
		s.log.Error("list quizzes", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	items := make([]quizSummaryResponse, 0, len(page.Quizzes))
	for _, quiz := range page.Quizzes {
		items = append(items, newQuizSummaryResponse(quiz, page.Played[quiz.ID]))
	}

	writeJSON(w, http.StatusOK, quizListResponse{
		Items:    items,
		Page:     page.Page,
		PageSize: page.PageSize,
		Total:    page.Total,
		HasMore:  page.HasMore(),
	})
}

func (s *Server) handleGetQuiz(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleGetQuiz reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	quizID, err := uuid.Parse(r.PathValue("quizID"))
	if err != nil {
		// An unparseable id cannot name a quiz, and saying so is the same answer as "there is no such quiz".
		writeError(w, http.StatusNotFound, "quiz not found")
		return
	}

	quiz, err := s.pubquizr.Quiz(r.Context(), quizID)
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}

	played, err := s.pubquizr.HasPlayed(r.Context(), ownerID, quiz.ID)
	if err != nil {
		s.log.Error("quiz played", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	writeJSON(w, http.StatusOK, newQuizResponse(quiz, played))
}

type startSingleDeviceRequest struct {
	QuizID      string   `json:"quizId"`
	PlayerNames []string `json:"playerNames"`
	ZenMode     bool     `json:"zenMode"`
	TriviaMode  bool     `json:"triviaMode"`
}

func (req startSingleDeviceRequest) Validate() map[string]string {
	problems := map[string]string{}

	if strings.TrimSpace(req.QuizID) == "" {
		problems["quizId"] = "is required"
	}
	switch {
	case len(req.PlayerNames) < pubquizr.MinPlayers:
		problems["playerNames"] = "needs at least " + strconv.Itoa(pubquizr.MinPlayers) + " players"
	case len(req.PlayerNames) > pubquizr.MaxPlayers:
		problems["playerNames"] = "takes at most " + strconv.Itoa(pubquizr.MaxPlayers) + " players"
	default:
		for _, name := range req.PlayerNames {
			if strings.TrimSpace(name) == "" {
				problems["playerNames"] = "every player needs a name"
				break
			}
		}
	}

	return problems
}

func (s *Server) handleStartSingleDeviceQuiz(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleStartSingleDeviceQuiz reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	req, problems, err := decode[startSingleDeviceRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	quizID, err := uuid.Parse(req.QuizID)
	if err != nil {
		writeError(w, http.StatusNotFound, "quiz not found")
		return
	}

	session, problems, err := s.pubquizr.StartSingleDeviceSession(r.Context(), pubquizr.StartSingleDeviceInput{
		QuizID:      quizID,
		OwnerID:     ownerID,
		PlayerNames: req.PlayerNames,
		Modes:       pubquizr.Modes{Zen: req.ZenMode, Trivia: req.TriviaMode},
	})
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	s.writeSession(w, r, session, http.StatusCreated)
}

func (s *Server) handleGetSingleDeviceSession(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleGetSingleDeviceSession reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	sessionID, err := uuid.Parse(r.PathValue("sessionID"))
	if err != nil {
		writeError(w, http.StatusNotFound, "session not found")
		return
	}

	session, err := s.pubquizr.SessionForOwner(r.Context(), sessionID, ownerID)
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}

	s.writeSession(w, r, session, http.StatusOK)
}

// handleGetCurrentSingleDeviceSession answers with the evening this player left running, and 204 when there is none.
func (s *Server) handleGetCurrentSingleDeviceSession(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleGetCurrentSingleDeviceSession reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	session, err := s.pubquizr.CurrentSession(r.Context(), ownerID)
	if err != nil {
		if errors.Is(err, pubquizr.ErrSessionNotFound) {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		s.writePubquizRError(w, err)
		return
	}

	s.writeSession(w, r, session, http.StatusOK)
}

func (s *Server) handleDeleteSingleDeviceSession(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleDeleteSingleDeviceSession reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	sessionID, err := uuid.Parse(r.PathValue("sessionID"))
	if err != nil {
		// An unparseable id cannot name a session, which is the same answer as one that is already gone.
		writeError(w, http.StatusNotFound, "session not found")
		return
	}

	if err := s.pubquizr.DeleteSession(r.Context(), sessionID, ownerID); err != nil {
		s.log.Error("delete single device session", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// hotSeatTurnRequest is the quizmaster settling one whole hot seat question.
type hotSeatTurnRequest struct {
	SessionQuestionID string `json:"sessionQuestionId"`
	// MissedSeats is who was asked and missed, in the order the question reached them.
	MissedSeats []int `json:"missedSeats"`
	// CorrectSeat is who took it, or null for a question that beat everybody.
	CorrectSeat *int `json:"correctSeat"`
	// Said is what the player actually answered, if the quizmaster bothered to type it in.
	Said string `json:"said,omitempty"`
}

func (req hotSeatTurnRequest) Validate() map[string]string {
	problems := map[string]string{}

	if strings.TrimSpace(req.SessionQuestionID) == "" {
		problems["sessionQuestionId"] = "is required"
	}

	// Only the shape is checked here.
	seen := map[int]bool{}
	for _, seat := range req.MissedSeats {
		if seat < 0 || seat >= pubquizr.MaxPlayers {
			problems["missedSeats"] = "names a seat nobody could be sitting in"
			break
		}
		if seen[seat] {
			problems["missedSeats"] = "names the same seat twice"
			break
		}
		seen[seat] = true
	}

	if req.CorrectSeat != nil {
		switch {
		case *req.CorrectSeat < 0 || *req.CorrectSeat >= pubquizr.MaxPlayers:
			problems["correctSeat"] = "names a seat nobody could be sitting in"
		case seen[*req.CorrectSeat]:
			problems["correctSeat"] = "cannot have missed it and taken it"
		}
	}

	return problems
}

// handleHotSeatVerdict is the quizmaster settling a whole round 1 or round 2 question.
func (s *Server) handleHotSeatVerdict(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleOpenVerdict reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	sessionID, err := uuid.Parse(r.PathValue("sessionID"))
	if err != nil {
		writeError(w, http.StatusNotFound, "session not found")
		return
	}

	req, problems, err := decode[hotSeatTurnRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	questionID, err := uuid.Parse(req.SessionQuestionID)
	if err != nil {
		// An unparseable id cannot name the current question, which is the same answer as naming one the table has moved past.
		writeErrorCode(w, http.StatusConflict, "stale_turn", "that question is no longer the current one")
		return
	}

	session, err := s.pubquizr.RecordHotSeatTurn(r.Context(), pubquizr.TurnInput{
		SessionID:         sessionID,
		OwnerID:           ownerID,
		SessionQuestionID: questionID,
		MissedSeats:       req.MissedSeats,
		CorrectSeat:       req.CorrectSeat,
		Said:              req.Said,
	})
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}

	s.writeSession(w, r, session, http.StatusOK)
}

type seatGuessRequest struct {
	Seat  int     `json:"seat"`
	Value float64 `json:"value"`
}

// closestGuessesRequest is the quizmaster settling a round 3 question.
type closestGuessesRequest struct {
	SessionQuestionID string             `json:"sessionQuestionId"`
	Guesses           []seatGuessRequest `json:"guesses,omitempty"`
	WinningSeats      []int              `json:"winningSeats,omitempty"`
}

func (req closestGuessesRequest) Validate() map[string]string {
	problems := map[string]string{}

	if strings.TrimSpace(req.SessionQuestionID) == "" {
		problems["sessionQuestionId"] = "is required"
	}
	if (len(req.Guesses) > 0) == (len(req.WinningSeats) > 0) {
		problems["guesses"] = "name the guesses or the winners, not both and not neither"
	}

	return problems
}

// handleClosestGuesses is the quizmaster settling one round 3 question.
func (s *Server) handleClosestGuesses(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleClosestGuesses reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	sessionID, err := uuid.Parse(r.PathValue("sessionID"))
	if err != nil {
		writeError(w, http.StatusNotFound, "session not found")
		return
	}

	req, problems, err := decode[closestGuessesRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	questionID, err := uuid.Parse(req.SessionQuestionID)
	if err != nil {
		// An unparseable id cannot name the current question, which is the same answer as naming one the table has moved past.
		writeErrorCode(w, http.StatusConflict, "stale_turn", "that question is no longer the current one")
		return
	}

	guesses := make([]pubquizr.SeatGuess, 0, len(req.Guesses))
	for _, guess := range req.Guesses {
		guesses = append(guesses, pubquizr.SeatGuess{Seat: guess.Seat, Value: guess.Value})
	}

	session, err := s.pubquizr.RecordClosestGuesses(r.Context(), pubquizr.ClosestInput{
		SessionID:         sessionID,
		OwnerID:           ownerID,
		SessionQuestionID: questionID,
		Guesses:           guesses,
		WinningSeats:      req.WinningSeats,
	})
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}

	s.writeSession(w, r, session, http.StatusOK)
}

// wordAwardRequest is what became of one round 4 word.
type wordAwardRequest struct {
	SessionQuestionID string `json:"sessionQuestionId"`
	Seats             []int  `json:"seats"`
}

// describeAwardsRequest is the quizmaster settling one thirty second turn. describerSeat is what makes this turn nameable at all.
type describeAwardsRequest struct {
	DescriberSeat int                `json:"describerSeat"`
	Awards        []wordAwardRequest `json:"awards"`
}

func (req describeAwardsRequest) Validate() map[string]string {
	problems := map[string]string{}

	if len(req.Awards) == 0 {
		problems["awards"] = "every word of the turn needs a verdict"
	}
	for _, awarded := range req.Awards {
		if strings.TrimSpace(awarded.SessionQuestionID) == "" {
			problems["awards"] = "every award names a word"
			break
		}
	}

	return problems
}

// handleDescribeAwards is the quizmaster settling one round 4 turn.
func (s *Server) handleDescribeAwards(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleDescribeAwards reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	sessionID, err := uuid.Parse(r.PathValue("sessionID"))
	if err != nil {
		writeError(w, http.StatusNotFound, "session not found")
		return
	}

	req, problems, err := decode[describeAwardsRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	awards := make([]pubquizr.WordAward, 0, len(req.Awards))
	for _, awarded := range req.Awards {
		wordID, err := uuid.Parse(awarded.SessionQuestionID)
		if err != nil {
			writeErrorCode(w, http.StatusConflict, "stale_turn", "that word is no longer part of this turn")
			return
		}
		awards = append(awards, pubquizr.WordAward{SessionQuestionID: wordID, Seats: awarded.Seats})
	}

	session, err := s.pubquizr.RecordDescribeAwards(r.Context(), pubquizr.DescribeInput{
		SessionID:     sessionID,
		OwnerID:       ownerID,
		DescriberSeat: req.DescriberSeat,
		Awards:        awards,
	})
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}

	s.writeSession(w, r, session, http.StatusOK)
}

// listAwardRequest is what became of one of round 5's four answers.
type listAwardRequest struct {
	AnswerID string `json:"answerId"`
	Seats    []int  `json:"seats"`
}

// listAwardsRequest is the quizmaster settling one round 5 question, once the round has been round every player it is going to reach.
type listAwardsRequest struct {
	SessionQuestionID string             `json:"sessionQuestionId"`
	Awards            []listAwardRequest `json:"awards"`
}

func (req listAwardsRequest) Validate() map[string]string {
	problems := map[string]string{}

	if strings.TrimSpace(req.SessionQuestionID) == "" {
		problems["sessionQuestionId"] = "is required"
	}
	if len(req.Awards) == 0 {
		problems["awards"] = "every answer to the question needs a verdict"
	}
	for _, awarded := range req.Awards {
		if strings.TrimSpace(awarded.AnswerID) == "" {
			problems["awards"] = "every award names an answer"
			break
		}
	}

	return problems
}

// handleListAwards is the quizmaster settling one round 5 question: which of its four answers were found, and by whom.
func (s *Server) handleListAwards(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleListAwards reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	sessionID, err := uuid.Parse(r.PathValue("sessionID"))
	if err != nil {
		writeError(w, http.StatusNotFound, "session not found")
		return
	}

	req, problems, err := decode[listAwardsRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	questionID, err := uuid.Parse(req.SessionQuestionID)
	if err != nil {
		// An unparseable id cannot name the current question, which is the same answer as naming one the table has moved past.
		writeErrorCode(w, http.StatusConflict, "stale_turn", "that question is no longer the current one")
		return
	}

	awards := make([]pubquizr.ListAward, 0, len(req.Awards))
	for _, awarded := range req.Awards {
		answerID, err := uuid.Parse(awarded.AnswerID)
		if err != nil {
			writeErrorCode(w, http.StatusConflict, "unknown_answer", "that answer is not part of this question")
			return
		}
		awards = append(awards, pubquizr.ListAward{AnswerID: answerID, Seats: awarded.Seats})
	}

	session, err := s.pubquizr.RecordListAward(r.Context(), pubquizr.ListInput{
		SessionID:         sessionID,
		OwnerID:           ownerID,
		SessionQuestionID: questionID,
		Awards:            awards,
	})
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}

	s.writeSession(w, r, session, http.StatusOK)
}

// handleFinaleVerdict is the quizmaster settling one whole round 6 question.
func (s *Server) handleFinaleVerdict(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleFinaleVerdict reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	sessionID, err := uuid.Parse(r.PathValue("sessionID"))
	if err != nil {
		writeError(w, http.StatusNotFound, "session not found")
		return
	}

	req, problems, err := decode[hotSeatTurnRequest](r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if len(problems) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"errors": problems})
		return
	}

	questionID, err := uuid.Parse(req.SessionQuestionID)
	if err != nil {
		writeErrorCode(w, http.StatusConflict, "stale_turn", "that question is no longer the current one")
		return
	}

	session, err := s.pubquizr.RecordFinaleTurn(r.Context(), pubquizr.TurnInput{
		SessionID:         sessionID,
		OwnerID:           ownerID,
		SessionQuestionID: questionID,
		MissedSeats:       req.MissedSeats,
		CorrectSeat:       req.CorrectSeat,
		Said:              req.Said,
	})
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}

	s.writeSession(w, r, session, http.StatusOK)
}

// writeSession answers with a session, and with whoever it is currently waiting on.
func (s *Server) writeSession(w http.ResponseWriter, r *http.Request, session *pubquizr.Session, status int) {
	answering, err := s.pubquizr.AnsweringSeatFor(r.Context(), session)
	if err != nil {
		s.log.Error("answering seat", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	writeJSON(w, status, newQuizSessionResponse(session, answering))
}

func (s *Server) writePubquizRError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, pubquizr.ErrQuizNotFound):
		writeError(w, http.StatusNotFound, "quiz not found")
	case errors.Is(err, pubquizr.ErrSessionNotFound):
		writeError(w, http.StatusNotFound, "session not found")
	case errors.Is(err, pubquizr.ErrTooFewPlayers):
		writeErrorCode(w, http.StatusConflict, "too_few_players", "you need at least three players")
	case errors.Is(err, pubquizr.ErrTooManyPlayers):
		writeErrorCode(w, http.StatusConflict, "too_many_players", "eight players is the most that fit")
	case errors.Is(err, pubquizr.ErrDuplicatePlayerName):
		writeErrorCode(w, http.StatusConflict, "duplicate_player_name", "two players cannot share a name")
	case errors.Is(err, pubquizr.ErrQuizTooSmall):
		writeErrorCode(w, http.StatusConflict, "quiz_too_small", "this quiz does not have enough questions for that many players")
	case errors.Is(err, pubquizr.ErrSessionOver):
		writeErrorCode(w, http.StatusConflict, "session_over", "this quiz has already finished")
	case errors.Is(err, pubquizr.ErrWrongRound):
		writeErrorCode(w, http.StatusConflict, "wrong_round", "that round cannot be played yet")
	case errors.Is(err, pubquizr.ErrStaleTurn):
		writeErrorCode(w, http.StatusConflict, "stale_turn", "that question is no longer the current one")
	case errors.Is(err, pubquizr.ErrUnknownSeat):
		writeErrorCode(w, http.StatusConflict, "unknown_seat", "that seat is not at this table")
	case errors.Is(err, pubquizr.ErrDuplicateGuess):
		writeErrorCode(w, http.StatusConflict, "duplicate_guess", "two players cannot guess the same number")
	case errors.Is(err, pubquizr.ErrQuizmasterCannotGuess):
		writeErrorCode(w, http.StatusConflict, "quizmaster_cannot_guess", "the quizmaster is reading this one out")
	case errors.Is(err, pubquizr.ErrDescriberCannotGuess):
		writeErrorCode(w, http.StatusConflict, "describer_cannot_guess", "you cannot guess your own word")
	case errors.Is(err, pubquizr.ErrOneGuessEach):
		writeErrorCode(w, http.StatusConflict, "one_guess_each", "everybody but the guesser gets one go")
	case errors.Is(err, pubquizr.ErrTwoOnOneCredit):
		writeErrorCode(w, http.StatusConflict, "two_on_one", "only one player can be credited with that")
	case errors.Is(err, pubquizr.ErrUnknownWord):
		writeErrorCode(w, http.StatusConflict, "unknown_word", "that word is not part of this turn")
	case errors.Is(err, pubquizr.ErrUnknownAnswer):
		writeErrorCode(w, http.StatusConflict, "unknown_answer", "that answer is not part of this question")
	// Last of the named cases, because several of the ones above are kinds of it and would be swallowed here.
	case errors.Is(err, pubquizr.ErrInvalidInput):
		writeErrorCode(w, http.StatusUnprocessableEntity, "invalid_input", "that is not something this round can be told")
	default:
		s.log.Error("pubquizr", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
	}
}

// atoiOr reads a query parameter that should be a number.
func atoiOr(raw string, fallback int) int {
	if raw == "" {
		return fallback
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return n
}
