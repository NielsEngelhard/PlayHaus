import type { Catalog } from '@/features/i18n/catalog';

export const nl: Catalog = {
    common: {
        retry: 'Opnieuw',
        back: 'Terug',
        backToGames: 'Terug',
        busy: 'Bezig…',
        failed: 'Mislukt',
        close: 'Sluiten',
        save: 'Opslaan',
        you: 'Jij',
        host: 'Host',
        yourTurn: 'AAN ZET',
        and: 'en',
        // De twee woorden waarmee een `Toggle` zichzelf stempelt.
        on: 'AAN',
        off: 'UIT',
        loading: 'Even geduld…',
        language: 'Taal',
        selectValue: '{{label}}: {{value}}',
        nothingSelected: 'niets gekozen',
        change: 'verander',
        minutes: 'min',
        start: 'Start',
        next: 'Verder',
        stepOf: 'Stap {{step}} van {{total}}',
        time: {
            justNow: 'zojuist',
            minutesAgo: '{{minutes}} min geleden',
            hoursAgo: '{{hours}} uur geleden',
            yesterday: 'gisteren',
            daysAgo: '{{days}} dagen geleden',
            onDate: 'op {{day}} {{month}} {{year}}',
            months: {
                jan: 'jan', feb: 'feb', mar: 'mrt', apr: 'apr',
                may: 'mei', jun: 'jun', jul: 'jul', aug: 'aug',
                sep: 'sep', oct: 'okt', nov: 'nov', dec: 'dec'
            },
            days: {
                mon: 'ma', tue: 'di', wed: 'wo', thu: 'do',
                fri: 'vr', sat: 'za', sun: 'zo'
            }
        },
      player: {
            players: "Spelers",
            add: "Toevoegen",
            remove: "Verwijder",
            namePlaceholder: "Naam",
            seated: "{{players}} spelers"
        }
    },
    nav: {
        games: 'Spellen',
        reconnect: 'Reconnect',
        friends: 'Vrienden',
        profile: 'Profiel'
    },
    chrome: {
        toDarkMode: 'Schakel over naar donkere modus',
        toLightMode: 'Schakel over naar lichte modus',
        muteSound: 'Zet al het geluid uit',
        unmuteSound: 'Zet het geluid aan',
        signedInAs: 'Ingelogd als {{name}}. Ga naar je profiel.'
    },
    notFound: {
        title: 'Pagina niet gevonden',
        message: 'Deze pagina bestaat niet, of is verplaatst.',
        action: 'Terug naar home'
    },
    home: {
        headline: {
            title: 'Kleine spelletjes,',
            accent: 'groot plezier.'
        },
        subtitle: 'Partygames voor jou en je vrienden. Kies er eentje en spelen maar!',
        stillRunning: {
            label: 'Nog bezig',
            line: '{{title}} · {{mode}} {{time}}'
        },
        join: {
            placeholder: 'CODE',
            action: 'Join',
            label: 'Lobbycode'
        },
        startNew: 'Alle spellen',
        bottomTeaser: "Meer spellen in de maak...",
    },
    games: {
        device: {
            perPlayer: '1 per speler',
            oneDevice: '1 totaal',
            perPlayerOrOneDevice: 'keuze'
        },
        leagueOfLetters: {
            description: 'Test je woordenschat. Solo, of tegen je vrienden.',
            mainCategory: 'Woord raden',
        },
        quizzer: {
            description: 'Stel je algemene kennis op de proef.',
            mainCategory: 'Trivia',
        },
        oneOfUs: {
            description: 'Ontraadsel wie de bedrieger is.',
            mainCategory: 'Bluf',
        },
        fakeFiller: {
            description: 'Verzin een fout antwoord.',
            mainCategory: 'Misleiding',
        },
        sketchOff: {
            description: 'Wie kan het beste tekenen?',
            mainCategory: 'Creatief',
        },        
        newBadge: 'Nieuw',
        wipBadge: 'In de maak'
    },
    // De joinkaart, die van geen enkel spel in het bijzonder is.
    join: {
        label: 'JOIN EEN GAME',
        // Dezelfde kaart, op een breed scherm in tweeën.
        labelWide: 'TYP DE CODE',
        paste: 'Plakken',
        pasteLabel: 'Code plakken',
        codeLabel: 'Joincode',
        // Het chipje naast de vakjes, zodra het eerste teken erin staat.
        gameHint: 'Je joint {{game}}',
        // Een complete code die niets opent.
        rejected: 'Dit is geen code die we kunnen openen. Check hem en probeer opnieuw.',
        scanRowTitle: 'Of scan zijn scherm',
        scanRowHint: 'Je zit er meteen in',
        scanAction: 'Scan liever',
        scanCopy: 'Richt je telefoon op de code van de host',
        scanTitle: 'Scannen om te joinen',
        scanLabel: 'Scan een QR-code om een game te joinen',
        scanCancel: 'Annuleren',
        permissionAsk: 'De camera is nodig om de code van de host te lezen. Er wordt niets opgenomen of verstuurd.',
        permissionGrant: 'Camera toestaan',
        // Hier geen knop onder: dit antwoord verander je in de instellingen.
        permissionDenied: 'De camera is geblokkeerd voor deze app. Sta hem toe in je instellingen, of typ de code gewoon in.'
    },
    languages: {
        nl: { description: 'Spellen in het Nederlands' },
        en: { description: 'Games in english' }
    },
    auth: {
        login: {
            title: 'Inloggen',
            email: 'E-mail',
            emailPlaceholder: 'jij@voorbeeld.nl',
            password: 'Wachtwoord',
            passwordPlaceholder: 'Je wachtwoord',
            submit: 'Inloggen',
            submitting: 'Bezig met inloggen…',
            signupPrompt: 'Nog geen account? Maak er een aan'
        },
        signup: {
            title: 'Account aanmaken',
            name: 'Speelnaam',
            namePlaceholder: 'Jouw naam',
            email: 'E-mail',
            emailPlaceholder: 'jij@voorbeeld.nl',
            password: 'Wachtwoord',
            passwordPlaceholder: 'Kies een wachtwoord',
            submit: 'Account aanmaken',
            submitting: 'Bezig met aanmaken…',
            nameNote: 'Dit is de naam die medespelers in een lobby zien. Je kunt hem later aanpassen in je profiel.',
            invalidEmail: 'Dit lijkt geen e-mailadres te zijn.'
        },
        guestLanguage: {
            title: 'Welkom bij Playhaus',
            description: 'Kies de taal waarin je wilt spelen.',
            note: 'Hierna kies je een gebruikersnaam, en dat meldt je aan met een gastaccount. Je kan dit account later gratis upgraden naar een normaal account.',
            login: 'Heb je al een account? Log in'
        },
        guestUsername: {
            title: 'Kies een gebruikersnaam',
            description: 'Dit is de naam die medespelers in een lobby zien. Je kunt hem later aanpassen in je profiel.',
            placeholder: 'Jouw gebruikersnaam',
            random: 'Willekeurige gebruikersnaam',
            note: 'Min {{min}}, max {{max}} tekens.',
            submit: 'Doorgaan',
            submitting: 'Bezig met aanmelden…'
        },
        errors: {
            invalidCredentials: 'Dit e-mailadres en wachtwoord horen niet bij een account.',
            emailInUse: 'Dit e-mailadres is al in gebruik.',
            generic: 'Er ging iets mis. Probeer het opnieuw.',
            network: 'Geen verbinding met de server. Check je verbinding en probeer het opnieuw.'
        }
    },
    profile: {
        loading: 'Profiel laden…',
        card: { action: 'Mijn profiel', caption: 'Dit ben jij, knapperd!' },
        name: {
            label: 'Speelnaam',
            placeholder: 'Jouw naam',
            random: 'Willekeurige naam',
            note: 'Min {{min}}, max {{max}} tekens. Dit is wat medespelers in een lobby zien.'
        },
        avatar: { title: 'Avatarkleur' },
        colors: {
            lemon: 'Citroen',
            fire: 'Vuur',
            cobalt: 'Kobalt',
            mint: 'Mint',
            blush: 'Blush',
            ink: 'Inkt'
        },
        settings: {
            title: 'Instellingen',
            sounds: { title: 'Geluid', description: 'Een zacht plopje bij elke tik.' },
            music: { title: 'Muziek', description: 'Achtergrondmuziek in de lobby en tijdens het spelen.' },
            vibration: { title: 'Trillen', description: 'Korte haptic feedback op mobiel.' }
        },
        guest: {
            title: 'Gastaccount',
            message: 'Je speelt als gast. Dit account is tijdelijk: statistieken en progressiegaan verloren wanneer ik ga opruimen. Voeg een e-mailadres en wachtwoord toe om een echt account te maken.',
            action: 'Upgrade (gratis)'
        },
        upgrade: {
            title: 'Houd je account',
            description: 'Voeg een e-mailadres en een wachtwoord toe en dit account wordt definitief. Je naam, kleur en games blijven precies zoals ze zijn.',
            email: 'E-mail',
            emailPlaceholder: 'jij@voorbeeld.nl',
            password: 'Wachtwoord',
            passwordPlaceholder: 'Kies een wachtwoord',
            submit: 'Maak het definitief',
            submitting: 'Bezig met opslaan…',
            note: 'Vanaf dan log je op elk apparaat in met dit e-mailadres en wachtwoord.',
            invalidEmail: 'Dit lijkt geen e-mailadres te zijn.',
            shortPassword: 'Je wachtwoord heeft minstens 8 tekens nodig.'
        },
        logout: 'Uitloggen',
        errors: {
            expired: 'Je sessie is verlopen. Log opnieuw in.',
            generic: 'Er ging iets mis. Probeer het opnieuw.',
            network: 'Geen verbinding met de server. Check je verbinding en probeer het opnieuw.'
        }
    },
    reconnect: {
        hero: {
            title: 'Een spel joinen', accent: 'met een code',
            resume: { title: 'Ga verder', accent: 'waar je gebleven was' }
        },
        loading: 'Spellen zoeken…',
        stillRunning: 'Nog bezig',
        orJoin: 'Of join een spel',
        nothingRunning: 'Niets bezig',
        updated: 'Bijgewerkt {{time}}',
        resume: 'Verder spelen met {{game}}',
        refresh: { label: 'Opnieuw naar spellen kijken', action: 'Opnieuw kijken' },
        empty: {
            title: 'Geen spellen meer bezig',
            message: 'Alles wat je halverwege laat liggen staat hier weer klaar om verder te spelen.'
        },
        mode: { solo: 'Solo', lobby: 'Lobby', oneDevice: '1 telefoon' },
        errors: {
            expired: 'Je sessie is verlopen. Log opnieuw in.',
            generic: 'Er ging iets mis bij het ophalen van je spellen. Probeer het opnieuw.',
            network: 'Geen verbinding met de server. Check je verbinding en probeer het opnieuw.'
        }
    },
    lobby: {
        yourRoom: 'Jouw kamer',
        named: 'Lobby {{code}}',
        live: 'Live',
        offline: 'Offline',
        disconnected: 'Verbinding met de lobby kwijt',
        close: 'Lobby sluiten',
        leave: 'Lobby verlaten',
        joinCode: 'Toegangscode',
        code: 'Lobbycode',
        codeSpoken: 'Lobbycode: {{characters}}',
        copyCode: 'Lobbycode {{characters}} kopiëren',
        copied: 'Gekopieerd',
        shareTitle: 'Kom in mijn lobby',
        shareLink: 'Deel de link',
        shareLinkLabel: 'Deel de link naar deze lobby',
        linkCopied: 'Link gekopieerd',
        shareFailed: 'Delen lukte niet',
        qrLabel: 'Toon een QR-code om deze lobby te joinen',
        qrTitle: 'Scannen om te joinen',
        qrCopy: 'Houd er een andere telefoon voor en die komt meteen in de lobby.',
        players: 'Spelers',
        playerCount: '{{taken}} van {{max}}',
        minPlayers: 'Min. {{min}}',
        inLobby: 'In de lobby',
        hostYou: 'HOST · JIJ',
        hostTag: 'HOST',
        ready: 'Klaar',
        away: 'Weg',
        freeSeat: 'Vrije plek',
        moreSeatsOne: '+ nog 1 vrije plek',
        moreSeatsMany: '+ nog {{seats}} vrije plekken',
        waiting: 'Wachten…',
        waitingForHost: 'Wachten op de host',
        waitingForHostMessage: '{{name}} zet het spel klaar. Blijf op dit scherm, het start hier meteen mee.',
        waitingLabel: 'Wachten',
        closedTitle: 'Lobby gesloten',
        inviteFriend: 'Nodig een vriend uit'
    },
    scoreboard: {
        eyebrow: 'Eindstand',
        subtitle: '{{game}} · {{rounds}} rondes',
        tie: 'Gelijkspel op {{score}}',
        youWin: 'Jij wint met {{score}}',
        playerWins: '{{name}} wint met {{score}}',
        places: {
            first: '1E',
            second: '2E',
            third: '3E'
        },
        playAgain: 'Nog een spel',
        waitingForHost: 'De host kan een nieuw spel starten — ',
        stayHere: 'blijf hier'
    },
    lol: {
        index: {
            description: 'Test je woordenschat en probeer het geheime woord te raden.',
            playingAs: 'Jij bent {{name}}',
            solo: {
                title: 'Solo',
                description: 'Speel alleen, lekker rustig.',
                action: 'Instellen',
                best: 'Best {{score}}'
            },
            multiplayer: { title: 'Multiplayer', description: 'Maak een lobby.', action: 'Openen' },
            wordOfTheDay: {
                title: 'Woord van de dag',
                resetIn: 'Nog {{time}} tot het nieuwe woord'
            },
            tournament: {
                badge: 'Nieuw',
                title: 'Toernooi',
                description: '4 tot 12 spelers, 1v1 potjes (1v1v1 bij oneven), vier rondes per potje. Twee keer verliezen en je ligt eruit.',
                action: 'Toernooi opzetten'
            }
        },
        settings: {
            loading: 'Spel zoeken…',
            title: 'Solo opzetten',
            wordLength: 'Woordlengte',
            wordLengthOption: '{{letters}} letters',
            summary: {
                seconds: '{{seconds}}s',
                hardOn: 'Moeilijk',
                hardOff: 'Normaal',
                zen: 'Zen',
                competitive: 'Competitief'
            },
            mode: {
                title: 'Spelmodus',
                badge: 'Nieuw',
                zen: {
                    label: 'Zen',
                    description: 'Een potje zonder tijd en score. Geen druk!'
                },
                competitive: {
                    label: 'Competitief',
                    description: 'Los alle drie de woorden zo snel mogelijk op met zo min mogelijk pogingen. Hoe sneller en korter, hoe hoger je score.'
                }
            },
            hardMode: {
                label: 'Moeilijke modus',
                description: 'Het woord kan elk bestaand woord in de taal zijn. Zet dit uit om met een makkelijkere woordenlijst te spelen.'
            },
            facts: '{{rounds}} rondes · {{guesses}} pogingen per ronde · eerste letter gegeven',
            competitiveFacts: '{{rounds}} rondes · {{guesses}} pogingen per ronde · tijdbonus tot {{minutes}} minuten',
            start: 'Starten',
            running: {
                title: 'Je speelt al een spel',
                message: 'Er staat nog een solospel open. Ga verder waar je gebleven was, of gooi het weg en stel een nieuw spel in.',
                resume: 'Verder spelen',
                discard: 'Weggooien'
            }
        },
        game: {
            loading: 'Spel laden…',
            loadFailed: 'Dit spel kon niet worden geladen.',
            guessUnsupported: 'Raden kan zodra de server dit ondersteunt.',
            alreadyGuessedYou: 'Die had je al.',
            alreadyGuessed: 'Die is al geprobeerd.',
            mustStartWith: 'Het woord begint met de {{letter}}.',
            resultLabel: 'Uitslag',
            viewResult: 'Bekijk de uitslag',
            nextRound: 'Volgende ronde',
            guesses: '{{guesses}}/{{max}}',
            roundOf: 'Ronde {{round}} van {{total}}',
            hint: 'Hint',
            hintLabel: 'Hint: het woord begint met de {{letter}}',
            dailyLabel: 'Woord van de dag',
            solved: 'CORRECT',
            lost: 'HELAAS',
            theWord: 'Het woord',
            attempts: 'Pogingen',
            guess: 'GO',
            clear: 'Wissen',
            timeLeft: 'Resterende tijd',
            /** Het woordlengte-label in de bovenste rij van de ronde. */
            wordLengthLabel: '{{letters}} letters',
            scoreLabel: '{{name}}, {{score}} punten',
            /** Voorleestekst voor de scorechip in de bovenste rij, die geen naam toont. */
            scoreCompactLabel: '{{score}} punten',
            playTimeLabel: 'Speeltijd: {{time}}',
            yourTurnNotice: 'JOUW BEURT!'
        },
        results: {
            loading: 'Uitslag laden…',
            loadFailed: 'De uitslag kon niet worden geladen.',
            title: 'Spel afgelopen',
            summary: 'Rondes: {{rounds}} · Letters: {{length}}',
            baseScore: 'Pogingen',
            timeBonus: 'Tijdbonus',
            total: 'Totaal',
            newHighScore: 'Nieuw persoonlijk record op {{letters}} letters!',
            again: 'Nog een keer'
        },
        lobby: {
            loading: 'Lobby zoeken…',
            opening: 'Lobby openen…',
            noGame: 'Geen spel',
            noLobby: 'Geen lobby',
            hostStoppedGame: 'De host heeft het spel gestopt. Vraag om een nieuwe code voor een volgend potje.',
            hostClosedLobby: 'De host heeft de lobby gesloten. Vraag om een nieuwe code.',
            running: {
                gameTitle: 'Je speelt al een spel',
                lobbyTitle: 'Je hebt nog een lobby open',
                gameMessage: 'Je bent nog bezig met een multiplayerspel in lobby {{code}}. Ga verder, of stop het spel en open een nieuwe lobby.',
                lobbyMessage: 'Lobby {{code}} staat nog open op jouw naam. Ga terug naar die lobby, of sluit hem en open een nieuwe.',
                resumeGame: 'Verder spelen',
                resumeLobby: 'Ga naar open lobby',
                stopGame: 'Spel stoppen',
                closeLobby: 'Stop huidige en maak nieuwe'
            },
            confirmClose: {
                title: 'Lobby sluiten?',
                message: 'De lobby wordt verwijderd en de code werkt niet meer. Iedereen die al binnen is, vliegt eruit.',
                action: 'Sluiten'
            },
            confirmLeave: {
                title: 'Lobby verlaten?',
                message: 'Je gaat terug naar het spelmenu. Je kunt later opnieuw joinen met dezelfde code.',
                action: 'Verlaten'
            },
            stay: 'Blijf hier',
            start: 'Start het spel',
            startNote: 'Zodra je start kan er niemand meer bij.',
            needPlayers: 'Je hebt minstens één medespeler nodig.',
            hostFallback: 'De host',
            settingsTitle: 'Spelinstellingen',
            timePerTurn: 'Tijd per beurt',
            timePerTurnOption: '{{seconds}} seconden'
        },
        wordOfTheDay: {
            eyebrow: 'Woord van de dag',
            streakDays: '{{days}} dagen op rij',
            guesses: 'Pogingen',
            legendMissed: 'Gemist',
            statBest: 'Beste dag',
            statAverage: 'Gemiddeld',
            statDays: 'Dagen',
            playDay: 'Speel {{day}}',
            playHint: '{{letters}} letters · geen klok',
            resume: 'Verder spelen',
            nextWord: 'Nog {{time}} tot een nieuw woord',
            bestAndNext: 'Je beste is {{guesses}} · nog {{time}} tot een nieuw woord',
            solvedInOne: 'Opgelost in {{guesses}} poging',
            solvedInMany: 'Opgelost in {{guesses}} pogingen',
            notSolved: 'Vandaag niet gehaald. Het woord was {{word}}.'
        },
        tournament: {
            loading: 'Even het toernooi ophalen…',
            noBracket: 'Geen toernooi',
            yourTournament: 'Jouw toernooi',
            start: 'Maak het schema',
            startNote: 'Zodra je start kan er niemand meer bij.',
            needPlayers: 'Een toernooi heeft minstens vier spelers nodig.',
            confirmLeave: {
                title: 'Toernooi verlaten?',
                message: 'Je potjes lopen zonder jou door en je kunt ze op de klok verliezen. Met dezelfde code kom je terug.',
                action: 'Verlaten'
            },
            // De balk bovenaan het schema.
            title: 'Toernooi · {{players}} spelers',
            schedule: 'Schema',
            nextRoundReady: 'Ronde {{stage}} kan starten',
            stageDrawn: 'Ronde {{stage}} is geloot',
            matchesLeft: '{{done}} van {{total}} potjes klaar · {{left}} nog onbeslist',
            winners: 'Winnaars {{players}}',
            losers: 'Verliezers {{players}}',
            final: 'Finale',
            stageOne: 'Ronde {{stage}} · 1 potje',
            stageMany: 'Ronde {{stage}} · {{matches}} potjes',
            nothingHere: 'Hier nog niets',
            // Eén potje in een kolom.
            playing: 'Bezig',
            upNext: 'Straks',
            bye: 'Vrije doorgang naar de volgende ronde',
            you: 'Jij',
            knockedOut: {
                title: 'Uitgeschakeld',
                message: 'Je bent {{place}}e geworden. Blijf kijken hoe de rest van het schema afloopt.'
            },
            // De poort tussen de loting en de potjes.
            matchup: {
                title: 'Jouw potje in ronde {{stage}}'
            },
            startMatches: 'Start de potjes',
            waitingForStart: 'Wachten tot {{name}} start',
            startGateOne: '1 potje is geloot en begint als de host dat zegt',
            startGateMany: '{{matches}} potjes zijn geloot en beginnen tegelijk',
            // De poort tussen de ene ronde en de volgende.
            waitingOnOne: 'Wachten op 1 potje',
            waitingOnMany: 'Wachten op {{matches}} potjes',
            readyWaiting: 'Wachten op de anderen',
            ready: 'Ik ben er klaar voor',
            readyCount: '{{ready}} van de {{total}} staan klaar · start zodra iedereen er is',
            readyGate: 'Ready wordt actief als alle {{matches}} potjes klaar zijn',
            backToBracket: 'Terug naar het schema',
            champion: {
                title: 'Kampioen',
                you: 'Je hebt het toernooi gewonnen.',
                player: '{{name}} wint het toernooi.'
            },
            lossOne: '1 verlies',
            lossMany: '{{losses}} verliezen'
        },
        errors: {
            staleServer: 'De server draait een oudere versie van dit spel. Herstart de API en probeer het opnieuw.',
            expired: 'Je sessie is verlopen. Log opnieuw in.',
            gameGone: 'Dit spel bestaat niet meer.',
            badSettings: 'Deze instellingen kloppen niet. Kies een andere woordlengte.',
            generic: 'Er ging iets mis. Probeer het opnieuw.',
            network: 'Geen verbinding met de server. Check je verbinding en probeer het opnieuw.',
            invalidWord: 'Ongeldig woord.',
            roundClosed: 'Deze ronde neemt geen gokken meer aan.',
            lobbyFull: 'Deze lobby zit vol.',
            lobbyGone: 'Deze lobby bestaat niet (meer). Check de code.',
            alreadyStarted: 'Dit spel is al begonnen.',
            alreadyPlayedToday: 'Je hebt vandaag al gespeeld. Kom morgen terug.',
            notEnoughForTournament: 'Een toernooi heeft vier tot twaalf spelers nodig.',
            stageNotOver: 'Deze ronde is nog niet klaar.',
            stageStarted: 'Deze ronde is al begonnen.',
            tournamentOver: 'Dit toernooi is al afgelopen.'
        }
    },
    pubquizr: {
        index: {
            description: 'Een klassiek potje trivia in een speels jasje.',
            oneDevice: { title: '1 telefoon', description: 'Geef de telefoon door.', action: 'Instellen' },
            multiDevice: { title: 'Per speler', description: '1 telefoon per speler', action: 'Kamer openen' },
            centralScreen: { title: 'Centraal scherm', description: 'Stream de quiz naar je tv. Iedereen gebruikt een telefoon als controller.', action: 'Opzetten'},
            tableScreen: { title: 'Tafelscherm', subtitle: 'Op de tv' },
            allQuizzes: { title: 'Alle quizzen', subtitle: 'Bekijk de lijst' },
            library: {
                title: 'Alle quizzen',
                subtitle: 'Muziek, film, geschiedenis en meer',
            },
            pickOne: 'Pak er een',
            playThis: 'Speel deze',
            newBadge: 'Nieuw',
            weekly: {
                weekday: 'WOE',
                promise: 'ELKE WEEK EEN\nNIEUWE QUIZ'
            },
            list: {
                label: 'Alle quizzen',
                tabs: { weekly: 'Wekelijks', official: 'Officieel', community: 'Community' },
                unplayedOnly: 'Ongespeeld',
                weeklyCadence: 'Elke woensdag een nieuwe',
                newThisWeek: 'Nieuw deze week',
                week: 'Week {{week}}',
                published: '{{day}} {{month}} {{year}}',
                played: 'Gespeeld',
                loadOlder: 'Ouder laden',
                browse: 'Blader door alle quizzen',
                empty: 'Hier staat nog niks om te laten zien.',
                filterEmpty: 'Nog niks.',
                failed: 'De quizzen konden niet geladen worden. Check je verbinding.',
                comingSoon: 'Coming soon...',
                search: 'Zoek een quiz…',
                searchLabel: 'Zoek in de quizzen op deze lijst',
                noMatches: 'Hier staat niks dat daarop lijkt.',
                noMatchesMore: 'Nog niks gevonden — oudere quizzen worden erbij geladen.',
                sortNewest: 'Nieuwste',
                sortAlpha: 'A–Z'
            }
        },
        oneDevice: {
            title: '1 telefoon',
            description: 'Eén telefoon om het spel te spelen. De telefoon wordt doorgegeven.',
            players: {
                seat: 'Speler {{seat}}',
                tooFew: 'Een quiz heeft minstens twee spelers nodig.',
                tooMany: 'Acht spelers is het maximum rond één telefoon.',
                duplicate: 'Twee spelers kunnen niet dezelfde naam hebben.',
            },
            seat: {
                first: 'Jij, met de telefoon',
                leftOf: 'Links van {{name}}',
                fallback: 'Naast speler {{seat}}',
                placeholder: 'Wie zit daar?',
                add: 'Speler toevoegen'
            },
            quiz: {
                selected: 'Jullie spelen',
                empty: {
                    title: 'Nog geen quiz gekozen',
                    message: 'Kies er hieronder een om ze hier te zien.'
                },
                pick: 'Kies een quiz',
                pickAnother: 'Of kies een andere quiz'
            },
            steps: {
                seatsTitle: 'Vul alle spelers in',
                quizTitle: 'Selecteer quiz',
                settingsTitle: 'Hoe jullie spelen',
                table: 'Spelers',
            },
            zenMode: {
                label: 'Zen-modus',
                description: 'Geen tijdsdruk. Rondes met een timer worden vervangen of anders gespeeld.',
                caption: 'Zen · geen timers'
            },
            triviaMode: {
                label: 'Alleen trivia',
                description: 'Alleen vragen en antwoorden. De omschrijfronde en de ronde met vier antwoorden vallen weg.',
                caption: 'Alleen trivia · 4 rondes'
            },
            start: 'Start de quiz',
            loading: 'Kijken of er nog een quiz openstaat…',
            running: {
                title: 'Er staat nog een quiz open',
                message: 'Je hebt al een quiz lopen. Ga verder waar de tafel gebleven was, of gooi hem weg en stel een nieuwe in.',
                resume: 'Verder spelen',
                discard: 'Weggooien'
            }
        },
        // De multi device kamer: één scherm waar de tafel naar kijkt, en ieder een telefoon.
        lobby: {
            loading: 'Even kijken of je al een kamer hebt…',
            opening: 'De kamer wordt geopend…',
            noLobby: 'Geen kamer',
            hostClosedLobby: 'De host heeft de kamer gesloten. Vraag om een nieuwe code.',
            hostStoppedQuiz: 'De host heeft de quiz gestopt. Vraag om een nieuwe code voor een volgende.',
            dealt: 'De quiz begint…',
            hostScreen: {
                label: 'Hostscherm',
                description: 'Zet de vraag op een tv of laptop en speel met de telefoons als controller. Uit, dan toont elke telefoon het hele bord.'
            },
            screenHint: {
                title: 'Zet eerst een scherm klaar',
                message: 'Open de kamer op een laptop of tv — HDMI, Chromecast of AirPlay werkt allemaal — en iedereen speelt mee vanaf zijn eigen telefoon.',
                messageUrl: 'Open op de tv {{url}} en typ {{code}}. Een laptop op HDMI, een gecast tabblad of schermspiegelen kan ook — iedereen speelt mee vanaf zijn eigen telefoon.'
            },
            cast: {
                action: 'Cast naar tv',
                connected: 'Aan het casten — tik om te wisselen'
            },
            running: {
                quizTitle: 'Je bent al aan het spelen',
                lobbyTitle: 'Er staat nog een kamer open',
                quizMessage: 'In kamer {{code}} loopt nog een quiz. Ga verder, of stop hem en open een nieuwe kamer.',
                lobbyMessage: 'Kamer {{code}} staat nog open op jouw naam. Ga erheen, of sluit hem en open een nieuwe.',
                resumeQuiz: 'Verder spelen',
                resumeLobby: 'Naar de open kamer',
                stopQuiz: 'Quiz stoppen',
                closeLobby: 'Sluiten en een nieuwe openen'
            },
            confirmClose: {
                title: 'Kamer sluiten?',
                message: 'De kamer wordt verwijderd en de code werkt niet meer. Iedereen die er al in zit vliegt eruit.',
                action: 'Sluiten'
            },
            confirmLeave: {
                title: 'Kamer verlaten?',
                message: 'Je gaat terug naar het spelmenu. Je kunt later met dezelfde code weer meedoen.',
                action: 'Verlaten'
            },
            stay: 'Hier blijven',
            start: 'Quiz starten',
            startNote: 'Zodra je start kan er niemand meer bij.',
            needPlayers: 'Je hebt minstens {{min}} telefoons aan tafel nodig.',
            needQuiz: 'Kies eerst een quiz.',
            hostFallback: 'De host'
        },
        // Het gedeelde scherm waar de hele tafel naar kijkt. Het kijkt alleen mee, dus er valt niets op te tikken.
        table: {
            // De weg naar binnen voor de laptop, want een scherm kan de QR van zichzelf niet scannen.
            door: {
                title: 'Zet de quiz op een scherm',
                message: 'Typ de code die de host op zijn telefoon heeft. Dit scherm kijkt alleen mee — iedereen speelt nog steeds op zijn eigen telefoon.',
                codeLabel: 'Kamercode',
                placeholder: 'PXK7Q',
                open: 'Scherm openen',
                rejected: 'Dat is geen quizcode. Check hem op de telefoon van de host.'
            },
            // De vier manieren waarop een tafel een scherm krijgt: twee browsers die een pagina openen, en twee manieren om diezelfde pagina te spiegelen.
            setup: {
                title: 'Zo zet je dit op een tv',
                wayBrowser: 'Open {{url}} in de browser van de tv en typ de code',
                wayBrowserPlain: 'Open deze pagina in de browser van de tv en typ de code',
                wayHdmi: 'Of hang een laptop met een HDMI-kabel aan de tv',
                wayCast: 'Of cast dit tabblad vanuit Chrome, en laat het tabblad vooraan staan',
                wayMirror: 'Of spiegel dit toestel met AirPlay of schermcasten',
                fullScreen: 'Volledig scherm',
                exitFullScreen: 'Volledig scherm sluiten',
                alreadyPlayingTitle: 'Dit toestel speelt mee',
                alreadyPlaying: 'Het heeft een stoel aan tafel en zou de helft van de avond missen. Open het scherm op de tv zelf, in een eigen browser.',
                signingIn: 'Het scherm klaarzetten…',
                signInFailed: 'Dit scherm kon het spel niet bereiken.'
            },
            roundOf: 'Ronde {{round}} van {{total}}',
            playAlong: 'Meespelen',
            numbersInLabel: 'getallen binnen',
            recapTitle: 'De woorden',
            recapPoints: '{{name}} pakt {{points}} voor de woorden die geraden zijn',
            weightChip: '{{weight}} · {{points}} punten',
            wordsSecret: 'De woorden staan alleen op de telefoon van {{name}} — de anderen krijgen straks nog een bonusgok',
            // Eén woord per kaart op de spelersbalk: wat die speler nu doet.
            status: {
                quizmaster: 'Quizmaster',
                turn: 'Aan de beurt',
                missed: 'Zat ernaast',
                sent: 'Ingestuurd',
                typing: 'Typt nog',
                describing: 'Omschrijft',
                guessing: 'Raadt',
                choosing: 'Kiest'
            },
            connecting: 'De kamer zoeken…',
            closed: 'De host heeft de kamer gesloten, dus dit scherm is klaar.',
            dealt: 'De quiz is begonnen.',
            joinAt: 'Doe mee met',
            scanHint: 'Scan dit met je telefoon om mee te doen.',
            waitingForHost: 'Wachten tot de host de quiz start…',
            needPlayers: 'Nog {{needed}} te gaan voordat de quiz kan starten.',
            scores: 'Scores',
            quizmaster: 'Quizmaster',
            guesser: 'Gokker',
            standings: 'Tussenstand',
            answer: 'Het antwoord',
            numbersIn: '{{done}} van {{total}} getallen binnen',
            typeYours: 'Typ je getal op je eigen telefoon.',
            // Een ronde waarvan het scherm nog niet gebouwd is, dus de telefoons zijn alles.
            followPhones: 'Speel deze ronde op je telefoon.',
            missed: 'Mis',
            gotSoFar: '{{awarded}} van {{total}} tot nu toe',
            choosing: '{{name}} kiest makkelijk of moeilijk',
            over: 'Dat was de quiz.'
        },
        // De telefoon, die in deze modus vooral een controller is.
        // Zonder gedeeld scherm: elke telefoon is een heel bord, en dit zijn de woorden die alleen een bord nodig heeft.
        board: {
            choiceAppears: 'Zodra er gekozen is verschijnt de vraag op elke telefoon',
            choosing: '{{name}} kiest een makkelijke of moeilijke vraag',
            clockSoon: 'De klok start zo',
            closestHint: 'Dubbele getallen mogen · {{name}} heeft het antwoord',
            describes: 'Omschrijft',
            describing: '{{describer}} omschrijft, {{guesser}} raadt',
            easy: 'Makkelijk',
            everyoneAtOnce: 'Iedereen tegelijk',
            gotIt: 'Ik snap het',
            guesses: 'Raadt',
            hard: 'Moeilijk',
            imReady: 'Ik ben er klaar voor',
            isUp: '{{name}} is aan zet',
            listFooter: '{{guesser}} noemt op · {{master}} vinkt af',
            listRules: 'Eén speler krijgt een vraag met vier antwoorden en {{seconds}} seconden. De quizmaster vinkt af wat goed is. Daarna krijgt elke andere speler één bonusgok op wat er over is.',
            missed: '{{name}} zat ernaast · de vraag is nu van {{next}}',
            missedToYou: '{{name}} zat ernaast · de vraag is nu van jou',
            mustGuess: 'Jij moet raden',
            mustGuessRules: '{{describer}} omschrijft {{words}} woorden. Je hebt samen {{seconds}} seconden. Elk goed woord is 1 punt voor jullie allebei.',
            namesFour: '{{name}} noemt er vier',
            neverSeeWords: 'De woorden zie jij nooit, ook niet achteraf',
            noQuizmaster: 'Geen quizmaster',
            notReadyYet: '{{name}} is nog niet klaar',
            numbersIn: '{{done}} / {{total}} binnen',
            onlyMasterMovesOn: 'Alleen {{name}} gaat verder',
            picking: '{{name}} kiest',
            picksOnOwnPhone: '{{name}} kiest op de eigen telefoon',
            onePoint: '1 punt',
            pointsWorth: '{{points}} punten',
            questionOf: 'Vraag {{number}} / {{total}}',
            quizmaster: 'Quizmaster',
            readsAloud: '{{name}} leest de vraag voor',
            queuePlace: 'Jij bent {{place}} in de rij om te antwoorden',
            queuePlaceNow: 'Jij bent {{place}} in de rij · jij mag nu antwoorden',
            previous: {
                label: 'Vorige vraag',
                gotIt: '{{name}} had het goed',
                youGotIt: 'Jij had het goed',
                nobody: 'Niemand had het goed'
            },
            readAhead: 'Lees de vraag alvast: {{seconds}} seconden zodra de klok loopt',
            readyCount: '{{done}} van de {{total}} spelers is klaar',
            readyToStart: 'Klaar om te beginnen',
            readyWaiting: 'Klaar. {{name}} start de klok',
            tapYourself: 'je tikt zelf',
            turnOf: 'Beurt {{number}} / {{total}}',
            wordsGuessed: '{{done}} van de {{total}} geraden',
            wordsSecret: 'De woorden staan alleen op de telefoon van {{name}}',
            you: 'Jij',
            yourChoiceCue: 'Kies, en je vraag staat op elke telefoon',
        },
        control: {
            alsoOnScreen: 'Staat ook op het scherm — jij hoeft alleen te beoordelen',
            isUpNow: '{{name}} is nu aan de beurt',
            lettersCue: 'De opties staan op het scherm',
            onScreen: 'TV',
            // Als woord en niet als getal, want {{count}} zet i18next in meervoudsmodus.
            ordinal: {
                first: '1e',
                second: '2e',
                third: '3e',
                fourth: '4e',
                fifth: '5e',
                sixth: '6e',
                seventh: '7e',
                eighth: '8e'
            },
            watchScreen: 'Kijk naar het scherm',
            yourPlace: 'Jij bent de {{place}} deze beurt',
            changeGuess: 'Aanpassen',
            guessSent: 'Je getal is binnen',
            onTheScreen: 'Op het scherm',
            pickAnswer: 'Kies je antwoord',
            roundStarting: 'Wacht tot {{name}} de ronde start',
            theScreenHasIt: 'Alles staat op het grote scherm.',
            submitGuess: 'Dit is mijn getal',
            theyTapItThemselves: '{{name}} tikt het antwoord op de eigen telefoon aan.',
            waitingFor: 'Wachten op {{name}}',
            yourChoice: 'Makkelijk of moeilijk?',
            yourChoiceCue: 'Kies er een en je vraag komt op het scherm',
            yourGuess: 'Jouw getal',
            yourTurn: 'Jij bent'
        },
        play: {
            loading: 'De tafel klaarzetten…',
            close: 'Quiz verlaten',
            roundLabel: 'Ronde {{round}} · {{kind}}',
            rules: {
                open: 'De quizmaster leest voor en bepaalt op de telefoon wie het goed had. Fout? De vraag schuift door naar de volgende speler.',
                choice: 'Geen quizmaster deze ronde. Wie aan de beurt is tikt zelf een letter op de telefoon. Fout? De vraag schuift door, de vergooide optie blijft weg.',
                closest: 'Iedereen tikt één getal in. Dubbele getallen mogen. Wie er het dichtst bij zit pakt 2 punten — bij gelijke afstand krijgen ze het allebei.',
                describe: 'De omschrijver heeft 30 seconden. Elk goed woord is 1 punt voor allebei. Daarna één bonusgok per overige speler.',
                list: 'Eén onderwerp. Vier trefwoorden.',
                doubleDown: 'Wie aan de beurt is kiest een makkelijk (1p) vraag of een moeilijke (3p) vraag.',
                finale: 'Zes open vragen, om en om. Fout? De vraag gaat naar de ander. Wie na de laatste vraag voorstaat wint de avond.'
            },
            rounds: {
                open: 'Open',
                choice: 'Meerkeuze',
                closest: 'Wie zit er het dichtst bij',
                describe: 'Omschrijven',
                list: 'Wat weet je over ... ?',
                doubleDown: 'Makkelijk of Moeilijk?',
                finale: 'De finale'
            },
            questionNumber: 'Vraag {{number}}',
            questionTotal: ' van {{total}}',
            questionOutOf: '/{{total}}',
            turn: {
                spoken: '{{master}} vraagt het aan {{player}}',
                spokenRun: '{{master}} vraagt het aan {{player}}, die er {{run}} op rij goed heeft',
                /** De koptekst boven de spotlight: wie deze beurt leidt. */
                quizmasterLabel: '{{name}} is quiz master',
                /** Het label boven de uitgelichte naam van wie nu antwoord moet geven. */
                answeringNow: 'Antwoordt nu',
                roleQuizmaster: 'Quiz master',
                roleGuesser: 'Raadt',
                bonusOf: 'Bonus · {{number}} van {{total}}',
                bonusMissed: '{{name}} had niks',
                bonusTake: '{{name}} had hem',
                nobody: 'Niemand had hem'
            },
            leadOpen: '{{name}} leest voor aan de speler links',
            leadChoice: '{{name}} leest voor · vier opties',
            leadClosest: '{{name}} leest voor · de rest gokt',
            leadDescribe: '{{name}} is aan de beurt',
            leadList: '{{name}} vraagt · één speler noemt wat die weet',
            leadDoubleDown: '{{name}} vraagt makkelijk of moeilijk',
            leadFinale: '{{name}} leest voor aan beide finalisten',
            readAloud: 'Lees dit hardop voor',
            onlyYouSeeThis: 'Het antwoord',
            alsoAccept: 'Ook goed: {{answers}}',
            answer: {
                reveal: 'Tik om het antwoord te zien',
                hide: 'Tik om het antwoord te verbergen',
                revealHint: 'Houd het scherm voor jezelf'
            },
            validate: 'Beoordelen',
            validateLocked: 'Laat eerst het antwoord zien',
            wrong: 'Fout',
            correct: 'Goed',
            markWrong: 'Reken {{name}} fout',
            markCorrect: 'Reken {{name}} goed',
            wrongPassesTo: 'Fout? Dan mag {{name}}',
            wrongEndsQuestion: 'Niemand meer over, fout beëindigt deze vraag',
            tableRound: 'Ga de tafel rond',
            whoGotIt: 'Vraag eerst aan {{name}}',
            answerLabel: 'Antwoord',
            pickHint: 'Tik op wie het goed had',
            pickUndoHint: '{{name}} is al af — tik hem aan om dat terug te draaien',
            pickLockHint: 'Tik nog eens op {{name}} om te wissen',
            pickSpoken: '{{name}} had het goed',
            ruleOutSpoken: '{{name}} fout rekenen',
            ruleInSpoken: '{{name}} weer mee laten doen',
            nobodyGotIt: 'Niemand had het',
            nobodyConfirm: 'Ga naar de volgende vraag',
            nobodyConfirmHint: 'Tik nogmaals om verder te gaan',
            lockIn: 'Bevestigen',
            choiceAlwaysPasses: 'Volgende ronde mag {{name}} raden',
            correctKeepsTurn: 'Goed, en de volgende vraag is weer voor {{name}}',
            worthPoints: '{{worth}}p',
            noPoint: 'Geen punt',
            scores: 'Stand',
            choice: {
                options: 'De vier opties',
                spoken: '{{letter}}. {{text}}',
                spokenCorrect: '{{letter}}. {{text}}, dit is de goede'
            },
            closest: {
                answer: '{{answer}} {{unit}}',
                placeholder: 'Gok',
                entry: 'De gok van {{name}}',
                duplicate: 'Twee spelers hebben hetzelfde getal. Vraag er een om een ander.',
                unreadable: 'Daar staat geen getal.',
                typeInstead: 'Vul de gokken toch in',
                award: 'Geef ze de punten',
                nearestTakes: 'Dichtstbij pakt {{worth}}p',
                guessingOrder: 'Wie gokt, op tafelvolgorde',
                collect: 'Schrijf de gokken op',
                collectHint: 'Laat ze eerst allemaal een getal noemen, geen twee dezelfde',
                backToQuestion: 'Terug naar de vraag',
                answerLabel: 'Antwoord · alleen jij',
                hide: 'Verberg',
                theirNumbers: 'Hun getallen',
                filled: '{{filled}} van {{total}} ingevuld',
                off: '{{off}} ernaast',
                nearestOff: 'dichtstbij · {{off}} ernaast',
                says: '{{name}} zegt…',
                now: 'nu',
                position: '{{number}} van {{total}}',
                missingTitle: 'Niet iedereen heeft een getal',
                missingOne: 'Bij {{names}} staat niets ingevuld, dus die kan deze niet winnen.',
                missingMany: 'Bij {{names}} staat niets ingevuld, dus die kunnen deze niet winnen.',
                missingBack: 'Terug om ze in te vullen',
                missingAnyway: 'Toch afronden',
                result: {
                    nearestOne: '{{names}} zat er het dichtstbij',
                    nearestMany: '{{names}} zaten er het dichtstbij',
                    nobody: 'Niemand zat er het dichtstbij',
                    paidOne: '{{worth}} punten',
                    paidMany: '{{worth}} punten elk',
                    paidNobody: 'Deze levert niemand iets op',
                    answerLabel: 'Het antwoord',
                    guessesLabel: 'Wat iedereen zei',
                    continue: 'Ga verder'
                }
            },
            pad: {
                minus: 'Min',
                backspace: 'Wissen'
            },
            describe: {
                readyRuleOnlyGuesser: 'Je omschrijft aan {{guesser}}. Zolang de klok loopt telt alleen wat {{guesser}} zegt',
                readyRuleTime: '{{seconds}} seconden om zoveel mogelijk van je {{words}} woorden te omschrijven',
                readyRuleNoSaying: 'Zeg het woord zelf nooit. Anders telt het niet.',
                readyRuleBothScore: 'Elk woord dat {{guesser}} raadt is een punt voor hen én een punt voor jou',
                readyRuleBonus: 'Als de tijd om is krijgen de andere {{others}} spelers ieder één gok op een woord dat nog niet geraden is',
                start: 'Start',
                dontSayIt: 'Zeg het woord zelf nooit',
                runningReminder: 'Tik een woord af zodra {{guesser}} het heeft. De rest van de tafel is straks aan de beurt.',
                inTimeTitle: 'Wat had {{guesser}}?',
                inTimeHint: 'Tik elk woord aan dat {{guesser}} op tijd zei',
                toBonus: 'Bonusronde · nog {{left}} over',
                toSettle: 'Door naar de punten',
                bonusHint: 'De quiz master mag niks meer zeggen, maar elke andere speler mag nog wel 1x een woord raden op basis van wat er net genoemd is om zo bonuspunten te scoren.',
                scoringTitle: 'Hoe de beurt ging',
                standing: '{{name}} pakt {{points}}p uit deze beurt',
                scoreAgain: 'Deze beurt opnieuw scoren',
                settle: 'Verder gaan'
            },
            list: {
                readyRuleOnlyGuesser: 'Je vraagt het aan {{guesser}}. Tot hun beurt voorbij is telt alleen wat zij zeggen',
                readyRuleTime: '{{seconds}} seconden om zoveel mogelijk van de {{answers}} antwoorden te noemen',
                readyRuleGuesses: '{{guesses}} gokken om zoveel mogelijk van de {{answers}} antwoorden te noemen',
                readyRuleHidden: 'Alleen jij als quizmaster ziet deze antwoorden',
                readyRuleScore: 'Elk antwoord dat ze noemen is {{worth}} punt voor de gokker',
                readyRuleBonus: 'Daarna krijgen de andere {{others}} spelers ieder één gok voor een antwoord dat nog niet genoemd is om zo bonuspunten te scoren',
                start: 'Start',
                preTimerHint: 'Lees eerst de vraag hardop voor, start dan de klok en {{guesser}} kan gaan gokken',
                startTimer: 'Start de klok',
                runningReminder: 'Vink elk antwoord af dat {{guesser}} noemt. De rest telt nog niet mee.',
                zenNotice: 'Geen tijdsdruk hier. {{guesser}} mag {{nGuesses}} keer gokken, en daarna krijgt elke andere speler één bonusgok op een antwoord dat niemand had.',
                inTimeTitle: 'Wat had {{guesser}}?',
                inTimeHint: 'Tik elk antwoord aan dat {{guesser}} goed had',
                toBonus: 'Bonusronde · nog {{left}} over',
                toSettle: 'Door naar de punten',
                bonusHint: 'Eén gok op een van deze. Goed geraden en het punt is van jou.',
                scoringTitle: 'Resultaat',
                standing: '{{name}} pakt {{points}}p uit deze vraag',
                scoreAgain: 'Deze vraag opnieuw scoren',
                settle: 'Verder gaan'
            },
            doubleDown: {
                ask: 'Wil {{name}} een makkelijke of moeilijke vraag?',
                easy: 'Makkelijk · {{points}} punt',
                hard: 'Moeilijk · {{points}} punten'
            },
            tieBreak: {
                kicker: 'Voor de finale',
                title: 'Gelijkspel!',
                bodyOne: '{{names}} hebben evenveel punten. Speel in het echt steen-papier-schaar: de winnaar gaat door naar de finale.',
                bodyTwo: '{{names}} hebben evenveel punten. Speel in het echt steen-papier-schaar: de twee winnaars gaan door naar de finale.',
                through: '{{name}} staat al in de finale.',
                pickOne: 'Winnaar naar de finale',
                pickTwo: 'Winnaars naar de finale',
                waiting: '{{name}} tikt aan wie er won.'
            },
            intro: {
                of: 'van {{total}}',
                round: 'Ronde {{round}}',
                briefOpen: 'Twintig open vragen. De quiz master vraagt het aan de speler links van zich; goed antwoord en de volgende is ook voor jou, fout de volgende speler mag raden. Elke tweede vraag levert een punt op.',
                briefChoice: 'Pittigere vragen, multiple choice. Iedereen start 1x en is 1x quiz master. Elke vraag is twee punten waard.',
                briefClosest: 'Een vraag met een getal als antwoord. Iedereen behalve de quiz master noemt één gok, en niemand mag hetzelfde getal zeggen. Wie er het dichtst bij zit pakt twee punten.',
                briefDescribe: '30 seconden om je eigen woorden te omschrijven zonder het woord te zeggen (of een vertaling).',
                briefList: 'Eén vraag met vier antwoorden erin verstopt. De quiz master vraagt het aan de speler links van zich, die twintig seconden krijgt om er zoveel mogelijk te noemen. Wat overblijft gaat daarna de tafel rond, ieder één gok. Elk antwoord dat valt is een punt voor wie het noemde.',
                briefListZen: 'Eén vraag met vier antwoorden erin verstopt. De quiz master vraagt het aan de speler links van zich, die geen klok heeft en acht gokken krijgt om er zoveel mogelijk te noemen. Wat overblijft gaat daarna de tafel rond, ieder één gok. Elk antwoord dat valt is een punt voor wie het noemde.',
                briefDoubleDown: 'Makkelijk of moeilijk? Elke speler krijgt de keuze: een makkelijke vraag is 1 punt waard, een moeilijke 4. Er zijn er vijf van elk, dus als een soort op is neem je wat er over is. Fout? Dan gaat de vraag de tafel rond — en wie hem pakt krijgt de volle waarde.',
                briefFinale: 'De 2 spelers met de meeste punten strijden tegen elkaar in de finale. Elk goed antwoord is 100 punten waard. De persoon met de minste punten begint steeds.',
                versus: 'vs',
                quizmaster: '{{name}} is quiz master',
                action: 'Start ronde {{round}}'
            },
            handoff: {
                step: 'Ronde {{round}} · {{number}} van {{total}}',
                title: 'Geef de telefoon aan {{name}}',
                jobOpen: '{{name}} leest voor aan de speler links van zich',
                jobChoice: '{{name}} leest de vraag en alle vier de opties voor',
                jobClosest: '{{name}} leest de vraag voor en verzamelt de getallen van de rest',
                jobDescribe: '{{name}} omschrijft de woorden aan de speler links. Alleen {{name}} mag dit scherm zien.',
                jobList: '{{name}} leest de vraag voor en vinkt elk antwoord af dat de speler links van hen noemt.',
                jobDoubleDown: '{{name}} vraagt de volgende speler makkelijk of moeilijk en leest daarna de vraag voor die eruit komt.',
                jobFinale: '{{name}} leest voor aan beide finalisten en speelt deze ronde zelf niet mee.',
                ruleOpen: 'Goed antwoord? Dan is de volgende vraag ook voor jou. Fout en hij schuift door. Elke tweede vraag levert een punt op.',
                ruleChoice: 'Net als hiervoor: goed antwoord en de volgende is ook voor jou. Elke vraag is hier 2 punten waard.',
                ruleClosest: 'Iedereen behalve de quiz master gokt één keer, en niemand mag hetzelfde getal zeggen. Dichtstbij pakt 2.',
                ruleDescribe: 'Dertig seconden, gespeeld met de speler links van je. Elk woord dat die raadt is een punt voor hen én een punt voor jou.',
                ruleList: 'Twintig seconden, en alleen de speler links van je antwoordt. Wat zij missen gaat daarna de tafel rond, ieder één gok.',
                ruleDoubleDown: 'Makkelijk levert 1 punt op, moeilijk 4, en er zijn er vijf van elk — dus een soort kan opraken. Fout? Dan gaat de vraag voor de volle waarde de tafel rond.',
                ruleFinale: 'Elke vraag gaat eerst naar wie achter staat. Fout? Dan mag de ander hem alsnog pakken. 100 punten per goed antwoord, en de meeste punten wint de avond.',
                action: 'Laat de vraag zien'
            },
            standings: {
                label: 'Ronde {{round}} van {{total}} klaar',
                title: 'Ronde {{round}} klaar',
                description: 'De tussenstand.',
                startNext: 'Start ronde {{round}}',
                nextRoundWip: 'Ronde {{round}} is er nog niet. Jullie punten zijn bewaard. De quiz wacht waar jullie gebleven waren.'
            },
            final: {
                title: 'De quiz is afgelopen',
                description: 'Zo eindigde de avond.',
                finalist: 'Finalist',
                winnerLabel: 'Winnaar',
                points: '{{score}} punten',
                tieLabel: 'Gedeelde eerste plaats',
                tieTitle: 'Niemand liep uit',
                tieDescription: 'Niemand eindigde bovenaan. De avond is gedeeld.'
            }
        },
        errors: {
            // De multi device kamer, geweigerd.
            lobbyFull: 'Die kamer is vol. Acht telefoons is het maximum aan één tafel.',
            alreadyStarted: 'Die kamer is al begonnen. Vraag om een nieuwe code.',
            lobbyGone: 'Die kamer bestaat niet meer. Check de code.',
            notHost: 'Alleen wie de kamer geopend heeft kan dat veranderen.',
            notAtThisTable: 'Je zit niet aan deze tafel.',
            notYourSeat: 'Het is niet jouw beurt om die te beantwoorden.',
            expired: 'Je bent uitgelogd. Log opnieuw in om een quiz te starten.',
            quizGone: 'Die quiz bestaat niet meer. Kies een andere.',
            badTable: 'De tafel werd geweigerd. Check de namen en probeer het opnieuw.',
            tooFewPlayers: 'Een quiz heeft minstens twee spelers nodig.',
            tooManyPlayers: 'Acht spelers is het maximum aan één tafel.',
            duplicateName: 'Twee spelers kunnen niet dezelfde naam hebben.',
            quizTooSmall: 'Deze quiz heeft niet genoeg vragen voor zoveel spelers. Kies een andere quiz, of speel met minder mensen.',
            generic: 'De quiz kon niet gestart worden. Probeer het opnieuw.',
            network: 'Geen verbinding met de server. Check je internet.',
            staleTurn: 'De tafel is al verder. Het bord hieronder is waar de quiz echt staat.',
            duplicateGuess: 'Twee spelers kunnen niet hetzelfde getal gokken. Vraag er een om een ander.',
            quizmasterCannotGuess: 'Wie de vraag voorleest, mag er zelf niet naar gokken.',
            describerCannotGuess: 'Je kunt geen punt krijgen voor een woord dat je zelf omschreef.',
            oneGuessEach: 'Iedereen behalve de speler die raadt krijgt één gok.',
            twoOnOne: 'Dit kan maar aan één speler worden toegekend.',
            /** Ronde 2 beoordeelt zichzelf op de telefoon van wie antwoordt, en de vraag van ronde 6 kiest de speler zelf. */
            verdictDisagrees: 'Dat is niet wat de quiz over dat antwoord zegt. Check welke optie er aangetikt is.',
            noChoiceYet: 'Er is nog niet gekozen tussen makkelijk en moeilijk, dus er is nog geen vraag om te beoordelen.'
        }
    },
    oneOfUs: { 
        index: { 
            description: "Kun jij de burgers van de bedrieger(s) onderscheiden?", 
            oneDevice: { 
                title: "1 telefoon", 
                description: "Speel met 1 telefoon die wordt doorgegeven", 
                action: "Spelen" 
            }, 
            multiDevice: { 
                title: "Multi device", 
                description: "Maak een lobby en nodig andere spelers uit", 
                action: "Lobby maken" 
            } 
        },
        singleDevice: {
            title: "Speel met 1 device",
            description: "Vul alle namen in van de spelers waar je mee speelt. Druk dan op start.",
            players: {
                tooFew: 'One of Us heeft minstens drie spelers nodig.',
                tooMany: 'Negen spelers is het maximum voor één telefoon.',
                duplicate: 'Twee spelers kunnen niet dezelfde naam hebben.'
            }
        },
        multiDevice: {
            lobby: {
                opening: 'De kamer wordt geopend…',
                noLobby: 'Geen kamer',
                hostStoppedGame: 'De host heeft het spel gestopt. Vraag om een nieuwe code voor nog een ronde.',
                hostClosedLobby: 'De host heeft de kamer gesloten. Vraag om een nieuwe code.',
                running: {
                    gameTitle: 'Je bent al aan het spelen',
                    lobbyTitle: 'Je hebt nog een kamer open',
                    gameMessage: 'Je speelt nog een spel in kamer {{code}}. Ga verder, of stop het en open een nieuwe kamer.',
                    lobbyMessage: 'Kamer {{code}} staat nog op jouw naam open. Ga terug, of sluit hem en open een nieuwe.',
                    resumeGame: 'Doorspelen',
                    resumeLobby: 'Naar de open kamer',
                    stopGame: 'Spel stoppen',
                    closeLobby: 'Stoppen en nieuwe maken'
                },
                confirmClose: {
                    title: 'Kamer sluiten?',
                    message: 'De kamer wordt verwijderd en de code werkt niet meer. Iedereen die er al in zit wordt eruit gezet.',
                    action: 'Sluiten'
                },
                confirmLeave: {
                    title: 'Kamer verlaten?',
                    message: 'Je gaat terug naar het spelmenu. Je kunt later met dezelfde code weer meedoen.',
                    action: 'Verlaten'
                },
                stay: 'Hier blijven',
                start: 'Start het spel',
                startNote: 'Zodra je start kan er niemand meer bij.',
                needPlayers: 'Je hebt minstens {{min}} spelers nodig.',
                hostFallback: 'De host',
                settingsTitle: 'Spelinstellingen'
            },
            play: {
                loading: 'De rollen worden verdeeld…',
                noGame: 'Geen spel',
                waiting: 'Wachten op de tafel…',
                // Er is geen rondetotaal om tegen af te tellen, dus de band zegt wat de tafel aan het doen is.
                phase: {
                    deal: 'Ronde {{round}} · het woord',
                    answer: 'Ronde {{round}} · aanwijzing',
                    vote: 'Ronde {{round}} · stemmen',
                    reveal: 'Ronde {{round}} · uitslag',
                    waiting: 'Ronde {{round}}'
                },
                stillIn: '{{count}} in spel',
                progress: '{{done}} / {{total}}',
                out: {
                    title: 'Je ligt eruit',
                    message: 'De tafel heeft je eruit gestemd. Blijf kijken hoe het eindigt — antwoorden en stemmen kan niet meer.'
                },
                deal: {
                    title: 'Trek je briefje',
                    action: 'Onthouden'
                },
                answer: {
                    title: 'Schrijf je briefje',
                    // De kop van het briefje zelf, dus kort en klein: het staat er als geheugensteun, niet als aankondiging.
                    about: 'Over: {{prompt}}',
                    aboutBlank: 'Je kreeg een leeg briefje',
                    field: 'Jouw briefje',
                    placeholder: 'Iets wat alleen iemand met jouw opdracht zou schrijven',
                    counter: '{{typed}} / {{max}} · anoniem op het bord',
                    submit: 'Indienen',
                    hung: 'Hangt op het bord · anoniem',
                    pinned: 'Al opgehangen',
                    waitingMessage: 'Wachten op de rest van de tafel. Het stemmen begint zodra het laatste briefje hangt.'
                },
                vote: {
                    title: 'Welk antwoord is sus?',
                    mine: 'JIJ',
                    // In twee stukken, want de naam ertussen staat vet.
                    tie: 'Gelijkspel?',
                    tieTail: 'hakt de knoop door.',
                    confirm: 'Prik dit briefje',
                    waiting: 'Je stem staat. Wachten op de rest van de tafel.'
                },
                reveal: {
                    title: 'De briefjes omgedraaid',
                    votedOut: '{{name}} · eruit gestemd',
                    tieBroken: 'De stemmen stonden gelijk, dus de burgemeester besliste.',
                    next: 'Ronde {{round}}',
                    toResult: 'Kijk hoe het eindigde'
                }
            },
            errors: {
                lobbyFull: 'Die kamer is vol.',
                alreadyStarted: 'Dat spel is al begonnen.',
                notHost: 'Alleen de host kan dat.',
                notEnoughPlayers: 'Je hebt meer spelers nodig voordat je kunt starten.',
                tooManyPlayers: 'Dat zijn meer spelers dan One of Us aan één tafel kwijt kan.',
                gameNotOver: 'Het spel is nog niet voorbij.',
                noContent: 'Er zijn nog geen opdrachten voor die taal.',
                lobbyGone: 'Die kamer bestaat niet meer.',
                alreadyAnswered: 'Je antwoord voor deze ronde staat al.',
                alreadyVoted: 'Je hebt deze ronde al gestemd.',
                cannotVoteSelf: 'Je kunt niet op je eigen antwoord stemmen.',
                votedOut: 'Je bent eruit gestemd, dus je antwoordt en stemt niet meer.',
                wrongRound: 'Die ronde is voorbij. Momentje.',
                wrongPhase: 'De tafel is ergens anders. Momentje.',
                badAnswer: 'Dat antwoord kan niet. Schrijf iets, en hou het kort.',
                gameFinished: 'Dat spel is voorbij.'
            }
        },
        settings: {
            wordsOnly: {
                title: "Alleen woorden",
                description: "Gebruik alleen woorden. Anders een zin."
            },
            roles: {
                title: 'Rollen',
                description: 'Welke rollen uitgedeeld kunnen worden.',
                count: '{{enabled}} van {{total}}',
                locked: 'Er moet één soort bedrieger aan blijven — zonder kan niemand winnen.',
                imposter: {
                    description: 'Krijgt een ander woord en moet meepraten zonder door de mand te vallen.'
                },
                nitwit: {
                    description: 'Krijgt helemaal geen woord.'
                }
            }
        },
        play: {
            loading: 'De woorden worden verdeeld…',
            close: 'Spel verlaten',
            roundSpeak: 'Ronde {{round}} · beurt',
            roundDiscuss: 'Ronde {{round}} · overleg',
            roundVote: 'Ronde {{round}} · stemmen',
            roundResult: 'Ronde {{round}} · uitslag',

            // Het briefje dat je trok. Beide speelvormen delen het.
            note: {
                label: 'Jouw woord',
                blurb: 'Laat deze aan niemand zien.',
                blurbBlank: 'Jij bent die iemand. Bouw voort op wat je anderen hoort zeggen.',
                cover: 'Tik om je briefje te lezen',
                coverHint: 'Zorg dat niemand meekijkt.'
            },

            reveal: {
                step: 'Woord {{number}} van {{total}}',
                title: '{{name}} is aan de beurt',
                body: 'Pak de telefoon aan van {{from}} en houd hem voor jezelf.',
                bodyFirst: 'Alleen {{name}} mag het volgende scherm zien.',
                note: 'Niemand anders mag meekijken.',
                action: 'Ik ben {{name}}',
                queue: 'Nog aan de beurt: {{names}}',
                secretLabel: 'Tik om je woord te zien',
                secretHint: 'Houd de telefoon zo dat niemand anders meekijkt.',
                warning: 'Alleen jij ziet dit',
                noWord: 'Helemaal geen woord',

                role: {
                    label: 'Jouw rol',
                    civilian: {
                        name: 'Burger',
                        explanation: 'Iedereen met jouw woord hoort erbij. Zoek degene die het niet heeft.'
                    },
                    imposter: {
                        name: 'Imposter',
                        explanation: 'Jouw woord is niet dat van de rest van de tafel. Bluf mee en overleef.'
                    },
                    unknown: {
                        name: 'Burger of Imposter',
                        explanation: 'Je weet niet wat je bent. Let op de tafel, luister naar het woord en kom erachter.'
                    },
                    nitwit: {
                        name: 'De onnozele',
                        explanation: 'Jij hebt helemaal geen woord. Bouw elke beurt op wat je anderen hoort zeggen.'
                    }
                },
                hide: 'Verbergen',
                done: 'Geef door aan {{name}}',
                lastDone: 'Gezien, start ronde 1'
            },

            speak: {
                step: 'Spreker {{number}} van {{total}}',
                nowSpeaking: 'Nu aan het woord',
                hint: 'Zeg één woord wat met jouw woord te maken heeft. Noem het woord zelf niet.',
                next: 'Volgende: {{name}}',
                lastNext: 'Iedereen is geweest'
            },

            discuss: {
                ring: 'Stemmen',
                title: 'Wie wordt geëlimineerd?',
                description: 'Iedereen moet wijzen naar iemand die hij/zij niet vertrouwd. Degene met de meeste stemmen wordt weggestemd. Je mag niet, niet stemmen.',
                tieNote: 'Je mag jouw antwoord niet verdedigen. Iedereen moet gewoon stemmen zonder overleg. Overleg is verboden!',
                tieNoteMayor: 'Je mag jouw antwoord niet verdedigen. Stemmen zonder overleg! Gelijk aantal stemmen, dan beslist {{name}} als burgemeester.',
                action: 'Stemmen'
            },

            vote: {
                title: 'Wie wordt geëlimineerd?',
                nobody: 'Nog niemand gekozen',
                confirm: 'Prik {{name}}',
                confirmHint: 'Dit kan niet ongedaan gemaakt worden.',
                locked: 'Tik eerst op een naam.'
            },

            elimination: {
                ringLabel: 'Weggestemd',
                civilian: '{{name}} was een burger',
                imposter: '{{name}} was een imposter',
                nitwit: '{{name}} was de onnozele',
                // Of de tafel de goede te pakken had.
                hit: 'raak',
                miss: 'mis',
                remaining: 'Nog {{players}} in het spel.',
                next: 'Ronde {{round}}'
            },

            briefing: {
                title: 'Wie spelen er mee',
                intro: 'Iedereen krijgt een van deze rollen. Lees ze voor voordat je begint.',
                roleLabel: 'Rol',
                role: {
                    civilian: 'De meesten aan tafel zijn burgers. Zij hebben allemaal hetzelfde woord en moeten uitzoeken wie dat niet heeft.',
                    imposter: 'De imposters kregen een ander woord en kennen het echte niet. Zij bluffen mee en winnen door te overleven.',
                    nitwit: 'De onnozele kreeg helemaal geen woord en speelt mee met de imposters, die geen idee hebben wie het is.'
                },
                action: 'Woorden verdelen'
            },

            over: {
                /** The band along the top. The headline under it says who won. */
                label: 'Spel afgelopen',
                civilians: 'De burgers winnen',
                imposters: 'De imposters winnen',
                civiliansWhy: 'Alle imposters zijn weggestemd.',
                impostersWhy: 'De imposters zijn niet langer in de minderheid.',
                rolesTitle: 'Iedereen',
                civilianTag: 'Burger',
                imposterTag: 'Imposter',
                nitwitTag: 'Onnozele',
                votedOut: 'Weggestemd',
                civilianWord: 'Het woord was',
                imposterWord: 'De imposters hadden',
                again: 'Opnieuw spelen'
            }
        },
        errors: {
            expired: 'Je bent uitgelogd. Log opnieuw in om verder te spelen.',
            gameGone: 'Dat spel bestaat niet meer.',
            badTable: 'Die tafel kan niet gedeeld worden. Check de namen en probeer opnieuw.',
            generic: 'Er ging iets mis. Probeer het opnieuw.',
            network: 'Geen verbinding met de server. Check je internet.',
            offlineUnavailable: 'Geen verbinding, en deze telefoon heeft geen opdrachten bewaard voor die taal. Speel één spel online, dan werkt het daarna overal.'
        }
    },
    fakeFiller: {
        index: {
            description: 'Een zin met een gat erin. Een paar spelers verzinnen stiekem een invulling; de rest moet raden welke echt is.',
            multiplayer: {
                title: 'Multi device',
                description: 'Iedereen op zijn eigen telefoon. Eén pseroon maak de lobby, de rest joined met de code.',
                action: 'Open een kamer'
            }
        },
        lobby: {
            loading: 'Zoeken naar je kamer…',
            opening: 'Kamer openen…',
            noLobby: 'Geen kamer',
            hostStoppedGame: 'De host heeft het spel gestopt. Vraag om een nieuwe code voor nog een ronde.',
            hostClosedLobby: 'De host heeft de kamer gesloten. Vraag om een nieuwe code.',
            running: {
                gameTitle: 'Je bent al aan het spelen',
                lobbyTitle: 'Je hebt nog een kamer open staan',
                gameMessage: 'Je speelt nog een spel in kamer {{code}}. Ga verder, of stop het en open een nieuwe kamer.',
                lobbyMessage: 'Kamer {{code}} staat nog op jouw naam open. Ga terug, of sluit hem en open een nieuwe.',
                resumeGame: 'Verder spelen',
                resumeLobby: 'Naar open kamer',
                stopGame: 'Spel stoppen',
                closeLobby: 'Spel stoppen en nieuwe maken'
            },
            confirmClose: {
                title: 'Kamer sluiten?',
                message: 'De kamer wordt verwijderd en de code werkt niet meer. Iedereen die er al in zit vliegt eruit.',
                action: 'Sluiten'
            },
            confirmLeave: {
                title: 'Kamer verlaten?',
                message: 'Je gaat terug naar het spelmenu. Je kunt later met dezelfde code weer meedoen.',
                action: 'Verlaten'
            },
            stay: 'Blijf hier',
            start: 'Start het spel',
            startNote: 'Zodra je start kan niemand er meer bij.',
            needPlayers: 'Je hebt minstens {{min}} spelers nodig.',
            hostFallback: 'De host',
            settingsTitle: 'Spelinstellingen',
            mode: 'Vragen',
            modeFacts: 'Echte feiten',
            modeCreative: 'Grappigste',
            modeFactsHint: 'Elke vraag heeft een echt antwoord tussen de verzinsels. Vind hem en je scoort.',
            modeCreativeHint: 'Wie verzint het grappigste antwoord?.',
            answersPerPlayer: 'Vragen per speler',
            answersPerPlayerHint: 'Hoeveel zinnen iedere speler aan het begin invult. Meer vragen, langer spel.',
            answersSummary: '{{amount}} vragen p.p.'
        },
        play: {
            loading: 'Vragen uitdelen…',
            noGame: 'Geen spel',
            band: {
                round: 'Ronde',
                prompt: 'Vraag'
            },
            writing: {
                title: 'Vul de gaten in',
                intro: 'Verzin iets wat onwaar is. Andere spelers moeten denken dat het waar is en zo misleid worden.',
                promptOf: 'Vraag {{index}} van {{total}}',
                blank: 'Gat {{index}}',
                blankPlaceholder: 'Jouw antwoord',
                submit: 'Vastzetten',
                locked: 'Vastgezet',
                edit: 'Aanpassen',
                incomplete: 'Vul eerst elk gat in.',
                waitingTitle: 'Wachten op de rest',
                waitingMessage: 'Jouw antwoorden staan erin. Het stemmen begint zodra iedereen de zijne heeft ingeleverd.',
                progress: '{{done}} van {{total}} antwoorden binnen'
            },
            voting: {
                title: 'Welke is echt?',
                titleCreative: 'Welke vind jij de beste?',
                hint: 'Tik de zin die volgens jou echt is.',
                hintCreative: 'Tik de zin die jij het beste vindt.',
                tapToPick: 'Tik om te kiezen',
                yourPick: 'Jouw keuze',
                option: 'Optie {{letter}}',
                or: 'of',
                roundOf: 'Ronde {{round}} van {{total}}',
                pick: 'Kies deze',
                confirm: 'Zet mijn stem vast',
                voted: 'Stem geteld',
                yoursTitle: 'Jij moet wachten',
                yoursMessage: 'Hopelijk raden anderen jouw fake filler! Dan scoor je punten.',
                progress: '{{done}} van {{total}} stemmen binnen',
                waiting: 'Wachten tot de rest gestemd heeft…'
            },
            reveal: {
                title: 'De uitslag',
                noScore: 'Geen punten deze ronde.',
                stamp: {
                    real: 'Echt',
                    more: '{{name}} +{{count}}'
                },
                voters: {
                    chose: 'Wie dit koos',
                    none: 'Niemand'
                },
                next: 'Volgende ronde',
                toResults: 'Naar de eindstand',
                waitingForHost: 'Wachten tot de host verdergaat…',
                waitingForResults: 'Wachten tot de host de eindstand laat zien…'
            }
        },
        results: {
            loading: 'Uitslag laden…'
        },
        errors: {
            expired: 'Je sessie is verlopen. Log opnieuw in.',
            gameGone: 'Dit spel bestaat niet meer.',
            generic: 'Er ging iets mis. Probeer het opnieuw.',
            network: 'Geen verbinding met de server. Controleer je internet.',
            lobbyFull: 'Deze kamer is vol.',
            lobbyGone: 'Deze kamer bestaat niet meer. Controleer de code.',
            alreadyStarted: 'Dit spel is al begonnen.',
            notEnoughPlayers: 'Je hebt meer spelers nodig om te starten.',
            tooManyPlayers: 'Dat zijn te veel spelers voor één spel.',
            noContent: 'Er zijn niet genoeg vragen in deze taal. Probeer de andere.',
            notYourPrompt: 'Die vraag is niet aan jou uitgedeeld.',
            alreadyAnswered: 'Die heb je al ingevuld.',
            alreadyVoted: 'Je hebt al gestemd in deze ronde.',
            cannotVoteOwnPrompt: 'Jij hebt voor deze geschreven, dus je kunt er niet op stemmen.',
            wrongRound: 'De tafel is al naar de volgende ronde.',
            wrongPhase: 'Zo ver is de tafel nog niet.',
            badAnswer: 'Vul elk gat in voordat je vastzet.',
            answerIsTruth: 'Ssst… dat is het echte antwoord! Verzin nu een nepantwoord.',
            gameFinished: 'Dit spel is afgelopen.'
        }
    },
    sketchOff: {
        index: {
            description: "description",
            multiplayer: {
                title: "Sketch off",
                description: "description",
                action: "action"
            }
        }
    },
    friends: {
        title: 'Vrienden',
        description: 'Want alleen is zo saai.',
        how: {
            title: 'Vrienden toevoegen',
            message: 'Vrienden worden automatisch toegevoegd wanneer je voor het eerst met een andere speler speelt.'
        },
        listLabel: 'Jouw vrienden',
        since: 'Sinds {{date}}',
        empty: {
            title: 'Nog niemand',
            message: 'Start een spel en deel de code, of doe mee met die van iemand anders. Iedereen in de lobby komt hier terecht.'
        },
        errors: {
            signedOut: 'Je sessie is verlopen. Log opnieuw in om je vrienden te zien.',
            generic: 'Je vrienden konden niet worden geladen.',
            network: 'Geen verbinding. Controleer je internet en probeer het opnieuw.'
        }
    },
    invite: {
        title: 'Nodig een vriend uit',
        message: 'Ze krijgen een seintje in de app, of een melding op hun telefoon als die dicht is.',
        send: 'Uitnodigen',
        sent: 'Uitgenodigd',
        failed: 'Niet verstuurd',
        alreadyHere: 'In de lobby',
        noFriends: 'Je hebt nog met niemand gespeeld. Deel de code — iedereen die meedoet komt op je vriendenlijst.',
        loadFailed: 'Je vrienden konden niet worden geladen.'
    },
    notifications: {
        inviteEyebrow: 'Uitnodiging',
        inviteHeadline: '{{name}} wil met je spelen',
        inviteRoom: '{{game}} · kamer van {{name}}',
        inviteTournament: '{{game}} · toernooi van {{name}}',
        inviteGeneric: '{{name}} nodigt je uit voor een spel',
        join: 'Meedoen',
        ignore: 'Negeren'
    }
};
