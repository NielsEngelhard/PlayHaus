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
        /** The badge `PlayerScoreRow` puts on whoever is up. */
        yourTurn: 'YOUR TURN',
        // The word before the last name in a list of them, for `joinNames`.
        and: 'and',
        // The two words a `Toggle` stamps itself with.
        on: 'ON',
        off: 'OFF',
        loading: 'One moment…',
        language: 'Language',
        selectValue: '{{label}}: {{value}}',
        nothingSelected: 'nothing selected',
        change: 'change',
        minutes: 'min',
        start: 'Start',
        /** On the button that closes one step of a form and opens the next. */
        next: 'Next',
        // Where a form split into steps has got to, on the band above it.
        stepOf: 'Step {{step}} of {{total}}',
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
            namePlaceholder: "Name",
            // `{{players}}` on purpose — `{{count}}` would switch i18next into plural mode and demand `_one`/`_other` variants of the key.
            seated: "{{players}} players"
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
    notFound: {
        title: "Page not found",
        message: "This page doesn't exist, or it moved.",
        action: "Take me home"
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
        startNew: 'All games',
        bottomTeaser: "More games in the making...",
    },
    games: {
        device: {
            perPlayer: '1 per player',
            oneDevice: '1 total',
            perPlayerOrOneDevice: 'choice'
        },
        leagueOfLetters: {
            description: 'Test your vocabulary. Solo, or against your friends.',
            mainCategory: 'Word guessing',
        },
        quizzer: {
            description: 'Put your general knowledge to the test.',
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
    // The join card, which is not any one game's.
    join: {
        label: 'JOIN A GAME',
        // The same card, split in two on a wide screen.
        labelWide: 'TYPE THE CODE',
        paste: 'Paste',
        pasteLabel: 'Paste code',
        codeLabel: 'Join code',
        // The chip beside the boxes, as soon as the first character is in.
        gameHint: 'Joining {{game}}',
        // A whole code that opens nothing.
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
        // No button under this one: the answer has to be changed in settings.
        permissionDenied: 'The camera is blocked for this app. Allow it in your settings, or type the code instead.'
    },
    languages: {
        nl: { description: 'Games in Dutch' },
        en: { description: 'Games in English' }
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
            message: 'You are playing as a guest. This account is temporary: your stats and progress will be lost once things get cleaned up. Add an email address and password to make a real account.',
            action: 'Upgrade (free)'
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
        stillRunning: 'Still going',
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
    // The waiting room's own words, shared by every game that has one.
    lobby: {
        yourRoom: 'Your room',
        named: 'Lobby {{code}}',
        live: 'Live',
        offline: 'Offline',
        disconnected: 'Lost the connection to the lobby',
        close: 'Close the lobby',
        leave: 'Leave the lobby',
        joinCode: 'Access code',
        code: 'Lobby code',
        codeSpoken: 'Lobby code: {{characters}}',
        copyCode: 'Copy lobby code {{characters}}',
        copied: 'Copied',
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
        minPlayers: 'Min {{min}}',
        inLobby: 'In the lobby',
        hostYou: 'HOST · YOU',
        hostTag: 'HOST',
        ready: 'Ready',
        away: 'Away',
        freeSeat: 'Free seat',
        // Two wordings rather than one key with a count.
        moreSeatsOne: '+ 1 more free seat',
        moreSeatsMany: '+ {{seats}} more free seats',
        waiting: 'Waiting…',
        // The guest's whole screen and the dead-room notice.
        waitingForHost: 'Waiting for the host',
        waitingForHostMessage: '{{name}} is setting up the game. Stay on this screen and it starts right here.',
        waitingLabel: 'Waiting',
        closedTitle: 'Lobby closed',
        // The free seat, on the host's screen only.
        inviteFriend: 'Invite a friend'
    },
    lol: {
        index: {
            description: 'Test your vocabulary and try to guess the secret word.',
            playingAs: 'Playing as {{name}}',
            solo: {
                title: 'Solo',
                description: 'Play alone, nice and easy.',
                action: 'Set up',
                /** The personal best on the solo card, once there is one. */
                best: 'Best {{score}}'
            },
            multiplayer: { title: 'Multiplayer', description: 'Create a lobby.', action: 'Open' },
            wordOfTheDay: {
                title: 'Word of the day',
                resetIn: 'A new word in {{time}}'
            },
            tournament: {
                badge: 'New',
                title: 'Tournament',
                description: '4 to 12 players, 1v1 matches (1v1v1 with an odd number), four rounds each. Lose twice and you are out.',
                action: 'Set up a tournament'
            }
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
                hardOff: 'Normal',
                zen: 'Zen',
                competitive: 'Competitive'
            },
            /** The segmented control that picks how a solo game is played. */
            mode: {
                title: 'Game mode',
                badge: 'New',
                zen: {
                    label: 'Zen',
                    description: 'No clock and no score — you play at your own pace.'
                },
                competitive: {
                    label: 'Competitive',
                    description: 'The clock runs from the start. Solve all three words for points, plus a bonus for the time you took.'
                }
            },
            hardMode: {
                label: 'Hard mode',
                description: 'The word can be any existing word in the language. Switch it off to play with an easier set of words.'
            },
            facts: '{{rounds}} rounds · {{guesses}} guesses per round · first letter given',
            competitiveFacts: '{{rounds}} rounds · {{guesses}} guesses per round · time bonus up to {{minutes}} minutes',
            start: 'Start',
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
            mustStartWith: 'The word starts with {{letter}}.',
            resultLabel: 'Result',
            viewResult: 'View the result',
            nextRound: 'Next round',
            guesses: '{{guesses}}/{{max}}',
            roundOf: 'Round {{round}} of {{total}}',
            hint: 'Hint',
            hintLabel: 'Hint: the word starts with {{letter}}',
            dailyLabel: 'Word of the day',
            solved: 'SOLVED',
            lost: 'BAD LUCK',
            theWord: 'The word',
            attempts: 'Guesses',
            guess: 'Guess',
            clear: 'Clear',
            timeLeft: 'Time left',
            /** The word-length badge in the round's top row. */
            wordLengthLabel: '{{letters}} letters',
            /** Read out for the solo board's status chip, which shows both as one line. */
            scoreLabel: '{{name}}, {{score}} points',
            /** Read out for the score chip in the round's top row, which has no name to show. */
            scoreCompactLabel: '{{score}} points',
            /** Read out for the solo board's clock, which shows the time on its own. */
            playTimeLabel: 'Play time: {{time}}',
            yourTurnNotice: 'YOUR TURN!'
        },
        results: {
            loading: 'Loading the result…',
            loadFailed: 'The result could not be loaded.',
            title: 'Game over',
            summary: 'Rounds: {{rounds}} · Letters: {{length}}',
            baseScore: 'Guesses',
            timeBonus: 'Time bonus',
            total: 'Total',
            newHighScore: 'A new personal best at {{letters}} letters!',
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
        wordOfTheDay: {
            eyebrow: 'Word of the day',
            // The badge in the header, which is read out rather than written.
            streakDays: '{{days}} days in a row',
            guesses: 'Guesses',
            legendMissed: 'Missed',
            statBest: 'Best day',
            statAverage: 'Average',
            statDays: 'Days',
            // The letter count is the day's own: four on Monday, eight on Sunday.
            playDay: 'Play {{day}}',
            playHint: '{{letters}} letters · no clock',
            resume: 'Keep playing',
            nextWord: 'A new word in {{time}}',
            bestAndNext: 'Your best is {{guesses}} · a new word in {{time}}',
            solvedInOne: 'Solved in {{guesses}} guess',
            solvedInMany: 'Solved in {{guesses}} guesses',
            notSolved: 'Not today. The word was {{word}}.'
        },
        tournament: {
            loading: 'Looking for the tournament…',
            noBracket: 'No tournament',
            yourTournament: 'Your tournament',
            start: 'Draw the bracket',
            startNote: 'Once you start, nobody else can join.',
            needPlayers: 'A tournament needs at least four players.',
            confirmLeave: {
                title: 'Leave the tournament?',
                message: 'Your matches keep running without you and you can lose them by the clock. You can come back with the same code.',
                action: 'Leave'
            },
            // The bar along the top of the bracket.
            title: 'Tournament · {{players}} players',
            schedule: 'Schedule',
            nextRoundReady: 'Round {{stage}} can start',
            stageDrawn: 'Round {{stage}} is drawn',
            matchesLeft: '{{done}} of {{total}} matches done · {{left}} still open',
            winners: 'Winners {{players}}',
            losers: 'Losers {{players}}',
            final: 'Final',
            stageOne: 'Round {{stage}} · 1 match',
            stageMany: 'Round {{stage}} · {{matches}} matches',
            nothingHere: 'Nothing here yet',
            // One match in a column.
            playing: 'Playing',
            upNext: 'Up next',
            bye: 'Free pass to the next round',
            you: 'You',
            knockedOut: {
                title: 'Knocked out',
                message: 'You finished {{place}}. Stay and watch the rest of the bracket play out.'
            },
            // The gate between the draw and the matches.
            matchup: {
                title: 'Your round {{stage}} match'
            },
            startMatches: 'Start the matches',
            waitingForStart: 'Waiting for {{name}} to start',
            startGateOne: '1 match is drawn and starts when the host says so',
            startGateMany: '{{matches}} matches are drawn and all start at once',
            // The gate between one round and the next.
            waitingOnOne: 'Waiting on 1 match',
            waitingOnMany: 'Waiting on {{matches}} matches',
            readyWaiting: 'Waiting for the others',
            ready: 'I am ready',
            readyCount: '{{ready}} of {{total}} are ready · starts as soon as everyone is',
            readyGate: 'Ready opens once all {{matches}} matches are done',
            backToBracket: 'Back to the bracket',
            champion: {
                title: 'Champion',
                you: 'You won the tournament.',
                player: '{{name}} wins the tournament.'
            },
            lossOne: '1 loss',
            lossMany: '{{losses}} losses'
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
            alreadyStarted: 'This game has already started.',
            alreadyPlayedToday: 'You have already played today. Come back tomorrow.',
            notEnoughForTournament: 'A tournament needs between four and twelve players.',
            stageNotOver: 'This round is not done yet.',
            stageStarted: 'This round has already started.',
            tournamentOver: 'This tournament is already over.'
        }
    },
    pubquizr: {
        index: {
            description: 'A classic pub quiz with a playful twist.',
            oneDevice: { title: 'One device', description: 'Pass the phone around.', action: 'Set up' },
            multiDevice: { title: 'Multi-device', description: 'One screen for the table, a phone each.', action: 'Open a room' },
            openTable: 'Open the screen for the table',
            // The sticker on the corner of the page.
            weekly: {
                weekday: 'WED',
                /** Broken by hand: the design sets it on two lines. */
                promise: 'NEW GENERAL\nQUIZ WEEKLY'
            },
            // The hero above the shelf: the one quiz the picker answers with, unprompted, instead of leaving the pick to a browse.
            newQuiz: {
                badge: 'New this week',
                play: 'Play this'
            },
            list: {
                // The shelf's name, which no longer promises an order.
                label: 'All quizzes',
                tabs: { weekly: 'Weekly', official: 'Official', community: 'Community' },
                // The second row of tabs: what's left to play versus what's already been.
                playedFilter: {
                    all: 'All {{n}}',
                    unplayed: 'New {{n}}',
                    played: 'Played {{n}}'
                },
                /** A quiz's publication date, as the row shows it: "19 Aug 2025". */
                published: '{{day}} {{month}} {{year}}',
                // The mark on a quiz this host has already had out of the box.
                played: 'Played',
                loadOlder: 'Load older',
                /** The way off the index page and into the sheet that holds the shelf. */
                seeAll: 'See all quizzes',
                // The same way through, before there is a number to put in it.
                browse: 'Browse all quizzes',
                empty: 'No quizzes on this shelf yet. Try another tab.',
                // What the played/unplayed tabs say when one of them comes up empty with no search running.
                filterEmpty: 'Nothing on this tab yet.',
                failed: 'The quizzes could not be loaded. Check your connection.',
                comingSoon: 'Coming soon...',
                search: 'Search quizzes…',
                /** Read out for the search field, which shows only its icon. */
                searchLabel: 'Search the quizzes on this shelf',
                // How many quizzes the shelf holds, and how many of them a search found.
                total: '{{quizzes}} total',
                matches: '{{quizzes}} found',
                noMatches: 'Nothing on this shelf matches that.',
                // The same miss, with older pages still unfetched behind it.
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
                tooFew: 'A quiz needs at least two players.',
                tooMany: 'Eight players is the most that fit round one phone.',
                duplicate: 'Two players cannot share a name.',
            },
            // `pick` and `pickAnother` title the row that opens the browse sheet, so they read as the thing pressing it will do.
            quiz: {
                selected: 'Playing',
                pick: 'Pick a quiz',
                pickAnother: 'Or pick another'
            },
            steps: {
                quizTitle: 'Which quiz',
                settingsTitle: 'How you play',
                table: 'At the table',
            },
            zenMode: {
                label: 'Zen mode',
                description: 'No time pressure. Rounds with a timer are swapped out or played differently.',
                caption: 'Zen · no timers'
            },
            triviaMode: {
                label: 'Trivia only',
                description: 'Just questions and answers. The describing round and the four-answer round are left out.',
                caption: 'Trivia only · 4 rounds'
            },
            start: 'Start quiz',
            loading: 'Checking for an open quiz…',
            running: {
                title: 'A quiz is still open',
                message: 'You already have a quiz going. Carry on where the table left off, or throw it away and set a new one up.',
                resume: 'Carry on',
                discard: 'Throw it away'
            }
        },
        // The multi device room: one screen the table looks at, and a phone each.
        lobby: {
            loading: 'Looking for your room…',
            opening: 'Opening the room…',
            noLobby: 'No room',
            hostClosedLobby: 'The host closed the room. Ask for a new code.',
            hostStoppedQuiz: 'The host stopped the quiz. Ask for a new code for another one.',
            // The phone, for the moment between the deal and the controller.
            dealt: 'The quiz is starting…',
            screenHint: {
                title: 'Put a screen up first',
                message: 'Open the room on a laptop or a TV — HDMI, Chromecast or AirPlay all work — and everybody plays from their own phone.'
            },
            running: {
                quizTitle: 'You are already playing',
                lobbyTitle: 'You still have a room open',
                quizMessage: 'A quiz is still running in room {{code}}. Carry on, or stop it and open a new room.',
                lobbyMessage: 'Room {{code}} is still open in your name. Go back to it, or close it and open a new one.',
                resumeQuiz: 'Carry on playing',
                resumeLobby: 'Go to the open room',
                stopQuiz: 'Stop the quiz',
                closeLobby: 'Close it and open a new one'
            },
            confirmClose: {
                title: 'Close the room?',
                message: 'The room is deleted and the code stops working. Everybody already in it is thrown out.',
                action: 'Close'
            },
            confirmLeave: {
                title: 'Leave the room?',
                message: 'You go back to the game menu. You can join again later with the same code.',
                action: 'Leave'
            },
            stay: 'Stay here',
            start: 'Start the quiz',
            startNote: 'Once you start, nobody else can join.',
            needPlayers: 'You need at least {{min}} phones at the table.',
            needQuiz: 'Pick a quiz first.',
            hostFallback: 'The host'
        },
        // The shared screen everybody at the table looks at. It only ever watches, so nothing on it is pressable.
        table: {
            // The laptop's way in, since a screen cannot scan the QR off its own display.
            door: {
                title: 'Put the quiz on a screen',
                message: 'Type the code the host has on their phone. This screen only watches — everybody still plays from their own phone.',
                codeLabel: 'Room code',
                placeholder: 'PXK7Q',
                open: 'Open the screen',
                rejected: 'That is not a quiz code. Check it on the host phone.'
            },
            connecting: 'Finding the room…',
            closed: 'The host closed the room, so this screen is done.',
            dealt: 'The quiz has started.',
            joinAt: 'Join with',
            scanHint: 'Scan this with your phone to join.',
            waitingForHost: 'Waiting for the host to start the quiz…',
            needPlayers: 'Waiting for {{needed}} more before the quiz can start.',
            scores: 'Scores',
            quizmaster: 'Quizmaster',
            guesser: 'Guesser',
            standings: 'Standings',
            answer: 'The answer',
            numbersIn: '{{done}} of {{total}} numbers in',
            typeYours: 'Type your number on your own phone.',
            // A round whose screen has not been built yet, so the phones are all there is.
            followPhones: 'Play this round on your phones.',
            missed: 'Missed',
            gotSoFar: '{{awarded}} of {{total}} so far',
            choosing: '{{name}} is picking easy or hard',
            over: 'That is the quiz.'
        },
        // The phone, which in this mode is a controller and not much else.
        control: {
            changeGuess: 'Change it',
            guessSent: 'Your number is in',
            onTheScreen: 'On the screen',
            pickAnswer: 'Pick your answer',
            roundStarting: '{{name}} is opening the round',
            theScreenHasIt: 'Everything is on the big screen.',
            submitGuess: 'That is my number',
            theyTapItThemselves: '{{name}} taps their answer on their own phone.',
            waitingFor: 'Waiting for {{name}}',
            yourChoice: 'Easy or hard?',
            yourChoiceCue: 'Pick one and your question goes on the screen',
            yourGuess: 'Your number',
            yourTurn: 'Your turn'
        },
        play: {
            loading: 'Setting up the table…',
            close: 'Leave the quiz',
            roundLabel: 'Round {{round}} · {{kind}}',
            rounds: {
                open: 'Open',
                choice: 'Multiple choice',
                closest: 'Closest guess',
                describe: 'Describe it',
                list: 'Name four',
                doubleDown: 'Double Down',
                finale: 'The final'
            },
            // Split in two so the total can be greyed out beside the number.
            questionNumber: 'Question {{number}}',
            questionTotal: ' of {{total}}',
            // The same fact at strip size: "3/8", with the total greyed out beside the number.
            questionOutOf: '/{{total}}',
            /** The two people the turn is about, above the question. */
            turn: {
                /** The banner read out as the one sentence it is. */
                spoken: '{{master}} is asking {{player}}',
                // The same, once there is a run worth saying.
                spokenRun: '{{master}} is asking {{player}}, who has taken {{run}} in a row',
                /** The strip's own header, naming whoever is running this turn. */
                quizmasterLabel: '{{name}} is quizmaster',
                /** The label over the strip's spotlighted, answering-now portrait. */
                answeringNow: 'Answering now',
                // What rounds 4 and 5 share, now that they are played the same way.
                roleQuizmaster: 'Quizmaster',
                roleGuesser: 'Guessing',
                /** The bonus walk: one screen per remaining player, one guess each. */
                bonusOf: 'Bonus · {{number}} of {{total}}',
                // The two ways off the bonus screen, which is one button wearing whichever of them the marked row says it is.
                bonusMissed: '{{name}} got nothing',
                bonusTake: '{{name}} got it',
                /** On a settle row nobody is credited with. */
                nobody: 'Nobody got it'
            },
            // The strip's one-line variant, for the rounds where nobody in particular is being asked.
            leadOpen: '{{name}} reads to the player on their left',
            leadChoice: '{{name}} reads · four options',
            leadClosest: '{{name}} reads · everyone else guesses',
            leadDescribe: '{{name}} describes their own words',
            leadList: '{{name}} asks · one player names what they can',
            // Both unused while `answering` is set.
            leadDoubleDown: '{{name}} asks easy or hard',
            leadFinale: '{{name}} reads to both finalists',
            readAloud: 'Read this out loud',
            onlyYouSeeThis: 'Only you see this',
            alsoAccept: 'Also accept: {{answers}}',
            /** The covered panel, before the quizmaster has asked to see the answer. */
            answer: {
                reveal: 'Tap to see the answer',
                revealHint: 'Keep the screen to yourself'
            },
            /** The gate in front of the verdict. */
            validate: 'Assess',
            validateHint: 'Then mark it right or wrong',
            validateLocked: 'Show the answer first',
            /** Round 2's gate, which is `validate` and the reveal in one tap — see `HotSeatBoard`. */
            gate: 'Check the answer',
            gateHint: 'Wrong passes the question to the next player.',
            wrong: 'Wrong',
            correct: 'Correct',
            /** Read out for the buttons, which are two words on their own. */
            markWrong: 'Mark {{name}} wrong',
            markCorrect: 'Mark {{name}} correct',
            wrongPassesTo: 'Wrong passes the turn to {{name}}',
            /** Nobody left to ask: the question dies here rather than passing on. */
            wrongEndsQuestion: 'Nobody else to ask, wrong ends this question',
            // `PassOnPrompt`, rounds 1 and 6 only: the one thing on screen after a wrong answer that still has somebody left to ask.
            passOn: 'Now {{name}} can guess',
            /** The line underneath, saying why the button says what it says. */
            passOnHint: '{{name}} had it wrong · tap to continue',
            /** The button's accessibility label, said whole rather than split in two. */
            passOnSpoken: 'Now {{to}} can guess the same question, because {{from}} had it wrong. Tap to continue.',
            // `QuickAssign`, the optional shortcut beside the hand-off.
            quickAssign: 'Quick',
            quickAssignSpoken: 'Quick assign: name who answered correctly',
            quickAssignTitle: 'Who got it?',
            quickAssignBody: 'Ask the table in a circle, then name who got it. Everyone you skip is marked wrong, the same as tapping Wrong down the line.',
            quickAssignNobody: 'Nobody got it',
            quickAssignConfirm: 'Assign',
            quickAssignConfirmNamed: 'Assign to {{name}}',
            quickAssignCancel: 'Back',
            // Round 2 only, replacing both lines above it.
            choiceAlwaysPasses: 'Either way, next up: {{name}}',
            // What Correct does, which is no longer only "score it".
            correctKeepsTurn: 'Correct and the next question is {{name}} again',
            // What the turn on screen pays.
            worthPoints: 'For {{worth}}',
            noPoint: 'No point',
            /** The score strip on the question card. A running total, not this round's. */
            scores: 'Scores',
            /** Round 2: the four options, read out loud. */
            choice: {
                options: 'The four options',
                // The cue above the question while it is being read.
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
                // Copying is not guessing, so the second person to say a number has to pick another one.
                duplicate: 'Two players have the same number. Ask one of them for another.',
                unreadable: 'One of those is not a number.',
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
                // How far off each guess landed, under the name.
                off: '{{off}} off',
                nearestOff: 'nearest · {{off}} off',
                // The check on the way out, when a row is still blank.
                missingTitle: 'Not everybody has a number',
                missingOne: '{{names}} has nothing written down, so they cannot win this one.',
                missingMany: '{{names}} have nothing written down, so they cannot win this one.',
                missingBack: 'Go back and fill them in',
                missingAnyway: 'Settle it anyway',
                // The screen after the settle: who was right, before the phone moves on.
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
                /** The ready screen's rules list, one row each rather than one paragraph. */
                readyRuleOnlyGuesser: 'You describe to {{guesser}}, and only their answers count while the clock is running',
                readyRuleTime: '{{seconds}} seconds to get through as many of your {{words}} words as you can',
                readyRuleNoSaying: 'Never say the word itself — it will not count',
                readyRuleBothScore: 'Every word {{guesser}} gets is a point for them and a point for you',
                readyRuleBonus: 'When time is up, the other {{others}} each get one guess at a word nobody got',
                start: 'Show my words and start',
                dontSayIt: 'Never say the word itself',
                /** Shown again mid-timer, so it does not depend on being remembered. */
                runningReminder: 'Tap a word off as {{guesser}} gets it. The rest of the table gets its go afterwards.',
                /** The first scoring screen: what the guesser got inside the thirty seconds. */
                inTimeTitle: 'What did {{guesser}} get?',
                inTimeHint: 'Tap every word {{guesser}} said before time ran out',
                toBonus: 'Bonus round · {{left}} left over',
                toSettle: 'On to the points',
                bonusHint: 'The quizmaster says nothing more, but every other player gets one guess at what is left — off whatever they just heard.',
                scoringTitle: 'How the turn went',
                /** What the turn is about to be worth to the person who described it. */
                standing: '{{name}} takes {{points}} from this turn',
                scoreAgain: 'Score this turn again',
                settle: 'Hand out the points'
            },
            // Round 5: one question, four answers, and twenty seconds with the player on the reader's left.
            list: {
                /** The ready screen's rules list, one row each rather than one paragraph. */
                readyRuleOnlyGuesser: 'You ask {{guesser}}, and until their turn is over only their answers count',
                readyRuleTime: '{{seconds}} seconds to name as many of the {{answers}} answers as they can',
                readyRuleGuesses: '{{guesses}} guesses to name as many of the {{answers}} answers as they can',
                readyRuleHidden: 'The answers are on your screen only. Never read them out.',
                readyRuleScore: 'Every answer they get is {{worth}} point for them',
                readyRuleBonus: 'Afterwards the other {{others}} each get one guess at an answer nobody got',
                start: 'Show the answers and start',
                // The beat between the rules and the clock.
                preTimerHint: 'First read the question out loud, then start the timer and {{guesser}} can start guessing',
                startTimer: 'Start the timer',
                /** Shown again mid-timer, so it does not depend on being remembered. */
                runningReminder: 'Tick off every answer {{guesser}} says. Nobody else counts yet.',
                // Zen mode's stand-in for the clock, said in a notification rather than drawn as a meter.
                zenNotice: 'No time pressure here. {{guesser}} can guess {{nGuesses}} times, and afterwards everybody else gets one bonus guess at an answer nobody got.',
                /** The confirm screen: one last look before the leftovers go round the table. */
                inTimeTitle: 'What did {{guesser}} get?',
                inTimeHint: "Tap every answer {{guesser}} got — including the one they named right at the end",
                toBonus: 'Bonus round · {{left}} left over',
                toSettle: 'On to the points',
                bonusHint: 'One guess at one of these. Get it and the point is yours.',
                scoringTitle: 'How the question went',
                /** What the question is about to be worth to the person who was asked it. */
                standing: '{{name}} takes {{points}} from this question',
                scoreAgain: 'Score this question again',
                settle: 'Hand out the points'
            },
            // Round 6: easy or hard, asked before there is a question to read.
            doubleDown: {
                ask: 'Easy or hard, {{name}}?',
                /** Said out loud, because the choice is made at the table rather than on screen. */
                cue: 'Ask out loud, then tap what they pick',
                easy: 'Easy · {{points}} point',
                hard: 'Hard · {{points}} points'
            },
            // The screen that opens every round, before the phone is handed to anybody.
            intro: {
                /** Under the number: "of 6". */
                of: 'of {{total}}',
                /** The headline. The table calls rounds by their number, so it is the number. */
                round: 'Round {{round}}',
                briefOpen: 'Twenty open questions, and they can be about anything. The reader asks the player on their left; get it right and the next one is yours as well, miss it and it moves on round the table. Only every second question is worth a point.',
                briefChoice: 'Hard questions, this time with four answers to choose from. One question each, read out with all four options — and every single one of them is worth two points.',
                briefClosest: 'A question with a number for an answer. Everybody except the reader says one guess, and no two people may say the same number. Whoever lands nearest takes two points.',
                briefDescribe: 'Thirty seconds each to describe your own words — to the player on your left, and to nobody else. Every word they get is a point for them and a point for you. When time is up, everybody else gets one guess at a word that was missed.',
                briefList: 'One question with four answers hiding in it. The reader asks the player on their left, who has twenty seconds to name as many as they can. Whatever is left then goes round the rest of the table, one guess each. Every answer that lands is a point for whoever named it.',
                briefListZen: 'One question with four answers hiding in it. The reader asks the player on their left, who has no clock and gets eight guesses to name as many as they can. Whatever is left then goes round the rest of the table, one guess each. Every answer that lands is a point for whoever named it.',
                briefDoubleDown: 'Easy or hard? Every player is asked which they would rather have: an easy question is worth 1 point, a hard one 3. There are five of each, so once a side is spent you take what is left. Miss it and it goes round the table — and whoever takes it gets its full value.',
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
                // What the person taking the phone is about to do.
                jobOpen: '{{name}} reads to the player on their left',
                jobChoice: '{{name}} reads the question and all four options',
                jobClosest: '{{name}} reads the question and collects everyone else’s number',
                jobDescribe: '{{name}} describes their own words to the player on their left. Nobody else may look at the screen.',
                jobList: '{{name}} reads the question out and ticks off every answer the player on their left gets.',
                jobDoubleDown: '{{name}} asks the next player easy or hard, then reads out whichever question comes up.',
                jobFinale: '{{name}} reads to both finalists. {{name}} is not playing this round.',
                // The round's rule, said on the one screen with room to say it properly.
                ruleOpen: 'Get one right and the next question is yours too. Miss one and it moves on. Every second question scores.',
                ruleChoice: 'Same as before: get one right and the next is yours too. Every question is worth 2 here.',
                ruleClosest: 'Everybody but the reader guesses once, and no two people may say the same number. Nearest takes 2.',
                ruleDescribe: 'Thirty seconds, played to the person on your left. Every word they get is a point for them and a point for you.',
                ruleList: 'Twenty seconds, and only the player on your left is answering. Whatever they miss goes round the rest of the table for one guess each.',
                ruleDoubleDown: 'Easy pays 1, hard pays 3, and there are five of each — so a side can run out. Miss it and it moves on round the table for its full value.',
                ruleFinale: 'Every question goes first to whoever is behind. If they miss it, the other one can still take it. 100 points an answer, and the most points wins the night.',
                action: 'Show the question'
            },
            standings: {
                // The accent band over the scoreboard, which is the one thing on that screen saying where in the evening it is.
                label: 'Round {{round}} of {{total}} done',
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
                // The banner across the top of the winner's card.
                winnerLabel: 'Winner',
                /** Under the winner's name, on the card. Their whole evening in one number. */
                points: '{{score}} points',
                // Nobody won outright.
                tieLabel: 'Shared first',
                tieTitle: 'Too close to call',
                tieDescription: 'Nobody finished ahead. The night is shared.',
                /** The rest of the table, under the winner's card. */
                restLabel: 'The rest of the table'
            }
        },
        // Written here rather than passed through from the API, for the reason `lol.errors` spells out.
        errors: {
            // The multi device room, refused.
            lobbyFull: 'That room is full. Eight phones is the most that fit at one table.',
            alreadyStarted: 'That room has already started. Ask for a new code.',
            lobbyGone: 'That room no longer exists. Check the code.',
            notHost: 'Only whoever opened the room can change that.',
            notAtThisTable: 'You are not at this table.',
            notYourSeat: 'It is not your turn to answer that.',
            expired: 'You have been signed out. Sign in again to start a quiz.',
            quizGone: 'That quiz is no longer available. Pick another one.',
            badTable: 'The table was refused. Check the names and try again.',
            tooFewPlayers: 'A quiz needs at least two players.',
            tooManyPlayers: 'Eight players is the most that fit at one table.',
            duplicateName: 'Two players cannot share a name.',
            quizTooSmall: 'This quiz does not have enough questions for that many players. Pick another quiz, or play with fewer people.',
            generic: 'The quiz could not be started. Try again.',
            network: 'No connection to the server. Check your internet.',
            // The turn moved under the screen — a second tap, or a phone left open on something the table has already played.
            staleTurn: 'The table has already moved on. The board below is where the quiz actually is.',
            duplicateGuess: 'Two players cannot guess the same number. Ask one of them for another.',
            quizmasterCannotGuess: 'Whoever is reading the question out does not get to guess at it.',
            describerCannotGuess: 'You cannot be credited with a word you were describing.',
            /** Round 4's two halves, refused: one name per word, one bonus guess each. */
            oneGuessEach: 'Everybody but the player being asked gets one guess.',
            twoOnOne: 'Only one player can be credited with that.',
            /** Round 2 judges itself on the answerer's phone, and round 6's question is the player's own to pick. */
            verdictDisagrees: 'That is not what the quiz says about that answer. Check which option was tapped.',
            noChoiceYet: 'Nobody has picked easy or hard yet, so there is no question to judge.'
        }
    },
    oneOfUs: { 
        index: {
            description: "Can you tell the civilians apart from the imposter(s)?",
            oneDevice: {
                title: "1 device",
                description: "Play with 1 phone that is passed around",
                action: "Play"
            },
            multiDevice: {
                title: "Multi device",
                description: "Create a lobby and invite other players",
                action: "Create lobby"
            }
        },
        singleDevice: {
            title: "Play with 1 device",
            description: "Fill in all the names of the people you are playing with. Then press start.",
            players: {
                tooFew: 'One of Us needs at least three players.',
                tooMany: 'Nine players is the most that fit round one phone.',
                duplicate: 'Two players cannot share a name.'
            }
        },
        multiDevice: {
            lobby: {
                opening: 'Opening the room…',
                noLobby: 'No room',
                hostStoppedGame: 'The host stopped the game. Ask for a new code for another round.',
                hostClosedLobby: 'The host closed the room. Ask for a new code.',
                running: {
                    gameTitle: 'You are already playing',
                    lobbyTitle: 'You still have a room open',
                    gameMessage: 'You are still playing a game in room {{code}}. Continue, or stop it and open a new room.',
                    lobbyMessage: 'Room {{code}} is still open in your name. Go back to it, or close it and open a new one.',
                    resumeGame: 'Continue playing',
                    resumeLobby: 'Go to open room',
                    stopGame: 'Stop game',
                    closeLobby: 'Stop game and create new'
                },
                confirmClose: {
                    title: 'Close the room?',
                    message: 'The room is deleted and the code stops working. Everyone already in it is thrown out.',
                    action: 'Close'
                },
                confirmLeave: {
                    title: 'Leave the room?',
                    message: 'You go back to the game menu. You can join again later with the same code.',
                    action: 'Leave'
                },
                stay: 'Stay here',
                start: 'Start the game',
                startNote: 'Once you start, nobody else can join.',
                // Interpolated rather than fixed at three: the floor is the server's, and it arrives on every lobby as `minPlayers`.
                needPlayers: 'You need at least {{min}} players.',
                hostFallback: 'The host',
                settingsTitle: 'Game settings'
            },
            play: {
                loading: 'Dealing the roles…',
                noGame: 'No game',
                waiting: 'Waiting for the table…',
                // There is no round total to count against, so the band says what the table is doing instead.
                phase: {
                    deal: 'Round {{round}} · the word',
                    answer: 'Round {{round}} · clue',
                    vote: 'Round {{round}} · vote',
                    reveal: 'Round {{round}} · result',
                    waiting: 'Round {{round}}'
                },
                stillIn: '{{count}} still in',
                progress: '{{done}} / {{total}}',
                out: {
                    title: 'You are out',
                    message: 'The table voted you out. Stay and watch how it ends — you cannot answer or vote any more.'
                },
                deal: {
                    title: 'Take your note',
                    action: 'Got it'
                },
                answer: {
                    title: 'Write your note',
                    // The note's own heading, so it stays small: it is there as a reminder, not as an announcement.
                    about: 'About: {{prompt}}',
                    aboutBlank: 'You got a blank note',
                    field: 'Your note',
                    placeholder: 'Something only somebody with your prompt would write',
                    counter: '{{typed}} / {{max}} · anonymous on the board',
                    submit: 'Pin it up',
                    hung: 'Up on the board · anonymous',
                    pinned: 'Already up',
                    waitingMessage: 'Waiting for the rest of the table. Voting starts the moment the last note goes up.'
                },
                vote: {
                    title: 'Which note does not fit?',
                    mine: 'YOU',
                    // In two pieces, because the name between them is bold.
                    tie: 'A tie?',
                    tieTail: 'settles it.',
                    confirm: 'Pin this note',
                    waiting: 'Your vote is in. Waiting for the rest of the table.'
                },
                reveal: {
                    title: 'The notes turned over',
                    votedOut: '{{name}} · voted out',
                    tieBroken: 'The vote tied, so the mayor settled it.',
                    next: 'Round {{round}}',
                    toResult: 'See how it ended'
                }
            },
            errors: {
                lobbyFull: 'That room is full.',
                alreadyStarted: 'That game has already started.',
                notHost: 'Only the host can do that.',
                notEnoughPlayers: 'You need more players before you can start.',
                tooManyPlayers: 'That is more players than One of Us can seat.',
                gameNotOver: 'The game is still going.',
                noContent: 'There are no prompts for that language yet.',
                lobbyGone: 'That room is no longer there.',
                alreadyAnswered: 'Your answer for this round is already in.',
                alreadyVoted: 'You have already voted this round.',
                cannotVoteSelf: 'You cannot vote for your own answer.',
                votedOut: 'You have been voted out, so you no longer answer or vote.',
                wrongRound: 'That round has moved on. One moment.',
                wrongPhase: 'The table is somewhere else. One moment.',
                badAnswer: 'That answer will not do. Write something, and keep it short.',
                gameFinished: 'That game is over.'
            }
        },
        settings: {
            wordsOnly: {
                title: "Use words only",
                description: "Use words only. Otherwise, a sentence."
            },
            // Which of the liars this table is willing to be dealt.
            roles: {
                title: 'Roles',
                description: 'Which roles can be dealt out.',
                /** Beside the label, in place of the switches' own answer. */
                count: '{{enabled}} of {{total}}',
                /** Under the group, once there is only one switch left standing. */
                locked: 'One kind of imposter has to stay on — without one, nobody can win.',
                imposter: {
                    description: 'Gets a different word and has to bluff along.'
                },
                nitwit: {
                    description: 'Gets no word at all.'
                }
            }
        },
        play: {
            loading: 'Dealing out the words…',
            close: 'Leave the game',
            // The header, every round.
            roundSpeak: 'Round {{round}} · turn',
            roundDiscuss: 'Round {{round}} · discuss',
            roundVote: 'Round {{round}} · vote',
            roundResult: 'Round {{round}} · result',

            // The note you drew. Both ways of playing share it.
            note: {
                label: 'Your word',
                blurb: 'Somebody got a blank note.',
                blurbBlank: 'You are that somebody. Build every turn out of what you hear.',
                cover: 'Tap to read your note',
                coverHint: 'Hold the phone so nobody else can read it.'
            },

            // The pass-the-phone reveal, once per player before the first round.
            reveal: {
                step: 'Word {{number}} of {{total}}',
                title: '{{name}} is up',
                // Two bodies, because `HandoffScreen` takes `from: Seat | null` and the first player has nobody to take the phone from.
                body: 'Take the phone from {{from}} and hold it where only you can see it.',
                bodyFirst: 'Only {{name}} may look at the next screen.',
                note: 'Nobody else may look.',
                action: "I'm {{name}}",
                // Who has not been handed the phone yet, under the role card.
                queue: 'Still to come: {{names}}',
                secretLabel: 'Tap to see your word',
                secretHint: 'Hold the phone so nobody else can read it.',
                warning: 'Only you see this',
                /** What the one player who was dealt nothing reads where a word would be. */
                noWord: 'No word at all',

                // The side you are on, uncovered with the word.
                role: {
                    label: 'Your role',
                    civilian: {
                        name: 'Civilian',
                        explanation: 'Everybody with your word belongs. Find the one who does not have it.'
                    },
                    imposter: {
                        name: 'Imposter',
                        explanation: 'Your word is not the one the rest of the table got. Bluff along and survive.'
                    },
                    // What a civilian and an imposter are shown instead of `civilian` or `imposter` above.
                    unknown: {
                        name: 'Civilian or Imposter',
                        explanation: "You don't know which one you are. Watch the table, listen to the word, and work it out."
                    },
                    nitwit: {
                        name: 'The nitwit',
                        explanation: 'You got no word at all. Build every turn out of what you hear.'
                    }
                },
                /** After the word is open: the way on, phrased as putting it away. */
                hide: 'Hide',
                done: 'Pass to {{name}}',
                lastDone: 'Got it — start round 1'
            },

            // One speaker at a time, in an order reshuffled every round.
            speak: {
                // Loses the round it used to carry.
                step: 'Speaker {{number}} of {{total}}',
                nowSpeaking: 'Now speaking',
                hint: 'Say one word about your own word. Do not say the word itself.',
                next: 'Next: {{name}}',
                lastNext: 'Everyone has spoken'
            },

            discuss: {
                /** The middle of the ring, which has room for three words at most. */
                ring: 'Vote',
                title: "Who's getting voted out?",
                description: "Everyone points at someone they don't trust. Whoever gets the most votes is voted out. Abstaining is not allowed.",
                /** Shown throughout: nobody gets to argue their case, only vote. */
                tieNote: "You can't defend your choice. Just vote — no discussion allowed!",
                tieNoteMayor: "You can't defend your choice. Vote without discussion! If it's a tie, {{name}} decides as mayor.",
                action: 'Vote'
            },

            vote: {
                title: 'Who does not fit?',
                nobody: 'Nobody chosen yet',
                confirm: 'Pin {{name}}',
                confirmHint: 'This cannot be undone.',
                locked: 'Tap a name first.'
            },

            /** What the table is told the moment somebody leaves. */
            elimination: {
                /** Above their name, on the seat that is about to disappear. */
                ringLabel: 'Voted out',
                civilian: '{{name}} was one of the civilians',
                imposter: '{{name}} was an imposter',
                nitwit: '{{name}} was the nitwit',
                // Whether the table had the right one.
                hit: 'hit',
                miss: 'miss',
                remaining: '{{players}} still in the game.',
                next: 'Round {{round}}'
            },

            // Every role the game can deal, read out to the table before the phone starts going round.
            briefing: {
                title: 'Who is at the table',
                intro: 'Everybody is dealt one of these. Read them out before you start.',
                /** Replaces the reveal card's "Your role" eyebrow. */
                roleLabel: 'Role',
                role: {
                    civilian: 'Most of the table are civilians. They all share one word and have to work out who does not have it.',
                    imposter: 'The imposters got a different word and do not know the real one. They bluff along, and win by surviving.',
                    nitwit: 'The nitwit got no word at all and plays with the imposters — who have no idea who they are.'
                },
                action: 'Hand out the words'
            },

            over: {
                /** The band along the top. The headline under it says who won. */
                label: 'Game over',
                civilians: 'The civilians win',
                imposters: 'The imposters win',
                civiliansWhy: 'Every imposter has been voted out.',
                impostersWhy: 'The imposters are no longer outnumbered.',
                /** The reveal at the end: who was what, all of it at once. */
                rolesTitle: 'Everybody',
                civilianTag: 'Civilian',
                imposterTag: 'Imposter',
                nitwitTag: 'Nitwit',
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
    fakeFiller: {
        index: {
            description: 'A sentence with a hole in it. Some of you secretly invent a filling; everyone else has to spot which one is real.',
            multiplayer: {
                title: 'Play together',
                description: 'Everyone on their own phone. One opens the room, the rest come in with the code.',
                action: 'Open a room'
            }
        },
        lobby: {
            loading: 'Looking for your room…',
            opening: 'Opening the room…',
            noLobby: 'No room',
            hostStoppedGame: 'The host stopped the game. Ask for a new code for another round.',
            hostClosedLobby: 'The host closed the room. Ask for a new code.',
            running: {
                gameTitle: 'You are already playing',
                lobbyTitle: 'You still have a room open',
                gameMessage: 'You are still playing a game in room {{code}}. Continue, or stop it and open a new room.',
                lobbyMessage: 'Room {{code}} is still open in your name. Go back to it, or close it and open a new one.',
                resumeGame: 'Continue playing',
                resumeLobby: 'Go to open room',
                stopGame: 'Stop game',
                closeLobby: 'Stop game and create new'
            },
            confirmClose: {
                title: 'Close the room?',
                message: 'The room is deleted and the code stops working. Everyone already in it is thrown out.',
                action: 'Close'
            },
            confirmLeave: {
                title: 'Leave the room?',
                message: 'You go back to the game menu. You can join again later with the same code.',
                action: 'Leave'
            },
            stay: 'Stay here',
            start: 'Start the game',
            startNote: 'Once you start, nobody else can join.',
            // Interpolated rather than fixed at three: the floor is the server's, and it arrives on every lobby as `minPlayers`.
            needPlayers: 'You need at least {{min}} players.',
            hostFallback: 'The host',
            settingsTitle: 'Game settings',
            mode: 'Prompts',
            modeFacts: 'True facts',
            modeCreative: 'Anything goes',
            // The one setting worth a sentence.
            modeFactsHint: 'Every prompt has a real answer hidden among the fakes. Find it and you score.',
            modeCreativeHint: 'No right answer — just the fakes. The only points are for being picked, and it takes three players.'
        },
        play: {
            loading: 'Dealing the prompts…',
            noGame: 'No game',
            writing: {
                title: 'Fill in the blanks',
                // Says the goal in one line, because it is the opposite of what a quiz trains people to do and is worth stating plainly.
                intro: 'Two prompts are yours. Invent something believable — you score every time somebody picks it.',
                promptOf: 'Prompt {{index}} of {{total}}',
                blank: 'Blank {{index}}',
                blankPlaceholder: 'Your answer',
                submit: 'Lock it in',
                locked: 'Locked in',
                edit: 'Change it',
                incomplete: 'Fill in every blank first.',
                waitingTitle: 'Both of yours are in',
                waitingMessage: 'Waiting for the rest of the table. Voting starts the moment the last answer lands.',
                progress: '{{done}} of {{total}} answers in'
            },
            voting: {
                title: 'Which one is real?',
                titleCreative: 'Which one do you like best?',
                roundOf: 'Round {{round}} of {{total}}',
                pick: 'Pick this one',
                confirm: 'Lock in my vote',
                voted: 'Vote counted',
                yoursTitle: 'This one is yours',
                yoursMessage: 'You wrote for this prompt, so you sit this round out. Fingers crossed somebody falls for it.',
                progress: '{{done}} of {{total}} votes in',
                waiting: 'Waiting for the others to vote…'
            },
            reveal: {
                title: 'The results',
                truthWas: 'The real one was',
                // What picking the truth is worth, which is not the same as what writing a good fake is worth.
                truthReward: 'spotting it is worth a point',
                truth: 'The truth',
                fake: 'Fake',
                nobodyPicked: 'Nobody picked this',
                pickedBy: 'Picked by {{names}}',
                points: '+{{points}}',
                noScore: 'No points this round.',
                next: 'Next round',
                toResults: 'See the final scores'
            }
        },
        results: {
            loading: 'Loading the result…',
            title: 'Game over',
            tie: 'A tie at {{score}} points.',
            youWin: 'You win with {{score}} points.',
            playerWins: '{{name}} wins with {{score}} points.',
            againSamePlayers: 'Once more, same players',
            autoJoin: 'Everyone still on this screen is taken along to the new room automatically.',
            anotherRound: 'Another round?',
            hostCanOpen: 'The game is done. The host can open a new room. Stay here and you come along automatically.'
        },
        errors: {
            expired: 'Your session has expired. Log in again.',
            gameGone: 'This game no longer exists.',
            generic: 'Something went wrong. Please try again.',
            network: 'Could not reach the server. Check your connection and try again.',
            lobbyFull: 'This room is full.',
            lobbyGone: 'This room does not exist any more. Check the code.',
            alreadyStarted: 'This game has already started.',
            notEnoughPlayers: 'You need more players to start.',
            tooManyPlayers: 'That is too many players for one game.',
            // A short data file is a broken build rather than a broken request.
            noContent: 'There are not enough prompts to play in this language. Try the other one.',
            notYourPrompt: 'That prompt was not dealt to you.',
            alreadyAnswered: 'You have already filled that one in.',
            alreadyVoted: 'You have already voted on this round.',
            cannotVoteOwnPrompt: 'You wrote for this one, so you cannot vote on it.',
            wrongRound: 'The table has moved on to the next round.',
            wrongPhase: 'The table is not doing that yet.',
            badAnswer: 'Fill in every blank before locking it in.',
            gameFinished: 'This game is over.'
        }
    },
    friends: {
        title: 'Friends',
        description: 'Play together, keep track of who wins and challenge each other.',
        // The one rule worth stating plainly: there is no search and nothing to accept.
        how: {
            title: 'How friends work',
            message: 'You do not add people here. Play a game together — join the same lobby — and everyone in it lands on this list. There is no search, and nothing to accept.'
        },
        listLabel: 'Your friends',
        // The day somebody joined a room you were in.
        since: 'Since {{date}}',
        empty: {
            title: 'Nobody here yet',
            message: 'Start a game and share the code, or join someone else’s. Everyone in the lobby ends up here.'
        },
        errors: {
            signedOut: 'Your session ran out. Sign in again to see your friends.',
            generic: 'Your friends could not be loaded.',
            network: 'No connection. Check your internet and try again.'
        }
    },
    invite: {
        title: 'Invite a friend',
        message: 'They get a nudge in the app, or a notification on their phone if it is closed.',
        send: 'Invite',
        sent: 'Invited',
        failed: 'Did not send',
        // Somebody already sitting in this room. Shown rather than hidden, so the list does not reshuffle as people arrive.
        alreadyHere: 'In the lobby',
        noFriends: 'You have not played with anybody yet. Share the code instead — everyone who joins lands on your friends list.',
        loadFailed: 'Your friends could not be loaded.'
    },
    notifications: {
        invite: '{{name}} invited you to {{game}}',
        inviteGeneric: '{{name}} invited you to a game',
        join: 'Join',
        dismiss: 'Dismiss'
    }
} as const;
