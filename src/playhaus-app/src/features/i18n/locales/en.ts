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
        players: 'players',
        change: 'change',
        minutes: 'min',
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
        }
    },
    games: {
        /**
         * How many devices a game needs, as one line under its home card.
         *
         * Keyed by mode, not by game: the answer is a property of how a game is played,
         * and two games played the same way should say it with the same words.
         */
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
            mainCategory: 'Bluf'
        }
    },
    /**
     * Only the descriptions. The names themselves stay endonyms in `LANGUAGES` and are
     * never translated, so someone who cannot yet read the current interface language can
     * still find their own.
     */
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
            title: 'Join a Game', accent: 'or Reconnect',
            description: "Reconnect to an existing game or join a new one."
        },        
        loading: 'Looking for your games…',
        updated: 'Updated {{time}}',
        noGames: 'Found no games to reconnect to.',
        resume: 'Continue playing',
        refresh: { label: 'Refresh the list', action: 'Refresh' },
        mode: { solo: 'Solo', lobby: 'Lobby', oneDevice: 'One device' },
        errors: {
            expired: 'Your session has expired. Log in again.',
            generic: 'Something went wrong while fetching your games. Please try again.',
            network: 'Could not reach the server. Check your connection and try again.'
        }
    },
    lol: {
        index: {
            description: 'Test your vocabulary, challenge your friends, and try to guess the secret word before you run out of chances. Play solo or against your enemies.',
            playingAs: 'Playing as {{name}}',
            solo: { title: 'Solo', description: 'Three rounds, your rules.', action: 'Set up' },
            multiplayer: { title: 'Multiplayer', description: 'Race against your friends.', action: 'Open' },
            join: {
                label: 'JOIN A LOBBY',
                /**
                 * The same card, split in two on a wide screen: the boxes are only half
                 * of it there, so the label names its own half rather than the card.
                 */
                labelWide: 'TYPE THE CODE',
                paste: 'Paste',
                pasteLabel: 'Paste code',
                codeLabel: 'Lobby code',
                scanRowTitle: 'Or scan their screen',
                scanRowHint: 'Joins instantly',
                scanAction: 'Scan instead',
                scanCopy: "Point your phone at the host's code",
                scanTitle: 'Scan to join',
                scanLabel: 'Scan a QR code to join a lobby',
                scanCancel: 'Cancel',
                permissionAsk: 'The camera is needed to read the host’s code. Nothing is recorded or sent anywhere.',
                permissionGrant: 'Allow the camera',
                /** No button under this one: the answer has to be changed in settings. */
                permissionDenied: 'The camera is blocked for this app. Allow it in your settings, or type the four characters instead.'
            }
        },
        settings: {
            loading: 'Looking for your game…',
            title: 'Set up your\ngame',
            description: 'Choose how you want to play, then start.',
            wordLength: 'Word length',
            wordLengthOption: '{{letters}} letters',
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
            close: 'Close the lobby',
            leave: 'Leave the lobby',
            youHost: 'You host',
            connected: 'Connected to lobby {{code}}',
            disconnected: 'Lost the connection to the lobby',
            code: 'Lobby code',
            named: 'Lobby {{code}}',
            shareTitle: 'Join my lobby',
            codeSpoken: 'Lobby code: {{characters}}',
            copyCode: 'Copy lobby code {{characters}}',
            copied: 'Copied',
            readAloud: 'Read it out, or',
            shareLinkLabel: 'Share the link to this lobby',
            shareLink: 'Share the link',
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
            waiting: 'Waiting…',
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
                label: 'All quizzes · newest first',
                tabs: { weekly: 'Weekly', official: 'Official', community: 'Community' },
                /** A quiz's publication date, as the row shows it: "Wed 19 Aug · 09:00". */
                published: '{{weekday}} {{day}} {{month}} · {{time}}',
                loadOlder: 'Load older',
                empty: 'No quizzes on this shelf yet. Try another tab.',
                failed: 'The quizzes could not be loaded. Check your connection.',
                comingSoon: 'Coming soon...'
            }
        },
        oneDevice: {
            title: 'One device',
            description: 'One phone for the whole table. Seat everyone, pick a quiz, and pass it round.',
            /**
             * Why the seating order is worth getting right, said before the fields
             * rather than after them.
             */
            order: {
                title: 'Order matters',
                message: 'Fill the names in the order people are sitting, left to right. The quiz master role moves along the table in that order.'
            },
            players: {
                label: 'Who is playing',
                /** Read out for the field; the number beside it is the seat. */
                seat: 'Player {{seat}}',
                placeholder: 'Name',
                add: 'Add player',
                /**
                 * Never `count`: that is the one option name i18next treats as a plural
                 * trigger, and there are no plural forms behind it. See `common.time`.
                 */
                count: '{{seats}} / {{max}}',
                remove: 'Remove player {{seat}}',
                tooFew: 'A quiz needs at least three players.',
                tooMany: 'Eight players is the most that fit round one phone.',
                duplicate: 'Two players cannot share a name.'
            },
            quiz: {
                selected: 'Playing',
                pick: 'Pick a quiz',
                pickAnother: 'Or pick another'
            },
            start: 'Start quiz'
        },
        play: {
            loading: 'Setting up the table…',
            close: 'Leave the quiz',
            /** "Round 1 · Open" — the round, and what kind of round it is. */
            roundLabel: 'Round {{round}} · {{kind}}',
            rounds: { open: 'Open' },
            /**
             * Split in two so the total can be greyed out beside the number. Never
             * `count`: that is the one option name i18next treats as a plural trigger,
             * and there are no plural forms behind it. See `common.time`.
             */
            questionNumber: 'Question {{number}}',
            questionTotal: ' of {{total}}',
            /** The two people the turn is about, above the question. */
            turn: {
                asking: 'asking',
                answering: 'answering',
                /** The banner read out as the one sentence it is. */
                spoken: '{{master}} is asking {{player}}'
            },
            readAloud: 'Read this out loud',
            scoresThisRound: 'Scores this round',
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
            wrong: 'Wrong',
            correct: 'Correct',
            /** Read out for the buttons, which are two words on their own. */
            markWrong: 'Mark {{name}} wrong',
            markCorrect: 'Mark {{name}} correct',
            wrongPassesTo: 'Wrong passes the turn to {{name}}',
            /** Nobody left to ask: the question dies here rather than passing on. */
            wrongEndsQuestion: 'Nobody else to ask — wrong ends this question',
            /**
             * What Correct does, which is no longer only "score it". Said beside the
             * Wrong line because the two together are the round's whole rule, and the
             * moment to read it is with a thumb over the buttons.
             */
            correctKeepsTurn: 'Correct keeps {{name}} answering',
            /**
             * Whether the question on screen pays out. Every second one does — see
             * `scoresAt` — and the other half are worth nothing but the seat, which is
             * a thing the table will not forgive being told only after the fact.
             */
            worthPoint: 'Worth a point',
            noPoint: 'No point — survive it',
            handoff: {
                step: 'Round {{round}} · question {{number}} of {{total}}',
                /** Broken over two lines by the design, which the app does not force. */
                title: 'Pass the phone to {{name}}',
                /**
                 * Not "this turn" any more: the reading stays put until a question goes
                 * all the way round unanswered, which can be a good while.
                 */
                body: '{{name}} reads until a question beats the table',
                /**
                 * The round's rule, said on the one screen with room for it. The
                 * hand-off is rare now, so this is where it can be read rather than
                 * skimmed past.
                 */
                rule: 'Get one right and you stay in. Every second question scores.',
                action: "I'm {{name}} — show the question"
            },
            standings: {
                title: 'Round {{round}} done',
                description: 'How the table stands with the first round behind you.',
                nextRoundWip: 'Round {{round}} is not built yet. Your scores are saved — the quiz is waiting where you left it.'
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
            network: 'No connection to the server. Check your internet.'
        }
    },
    oneOfUs: { 
        index: { 
            description: "Everyone gets a question/word, e.g. “What would you do if you became invisible?” Everyone answers anonymously, except one player gets a slightly different question/word.", 
            oneDevice: { 
                title: "1 phone", 
                description: "Play with 1 phone that is passed around", 
                action: "Play" 
            }, 
            multiDevice: { 
                title: "1 phone per person", 
                description: "Create a lobby and invite other players", 
                action: "Create lobby" 
            } 
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
