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
        loading: 'Even geduld…',
        language: 'Taal',
        selectValue: '{{label}}: {{value}}',
        nothingSelected: 'niets gekozen',
        change: 'verander',
        minutes: 'min',
        start: 'Start',
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
        reconnect: 'Verder spelen',
        friends: 'Vrienden',
        profile: 'Profiel'
    },
    chrome: {
        toDarkMode: 'Schakel over naar donkere modus',
        toLightMode: 'Schakel over naar lichte modus',
        muteMusic: 'Zet de muziek uit',
        unmuteMusic: 'Zet de muziek aan',
        signedInAs: 'Ingelogd als {{name}}. Ga naar je profiel.'
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
    /*
     * De joinkaart, die van geen enkel spel in het bijzonder is.
     *
     * Deze stonden onder `lol.index` tot het eerste teken van een code het spel begon te
     * noemen, omdat de kaart alleen League of Letters-kamers opende. Hij staat nu op drie
     * pagina's en maar één daarvan is dat spel, dus de oude key loog over waar deze
     * woorden te zien zijn.
     */
    join: {
        label: 'JOIN EEN GAME',
        /**
         * Dezelfde kaart, op een breed scherm in tweeën: de vakjes zijn daar maar
         * de helft, dus het label noemt zijn eigen helft in plaats van de kaart.
         */
        labelWide: 'TYP DE CODE',
        paste: 'Plakken',
        pasteLabel: 'Code plakken',
        codeLabel: 'Joincode',
        /**
         * Het chipje naast de vakjes, zodra het eerste teken erin staat.
         *
         * De echte bescherming tegen `O` en `0`: je ziet dat het eerste teken goed
         * aankwam voordat je het tweede typt, in plaats van pas bij een afwijzing vijf
         * tekens later.
         */
        gameHint: 'Je joint {{game}}',
        /**
         * Een complete code die niets opent — een eerste teken dat geen spel heeft, een
         * spel dat nog geen kamers heeft, of een teken in de code dat wij nooit uitgeven.
         *
         * Eén zin voor alle drie, want voor wie de telefoon vasthoudt zijn het hetzelfde:
         * vijf tekens die niets openen.
         */
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
        /**
         * Hier geen knop onder: dit antwoord verander je in de instellingen.
         *
         * Het aantal staat er bewust niet meer in. Er stond "de vier tekens" en codes zijn
         * nu vijf tekens lang — precies het soort zin dat stil fout gaat zodra een getal
         * verschuift en niemand eraan denkt de catalogus erop na te lezen.
         */
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
            note: 'Als je een taal kiest wordt je aangemeld met een gastaccount. Je kan dit account later gratis upgraden naar een normaal account.',
            login: 'Heb je al een account? Log in'
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
        inLobby: 'In de lobby',
        hostYou: 'HOST · JIJ',
        hostTag: 'HOST',
        ready: 'Klaar',
        away: 'Weg',
        freeSeat: 'Vrije plek',
        moreSeatsOne: '+ nog 1 vrije plek',
        moreSeatsMany: '+ nog {{seats}} vrije plekken',
        waiting: 'Wachten…'
    },
    lol: {
        index: {
            description: 'Test je woordenschat en probeer het geheime woord te raden.',
            playingAs: 'Jij bent {{name}}',
            solo: { title: 'Solo', description: 'Speel alleen, lekker rustig.', action: 'Instellen' },
            multiplayer: { title: 'Multiplayer', description: 'Maak een lobby.', action: 'Openen' }
        },
        settings: {
            loading: 'Spel zoeken…',
            title: 'Solo opzetten',
            wordLength: 'Woordlengte',
            wordLengthOption: '{{letters}} letters',
            summary: {
                seconds: '{{seconds}}s',
                hardOn: 'Moeilijk',
                hardOff: 'Normaal'
            },
            hardMode: {
                label: 'Moeilijke modus',
                description: 'Het woord kan elk bestaand woord in de taal zijn. Zet dit uit om met een makkelijkere woordenlijst te spelen.'
            },
            facts: '{{rounds}} rondes · {{guesses}} pogingen per ronde · eerste letter gegeven',
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
            resultLabel: 'Uitslag',
            viewResult: 'Bekijk de uitslag',
            nextRound: 'Volgende ronde',
            guesses: 'Pogingen: {{guesses}}',
            roundOf: 'Ronde {{round}} van {{total}}',
            hint: 'Hint',
            hintLabel: 'Hint: het woord begint met de {{letter}}',
            solved: 'CORRECT',
            lost: 'HELAAS',
            theWord: 'Het woord',
            attempts: 'Pogingen',
            guess: 'Raden',
            clear: 'Wissen',
            timeLeft: 'Resterende tijd',
            scoreLabel: '{{name}}, {{score}} punten',
            playTimeLabel: 'Speeltijd: {{time}}',
            yourTurn: 'AAN ZET',
            typing: 'typt…'
        },
        results: {
            loading: 'Uitslag laden…',
            loadFailed: 'De uitslag kon niet worden geladen.',
            title: 'Spel afgelopen',
            summary: 'Rondes: {{rounds}} · Letters: {{length}}',
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
            timePerTurnOption: '{{seconds}} seconden',
            waitingForHost: 'Wachten op de host',
            waitingForHostMessage: '{{name}} zet het spel klaar. Blijf op dit scherm, het start hier meteen mee.',
            waitingLabel: 'Wachten',
            closedTitle: 'Lobby gesloten',
            results: {
                title: 'Spel afgelopen',
                tie: 'Gelijkspel op {{score}} punten.',
                youWin: 'Jij wint met {{score}} punten.',
                playerWins: '{{name}} wint met {{score}} punten.',
                againSamePlayers: 'Nog een keer, zelfde spelers',
                autoJoin: 'Iedereen die nog op dit scherm zit, gaat automatisch mee naar de nieuwe lobby.',
                anotherRound: 'Nog een potje?',
                hostCanOpen: 'Het spel zit erop. De host kan een nieuwe lobby openen. Blijf hier, dan word je er vanzelf in meegenomen.'
            }
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
            alreadyStarted: 'Dit spel is al begonnen.'
        }
    },
    pubquizr: {
        index: {
            description: 'Een klassiek potje trivia in een speels jasje.',
            oneDevice: { title: '1 telefoon', description: 'Geef de telefoon door.', action: 'Instellen' },
            multiDevice: { title: 'Multi-device', description: 'Iedereen op zijn eigen scherm.', action: 'Coming soon...' },
            weekly: {
                weekday: 'WOE',
                promise: 'ELKE WEEK EEN\nNIEUWE QUIZ'
            },
            list: {
                label: 'Alle quizzen',
                tabs: { weekly: 'Wekelijks', official: 'Officieel', community: 'Community' },
                published: '{{day}} {{month}} {{year}}',
                loadOlder: 'Ouder laden',
                empty: 'Hier staat nog niks. Probeer een ander tabblad.',
                failed: 'De quizzen konden niet geladen worden. Check je verbinding.',
                comingSoon: 'Coming soon...',
                search: 'Zoek een quiz…',
                searchLabel: 'Zoek in de quizzen op deze lijst',
                total: '{{quizzes}} in totaal',
                matches: '{{quizzes}} gevonden',
                noMatches: 'Hier staat niks dat daarop lijkt.',
                noMatchesMore: 'Nog niks gevonden — oudere quizzen komen per pagina binnen. Laad er meer en kijk nog eens.',
                sortNewest: 'Nieuwste',
                sortAlpha: 'A–Z'
            }
        },
        oneDevice: {
            title: '1 telefoon',
            description: 'Eén telefoon om het spel te spelen. De telefoon wordt doorgegeven.',
            order: {
                title: 'Op volgorde',
                message: 'Vul de namen in de volgorde waarin je zit, van links naar rechts. De rol van quizmaster schuift namelijk door.'
            },
            players: {
                label: 'Wie doen er mee',
                seat: 'Speler {{seat}}',
                tooFew: 'Een quiz heeft minstens drie spelers nodig.',
                tooMany: 'Acht spelers is het maximum rond één telefoon.',
                duplicate: 'Twee spelers kunnen niet dezelfde naam hebben.',
            },
            quiz: {
                selected: 'Jullie spelen',
                pick: 'Kies een quiz',
                pickAnother: 'Of kies een andere'
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
        play: {
            loading: 'De tafel klaarzetten…',
            close: 'Quiz verlaten',
            roundLabel: 'Ronde {{round}} · {{kind}}',
            rounds: {
                open: 'Open',
                choice: 'Meerkeuze',
                closest: 'Wie zit er het dichtst bij',
                describe: 'Omschrijven',
                list: 'Noem er vier',
                finale: 'De finale'
            },
            questionNumber: 'Vraag {{number}}',
            questionTotal: ' van {{total}}',
            questionOutOf: '/{{total}}',
            turn: {
                asking: 'vraagt',
                answering: 'antwoordt',
                spoken: '{{master}} vraagt het aan {{player}}',
                spokenRun: '{{master}} vraagt het aan {{player}}, die er {{run}} op rij goed heeft',
                run: '{{run}} op rij',
                staysWhileRight: '{{name}} blijft aan de beurt tot er één fout gaat',
                reads: 'leest voor',
                answers: 'aan {{name}}',
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
            leadFinale: '{{name}} leest voor aan beide finalisten',
            readAloud: 'Lees dit hardop voor',
            onlyYouSeeThis: 'Het antwoord',
            alsoAccept: 'Ook goed: {{answers}}',
            answer: {
                reveal: 'Tik om het antwoord te zien',
                revealHint: 'Houd het scherm voor jezelf'
            },
            validate: 'Beoordelen',
            validateHint: 'Reken het daarna goed of fout',
            validateLocked: 'Laat eerst het antwoord zien',
            gate: 'Check het antwoord',
            gateHint: 'Fout? Dan gaat de vraag naar de volgende speler.',
            reread: 'tik om terug te lezen',
            wrong: 'Fout',
            correct: 'Goed',
            markWrong: 'Reken {{name}} fout',
            markCorrect: 'Reken {{name}} goed',
            wrongPassesTo: 'Fout? Dan mag {{name}}',
            wrongEndsQuestion: 'Niemand meer over, fout beëindigt deze vraag',
            choiceAlwaysPasses: 'Volgende ronde mag {{name}} raden',
            correctKeepsTurn: 'Goed, en de volgende vraag is weer voor {{name}}',
            worthPoints: '{{worth}}p',
            noPoint: 'Geen punt',
            scores: 'Stand',
            choice: {
                options: 'De vier opties',
                readAll: 'Lees de vraag hardop voor en daarna de opties',
                spoken: '{{letter}}. {{text}}',
                spokenCorrect: '{{letter}}. {{text}}, dit is de goede'
            },
            closest: {
                answer: '{{answer}} {{unit}}',
                placeholder: 'Gok',
                entry: 'De gok van {{name}}',
                duplicate: 'Twee spelers hebben hetzelfde getal. Vraag er een om een ander.',
                unreadable: 'Daar staat geen getal.',
                pickInstead: 'Sla de getallen over, tik gewoon wie won',
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
                readyRuleOnlyGuesser: 'Je omschrijft aan {{guesser}}. Zolang de klok loopt telt alleen wat zij zeggen',
                readyRuleTime: '{{seconds}} seconden om zoveel mogelijk van je {{words}} woorden te omschrijven',
                readyRuleNoSaying: 'Zeg het woord zelf nooit. Anders telt het niet.',
                readyRuleBothScore: 'Elk woord dat {{guesser}} raadt is een punt voor hen én een punt voor jou',
                readyRuleBonus: 'Als de tijd om is krijgen de andere {{others}} spelers ieder één gok op een woord dat nog niet geraden is',
                start: 'Laat mijn woorden zien en start',
                dontSayIt: 'Zeg het woord zelf nooit',
                runningReminder: 'Alleen {{guesser}} mag antwoorden. De rest van de tafel is straks aan de beurt.',
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
                readyRuleOnlyGuesser: 'Je vraagt het aan {{guesser}}. Zolang de klok loopt telt alleen wat zij zeggen',
                readyRuleTime: '{{seconds}} seconden om zoveel mogelijk van de {{answers}} antwoorden te noemen',
                readyRuleHidden: 'Alleen jij als quizmaster ziet deze antwoorden',
                readyRuleScore: 'Elk antwoord dat ze noemen is {{worth}} punt voor de gokker',
                readyRuleBonus: 'Als de tijd om is krijgen de andere {{others}} spelers ieder één gok voor een antwoord dat nog niet genoemd is om zo bonuspunten te scoren',
                start: 'Laat de antwoorden zien en start',
                runningReminder: 'Vink elk antwoord af dat {{guesser}} noemt. De rest telt nog niet mee.',
                toBonus: 'Bonusronde · nog {{left}} over',
                toSettle: 'Door naar de punten',
                bonusHint: 'Eén gok op een van deze. Goed geraden en het punt is van jou.',
                scoringTitle: 'Hoe de vraag ging',
                standing: '{{name}} pakt {{points}}p uit deze vraag',
                scoreAgain: 'Deze vraag opnieuw scoren',
                settle: 'Verder gaan'
            },
            intro: {
                of: 'van {{total}}',
                round: 'Ronde {{round}}',
                briefOpen: 'Twintig open vragen. De quiz master vraagt het aan de speler links van zich; goed antwoord en de volgende is ook voor jou, fout de volgende speler mag raden. Elke tweede vraag levert een punt op.',
                briefChoice: 'Pittigere vragen, multiple choice. Iedereen start 1x en is 1x quiz master. Elke vraag is twee punten waard.',
                briefClosest: 'Een vraag met een getal als antwoord. Iedereen behalve de quiz master noemt één gok, en niemand mag hetzelfde getal zeggen. Wie er het dichtst bij zit pakt twee punten.',
                briefDescribe: '30 seconden om je eigen woorden te omschrijven zonder het woord te zeggen (of een vertaling) — aan de speler links van je, en aan niemand anders. Elk woord dat die raadt is een punt voor hen én voor jou. Daarna krijgt de rest van de tafel ieder één gok op een gemist woord.',
                briefList: 'Eén vraag met vier antwoorden erin verstopt. De quiz master vraagt het aan de speler links van zich, die twintig seconden krijgt om er zoveel mogelijk te noemen. Wat overblijft gaat daarna de tafel rond, ieder één gok. Elk antwoord dat valt is een punt voor wie het noemde.',
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
                jobFinale: '{{name}} leest voor aan beide finalisten en speelt deze ronde zelf niet mee.',
                ruleOpen: 'Goed antwoord? Dan is de volgende vraag ook voor jou. Fout en hij schuift door. Elke tweede vraag levert een punt op.',
                ruleChoice: 'Net als hiervoor: goed antwoord en de volgende is ook voor jou. Elke vraag is hier 2 punten waard.',
                ruleClosest: 'Iedereen behalve de quiz master gokt één keer, en niemand mag hetzelfde getal zeggen. Dichtstbij pakt 2.',
                ruleDescribe: 'Dertig seconden, gespeeld met de speler links van je. Elk woord dat die raadt is een punt voor hen én een punt voor jou.',
                ruleList: 'Twintig seconden, en alleen de speler links van je antwoordt. Wat zij missen gaat daarna de tafel rond, ieder één gok.',
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
                tieDescription: 'Niemand eindigde bovenaan. De avond is gedeeld.',
                restLabel: 'De rest van de tafel'
            }
        },
        errors: {
            expired: 'Je bent uitgelogd. Log opnieuw in om een quiz te starten.',
            quizGone: 'Die quiz bestaat niet meer. Kies een andere.',
            badTable: 'De tafel werd geweigerd. Check de namen en probeer het opnieuw.',
            tooFewPlayers: 'Een quiz heeft minstens drie spelers nodig.',
            tooManyPlayers: 'Acht spelers is het maximum rond één telefoon.',
            duplicateName: 'Twee spelers kunnen niet dezelfde naam hebben.',
            quizTooSmall: 'Deze quiz heeft niet genoeg vragen voor zoveel spelers. Kies een andere quiz, of speel met minder mensen.',
            generic: 'De quiz kon niet gestart worden. Probeer het opnieuw.',
            network: 'Geen verbinding met de server. Check je internet.',
            staleTurn: 'De tafel is al verder. Het bord hieronder is waar de quiz echt staat.',
            duplicateGuess: 'Twee spelers kunnen niet hetzelfde getal gokken. Vraag er een om een ander.',
            quizmasterCannotGuess: 'Wie de vraag voorleest, mag er zelf niet naar gokken.',
            describerCannotGuess: 'Je kunt geen punt krijgen voor een woord dat je zelf omschreef.',
            oneGuessEach: 'Iedereen behalve de speler die raadt krijgt één gok.',
            twoOnOne: 'Dit kan maar aan één speler worden toegekend.'
        }
    },
    oneOfUs: { 
        index: { 
            description: "De burgers krijgen allemaal hetzelfde woord, of dezelfde vraag. De imposters krijgen een net wat andere en moeten zich schuil houden.", 
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
        settings: {
            wordsOnly: {
                title: "Alleen woorden",
                description: "Gebruik alleen woorden of wil je ook zinnen gebruiken om een passend antwoord bij te zoeken."
            }
        },
        play: {
            loading: 'De woorden worden verdeeld…',
            close: 'Spel verlaten',
            roundLabel: 'Ronde {{round}}',

            reveal: {
                step: 'Woorden verdelen · {{number}} van {{total}}',
                title: 'Geef de telefoon aan {{name}}',
                body: 'Alleen {{name}} mag het volgende scherm zien.',
                note: 'Iedereen krijgt een rol en zin of woord. Eén of meer van jullie krijgen een andere rol iets anders dan de burgers. De imposters!',
                action: 'Ik ben {{name}}',
                secretLabel: 'Tik om je woord te zien',
                secretHint: 'Houd de telefoon zo dat niemand anders meekijkt.',
                warning: 'Alleen jij ziet dit',
                noWord: 'Helemaal geen woord',

                role: {
                    label: 'Jouw rol',
                    civilian: {
                        name: 'Burger',
                        explanation: 'De meesten van jullie hebben ditzelfde woord. Zeg er iets over waaruit blijkt dat je het kent, zonder het te noemen — zeg je te veel, dan geef je het cadeau aan de imposters. Zoek daarna uit wie er zit te bluffen en stem die weg.'
                    },
                    imposter: {
                        name: 'Imposter',
                        explanation: 'Jouw woord is niet het woord dat de rest van de tafel heeft, en dat van hen ken je niet. Luister goed naar wat de anderen zeggen, raad waar ze het over hebben en bluf je door je eigen beurt heen. Je wint als de imposters niet langer in de minderheid zijn.'
                    },
                    nitwit: {
                        name: 'De onnozele',
                        explanation: 'Jij hebt helemaal geen woord gekregen — zelfs niet dat van de imposters. Je speelt wel met ze mee, maar zij weten niet wie je bent. Alles wat jij zegt moet je bij elkaar rapen uit wat je de anderen hoort zeggen, dus luister scherp en geef niets weg. Je wint samen met de imposters, als zij niet langer in de minderheid zijn.'
                    }
                },
                hide: 'Verbergen',
                done: 'Gezien, geef door',
                lastDone: 'Gezien, start ronde 1'
            },

            speak: {
                step: 'Ronde {{round}} · {{number}} van {{total}}',
                nowSpeaking: 'Nu aan de beurt',
                hint: 'Zeg één woord wat met jouw woord te maken heeft. Noem het woord zelf niet.',
                next: 'Volgende speler',
                lastNext: 'Iedereen is geweest'
            },

            discuss: {
                title: 'Overleg',
                description: 'Wie klonk alsof die zat te gokken? Stem allemaal iemand weg. Je mag jezelf niet verdedigen. Je mag alleen overleggen wie je weg stemt en waarom.',
                tieNote: 'Bij een gelijke stand beslist de tafel samen wie er weggaat.',
                action: 'Klaar om te stemmen'
            },

            vote: {
                title: 'Wie stemmen we weg?',
                description: 'Tik op degene die de meerderheid van de stemmen heeft en bevestig.',
                nobody: 'Nog niemand gekozen',
                confirm: '{{name}} wegstemmen',
                confirmHint: 'Dit kan niet ongedaan gemaakt worden.',
                locked: 'Tik eerst op een naam.'
            },

            elimination: {
                title: '{{name}} ligt eruit',
                civilian: '{{name}} was een burger.',
                imposter: '{{name}} was een imposter.',
                nitwit: '{{name}} was de onnozele — helemaal geen woord.',
                remaining: 'Nog {{players}} in het spel.',
                next: 'Start ronde {{round}}'
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
            network: 'Geen verbinding met de server. Check je internet.'
        }
    },
    friends: {
        title: 'Vrienden',
        description: 'Speel samen, houd bij wie er wint en daag elkaar uit.',
        soon: {
            title: 'Binnenkort',
            message: 'Vriendenlijsten, uitnodigingen en onderlinge standen komen eraan. Voor nu speel je samen via een lobbycode.'
        }
    }
};
