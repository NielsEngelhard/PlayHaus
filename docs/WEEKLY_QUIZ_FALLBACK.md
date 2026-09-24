# Fallback: write the weekly quiz by hand

`.github/workflows/weekly-quiz.yml` does this every Wednesday. This file is what to do when it
doesn't — the cron didn't fire, the run failed, or a week was missed and needs backfilling.

It is the same pipeline, run from a laptop. Nothing here writes questions itself: `cmd/quizgen`
calls the model, and the point of the fallback is the surrounding sequence.

Everything runs from `src/playhaus-api`.

## Before you start

- `ANTHROPIC_API_KEY` must be set, in the environment or in `src/playhaus-api/.env`. About €0.60 a
  week goes on the user's Anthropic bill, so **ask before running step 2** if they haven't already
  said to go ahead.
- The production connection string is only needed for step 5, and only if the quiz should be
  playable before the next Deploy API.

## 1. Work out which weeks are missing

```
ls internal/pubquizr/data/nl/weekly/ internal/pubquizr/data/en/weekly/
date -u +%G-w%V
```

The slug is `YYYY-wNN` **unpadded** — week 5 is `2026-w5`, not `2026-w05`, so strip the zero `date`
prints. Compare both locales: they can disagree, and `en` has historically run a week ahead.

Do one week at a time. If several are missing, finish one completely before starting the next.

## 2. Generate

Dutch first, then English as a translation of it. This order is not optional — the two locales are
question for question the same quiz, because the app switches language mid-session.

```
go run ./cmd/quizgen -locale nl -week 2026-w40
go run ./cmd/quizgen -locale en -from internal/pubquizr/data/nl/weekly/2026-w40.json
```

Seven calls per locale, one per round, each retried up to three times against the same validation
the loader applies. It writes nothing until all seven rounds pass, so a failure leaves no file.

`-dry-run` prints the quiz instead of writing it. Useful for reading one before committing to it;
it still costs the same.

**If a week already exists, `quizgen` refuses it.** Do not reach for `-force`: replacing a quiz
regenerates every question id and dangles anyone mid-game. Only use it when the existing week is
known-broken and nobody is playing.

## 3. Read round 3 and round 6

Nothing in the pipeline checks whether an answer is *true*. Validation checks shape.

- **Round 3** is eight numbers. A wrong one is the most visible failure in the game, because the
  scoring is "nearest wins" and the table argues about it.
- **Round 6** must be five `easy` and five `hard`, and the hard five pay four points against the
  easy one. Check no easy one is a fact everybody knows without thinking -- most of the table should
  get it and one or two miss it.
- Spot-check a handful of round 1 answers, preferring anything that sounds like a record, a total
  or a "first".

Fix a wrong answer by editing the JSON directly — both locales, same question, same position — then
re-run step 4.

## 4. Prove it loads

```
go test ./internal/pubquizr ./internal/quizgen
```

Needs `TEST_DATABASE_URL`. This is the gate that matters: `internal/pubquizr` seeds the whole corpus
through the real decoder and the real validator, which is exactly what `ph-migrate` does on deploy.
A file that fails here would stop the next Deploy API.

## 5. Commit, and seed if it should be playable today

```
git add internal/pubquizr/data/{nl,en}/weekly/2026-w40.json
git commit -m "PubquizR: weekly quiz 2026-w40"
git push
```

The commit puts the file in the embed tree, so the next Deploy API seeds it. That is enough if a
deploy is coming anyway.

To make it playable **now**, seed the live database directly:

```
DATABASE_URL='postgres://...' go run ./cmd/quizseed \
    internal/pubquizr/data/nl/weekly/2026-w40.json \
    internal/pubquizr/data/en/weekly/2026-w40.json
```

The variable has to be on the command line like that. `.env` holds the *local* database and a
variable already in the environment wins over the file — without the prefix you will quietly seed
your laptop. Ask the user for the string rather than looking for it, and keep it off any line that
ends up in a log.

Seeding twice is harmless: a quiz is stored under the SHA-256 of the exact bytes, so the second run
is a no-op, and so is the later `ph-migrate` over the same committed file.

## 6. Report

Say which week, which files, what the tests said, whether it was seeded or is waiting for a deploy,
and name anything in round 3 or round 6 you checked and were unsure about.
