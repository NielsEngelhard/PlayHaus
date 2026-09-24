# Prompt: write a new PubquizR quiz

**Weekly quizzes are not written by hand any more.** `.github/workflows/weekly-quiz.yml` runs every
Wednesday: `cmd/quizgen` writes the Dutch quiz, translates it into English, both files are validated
and committed, and `cmd/quizseed` puts them in the live database. To write one off schedule, dispatch
that workflow with a `week` input, or run it locally:

```
cd src/playhaus-api
ANTHROPIC_API_KEY=... go run ./cmd/quizgen -locale nl -week 2026-w40
ANTHROPIC_API_KEY=... go run ./cmd/quizgen -locale en -from internal/pubquizr/data/nl/weekly/2026-w40.json
```

The prompt the model is given lives in `internal/quizgen/prompt.go` and the round briefs in
`internal/quizgen/specs.go`. Change the quiz's character there, not here.

Everything below is for an **official** quiz -- a themed one-off, still written by hand. Hand this
file to an AI agent with read/write access to the repository, together with one line saying what you
want:

> Follow `docs/QUIZZER_QUIZ_PROMPT.md` and write an official quiz about Formula 1, slug `formula-1`.

---

## Your job

Write **two** JSON files -- one English, one Dutch -- holding the same quiz, and leave them
validated. A PubquizR quiz is seven rounds with a fixed shape; the loader is strict and a wrong key
or a miscounted round crashes the API at startup, so the shape is not negotiable.

Work in this order:

1. Read one existing official quiz as a formatting reference. **One** -- do not read the whole
   `data/` tree.
2. Draft the whole quiz in English, checking each answer against what already exists.
3. Translate to Dutch, adapting where a question does not survive the crossing.
4. Run the seed test.

## Where the files go

```
src/playhaus-api/internal/pubquizr/data/{locale}/{category}/{slug}.json
```

`locale` is `nl` or `en`. `category` is `weekly` or `official` -- never `community`, which the loader
refuses. Both come from the directory the file sits in and appear nowhere inside it, so a file can
never disagree with where it is filed.

An official quiz takes a kebab-case slug naming the theme (`taylor-swift`, `cold-war`,
`human-body`), a `publishedAt` of `YYYY-MM-DD`, and a one-sentence description of what it covers.
Every question is on the theme.

## The seven rounds

Counts are exact, and `pubquizr.QuestionsIn` in `internal/pubquizr/rules.go` is the only place they
are defined -- read it rather than trusting the numbers below if the two ever disagree.

| Round | What it is | Count | Keys |
|---|---|---|---|
| 1 | open trivia, read out and answered out loud | **20** | `prompt`, `category`, `answers` (exactly 1) |
| 2 | multiple choice, hard on purpose | **10** | `prompt`, `options` (exactly 4, exactly one `"correct": true`) |
| 3 | guess the number, nearest wins | **8** | `prompt`, `answer` (a number), `unit`, optional `explanation` |
| 4 | describe the word, the table guesses | **30** | plain strings under `words`, not questions |
| 5 | one question, four answers to find | **8** | `prompt`, `answers` (exactly 4) |
| 6 | double down: pick easy or hard before hearing it | **10** | `prompt`, `difficulty`, `answers` (exactly 1) -- **5 `easy` and 5 `hard`** |
| 7 | the finale, head to head | **7** | `prompt`, `answers` (exactly 1) |

Round by round:

- **Round 1** carries a free-text `category` label shown next to the question. On an official quiz
  use facets of the theme (`Albums`, `Tours`, `Songs`). Localise the label with the question.
- **Round 2** is meant to be harder than round 1. Make the three wrong options plausible and of the
  same kind as the right one -- four composers, four years, four cities -- never one real answer and
  three jokes.
- **Round 3** answers are numbers only. `unit` is the word shown after the number (`metres`,
  `minutes`, `albums`) and is left out for a year. Give one or two of them an `explanation`: a
  single sentence the quizmaster reads out after the answer. Zero is a legitimate answer.
- **Round 4** is a list of thirty words, not questions: `"words": ["Lighthouse", "Wheelbarrow", …]`.
  Pick concrete, describable things, never abstractions. One word or a short noun phrase.
- **Round 5** prompts are always "Name the four ..." / "Noem de vier ...", with exactly four answers
  a table could plausibly get between them.
- **Round 6** must be exactly five `easy` and five `hard`, paying one point and four. An easy one
  is still a question: most of the table gets it and one or two miss it -- a capital city, an
  element, the author of a book everybody has heard of. A fact every adult answers without thinking
  is not an easy question, it is a non-question, so never ask for the colour of grass, the legs on a
  cat, the sound a cow makes, the room you cook in, where bread is sold or the minutes in an hour.
  The hard five should be genuinely hard, because they pay four times as much.
- **Round 7** is the finale between the two highest scores. These are the seven hardest questions in
  the file, and not one of them is a warm-up.

`difficulty` may only appear in round 6. Anywhere else it is a validation error.

## Exact file shape

Only the keys below exist. The loader decodes with `DisallowUnknownFields`, so a misspelled key is a
crash, not a question that quietly goes missing.

- top level: `slug`, `title`, `publishedAt`, `description`, `rounds`
- round: `round`, and either `questions` or -- round 4 only -- `words`
- question: `prompt`, `category`, `explanation`, `difficulty`, `unit`, `answer`, `options`, `answers`
- option: `text`, `correct`
- answer: `text`, `aliases`

`aliases` are wordings that also count as correct and are **never shown on screen**. Add them for
spelled-out numbers (`Eight` / `8`), bare surnames (`Leonardo da Vinci` / `Da Vinci`) and dropped
articles (`The Nile` / `Nile`). Do not use them to smuggle in a second answer.

Formatting: two-space indent for the structure, **one question object per line**. Match this exactly
-- it is what every existing file looks like, it is what `quizgen.Encode` produces, and it keeps the
diffs readable.

```json
{
  "slug": "human-body",
  "title": "The human body",
  "description": "Bones, blood and everything in between.",
  "publishedAt": "2026-06-10",
  "rounds": [
    {
      "round": 1,
      "questions": [
        { "prompt": "Which is the longest bone in the human body?", "category": "Anatomy", "answers": [{ "text": "The femur", "aliases": ["Femur", "Thigh bone"] }] }
      ]
    },
    {
      "round": 2,
      "questions": [
        { "prompt": "Which organ produces insulin?", "options": [{ "text": "The pancreas", "correct": true }, { "text": "The liver" }, { "text": "The spleen" }, { "text": "The gallbladder" }] }
      ]
    },
    {
      "round": 3,
      "questions": [
        { "prompt": "How many bones does an adult human skeleton have?", "answer": 206, "unit": "bones", "explanation": "A newborn has about 300; a good many of them fuse on the way up." },
        { "prompt": "In what year was the first successful human heart transplant?", "answer": 1967 }
      ]
    },
    {
      "round": 4,
      "words": [
        "Kneecap",
        "Eyelash"
      ]
    },
    {
      "round": 5,
      "questions": [
        { "prompt": "Name the four chambers of the heart.", "answers": [{ "text": "Left atrium" }, { "text": "Right atrium" }, { "text": "Left ventricle" }, { "text": "Right ventricle" }] }
      ]
    },
    {
      "round": 6,
      "questions": [
        { "prompt": "How many lungs does a human have?", "difficulty": "easy", "answers": [{ "text": "Two" }] },
        { "prompt": "What is the medical name for the kneecap?", "difficulty": "hard", "answers": [{ "text": "Patella" }] }
      ]
    },
    {
      "round": 7,
      "questions": [
        { "prompt": "Which is the smallest bone in the human body?", "answers": [{ "text": "The stapes", "aliases": ["Stapes", "Stirrup"] }] }
      ]
    }
  ]
}
```

Abridged -- the real file carries the full counts from the table above.

## Both locales, one quiz

`en` and `nl` hold the same quiz: same slug, same rounds, same questions in the same order,
translated. Draft in English and translate, adapting where a question does not survive the crossing.
Adapt rather than translate literally when:

- the question is about a language, a measurement or a convention that differs;
- the answer has an established Dutch name (`Albus Dumbledore` / `Albus Perkamentus`);
- a Dutch-culture question would be unanswerable for an English-speaking table, or the reverse.

Aliases are per locale: `Nile` for `The Nile`, `Nijl` for `De Nijl`.

## Do not repeat questions

The corpus already carries the scars of skipping this -- one weekly asks in what year the Berlin
Wall fell in round 1 and asks it again in round 3, and another asks for the smallest country in the
world twice inside round 6.

The rule is about the **answer**, not the wording. Two questions with the same answer are the same
question however differently they are phrased.

1. No answer appears twice inside the new quiz. Not across rounds, not within one.
2. No round 4 word is reused from any existing quiz.
3. A question whose answer already exists elsewhere in the corpus is acceptable only when it comes
   at the fact from a genuinely different angle.
4. An official quiz will be forced into some overlap with quizzes on nearby themes, and that is
   fine. What is not fine is the same fact twice in one file, or a rerun of an existing quiz on the
   same theme.

`internal/quizgen/corpus.go` is how the generator enforces this: it normalises every shipped prompt
and refuses a round that repeats one. Grep the existing files on the answer you are about to use --
`grep -rl "Ulaanbaatar" internal/pubquizr/data/en` -- rather than trusting your own memory.

## Validate

```
cd src/playhaus-api
go test ./internal/pubquizr -run TestSeedLoadsEveryQuizThatShips
```

That test loads every shipped quiz through the real decoder and the real validator, so it is the
whole gate: unknown keys, exact round counts, the round 6 split, four options with exactly one
correct, four answers in round 5, empty answers. It needs `TEST_DATABASE_URL`. If it passes, the
files are good.

## Report back

Say which two files you wrote, the theme, and name any question you kept whose answer already
appears somewhere in the corpus.
