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

	Players   []quizSessionPlayerResponse   `json:"players"`
	Questions []quizSessionQuestionResponse `json:"questions"`

	CreatedAt string `json:"createdAt"`
}

func newQuizSessionResponse(s *pubquizr.Session) quizSessionResponse {
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
	QuizID string `json:"quizId"`
	// PlayerNames are in seating order, left to right, because the phone gets
	// turned round the table as the quiz master role moves.
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

	writeJSON(w, http.StatusCreated, newQuizSessionResponse(session))
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

	writeJSON(w, http.StatusOK, newQuizSessionResponse(session))
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
