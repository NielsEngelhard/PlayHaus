# Prompt: write a new PubquizR quiz

Hand this whole file to an AI agent that has read/write access to this repository, together with
one line saying what you want:

> Follow `docs/QUIZZER_QUIZ_PROMPT.md` and write the weekly quiz for 2026 week 35.

> Follow `docs/QUIZZER_QUIZ_PROMPT.md` and write an official quiz about Formula 1, slug `formula-1`.

Everything below is addressed to that agent.

---

## Your job

Write **two** JSON files -- one English, one Dutch -- holding the same quiz, and leave them
validated. A PubquizR quiz is seven rounds with a fixed shape; the loader is strict and a wrong key
or a miscounted round crashes the API at startup, so the shape is not negotiable.

Work in this order. It is the cheap order: the index in step 1 is what keeps you from writing 70
questions and then discovering half of them already exist.

1. Build the duplicate index (one command).
2. Read one existing quiz of the same category as a formatting reference. **One** -- do not read
   the whole `data/` tree.
3. Draft all 70 questions in English, checking each answer against the index as you go.
4. Write both files.
5. Run the checker, fix what it flags, run the seed test.

## 1. Build the duplicate index

Write this to a scratch file and run it from `src/playhaus-api/internal/pubquizr/data`:

```python
# pq-index.py -- every answer already used, grouped by round
import collections, glob, json, sys

pattern = sys.argv[1] if len(sys.argv) > 1 else 'en/*/*.json'
answers, words = collections.defaultdict(set), set()

def key(q):
    if 'answers' in q:
        return ' + '.join(a['text'] for a in q['answers'])
    if 'options' in q:
        return next(o['text'] for o in q['options'] if o.get('correct'))
    return '%s %s' % (q['answer'], q.get('unit', ''))

for f in sorted(glob.glob(pattern)):
    for r in json.load(open(f, encoding='utf-8'))['rounds']:
        for q in r['questions']:
            words.add(q['prompt']) if r['round'] == 4 else answers[r['round']].add(key(q))

for n in sorted(answers):
    print('== round %d (%d answers already used) ==' % (n, len(answers[n])))
    print(' ; '.join(sorted(answers[n])))
print('== round 4 words already used (%d) ==' % len(words))
print(' ; '.join(sorted(words)))
```

```
python pq-index.py "en/*/*.json" > pq-index.txt
```

Index the English side only: the Dutch files are translations of the same questions, so they carry
no topics the English files do not. Read `pq-index.txt` once and keep it in mind while drafting. It
is about 30 KB, and that is the whole cost of not repeating yourself.

For an official quiz, also run it narrowed to the neighbouring shelf:
`python pq-index.py "en/official/*.json"`.

## 2. Where the files go

```
src/playhaus-api/internal/pubquizr/data/{locale}/{category}/{slug}.json
```

`locale` is `nl` or `en`. `category` is `weekly` or `official` -- never `community`, which the
loader refuses. The locale and the category come from the directory the file sits in and appear
nowhere inside it, so a file can never disagree with where it is filed.

**Weekly quiz** -- slug `YYYY-wNN` (`2026-w35`). Leave `publishedAt` out: the loader derives the
Wednesday of that ISO week from the slug. Title and description follow the house pattern:

| | `en` | `nl` |
|---|---|---|
| title | `Weekly quiz 35 2026` | `Weekquiz 35 2026` |
| description | `The weekly quiz of Wednesday 26 August 2026.` | `De wekelijkse quiz van woensdag 26 augustus 2026.` |

A weekly is general knowledge across the board -- no theme.

**Official quiz** -- kebab-case slug naming the theme (`taylor-swift`, `cold-war`, `human-body`), a
`publishedAt` of `YYYY-MM-DD`, and a one-sentence description of what the quiz covers. Every
question is on the theme.

## 3. The seven rounds

Counts are exact. Every one of the 51 quizzes on disk uses these numbers, and round 6's five/five
split is enforced by the loader.

| Round | What it is | Questions | Keys on each question |
|---|---|---|---|
| 1 | open trivia, read out and answered out loud | **20** | `prompt`, `category`, `answers` (exactly 1) |
| 2 | multiple choice, hard on purpose | **14** | `prompt`, `options` (exactly 4, exactly one `"correct": true`) |
| 3 | guess the number, nearest wins | **8** | `prompt`, `answer` (a number), `unit`, optional `explanation` |
| 4 | describe the word, the table guesses | **16** | `prompt` only |
| 5 | one question, four answers to find | **8** | `prompt`, `answers` (exactly 4) |
| 6 | double down: pick easy or hard before hearing it | **10** | `prompt`, `difficulty`, `answers` (exactly 1) -- **5 `easy` and 5 `hard`** |
| 7 | the finale, head to head | **6** | `prompt`, `answers` (exactly 1) |

Round by round:

- **Round 1** carries a free-text `category` label shown next to the question (`Geography`, `Music`,
  `Film`, `Sport`, `The Netherlands` / `Aardrijkskunde`, `Muziek`, `Film`, `Sport`, `Nederland`).
  Localise the label with the question. On a weekly, spread the twenty over eight or more different
  categories; on an official quiz use facets of the theme (`Albums`, `Tours`, `Songs`).
- **Round 2** is meant to be harder than round 1. Make the three wrong options plausible and of the
  same kind as the right one -- four composers, four years, four cities -- never one real answer and
  three jokes.
- **Round 3** answers are numbers only. `unit` is the word shown after the number (`metres`,
  `minutes`, `albums`) and is `""` for a year. Give one or two of them an `explanation`: a single
  sentence the quizmaster reads out after the answer.
- **Round 4** has no answers at all -- the prompt *is* the word being described. Pick concrete,
  describable things (`Lighthouse`, `Wheelbarrow`, `Ice skates`), never abstractions. One word or a
  short noun phrase.
- **Round 5** prompts are always "Name the four ..." / "Noem de vier ...", with exactly four answers
  a table could plausibly get between them.
- **Round 6** must be exactly five `easy` and five `hard`. The easy five should be gettable by
  anyone; the hard five should be genuinely hard, because they pay triple.
- **Round 7** is the finale between the two highest scores. These are the six hardest questions in
  the file.

`difficulty` may only appear in round 6. Anywhere else it is a validation error.

## 4. Exact file shape

Only the keys below exist. The loader decodes with `DisallowUnknownFields`, so a misspelled key is
a crash, not a question that quietly goes missing.

- top level: `slug`, `title`, `publishedAt`, `description`, `rounds`
- round: `round`, `questions`
- question: `prompt`, `category`, `explanation`, `difficulty`, `unit`, `answer`, `options`, `answers`
- option: `text`, `correct`
- answer: `text`, `aliases`

`aliases` are wordings that also count as correct and are **never shown on screen**. Add them for
spelled-out numbers (`Eight` / `8`), bare surnames (`Leonardo da Vinci` / `Da Vinci`) and dropped
articles (`The Nile` / `Nile`). Do not use them to smuggle in a second answer.

Formatting: two-space indent for the structure, **one question object per line**. Match this exactly
-- it is what every existing file looks like and it keeps the diffs readable.

```json
{
  "slug": "2026-w24",
  "title": "Weekly quiz 24 2026",
  "description": "The weekly quiz of Wednesday 10 June 2026.",
  "rounds": [
    {
      "round": 1,
      "questions": [
        { "prompt": "What is the longest river in Africa?", "category": "Geography", "answers": [{ "text": "The Nile", "aliases": ["Nile"] }] },
        { "prompt": "How many legs does a spider have?", "category": "Nature", "answers": [{ "text": "Eight", "aliases": ["8"] }] }
      ]
    },
    {
      "round": 2,
      "questions": [
        { "prompt": "Who wrote the novel Crime and Punishment?", "options": [{ "text": "Dostoevsky", "correct": true }, { "text": "Tolstoy" }, { "text": "Chekhov" }, { "text": "Gogol" }] }
      ]
    },
    {
      "round": 3,
      "questions": [
        { "prompt": "How tall was the Eiffel Tower when it opened in 1889, in metres?", "answer": 312, "unit": "metres", "explanation": "Just over three hundred metres, and the tallest structure in the world for forty years." },
        { "prompt": "In what year was the telephone patented?", "answer": 1876, "unit": "" }
      ]
    },
    {
      "round": 4,
      "questions": [
        { "prompt": "Lighthouse" },
        { "prompt": "Wheelbarrow" }
      ]
    },
    {
      "round": 5,
      "questions": [
        { "prompt": "Name the four suits in a deck of cards.", "answers": [{ "text": "Hearts" }, { "text": "Diamonds" }, { "text": "Clubs" }, { "text": "Spades" }] }
      ]
    },
    {
      "round": 6,
      "questions": [
        { "prompt": "Which planet is known as the Red Planet?", "difficulty": "easy", "answers": [{ "text": "Mars" }] },
        { "prompt": "Which element has the chemical symbol W?", "difficulty": "hard", "answers": [{ "text": "Tungsten", "aliases": ["Wolfram"] }] }
      ]
    },
    {
      "round": 7,
      "questions": [
        { "prompt": "What is the capital of Mongolia?", "answers": [{ "text": "Ulaanbaatar", "aliases": ["Ulan Bator"] }] }
      ]
    }
  ]
}
```

Abridged -- the real file carries the full counts from the table above.

## 5. Both locales, one quiz

`en` and `nl` hold the same quiz: same slug, same rounds, same questions in the same order,
translated. Draft in English and translate, adapting where a question does not survive the crossing
-- w24 asks how many letters are in the English alphabet in `en` and in the Dutch alphabet in `nl`,
with different answers. Adapt rather than translate literally when:

- the question is about a language, a measurement or a convention that differs;
- the answer has an established Dutch name (`Albus Dumbledore` / `Albus Perkamentus`);
- a Dutch-culture question would be unanswerable for an English-speaking table, or the reverse.

Aliases are per locale: `Nile` for `The Nile`, `Nijl` for `De Nijl`.

## 6. Do not repeat questions

This is the part that matters most. The corpus already carries the scars of skipping it -- one
weekly asks in what year the Berlin Wall fell in round 1 and asks it again in round 3, and another
asks for the smallest country in the world twice inside round 6.

The rule is about the **answer**, not the wording. Two questions with the same answer are the same
question however differently they are phrased.

1. No answer appears twice inside the new quiz. Not across rounds, not within one.
2. No round 4 word is reused from any existing quiz.
3. A question whose answer is already in `pq-index.txt` is acceptable only when it comes at the fact
   from a genuinely different angle. Aim for under ~5% of a weekly's answers colliding at all.
4. An official quiz will be forced into some overlap with quizzes on nearby themes, and that is
   fine. What is not fine is the same fact twice in one file, or a rerun of an existing quiz on the
   same theme.

Then verify it mechanically rather than trusting your own memory. Write this out and run it from
`src/playhaus-api/internal/pubquizr/data`:

```python
# pq-check.py -- shape errors, and answers that already exist
import collections, glob, json, re, sys

new, pattern = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else 'en/*/*.json')
COUNTS = {1: 20, 2: 14, 3: 8, 4: 16, 5: 8, 6: 10, 7: 6}
STOP = set('what which welk welke who wie where waar when wanneer year jaar many hoeveel does deze this that with from name noem four vier called heet did was were have heeft hebben your world'.split())
slash = lambda p: p.replace(chr(92), '/')

def norm(s):
    s = re.sub('[^a-z0-9 ]', ' ', str(s).lower())
    return ' '.join(w for w in s.split() if w not in ('the', 'de', 'het', 'een', 'a', 'an'))

def words(prompt):
    return {w for w in norm(prompt).split() if len(w) > 3 and w not in STOP}

def overlap(a, b):
    wa, wb = words(a), words(b)
    return len(wa & wb) / max(1, min(len(wa), len(wb)))

def answer(q):
    if 'answers' in q:
        return ' + '.join(a['text'] for a in q['answers'])
    if 'options' in q:
        return next(o['text'] for o in q['options'] if o.get('correct'))
    return str(q.get('answer', ''))

def entries(files):
    for f in files:
        for r in json.load(open(f, encoding='utf-8'))['rounds']:
            for q in r['questions']:
                yield norm(q['prompt'] if r['round'] == 4 else answer(q)), q['prompt'], '%s r%d' % (slash(f), r['round']), r['round']

corpus = collections.defaultdict(list)
for key, prompt, where, _ in entries([f for f in sorted(glob.glob(pattern)) if slash(f) != slash(new)]):
    corpus[key].append((prompt, where))

quiz = json.load(open(new, encoding='utf-8'))
for r in quiz['rounds']:
    got = len(r['questions'])
    if got != COUNTS.get(r['round']):
        print('SHAPE     round %d has %d questions, wants %d' % (r['round'], got, COUNTS.get(r['round'])))
    if r['round'] == 6:
        split = collections.Counter(q.get('difficulty') for q in r['questions'])
        if split['easy'] != 5 or split['hard'] != 5:
            print('SHAPE     round 6 split is %s, wants 5 easy and 5 hard' % dict(split))
    for q in r['questions']:
        if r['round'] == 2 and sum(1 for o in q['options'] if o.get('correct')) != 1:
            print('SHAPE     round 2 %r has no single correct option' % q['prompt'])

mine = collections.defaultdict(list)
for key, prompt, _, round_ in entries([new]):
    mine[key].append((prompt, round_))

hard = 0
for key, uses in sorted(mine.items()):
    for i, (prompt, round_) in enumerate(uses):
        for other, other_round in uses[i + 1:]:
            if round_ == 4 or overlap(prompt, other) >= 0.5:
                print('INTERNAL  r%d %r == r%d %r' % (round_, prompt, other_round, other))
    for prompt, round_ in uses:
        near = sorted(((overlap(prompt, p), p, where) for p, where in corpus.get(key, [])), reverse=True)
        if near and (round_ == 4 or near[0][0] >= 0.5):
            hard += 1
            print('DUPLICATE r%d %r -- %s says %r' % (round_, prompt, near[0][2], near[0][1]))
        elif near:
            print('related   r%d %r -- same answer in %s' % (round_, prompt, near[0][2]))
print('--- %d duplicates to replace' % hard)
```

```
python pq-check.py en/weekly/2026-w35.json "en/*/*.json"
python pq-check.py nl/weekly/2026-w35.json "nl/*/*.json"
```

How to read it:

- `SHAPE` -- a counting error. Fix it.
- `INTERNAL` -- the same answer twice in your own file. Always fix.
- `DUPLICATE` -- the answer exists and the wording is close. Replace the question.
- `related` -- the answer exists but the question comes at it differently. Judge it: keep a handful
  at most, and replace them where the replacement is easy.

Replace, then run it again. The English and Dutch files are the same quiz, so a replacement in one
is a replacement in both.

## 7. Validate

```
cd src/playhaus-api
go test ./internal/pubquizr -run TestSeedLoadsEveryQuizThatShips
```

That test loads every shipped quiz through the real decoder and the real validator, so it is the
whole gate: unknown keys, round counts, the round 6 split, four options with exactly one correct,
four answers in round 5, empty answers. If it passes, the files are good.

## 8. Report back

Say which two files you wrote, the theme or week, what the checker's final count was, and name
anything you deliberately kept that it flagged as `related`.
