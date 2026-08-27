# Word lists

Two lists per locale and length, both compiled into the binary by `//go:embed data`
in `words.go`.

| File | Role | Read by |
|---|---|---|
| `[lang]/[lang]-[size].txt` | **Answers.** A short curated pool of good puzzle words. | `GetRandomWords` |
| `[lang]/[lang]-[size]-allowed.txt` | **Guessable.** Every word a player may submit. | `IsAllowedWord` |

One lowercase word per line, no blank-line padding needed (blank lines are skipped).

## The allowed lists are empty placeholders

They ship empty on purpose. `IsAllowedWord` answers `true` for a locale+length whose
allowed list is missing or empty, which leaves the shape checks in `ValidGuess` as the
only rule on a guess. The answer files are ten-word placeholders, so a membership test
against those would reject nearly every real word a player typed — worse than not
checking at all.

**Dropping a real list into one of these files turns the check on for that locale and
length, with no code change.** The lists are cached on first read, so the process needs a
restart to pick up an edit.

Two rules when you fill them in:

- **Every answer must also be in the allowed list.** Otherwise the game draws a word its
  own validator refuses, and that round becomes unwinnable.
- Lowercase letters only, and the same length as the filename says. Anything else is
  rejected by `ValidGuess` before membership is ever checked, so it would be dead weight.

Sources worth considering: [OpenTaal](https://github.com/OpenTaal/opentaal-wordlist)
(Dutch, CC-BY 3.0 / BSD) and [SCOWL](http://wordlist.aspell.net/) or
[dwyl/english-words](https://github.com/dwyl/english-words) (English).
