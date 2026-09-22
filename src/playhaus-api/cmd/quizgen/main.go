// Command quizgen writes one week of PubquizR and then exits: seven rounds from a
// language model, validated against the same rules the loader applies, into
// internal/pubquizr/data/{locale}/weekly/{slug}.json.
//
// It touches no database. The file it writes is the deliverable, and it reaches
// players two ways: cmd/quizseed puts it straight into the live database, and the
// commit puts it in the embed tree so the next ph-migrate seeds it too. Both hash
// the same bytes, so whichever runs second is a no-op.
//
// The second locale is a translation of the first rather than a second quiz. The
// two corpora are question for question the same quiz today, and -from is what
// keeps them so:
//
//	ANTHROPIC_API_KEY=... go run ./cmd/quizgen -locale nl -week 2026-w40
//	ANTHROPIC_API_KEY=... go run ./cmd/quizgen -locale en -from internal/pubquizr/data/nl/weekly/2026-w40.json
package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"playhaus-api/internal/config"
	"playhaus-api/internal/i18n"
	"playhaus-api/internal/quizgen"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "quizgen failed: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	locale := flag.String("locale", "", "language to write the quiz in: nl or en")
	week := flag.String("week", "", "ISO week to write, e.g. 2026-w40 (default: this week)")
	from := flag.String("from", "", "translate this already written quiz instead of writing a new one")
	out := flag.String("out", "internal/pubquizr/data", "directory to write into")
	force := flag.Bool("force", false, "replace a week that already exists")
	dryRun := flag.Bool("dry-run", false, "print the quiz and write nothing")
	flag.Parse()

	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	envFile, err := config.LoadDotEnv()
	if err != nil {
		return err
	}
	if envFile != "" {
		logger.Info("loaded environment file", "path", envFile)
	}

	wanted := i18n.Locale(*locale)
	if !wanted.Valid() {
		return fmt.Errorf("-locale is %q, want one of %s", *locale, i18n.Names())
	}

	apiKey := os.Getenv("ANTHROPIC_API_KEY")
	if apiKey == "" {
		return quizgen.ErrNoKey
	}

	// Cancelled on SIGTERM so an abandoned run stops between rounds rather than
	// paying for one it will not write.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	service := quizgen.NewService(apiKey, logger)

	var (
		writing quizgen.Week
		rounds  []quizgen.Round
	)
	if *from != "" {
		writing, rounds, err = translate(ctx, service, logger, *from, wanted, *week)
	} else {
		writing, rounds, err = write(ctx, service, logger, wanted, *week)
	}
	if err != nil {
		return err
	}

	quiz, err := quizgen.Assemble(writing, wanted, rounds)
	if err != nil {
		return err
	}

	if *dryRun {
		raw, err := quizgen.Encode(quiz)
		if err != nil {
			return err
		}
		_, err = os.Stdout.Write(raw)

		return err
	}

	file, err := quizgen.Write(*out, wanted, quiz, *force)
	if err != nil {
		return err
	}
	logger.Info("quiz written", "file", file, "week", writing.Slug(), "locale", wanted)

	return nil
}

func write(ctx context.Context, service *quizgen.Service, logger *slog.Logger, locale i18n.Locale, flagged string) (quizgen.Week, []quizgen.Round, error) {
	writing, err := weekFrom(flagged)
	if err != nil {
		return quizgen.Week{}, nil, err
	}

	corpus, err := quizgen.LoadCorpus(locale)
	if err != nil {
		return quizgen.Week{}, nil, err
	}
	logger.Info("writing a new quiz", "week", writing.Slug(), "locale", locale, "avoiding", len(corpus.Avoid()))

	rounds, err := service.Write(ctx, writing, locale, corpus)

	return writing, rounds, err
}

func translate(ctx context.Context, service *quizgen.Service, logger *slog.Logger, from string, locale i18n.Locale, flagged string) (quizgen.Week, []quizgen.Round, error) {
	if locale == i18n.Default {
		return quizgen.Week{}, nil, fmt.Errorf("-from translates out of %s, so -locale cannot be %s as well", i18n.Default, locale)
	}

	raw, err := os.ReadFile(from)
	if err != nil {
		return quizgen.Week{}, nil, fmt.Errorf("read %s: %w", from, err)
	}

	// A translation is always out of the default locale, which is what the prompt tells the model it is reading.
	writing, source, err := quizgen.ReadQuiz(raw, i18n.Default)
	if err != nil {
		return quizgen.Week{}, nil, fmt.Errorf("read %s: %w", from, err)
	}
	if flagged != "" {
		asked, err := quizgen.ParseWeek(flagged)
		if err != nil {
			return quizgen.Week{}, nil, err
		}
		if asked != writing {
			return quizgen.Week{}, nil, fmt.Errorf("-week is %s but %s is %s", asked.Slug(), from, writing.Slug())
		}
	}
	logger.Info("translating a quiz", "week", writing.Slug(), "from", from, "locale", locale)

	rounds, err := service.Translate(ctx, source, locale)

	return writing, rounds, err
}

func weekFrom(flagged string) (quizgen.Week, error) {
	if flagged == "" {
		return quizgen.ThisWeek(time.Now()), nil
	}

	return quizgen.ParseWeek(flagged)
}
