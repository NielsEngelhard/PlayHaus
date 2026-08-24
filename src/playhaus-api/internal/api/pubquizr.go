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

// quizSummaryResponse is a quiz on a shelf: enough to draw a card, and nothing
// anybody could play from.
type quizSummaryResponse struct {
	ID          string `json:"id"`
	Slug        string `json:"slug"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Locale      string `json:"locale"`
	PublishedAt string `json:"publishedAt,omitempty"`
}

type quizListResponse struct {
	Items    []quizSummaryResponse `json:"items"`
	Page     int                   `json:"page"`
	PageSize int                   `json:"pageSize"`
	Total    int64                 `json:"total"`
	HasMore  bool                  `json:"hasMore"`
}

// quizResponse is the whole quiz, answers included.
//
// The answers ride along on purpose: this is the quiz master's own phone, they are
// about to read them out loud anyway, and one call means the evening survives the
// pub's wifi.
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
	// Alias is an accepted alternative wording. The app should never draw one --
	// it is there so a quiz master can see that "Tarantino" also counts.
	Alias bool `json:"alias,omitempty"`
}

func newQuizSummaryResponse(q *pubquizr.Quiz, questionCount int) quizSummaryResponse {
	summary := quizSummaryResponse{
		ID:          q.ID.String(),
		Slug:        q.Slug,
		Title:       q.Title,
		Description: q.Description,
		Category:    q.Category.String(),
		Locale:      q.Locale.String(),
		PublishedAt: q.CreatedAt.Format(time.RFC3339),
	}

	if q.PublishedAt != nil {
		summary.PublishedAt = q.PublishedAt.Format(timeFormat)
	}
	return summary
}

func newQuizResponse(q *pubquizr.Quiz) quizResponse {
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
		quizSummaryResponse: newQuizSummaryResponse(q, len(q.Questions)),
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
	Seat  int    `json:"seat"`
	Name  string `json:"name"`
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

	CurrentRound    int `json:"currentRound"`
	CurrentPosition int `json:"currentPosition"`
	QuizMasterSeat  int `json:"quizMasterSeat"`
	TotalRounds     int `json:"totalRounds"`
	// AnsweringSeat is whose turn it is to answer the current question, and null
	// when nobody is being asked anything -- a finished session, or a round this
	// build cannot play yet. Worked out here rather than by the app: it depends on
	// how many seats have already had a go, which only the server counts.
	AnsweringSeat *int `json:"answeringSeat"`
	// HotSeat is the seat the current question was first asked to. Sent so the app
	// can say who a wrong answer would pass it to: with the question able to start
	// anywhere, "has it been all the way round" is the distance back to here.
	HotSeat int `json:"hotSeat"`
	// HotSeatRun is how many questions in a row the hot seat has taken. Sent so the
	// board can put a number on the rule the round is built round -- take one and you
	// are asked the next -- rather than leaving it to be explained out loud.
	HotSeatRun int `json:"hotSeatRun"`

	Players   []quizSessionPlayerResponse   `json:"players"`
	Questions []quizSessionQuestionResponse `json:"questions"`

	CreatedAt string `json:"createdAt"`
}

// newQuizSessionResponse draws a session for the app. answeringSeat is passed in
// rather than worked out here because it needs the attempt count, which lives in the
// store; -1 means nobody is being asked.
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

	return quizSessionResponse{
		ID:              s.ID.String(),
		QuizID:          s.QuizID.String(),
		Mode:            string(s.Mode),
		Locale:          s.Locale.String(),
		Status:          string(s.Status),
		CurrentRound:    s.CurrentRound,
		CurrentPosition: s.CurrentPosition,
		QuizMasterSeat:  s.QuizMasterSeat,
		TotalRounds:     pubquizr.Rounds,
		AnsweringSeat:   asked,
		HotSeat:         s.HotSeatOrFirst(),
		HotSeatRun:      s.HotSeatRun,
		Players:         players,
		Questions:       questions,
		CreatedAt:       s.CreatedAt.Format(timeFormat),
	}
}

// --- handlers -------------------------------------------------------------

func (s *Server) handleListQuizzes(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	// The locale is not a nicety here. A quiz is written for one language, so a
	// list that ignored it would be offering most people questions they cannot
	// play. An explicit ?locale wins; otherwise Accept-Language decides.
	filter := pubquizr.QuizFilter{
		Locale:   localeFrom(query.Get("locale"), r),
		Category: pubquizr.Category(query.Get("category")),
		Page:     atoiOr(query.Get("page"), 1),
		PageSize: atoiOr(query.Get("pageSize"), pubquizr.DefaultPageSize),
	}

	page, err := s.pubquizr.ListQuizzes(r.Context(), filter)
	if err != nil {
		s.log.Error("list quizzes", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	items := make([]quizSummaryResponse, 0, len(page.Quizzes))
	for _, quiz := range page.Quizzes {
		items = append(items, newQuizSummaryResponse(quiz, page.Counts[quiz.ID]))
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
	quizID, err := uuid.Parse(r.PathValue("quizID"))
	if err != nil {
		// An unparseable id cannot name a quiz, and saying so is the same answer
		// as "there is no such quiz".
		writeError(w, http.StatusNotFound, "quiz not found")
		return
	}

	quiz, err := s.pubquizr.Quiz(r.Context(), quizID)
	if err != nil {
		s.writePubquizRError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, newQuizResponse(quiz))
}

type startSingleDeviceRequest struct {
	QuizID      string   `json:"quizId"`
	PlayerNames []string `json:"playerNames"`
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

// handleGetCurrentSingleDeviceSession answers with the evening this player left
// running, and 204 when there is none.
//
// The setup screen asks this before it draws a form whose only outcome would be
// destroying a game -- starting one throws every other session away. Same shape as
// League of Letters' /solo/current, so the two screens can ask their question the
// same way.
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

// handleDeleteSingleDeviceSession gives up on an evening, for good.
//
// The rows go rather than the status moving to abandoned, so there is nothing to read
// back afterwards. Answers 204 whether or not there was anything to delete: a session
// that is not this player's is the same answer as one that never existed.
func (s *Server) handleDeleteSingleDeviceSession(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := UserIDFrom(r.Context())
	if !ok {
		s.log.Error("handleDeleteSingleDeviceSession reached without an authenticated user")
		writeError(w, http.StatusInternalServerError, "something went wrong")
		return
	}

	sessionID, err := uuid.Parse(r.PathValue("sessionID"))
	if err != nil {
		// An unparseable id cannot name a session, which is the same answer as one
		// that is already gone.
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

type openVerdictRequest struct {
	SessionQuestionID string `json:"sessionQuestionId"`
	Correct           bool   `json:"correct"`
	// Said is what the player actually answered, if the quizmaster bothered to type
	// it in. Optional everywhere -- the verdict is the quizmaster's, not the text's.
	Said string `json:"said,omitempty"`
}

func (req openVerdictRequest) Validate() map[string]string {
	problems := map[string]string{}

	if strings.TrimSpace(req.SessionQuestionID) == "" {
		problems["sessionQuestionId"] = "is required"
	}

	return problems
}

// handleOpenVerdict is the quizmaster ruling on a round 1 answer.
//
// The body says which question and whether it was right, and nothing else. Who was
// answering, what it is worth and who reads next are all the game's own business --
// see VerdictInput.
func (s *Server) handleOpenVerdict(w http.ResponseWriter, r *http.Request) {
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

	req, problems, err := decode[openVerdictRequest](r)
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
		// An unparseable id cannot name the current question, which is the same
		// answer as naming one the table has moved past.
		writeErrorCode(w, http.StatusConflict, "stale_turn", "that question is no longer the current one")
		return
	}

	session, err := s.pubquizr.RecordOpenVerdict(r.Context(), pubquizr.VerdictInput{
		SessionID:         sessionID,
		OwnerID:           ownerID,
		SessionQuestionID: questionID,
		Correct:           req.Correct,
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
	default:
		s.log.Error("pubquizr", "err", err)
		writeError(w, http.StatusInternalServerError, "something went wrong")
	}
}

// atoiOr reads a query parameter that should be a number. Anything unreadable falls
// back rather than failing: a bad ?page is a link somebody mangled, not a request
// worth refusing, and the service clamps whatever comes through into range anyway.
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
