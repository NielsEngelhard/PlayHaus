export const en = {
    /** Words that turn up on more than one screen, so they are written once. */
    common: {
        retry: 'Try again',
        back: 'Back',
        backToGames: 'Back to games',
        busy: 'Working…',
        failed: 'Failed',
        close: 'Close',
        save: 'Save',
        you: 'You',
        host: 'Host',
        loading: 'One moment…',
        language: 'Language',
        selectValue: '{{label}}: {{value}}',
        nothingSelected: 'nothing selected',
        change: 'change',
        minutes: 'min',
        start: 'Start',
        time: {
            justNow: 'just now',
            minutesAgo: '{{minutes}} min ago',
            hoursAgo: '{{hours}} hr ago',
            yesterday: 'yesterday',
            daysAgo: '{{days}} days ago',
            onDate: 'on {{day}} {{month}} {{year}}',
            months: {
                jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr',
                may: 'May', jun: 'Jun', jul: 'Jul', aug: 'Aug',
                sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec'
            },
            days: {
                mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
                fri: 'Fri', sat: 'Sat', sun: 'Sun'
            }
        },
        player: {
            players: "Players",
            add: "Add player",
            remove: "Remove player",
            namePlaceholder: "Name"
        }
    },
    nav: {
        games: 'Games',
        reconnect: 'Reconnect',
        friends: 'Friends',
        profile: 'Profile'
    },
    chrome: {
        toDarkMode: 'Switch to dark mode',
        toLightMode: 'Switch to light mode',
        muteMusic: 'Turn the music off',
        unmuteMusic: 'Turn the music on',
        signedInAs: 'Signed in as {{name}}. Go to your profile.'
    },
    home: {
        headline: {
            title: 'Tiny games,',
            accent: 'serious fun.'
        },
        subtitle: 'Party games made for you and your friends. Pick one and play!',
        stillRunning: {
            label: 'Still going',
            /** Punctuation only, so the separator is the translator's to change. */
            line: '{{title}} · {{mode}} {{time}}'
        },
        join: {
            /** Sits in the empty field. The word for a lobby code, in caps. */
            placeholder: 'CODE',
            action: 'Join',
            /** Names the field for anyone who cannot see the placeholder. */
            label: 'Lobby code'
        },
        /** Heads the list of games, under the ways back into one you already have. */
        startNew: 'Start something new',
        bottomTeaser: "More party games coming soon...",
    },
    games: {
        device: {
            perPlayer: '1 per player',
            oneDevice: '1 total',
            perPlayerOrOneDevice: 'choice'
        },
        leagueOfLetters: {
            description: 'Hunt the hidden word. Solo, or humiliate your friends.',
            mainCategory: 'Word guessing',
        },
        quizzer: {
            description: 'Your own mini pub quiz. Who knows it all?.',
            mainCategory: 'Trivia'
        },
        oneOfUs: {
            description: 'Unravel who the imposter is.',
            mainCategory: 'Bluff'
        },
        fakeFiller: {
            description: 'Invent a wrong answer.',
            mainCategory: 'Deception',
        },
        sketchOff: {
            description: 'Who can draw best?',
            mainCategory: 'Creative',
        },           
        newBadge: 'New',
        wipBadge: 'In the making'
    },
    /**
     * Only the descriptions. The names themselves stay endonyms in `LANGUAGES` and are
     * never translated, so someone who cannot yet read the current interface language can
     * still find their own.
     */
    /*
     * The join card, which is not any one game's.
     *
     * These lived under `lol.index` until the first character of a code started naming
     * the game, because the card only ever opened League of Letters rooms. It is mounted
     * on three pages now and only one of them is that game, so the old key was a lie
     * about which screen the words appear on.
     */
    join: {
        label: 'JOIN A GAME',
        /**
         * The same card, split in two on a wide screen: the boxes are only half
         * of it there, so the label names its own half rather than the card.
         */
        labelWide: 'TYPE THE CODE',
        paste: 'Paste',
        pasteLabel: 'Paste code',
        codeLabel: 'Join code',
        /**
         * The chip beside the boxes, as soon as the first character is in.
         *
         * The real defence against `O` and `0`: you find out the first character landed
         * where you meant it before you have typed the second, rather than off a refusal
         * five characters later.
         */
        gameHint: 'Joining {{game}}',
        /**
         * A whole code that opens nothing — an unclaimed first character, a game with no
         * rooms yet, or a character in the body that no code contains.
         *
         * One phrase for all three, because they are one thing to the person holding the
         * phone: five characters that do not open anything. Saying which would mean
         * explaining that a game has a letter reserved for a feature it does not have.
         */
        rejected: "That isn't a code we can open. Check it and try again.",
        scanRowTitle: 'Or scan their screen',
        scanRowHint: 'Joins instantly',
        scanAction: 'Scan instead',
        scanCopy: "Point your phone at the host's code",
        scanTitle: 'Scan to join',
        scanLabel: 'Scan a QR code to join a game',
        scanCancel: 'Cancel',
        permissionAsk: 'The camera is needed to read the host’s code. Nothing is recorded or sent anywhere.',
        permissionGrant: 'Allow the camera',
        /**
         * No button under this one: the answer has to be changed in settings.
         *
         * The count is deliberately not named. It said "the four characters" and codes are
         * five now, which is the kind of sentence that goes quietly wrong the moment a
         * number moves and nobody thinks to grep the catalogue for it.
         */
        permissionDenied: 'The camera is blocked for this app. Allow it in your settings, or type the code instead.'
    },
    languages: {
        nl: { description: 'Words from the Dutch list.' },
        en: { description: 'Words from the English list.' }
    },
    auth: {
        login: {
            title: 'Log in',
            email: 'Email',
            emailPlaceholder: 'you@example.com',
            password: 'Password',
            passwordPlaceholder: 'Your password',
            submit: 'Log in',
            submitting: 'Signing in…',
            signupPrompt: 'No account yet? Sign up'
        },
        signup: {
            title: 'Sign up',
            name: 'Player name',
            namePlaceholder: 'Your name',
            email: 'Email',
            emailPlaceholder: 'you@example.com',
            password: 'Password',
            passwordPlaceholder: 'Pick a password',
            submit: 'Create account',
            submitting: 'Creating…',
            nameNote: 'This is the name other players see in a lobby. You can change it later in your profile.',
            invalidEmail: 'That does not look like an email address.'
        },
        guestLanguage: {
            title: 'Welcome to Playhaus',
            description: 'Pick the language you want to play in.',
            note: 'Picking a language will sign you up as a guest user. You can later upgrade your account for free to a regular user.',
            login: 'Already have an account? Log in'
        },
        errors: {
            invalidCredentials: 'That email and password do not match an account.',
            emailInUse: 'That email address is already in use.',
            generic: 'Something went wrong. Please try again.',
            network: 'Could not reach the server. Check your connection and try again.'
        }
    },
    profile: {
        loading: 'Loading your profile…',
        card: { action: 'My profile', caption: 'This is you, handsome!' },
        name: {
            label: 'Player name',
            placeholder: 'Your name',
            random: 'Random name',
            note: 'Min {{min}}, max {{max}} characters. This is what other players see in a lobby.'
        },
        avatar: { title: 'Avatar colour' },
        colors: {
            lemon: 'Lemon',
            fire: 'Fire',
            cobalt: 'Cobalt',
            mint: 'Mint',
            blush: 'Blush',
            ink: 'Ink'
        },
        settings: {
            title: 'Settings',
            sounds: { title: 'Sound', description: 'A soft pop on every tap.' },
            music: { title: 'Music', description: 'Background music in the lobby and while you play.' },
            vibration: { title: 'Vibration', description: 'Short haptic feedback on mobile.' }
        },
        guest: {
            title: 'Guest account',
            message: 'You are playing as a guest. This account is temporary: your name, colour and played games can be lost once this session ends. Add an email and a password to keep them for good.',
            action: 'Make it permanent'
        },
        upgrade: {
            title: 'Keep your account',
            description: 'Add an email and a password and this account becomes permanent. Your name, colour and games all stay exactly as they are.',
            email: 'Email',
            emailPlaceholder: 'you@example.com',
            password: 'Password',
            passwordPlaceholder: 'Pick a password',
            submit: 'Make it permanent',
            submitting: 'Saving…',
            note: 'From then on you log in with this email and password on any device.',
            invalidEmail: 'That does not look like an email address.',
            shortPassword: 'Your password needs at least 8 characters.'
        },
        logout: 'Log out',
        errors: {
            expired: 'Your session has expired. Log in again.',
            generic: 'Something went wrong. Please try again.',
            network: 'Could not reach the server. Check your connection and try again.'
        }
    },
    reconnect: {
        hero: {
            title: 'Join a game', accent: 'with a code',
            resume: { title: 'Pick up', accent: 'where you left off' }
        },
        loading: 'Looking for your games…',
        stillRunning: 'Still running',
        orJoin: 'Or join a game',
        nothingRunning: 'Nothing running',
        updated: 'Updated {{time}}',
        resume: 'Continue playing {{game}}',
        refresh: { label: 'Check for games again', action: 'Check again' },
        empty: {
            title: 'No games left running',
            message: 'Anything you walk out of halfway shows up here, ready to walk back into.'
        },
        mode: { solo: 'Solo', lobby: 'Lobby', oneDevice: 'One device' },
        errors: {
            expired: 'Your session has expired. Log in again.',
            generic: 'Something went wrong while fetching your games. Please try again.',
            network: 'Could not reach the server. Check your connection and try again.'
        }
    },
    /**
     * The waiting room's own words, shared by every game that has one.
     *
     * Its own namespace rather than a corner of `lol` because the room is chrome now: a
     * second game's lobby draws the same bar, the same code band and the same seat grid
     * through `LobbyPageBase`, and those pieces would otherwise be reading a neighbour's
     * catalogue. What stays under `lol.lobby` is only what League of Letters itself says.
     */
    lobby: {
        yourRoom: 'Your room',
        named: 'Lobby {{code}}',
        live: 'Live',
        offline: 'Offline',
        disconnected: 'Lost the connection to the lobby',
        close: 'Close the lobby',
        leave: 'Leave the lobby',
        joinCode: 'Join code',
        code: 'Lobby code',
        codeSpoken: 'Lobby code: {{characters}}',
        copyCode: 'Copy lobby code {{characters}}',
        copied: 'Copied',
        readAloud: 'Read it out, or let them scan it.',
        shareTitle: 'Join my lobby',
        shareLink: 'Share link',
        shareLinkLabel: 'Share the link to this lobby',
        linkCopied: 'Link copied',
        shareFailed: 'Sharing did not work',
        qrLabel: 'Show a QR code to join this lobby',
        qrTitle: 'Scan to join',
        qrCopy: 'Hold another phone up to this and it lands straight in the lobby.',
        players: 'Players',
        playerCount: '{{taken}} of {{max}}',
        inLobby: 'In the lobby',
        hostYou: 'HOST · YOU',
        hostTag: 'HOST',
        ready: 'Ready',
        away: 'Away',
        freeSeat: 'Free seat',
        waiting: 'Waiting…'
    },
    lol: {
        index: {
            description: 'Test your vocabulary, challenge your friends, and try to guess the secret word before you run out of chances. Play solo or against your enemies.',
            playingAs: 'Playing as {{name}}',
            solo: { title: 'Solo', description: 'Three rounds, your rules.', action: 'Set up' },
            multiplayer: { title: 'Multiplayer', description: 'Race against your friends.', action: 'Open' }
        },
        settings: {
            loading: 'Looking for your game…',
            /** Sits under the game's own name in the card's header, so it names the mode. */
            title: 'Solo setup',
            wordLength: 'Word length',
            wordLengthOption: '{{letters}} letters',
            /** The settings card's one line while it is shut. See `LobbySettingsCard`. */
            summary: {
                seconds: '{{seconds}}s',
                hardOn: 'Hard mode',
                hardOff: 'Normal'
            },
            hardMode: {
                label: 'Hard mode',
                description: 'The word can be any existing word in the language. Switch it off to play with an easier set of words.'
            },
            facts: '{{rounds}} rounds · {{guesses}} guesses per round · first letter given',
            start: 'Start playing',
            running: {
                title: 'You are already playing',
                message: 'A solo game is still open. Continue where you left off, or throw it away and set up a new one.',
                resume: 'Continue playing',
                discard: 'Throw it away'
            }
        },
        game: {
            loading: 'Loading game…',
            loadFailed: 'This game could not be loaded.',
            guessUnsupported: 'Guessing works as soon as the server supports it.',
            alreadyGuessedYou: 'You tried that one already.',
            alreadyGuessed: 'That one has been tried already.',
            resultLabel: 'Result',
            viewResult: 'View the result',
            nextRound: 'Next round',
            guesses: 'Guesses: {{guesses}}',
            roundOf: 'Round {{round}} of {{total}}',
            hint: 'Hint',
            hintLabel: 'Hint: the word starts with {{letter}}',
            solved: 'SOLVED',
            lost: 'BAD LUCK',
            theWord: 'The word',
            attempts: 'Guesses',
            guess: 'Guess',
            clear: 'Clear',
            timeLeft: 'Time left',
            yourTurn: 'YOUR TURN',
            typing: 'typing…'
        },
        results: {
            loading: 'Loading the result…',
            loadFailed: 'The result could not be loaded.',
            title: 'Game over',
            summary: 'Rounds: {{rounds}} · Letters: {{length}}',
            again: 'Once more'
        },
        lobby: {
            loading: 'Looking for your lobby…',
            opening: 'Opening the lobby…',
            noGame: 'No game',
            noLobby: 'No lobby',
            hostStoppedGame: 'The host stopped the game. Ask for a new code for another round.',
            hostClosedLobby: 'The host closed the lobby. Ask for a new code.',
            running: {
                gameTitle: 'You are already playing',
                lobbyTitle: 'You still have a lobby open',
                gameMessage: 'You are still playing a multiplayer game in lobby {{code}}. Continue, or stop the game and open a new lobby.',
                lobbyMessage: 'Lobby {{code}} is still open in your name. Go back to it, or close it and open a new one.',
                resumeGame: 'Continue playing',
                resumeLobby: 'Go to open lobby',
                stopGame: 'Stop game',
                closeLobby: 'Stop game and create new'                
            },
            confirmClose: {
                title: 'Close the lobby?',
                message: 'The lobby is deleted and the code stops working. Everyone already in it is thrown out.',
                action: 'Close'
            },
            confirmLeave: {
                title: 'Leave the lobby?',
                message: 'You go back to the game menu. You can join again later with the same code.',
                action: 'Leave'
            },
            stay: 'Stay here',
            start: 'Start the game',
            startNote: 'Once you start, nobody else can join.',
            needPlayers: 'You need at least one other player.',
            hostFallback: 'The host',
            settingsTitle: 'Game settings',
            timePerTurn: 'Time per turn',
            timePerTurnOption: '{{seconds}} seconds',
            waitingForHost: 'Waiting for the host',
            waitingForHostMessage: '{{name}} is setting up the game. Stay on this screen and it starts right here.',
            waitingLabel: 'Waiting',
            closedTitle: 'Lobby closed',
            results: {
                title: 'Game over',
                tie: 'A tie at {{score}} points.',
                youWin: 'You win with {{score}} points.',
                playerWins: '{{name}} wins with {{score}} points.',
                againSamePlayers: 'Once more, same players',
                autoJoin: 'Everyone still on this screen is taken along to the new lobby automatically.',
                anotherRound: 'Another round?',
                hostCanOpen: 'The game is done. The host can open a new lobby. Stay here and you come along automatically.'
            }
        },
        errors: {
            staleServer: 'The server is running an older version of this game. Restart the API and try again.',
            expired: 'Your session has expired. Log in again.',
            gameGone: 'This game no longer exists.',
            badSettings: 'These settings do not work. Pick a different word length.',
            generic: 'Something went wrong. Please try again.',
            network: 'Could not reach the server. Check your connection and try again.',
            invalidWord: 'Not a valid word.',
            roundClosed: 'This round is not taking any more guesses.',
            lobbyFull: 'This lobby is full.',
            lobbyGone: 'This lobby does not exist any more. Check the code.',
            alreadyStarted: 'This game has already started.'
        }
    },
    pubquizr: {
        index: {
            description: 'A classic game of trivia with some fun twist to keep you entertained.',
            oneDevice: { title: 'One device', description: 'Pass the phone around.', action: 'Play' },
            multiDevice: { title: 'Multi-device', description: 'Everyone on their own.', action: 'Coming soon...' },
            /**
             * The sticker on the corner of the page. `weekday` is spelled one letter to
             * a tile, so a translation of it has to stay short enough to fit three or
             * four of them beside the headline.
             */
            weekly: {
                weekday: 'WED',
                /** Broken by hand: the design sets it on two lines. */
                promise: 'NEW GENERAL\nQUIZ WEEKLY'
            },
            list: {
                /**
                 * The shelf's name, which no longer promises an order — the panel has a
                 * sort of its own now, and a heading that said "newest first" would be
                 * wrong every time somebody pressed it.
                 */
                label: 'All quizzes',
                tabs: { weekly: 'Weekly', official: 'Official', community: 'Community' },
                /** A quiz's publication date, as the row shows it: "19 Aug 2025". */
                published: '{{day}} {{month}} {{year}}',
                loadOlder: 'Load older',
                empty: 'No quizzes on this shelf yet. Try another tab.',
                failed: 'The quizzes could not be loaded. Check your connection.',
                comingSoon: 'Coming soon...',
                search: 'Search quizzes…',
                /** Read out for the search field, which shows only its icon. */
                searchLabel: 'Search the quizzes on this shelf',
                /**
                 * How many quizzes the shelf holds, and how many of them a search found.
                 * Never `count`: that is the one option name i18next treats as a plural
                 * trigger, and there are no plural forms behind it. See `common.time`.
                 */
                total: '{{quizzes}} total',
                matches: '{{quizzes}} found',
                noMatches: 'Nothing on this shelf matches that.',
                /**
                 * The same miss, with older pages still unfetched behind it. Search only
                 * sees the quizzes already loaded, so this has to say so rather than
                 * leave someone certain their quiz is not here.
                 */
                noMatchesMore: 'Nothing matches that yet — older quizzes arrive a page at a time. Load some more and look again.',
                /** The sort switch, spelled as the order it would put the shelf in. */
                sortNewest: 'Newest',
                sortAlpha: 'A–Z',
            }
        },
        oneDevice: {
            title: 'One device',
            description: 'One phone for the whole table. Seat everyone, pick a quiz, and pass it round.',
            order: {
                title: 'Order matters',
                message: 'Fill the names in the order people are sitting, left to right. The quiz master role moves along the table in that order.'
            },
            players: {
                label: 'Who is playing',
                seat: 'Player {{seat}}',
                tooFew: 'A quiz needs at least three players.',
                tooMany: 'Eight players is the most that fit round one phone.',
                duplicate: 'Two players cannot share a name.',
            },
            quiz: {
                selected: 'Playing',
                pick: 'Pick a quiz',
                pickAnother: 'Or pick another'
            },
            start: 'Start quiz',
            /** While the server is being asked whether a quiz is already running. */
            loading: 'Checking for an open quiz…',
            running: {
                title: 'A quiz is still open',
                message: 'You already have a quiz going. Carry on where the table left off, or throw it away and set a new one up.',
                resume: 'Carry on',
                discard: 'Throw it away'
            }
        },
        play: {
            loading: 'Setting up the table…',
            close: 'Leave the quiz',
            /** "Round 1 · Open" — the round, and what kind of round it is. */
            roundLabel: 'Round {{round}} · {{kind}}',
            /** What kind of round it is, for the label beside its number. */
            rounds: {
                open: 'Open',
                choice: 'Multiple choice',
                closest: 'Closest guess',
                describe: 'Describe it',
                list: 'Name four',
                finale: 'The final'
            },
            /**
             * Split in two so the total can be greyed out beside the number. Never
             * `count`: that is the one option name i18next treats as a plural trigger,
             * and there are no plural forms behind it. See `common.time`.
             */
            questionNumber: 'Question {{number}}',
            questionTotal: ' of {{total}}',
            /**
             * The same fact at strip size: "3/8", with the total greyed out beside the
             * number. Two keys again for the same reason, and the number itself is left
             * bare — there is nothing to translate about a digit. Whatever draws this
             * owes a screen reader `questionNumber` + `questionTotal` as a label,
             * because "3 slash 8" is not a sentence.
             */
            questionOutOf: '/{{total}}',
            /** The two people the turn is about, above the question. */
            turn: {
                asking: 'asking',
                answering: 'answering',
                /** The banner read out as the one sentence it is. */
                spoken: '{{master}} is asking {{player}}',
                /**
                 * The same, once there is a run worth saying. The pill that carries it
                 * on screen sits inside a labelled banner, so a screen reader would
                 * never reach it otherwise.
                 */
                spokenRun: '{{master}} is asking {{player}}, who has taken {{run}} in a row',
                /**
                 * The pill beside the name. Never `count`: that is the one option name
                 * i18next treats as a plural trigger, and there are no plural forms
                 * behind it. See `common.time`.
                 */
                run: 'Run of {{run}}',
                /**
                 * The round's rule, on screen every turn rather than only on the
                 * hand-off. It is the thing a table gets wrong: the questions do not go
                 * round like a deal of cards, they come straight back to whoever just
                 * took one.
                 */
                staysWhileRight: '{{name}} keeps being asked until they get one wrong',
                /** The strip's own two halves: "NI reads → SA  Sanne answers". */
                reads: 'reads',
                answers: 'to {{name}}'
            },
            /**
             * The strip's one-line variant, for the rounds where nobody in particular is
             * being asked. Said by the round rather than by the strip, because "reads"
             * is only half the sentence and the other half is what the round is.
             */
            leadOpen: '{{name}} reads to the player on their left',
            leadChoice: '{{name}} reads · four options',
            leadClosest: '{{name}} reads · everyone else guesses',
            leadDescribe: '{{name}} describes their own words',
            leadList: '{{name}} reads · everyone else calls out answers',
            /**
             * Unused while `answering` is set — the finale always has somebody in
             * particular being asked, so `TurnStrip` never falls back to its one-line
             * variant here. Kept for the same reason every other round keeps one: the
             * shape of `roundCopy` is uniform across rounds.
             */
            leadFinale: '{{name}} reads to both finalists',
            readAloud: 'Read this out loud',
            onlyYouSeeThis: 'Only you see this',
            alsoAccept: 'Also accept: {{answers}}',
            /** The covered panel, before the quizmaster has asked to see the answer. */
            answer: {
                reveal: 'Tap to see the answer',
                revealHint: 'Keep the screen to yourself'
            },
            /**
             * The gate in front of the verdict. Named after the person so a stray tap
             * during a hand-over reads as obviously about somebody else's turn.
             */
            validate: "Check {{name}}'s answer",
            validateHint: 'Then mark it right or wrong',
            validateLocked: 'Show the answer first',
            /**
             * Round 2's gate, which is `validate` and the reveal in one tap — see
             * `HotSeatBoard`. Named after the person for the same reason `validate` is:
             * a stray press during a hand-over has to read as obviously somebody else's
             * turn.
             */
            gate: '{{name}} answered, check it',
            gateHint: "Nothing to tap until they've picked a letter",
            /** The one-line question recap, and what tapping it does. */
            reread: 'tap to reread',
            wrong: 'Wrong',
            correct: 'Correct',
            /** Read out for the buttons, which are two words on their own. */
            markWrong: 'Mark {{name}} wrong',
            markCorrect: 'Mark {{name}} correct',
            wrongPassesTo: 'Wrong passes the turn to {{name}}',
            /** Nobody left to ask: the question dies here rather than passing on. */
            wrongEndsQuestion: 'Nobody else to ask, wrong ends this question',
            /**
             * Round 2 only, replacing both lines above it: round 2 never keeps the seat
             * on a correct answer, so this one name is true no matter which button gets
             * pressed.
             */
            choiceAlwaysPasses: 'Either way, next up: {{name}}',
            /**
             * What Correct does, which is no longer only "score it". Said beside the
             * Wrong line because the two together are the round's whole rule, and the
             * moment to read it is with a thumb over the buttons.
             */
            correctKeepsTurn: 'Correct and the next question is {{name}} again',
            /**
             * What the turn on screen pays. In round 1 every second question does — see
             * `scoresAt` — and the other half are worth nothing but the seat, which is a
             * thing the table will not forgive being told only after the fact. Every
             * other round pays on all of them.
             *
             * Never `count`: that is the one option name i18next treats as a plural
             * trigger, and there are no plural forms behind this. See `common.time`.
             */
            worthPoints: 'For {{worth}}',
            noPoint: 'No point',
            /** The score strip on the question card. A running total, not this round's. */
            scores: 'Scores',
            /** Round 2: the four options, read out loud. */
            choice: {
                options: 'The four options',
                /**
                 * The cue above the question while it is being read. Round 1's cue says
                 * only "read this out loud"; round 2 has four more things to say before
                 * anybody may answer, and a quizmaster who reads the question and stops
                 * is the mistake this line exists to prevent.
                 */
                readAll: 'Read out loud: question and all four',
                spoken: '{{letter}}. {{text}}',
                spokenCorrect: '{{letter}}. {{text}}, this is the right one'
            },
            /** Round 3: everybody guesses a number, nearest takes it. */
            closest: {
                /** The number on the back of the card, with what it counts. */
                answer: '{{answer}} {{unit}}',
                placeholder: 'Guess',
                entry: "{{name}}'s guess",
                /**
                 * Copying is not guessing, so the second person to say a number has to
                 * pick another one. Said as the thing to do rather than as a complaint.
                 */
                duplicate: 'Two players have the same number. Ask one of them for another.',
                unreadable: 'One of those is not a number.',
                settle: 'Nearest takes {{worth}}',
                /** The way out for a table that has already agreed out loud. */
                pickInstead: 'Skip the numbers, just tap who won',
                typeInstead: 'Type the guesses instead',
                award: 'Give them the points',
                /** The reading screen: what is at stake, and who is playing for it. */
                nearestTakes: 'Nearest number takes {{worth}}',
                guessingOrder: 'Guessing, in table order',
                collect: 'Write down the guesses',
                collectHint: 'Let them all say a number first, no two the same',
                /** Back off the form to the question, for a table that wants it again. */
                backToQuestion: 'Back to the question',
                /** The ink bar at the top of the form, and the way to cover it again. */
                answerLabel: 'Answer · only you',
                hide: 'Hide',
                /** The rows, and how many of them have a number in them so far. */
                theirNumbers: 'Their numbers',
                filled: '{{filled}} of {{total}} in',
                /**
                 * How far off each guess landed, under the name. Only ever once the
                 * answer is on screen — before that it would be the app telling the
                 * table the answer sideways.
                 *
                 * Worth the two lines it costs: without them the quizmaster does four
                 * subtractions out loud while five people check the arithmetic.
                 */
                off: '{{off}} off',
                nearestOff: 'nearest · {{off}} off',
                /** The settling button, naming whoever it would pay as it stands. */
                awardTo: 'Award {{worth}} to {{name}}',
                /**
                 * The check on the way out, when a row is still blank.
                 *
                 * Not a rule — a blank row is legal, and `reviewGuesses` drops it on
                 * purpose, because somebody is always at the bar. But the far commoner
                 * reason for a blank row is that the quizmaster has not got to it yet,
                 * and the turn cannot be taken back once it is settled. So it asks.
                 *
                 * Two wordings rather than a `count`: that is the one option name
                 * i18next treats as a plural trigger, and there are no plural forms
                 * behind these. See `common.time`.
                 */
                missingTitle: 'Not everybody has a number',
                missingOne: '{{names}} has nothing written down, so they cannot win this one.',
                missingMany: '{{names}} have nothing written down, so they cannot win this one.',
                missingBack: 'Go back and fill them in',
                missingAnyway: 'Settle it anyway',
                /**
                 * The screen after the settle: who was right, before the phone moves on.
                 *
                 * Two wordings wherever a tie changes the verb, rather than a `count`:
                 * that is the one option name i18next treats as a plural trigger, and
                 * there are no plural forms behind these. See `common.time`.
                 */
                result: {
                    nearestOne: '{{names}} was nearest',
                    nearestMany: '{{names}} were nearest',
                    /** A by-hand settle with the tie waved off leaves nobody at all. */
                    nobody: 'Nobody was nearest',
                    paidOne: '{{worth}} points',
                    /** Each: a tie pays both of them in full rather than splitting it. */
                    paidMany: '{{worth}} points each',
                    paidNobody: 'Nothing on the board for this one',
                    /** The panel that finally says it out loud to the whole table. */
                    answerLabel: 'The answer',
                    guessesLabel: 'What everybody said',
                    /** Deliberately not "next question": the last one leads to the scores. */
                    continue: 'Carry on'
                }
            },
            /** The in-app number pad, which is only ever read out. */
            pad: {
                minus: 'Minus',
                backspace: 'Backspace'
            },
            /** Round 4: thirty seconds to describe your own words to the player on your left. */
            describe: {
                readyTitle: 'The rules',
                /**
                 * Under the two faces on the ready card. The round used to be a room
                 * shouting at once, so who is playing whom is the thing a table has to
                 * be told before anybody presses start.
                 */
                roleQuizmaster: 'Quizmaster',
                roleGuesser: 'Guessing',
                /** The ready screen's rules list, one row each rather than one paragraph. */
                readyRuleOnlyGuesser: 'You describe to {{guesser}}, and only their answers count while the clock is running',
                readyRuleTime: '{{seconds}} seconds to get through as many of your {{words}} words as you can',
                readyRuleNoSaying: 'Never say the word itself',
                readyRuleBothScore: 'Every word {{guesser}} gets is a point for them and a point for you',
                readyRuleBonus: 'When time is up, the other {{others}} each get one guess at a word nobody got',
                start: 'Show my words and start',
                dontSayIt: 'Never say the word itself',
                /** Shown again mid-timer, so it does not depend on being remembered. */
                runningReminder: 'Only {{guesser}} may answer. The rest of the table gets its go afterwards.',
                /** The first scoring screen: what the guesser got inside the thirty seconds. */
                inTimeTitle: 'What did {{guesser}} get?',
                inTimeHint: 'Tap every word {{guesser}} said before time ran out',
                toBonus: 'Bonus round · {{left}} left over',
                toSettle: 'On to the points',
                /** The bonus walk: one screen per remaining player, one guess each. */
                bonusOf: 'Bonus · {{number}} of {{total}}',
                bonusTitle: '{{name}} has one guess',
                bonusHint: 'One guess at one of these. Get it and you both score.',
                bonusMissed: '{{name}} got nothing',
                scoringTitle: 'How the turn went',
                nobody: 'Nobody got it',
                /** Beside the name on a word that landed: what it paid, all in. */
                plus: '+{{points}}',
                /** What the turn is about to be worth to the person who described it. */
                standing: '{{name}} takes {{points}} from this turn',
                scoreAgain: 'Score this turn again',
                settle: 'Hand out the points'
            },
            /** Round 5: one category, four answers, and the table takes turns to find them. */
            list: {
                readCategory: 'Read the category out loud',
                perAnswer: '{{worth}} a find',
                turnOrder: 'Ten seconds each, in table order',
                start: 'Start guessing',
                /** The skip button, top right of the guessing screen. */
                skip: "Skip {{name}}'s turn",
                scoringTitle: 'Who found them?',
                whoSaidItHint: 'Tap whoever called each one out',
                /**
                 * Never `count`: that is the one option name i18next treats as a
                 * plural trigger, and there are no plural forms behind it. See
                 * `common.time`.
                 */
                stillToRule: '{{left}} still to credit',
                settle: 'Hand out the points'
            },
            /**
             * The screen that opens every round, before the phone is handed to anybody.
             *
             * `rounds.*` names a round in the two words a label has room for and
             * `handoff.rule*` states its rule at whoever is holding the phone; these are
             * the versions written at the table, which has not seen this round before and
             * needs to know what is about to be asked of it.
             */
            intro: {
                /** Under the number: "of 6". */
                of: 'of {{total}}',
                /** The headline. The table calls rounds by their number, so it is the number. */
                round: 'Round {{round}}',
                briefOpen: 'Twenty open questions, and they can be about anything. The reader asks the player on their left; get it right and the next one is yours as well, miss it and it moves on round the table. Only every second question is worth a point.',
                briefChoice: 'Hard questions, this time with four answers to choose from. One question each, read out with all four options — and every single one of them is worth two points.',
                briefClosest: 'A question with a number for an answer. Everybody except the reader says one guess, and no two people may say the same number. Whoever lands nearest takes two points.',
                briefDescribe: 'Thirty seconds each to describe your own words — to the player on your left, and to nobody else. Every word they get is a point for them and a point for you. When time is up, everybody else gets one guess at a word that was missed.',
                briefList: 'One question with four answers hiding in it. Everybody but the reader gets ten seconds in turn to call out as many as they can, until all four are found or the table runs out of goes. Then the reader says who called out what — a point each.',
                briefFinale: 'The top two scores go head to head, and a quizmaster who is not one of them reads every question. Each one goes first to whoever is behind; if they miss it, the other one still gets a go at it. Every answer is worth 100 points, and the most points wins the night.',
                /** Between the two finalist portraits on the finale's intro screen. */
                versus: 'vs',
                /** Under the two portraits, naming whoever reads the whole finale out. */
                quizmaster: '{{name}} is quizmaster',
                action: 'Start round {{round}}'
            },
            handoff: {
                /** Not "question": in round 4 a turn is thirty seconds and four words. */
                step: 'Round {{round}} · {{number}} of {{total}}',
                /** Broken over two lines by the design, which the app does not force. */
                title: 'Pass the phone to {{name}}',
                /**
                 * What the person taking the phone is about to do. One line per round,
                 * because "reads to the player on their left" is true of the first three
                 * and completely wrong for the fourth.
                 */
                jobOpen: '{{name}} reads to the player on their left',
                jobChoice: '{{name}} reads the question and all four options',
                jobClosest: '{{name}} reads the question and collects everyone else’s number',
                jobDescribe: '{{name}} describes their own words to the player on their left. Nobody else may look at the screen.',
                jobList: '{{name}} reads the category and marks off answers as the table calls them out.',
                jobFinale: '{{name}} reads to both finalists. {{name}} is not playing this round.',
                /**
                 * The round's rule, said on the one screen with room to say it properly.
                 * The board says the short version every turn; this is the version with
                 * room for the second half of it.
                 */
                ruleOpen: 'Get one right and the next question is yours too. Miss one and it moves on. Every second question scores.',
                ruleChoice: 'Same as before: get one right and the next is yours too. Every question is worth 2 here.',
                ruleClosest: 'Everybody but the reader guesses once, and no two people may say the same number. Nearest takes 2.',
                ruleDescribe: 'Thirty seconds, played to the person on your left. Every word they get is a point for them and a point for you.',
                ruleList: 'Ten seconds each. Mark an answer the instant somebody says it, then say who found what once the round is done.',
                ruleFinale: 'Every question goes first to whoever is behind. If they miss it, the other one can still take it. 100 points an answer, and the most points wins the night.',
                action: "I'm {{name}}, show the question"
            },
            standings: {
                title: 'Round {{round}} done',
                description: 'How the table stands with that round behind you.',
                startNext: 'Start round {{round}}',
                nextRoundWip: 'Round {{round}} is not built yet. Your scores are saved. The quiz is waiting where you left it.'
            },
            /** The very last screen: the whole evening, ranked. */
            final: {
                title: 'The quiz is over',
                /** Only when there is nobody to name — an empty table, in practice. */
                description: 'How the whole evening finished.',
                /** The tag under a finalist's name, so their row explains its own number. */
                finalist: 'Finalist',
                /**
                 * The banner across the top of the winner's card. Uppercased by the
                 * style rather than by the copy, so a language whose casing rules
                 * differ still gets its own.
                 */
                winnerLabel: 'Winner',
                /** Under the winner's name, on the card. Their whole evening in one number. */
                points: '{{score}} points',
                /**
                 * Nobody won outright. The card names the joint leaders instead, and
                 * the app does not hand the night to whoever the sort put first.
                 */
                tieLabel: 'Shared first',
                tieTitle: 'Too close to call',
                tieDescription: 'Nobody finished ahead. The night is shared.',
                /** The rest of the table, under the winner's card. */
                restLabel: 'The rest of the table'
            }
        },
        /**
         * Written here rather than passed through from the API, for the reason
         * `lol.errors` spells out: the server's own wording is English, and some of it
         * is not even the API's.
         */
        errors: {
            expired: 'You have been signed out. Sign in again to start a quiz.',
            quizGone: 'That quiz is no longer available. Pick another one.',
            badTable: 'The table was refused. Check the names and try again.',
            tooFewPlayers: 'A quiz needs at least three players.',
            tooManyPlayers: 'Eight players is the most that fit round one phone.',
            duplicateName: 'Two players cannot share a name.',
            quizTooSmall: 'This quiz does not have enough questions for that many players. Pick another quiz, or play with fewer people.',
            generic: 'The quiz could not be started. Try again.',
            network: 'No connection to the server. Check your internet.',
            /**
             * The turn moved under the screen — a second tap, or a phone left open on
             * something the table has already played. The board stays up, so the line
             * says what to do rather than apologising.
             */
            staleTurn: 'The table has already moved on. The board below is where the quiz actually is.',
            duplicateGuess: 'Two players cannot guess the same number. Ask one of them for another.',
            quizmasterCannotGuess: 'Whoever is reading the question out does not get to guess at it.',
            describerCannotGuess: 'You cannot be credited with a word you were describing.',
            /** Round 4's two halves, refused: one name per word, one bonus guess each. */
            oneGuessEach: 'Everybody but the player being described to gets one guess.',
            twoOnOneWord: 'Only one player can be credited with a word.'
        }
    },
    oneOfUs: { 
        index: { 
            description: "Everyone gets a question/word, e.g. “What would you do if you became invisible?” Everyone answers anonymously, except one player gets a slightly different question/word.", 
            oneDevice: { 
                title: "1 device", 
                description: "Play with 1 phone that is passed around", 
                action: "Play" 
            }, 
            multiDevice: { 
                title: "1 phone per person", 
                description: "Create a lobby and invite other players", 
                action: "Create lobby" 
            }
        },
        singleDevice: {
            title: "Play with 1 device",
            description: "Fill in all the names of the people that you are playing with. Then press start. The game is self-explanatory.",
            players: {
                tooFew: 'One of Us needs at least three players.',
                tooMany: 'Nine players is the most that fit round one phone.',
                duplicate: 'Two players cannot share a name.'
            }
        },
        settings: {
            wordsOnly: {
                title: "Use words only",
                description: "Use words only or use sentences that you should find a fitting answer for."
            }
        },
        play: {
            loading: 'loading…',
            close: 'Leave the game',
            /** The header, every round. */
            roundLabel: 'Round {{round}}',

            /**
             * The pass-the-phone reveal, once per player before the first round.
             *
             * The step line counts people rather than rounds, because that is what is
             * actually happening: the phone is going round the table once so everybody
             * can read their own word.
             */
            reveal: {
                step: 'Handing out words · {{number}} of {{total}}',
                title: 'Pass the phone to {{name}}',
                body: 'Only {{name}} may look at the next screen.',
                note: 'Everybody gets a word. One or more of you get a different one — and will have to bluff.',
                action: "I'm {{name}}",
                secretLabel: 'Tap to see your word',
                secretHint: 'Hold the phone so nobody else can read it.',
                warning: 'Only you see this',

                /**
                 * The side you are on, uncovered with the word.
                 *
                 * The explanations say what to do with the word rather than defining the
                 * role: knowing you are called an imposter is worth nothing on its own,
                 * and the one thing a player needs in the ten seconds they hold the
                 * phone is whether they are bluffing or hunting.
                 */
                role: {
                    label: 'Your role',
                    civilian: {
                        name: 'Civilian',
                        explanation: 'Most of you got this same word. Say something about it that proves you know it, without saying it outright — say too much and you hand it to the imposters. Then work out who is faking it, and vote them out.'
                    },
                    imposter: {
                        name: 'Imposter',
                        explanation: 'Your word is not the one most of the table got, and you do not know theirs. Listen to what the others say, guess what they are all describing, and bluff your way through your own turn. You win by surviving until the imposters are no longer outnumbered.'
                    }
                },
                /** After the word is open: the way on, phrased as putting it away. */
                hide: 'Hide',
                done: 'Got it — pass it on',
                lastDone: 'Got it — start round 1'
            },

            /**
             * One speaker at a time, in an order reshuffled every round.
             *
             * The screen names one person and nothing else. There is nothing to type:
             * the whole turn happens out loud, and the phone is only keeping the order.
             */
            speak: {
                step: 'Round {{round}} · {{number}} of {{total}}',
                nowSpeaking: 'Now speaking',
                hint: 'Say one word about your own word. Do not say the word itself.',
                next: 'Next player',
                lastNext: 'Everyone has spoken'
            },

            discuss: {
                title: 'Talk it over',
                description: 'Who sounded like they were guessing? Argue it out, then vote somebody out.',
                /** The tie rule, which the app deliberately does not enforce. */
                tieNote: 'If the vote ties, the table decides together who goes.',
                action: 'Ready to vote'
            },

            vote: {
                title: 'Who is one of us?',
                description: 'Tap whoever the table has decided on, then confirm.',
                nobody: 'Nobody chosen yet',
                confirm: 'Vote {{name}} out',
                confirmHint: 'This cannot be undone.',
                locked: 'Tap a name first.'
            },

            /** What the table is told the moment somebody leaves. */
            elimination: {
                title: '{{name}} is out',
                civilian: '{{name}} was one of the civilians.',
                imposter: '{{name}} was an imposter.',
                remaining: '{{players}} still in the game.',
                next: 'Start round {{round}}'
            },

            over: {
                civilians: 'The civilians win',
                imposters: 'The imposters win',
                civiliansWhy: 'Every imposter has been voted out.',
                impostersWhy: 'The imposters are no longer outnumbered.',
                /** The reveal at the end: who was what, all of it at once. */
                rolesTitle: 'Everybody',
                civilianTag: 'Civilian',
                imposterTag: 'Imposter',
                votedOut: 'Voted out',
                civilianWord: 'The word was',
                imposterWord: 'The imposters had',
                again: 'Play again'
            }
        },
        errors: {
            expired: 'You have been signed out. Sign in again to carry on.',
            gameGone: 'That game is no longer there.',
            badTable: 'That table cannot be dealt. Check the names and try again.',
            generic: 'Something went wrong. Try again.',
            network: 'No connection to the server. Check your internet.'
        }
    },
    friends: {
        title: 'Friends',
        description: 'Play together, keep track of who wins and challenge each other.',
        soon: {
            title: 'Coming soon',
            message: 'Friend lists, invites and head to head standings are on the way. For now you play together with a lobby code.'
        }
    }
} as const;
