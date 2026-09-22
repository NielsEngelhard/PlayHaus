package quizgen

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"

	"playhaus-api/internal/i18n"
	"playhaus-api/internal/pubquizr"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
)

const (
	// Model is what a weekly quiz is worth: a wrong answer is read out to a table with nobody in between to catch it.
	Model = "claude-opus-5"
	// MaxTokens holds round 1 with its aliases, with adaptive thinking on top.
	MaxTokens = 16000
	// Attempts is how often one round is asked for before the run gives up and writes nothing at all.
	Attempts = 3

	toolName = "emit_round"
)

// Service writes rounds. It owns its client the way push.Service does, and reads no environment itself.
type Service struct {
	client anthropic.Client
	log    *slog.Logger
}

func NewService(apiKey string, log *slog.Logger) *Service {
	return &Service{
		client: anthropic.NewClient(option.WithAPIKey(apiKey)),
		log:    log,
	}
}

// Write is one whole week in one language, a round at a time so a bad round is retried alone.
func (s *Service) Write(ctx context.Context, week Week, locale i18n.Locale, corpus *Corpus) ([]Round, error) {
	rounds := make([]Round, 0, pubquizr.Rounds)

	for _, number := range Rounds() {
		spec, err := SpecFor(number)
		if err != nil {
			return nil, err
		}

		round, err := s.ask(ctx, locale, spec, askFor(spec, week, locale, corpus.Avoid()), corpus)
		if err != nil {
			return nil, fmt.Errorf("round %d: %w", number, err)
		}

		// Claimed as we go, so round 5 cannot ask what round 1 already asked.
		for _, prompt := range round.Prompts() {
			corpus.Take(prompt)
		}
		rounds = append(rounds, round)
	}

	return rounds, nil
}

// Translate is the same quiz in another language. The two locales are question for question the same quiz, and that is what keeps them so.
func (s *Service) Translate(ctx context.Context, rounds []Round, locale i18n.Locale) ([]Round, error) {
	translated := make([]Round, 0, len(rounds))

	for _, round := range rounds {
		spec, err := SpecFor(round.Round)
		if err != nil {
			return nil, err
		}

		source, err := json.MarshalIndent(round.canonical(), "", "  ")
		if err != nil {
			return nil, fmt.Errorf("round %d: %w", round.Round, err)
		}

		// No corpus: a translation is meant to repeat the round it came from.
		put, err := s.ask(ctx, locale, spec, translateFor(spec, locale, string(source)), nil)
		if err != nil {
			return nil, fmt.Errorf("round %d: %w", round.Round, err)
		}
		translated = append(translated, put)
	}

	return translated, nil
}

func (s *Service) ask(ctx context.Context, locale i18n.Locale, spec Spec, request string, corpus *Corpus) (Round, error) {
	tool := anthropic.ToolParam{
		Name:        toolName,
		Description: anthropic.String(fmt.Sprintf("Hand back %s, whole, in one call.", spec.Name)),
		Strict:      anthropic.Bool(true),
		InputSchema: spec.inputSchema(),
	}

	params := anthropic.MessageNewParams{
		Model:     Model,
		MaxTokens: MaxTokens,
		Thinking:  anthropic.ThinkingConfigParamUnion{OfAdaptive: &anthropic.ThinkingConfigAdaptiveParam{}},
		System: []anthropic.TextBlockParam{{
			Text:         systemFor(locale),
			CacheControl: anthropic.NewCacheControlEphemeralParam(),
		}},
		Tools:    []anthropic.ToolUnionParam{{OfTool: &tool}},
		Messages: []anthropic.MessageParam{anthropic.NewUserMessage(anthropic.NewTextBlock(request))},
	}

	var problem error
	for attempt := 1; attempt <= Attempts; attempt++ {
		message, err := s.send(ctx, params)
		if err != nil {
			return Round{}, err
		}
		params.Messages = append(params.Messages, message.ToParam())

		use, called := toolUse(message)
		if !called {
			problem = fmt.Errorf("no %s call came back, the turn stopped on %q", toolName, message.StopReason)
			params.Messages = append(params.Messages, anthropic.NewUserMessage(anthropic.NewTextBlock(retryFor(problem.Error()))))

			continue
		}

		round, err := spec.decode([]byte(use.JSON.Input.Raw()))
		if err == nil {
			err = round.check(corpus)
		}
		if err == nil {
			s.log.Info("round written",
				"round", spec.Round, "locale", locale, "attempt", attempt,
				"input_tokens", message.Usage.InputTokens,
				"output_tokens", message.Usage.OutputTokens,
				"cache_read_tokens", message.Usage.CacheReadInputTokens)

			return round, nil
		}

		problem = err
		s.log.Warn("round came back unusable", "round", spec.Round, "locale", locale, "attempt", attempt, "problem", err)
		params.Messages = append(params.Messages, anthropic.NewUserMessage(
			anthropic.NewToolResultBlock(use.ID, retryFor(err.Error()), true)))
	}

	return Round{}, fmt.Errorf("gave up after %d attempts: %w", Attempts, problem)
}

// send streams, because a round of twenty with aliases is long enough to sit near a request timeout.
func (s *Service) send(ctx context.Context, params anthropic.MessageNewParams) (anthropic.Message, error) {
	stream := s.client.Messages.NewStreaming(ctx, params)

	var message anthropic.Message
	for stream.Next() {
		if err := message.Accumulate(stream.Current()); err != nil {
			return anthropic.Message{}, fmt.Errorf("accumulate: %w", err)
		}
	}
	if err := stream.Err(); err != nil {
		return anthropic.Message{}, fmt.Errorf("ask: %w", err)
	}

	return message, nil
}

func toolUse(message anthropic.Message) (anthropic.ToolUseBlock, bool) {
	for _, block := range message.Content {
		if use, ok := block.AsAny().(anthropic.ToolUseBlock); ok && use.Name == toolName {
			return use, true
		}
	}

	return anthropic.ToolUseBlock{}, false
}

// inputSchema is the round's schema as the API takes it, with the closed-object rule strict tool use needs.
func (s Spec) inputSchema() anthropic.ToolInputSchemaParam {
	properties, _ := s.schema["properties"].(map[string]any)
	required, _ := s.schema["required"].([]string)

	return anthropic.ToolInputSchemaParam{
		Properties:  properties,
		Required:    required,
		ExtraFields: map[string]any{"additionalProperties": false},
	}
}

// ErrNoKey is what the command reports rather than letting the SDK fail on the first call.
var ErrNoKey = errors.New("ANTHROPIC_API_KEY is not set")
