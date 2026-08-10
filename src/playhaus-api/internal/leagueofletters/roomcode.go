package leagueofletters

import "crypto/rand"

// Room codes are read aloud and typed in by hand, so the alphabet leaves out
// the pairs that get misheard or mistyped: no O/0, no I/1. What is left is
// exactly 32 characters, which is a power of two — so a random byte masked to
// five bits picks one without the modulo bias a 26- or 36-character alphabet
// would introduce.
const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

// CodeLength mirrors CODE_LENGTH in the app's JoinLeagueOfLettersGameCard.
const CodeLength = 6

// NewRoomCode returns a random room code. Uniqueness is not checked here — the
// unique index on Game.Code is what actually enforces it, and the caller
// retries on conflict. At 32^6 combinations that retry is close to never.
func NewRoomCode() (string, error) {
	buf := make([]byte, CodeLength)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}

	code := make([]byte, CodeLength)
	for i, b := range buf {
		code[i] = codeAlphabet[b&31]
	}

	return string(code), nil
}
