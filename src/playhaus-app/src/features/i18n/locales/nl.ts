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
            }
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
        }
    },
    games: {
        device: {
            perPlayer: '1 mobiel per speler',
            shared: '1 mobiel voor iedereen',
            perPlayerOrOneDevice: '1 mobiel of 1 mobiel per speler'
        },
        leagueOfLetters: {
            description: 'Test je woordenschat. Solo, of tegen je vrienden.',
            tag: { category: 'Woord', players: '1-6 spelers' }
        },
        quizzer: {
            description: 'Stel je algemene kennis op de proef.',
            tag: { category: 'Trivia', players: '2-10 spelers' }
        },
        imposter: {
            description: 'Ontraadsel wie de bedrieger is.',
            tag: { category: 'Bluf', players: '3-10 spelers' }
        }        
    },
    languages: {
        nl: { description: 'Woorden uit de Nederlandse lijst.' },
        en: { description: 'Woorden uit de Engelse lijst.' }
    },
    auth: {
        choice: {
            title: 'Welkom bij Playhaus',
            description: 'Log in en houd je naam, je vrienden en je spellen. Of stap er meteen in als gast.',
            account: 'Account',
            guest: 'Als gast',
            guestNote: 'Een gastaccount is tijdelijk'
        },
        account: {
            title: 'Account',
            description: 'Log in als je al een account hebt, of maak er een aan.',
            login: 'Inloggen',
            signup: 'Account aanmaken'
        },
        login: {
            title: 'Inloggen',
            email: 'E-mail',
            emailPlaceholder: 'jij@voorbeeld.nl',
            password: 'Wachtwoord',
            passwordPlaceholder: 'Je wachtwoord',
            submit: 'Inloggen',
            submitting: 'Bezig met inloggen…'
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
            title: 'Jouw taal',
            description: 'De taal waarin je spellen gespeeld worden. Kies er een en stap meteen in als gast.',
            note: 'Een gastaccount is tijdelijk. Je kunt de taal later aanpassen in je profiel.'
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
        card: { action: 'Mijn profiel', caption: 'Dit ben jij!' },
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
            music: { title: 'Muziek', description: 'Rustige achtergrondmuziek, wat sneller tijdens het spelen.' },
            vibration: { title: 'Trillen', description: 'Korte haptic feedback op mobiel.' }
        },
        guest: {
            title: 'Gastaccount',
            message: 'Je speelt als gast. Dit account is tijdelijk: je naam, kleur en gespeelde games kunnen verloren gaan zodra deze sessie eindigt. Maak een account aan om ze te bewaren.',
            action: 'Account aanmaken'
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
            checking: { title: 'Waar was je', accent: 'gebleven?' },
            waiting: { title: 'Pak het', accent: 'weer op.' },
            empty: { title: 'Er loopt', accent: 'niets.' }
        },
        description: {
            checking: 'We kijken even welke spellen er nog voor je openstaan.',
            waiting: 'Je hebt spellen openstaan. Pak er een op waar je gebleven was.',
            empty: 'Start een spel en loop weg. Hij staat hier nog als je terugkomt.'
        },
        loading: 'Spellen zoeken…',
        updated: 'Bijgewerkt {{time}}',
        noGames: {
            title: 'Geen spellen open',
            message: 'Alles wat je half gespeeld achterlaat komt hier terug te staan, solo of in een lobby.',
            action: 'Kies een spel'
        },
        resume: 'Verder spelen',
        refresh: { label: 'Ververs de lijst', action: 'Ververs' },
        mode: { solo: 'Solo', lobby: 'Lobby' },
        errors: {
            expired: 'Je sessie is verlopen. Log opnieuw in.',
            generic: 'Er ging iets mis bij het ophalen van je spellen. Probeer het opnieuw.',
            network: 'Geen verbinding met de server. Check je verbinding en probeer het opnieuw.'
        }
    },
    lol: {
        index: {
            description: 'Test je woordenschat, daag je vrienden uit en probeer het geheime woord te raden voordat je kansen op zijn. Alleen of tegen je vijanden.',
            playingAs: 'Speelt als {{name}}',
            changeProfile: 'Profiel wijzigen',
            change: 'Wijzig',
            solo: { title: 'Solo', description: 'Drie rondes, jouw regels.', action: 'Instellen' },
            multiplayer: { title: 'Multiplayer', description: 'Race tegen je vrienden.', action: 'Openen' },
            join: {
                label: 'Of join een lobby',
                hint: '{{length}} tekens, daarna ga je er automatisch in',
                paste: 'Plakken',
                pasteLabel: 'Code plakken',
                codeLabel: 'Lobbycode'
            }
        },
        settings: {
            loading: 'Spel zoeken…',
            title: 'Zet je spel\nklaar',
            description: 'Kies hoe je wilt spelen en begin.',
            wordLength: 'Woordlengte',
            wordLengthOption: '{{letters}} letters',
            hardMode: {
                label: 'Moeilijke modus',
                description: 'Het woord kan elk bestaand woord in de taal zijn. Zet dit uit om met een makkelijkere woordenlijst te spelen.'
            },
            facts: '{{rounds}} rondes · {{guesses}} pogingen per ronde · eerste letter gegeven',
            start: 'Start met spelen',
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
            solved: 'OPGELOST',
            lost: 'HELAAS',
            theWord: 'Het woord',
            attempts: 'Pogingen',
            guess: 'Raden',
            clear: 'Wissen',
            timeLeft: 'Resterende tijd',
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
            close: 'Lobby sluiten',
            leave: 'Lobby verlaten',
            youHost: 'Jij host',
            connected: 'Verbonden met lobby {{code}}',
            disconnected: 'Verbinding met de lobby kwijt',
            code: 'Lobbycode',
            named: 'Lobby {{code}}',
            shareTitle: 'Kom in mijn lobby',
            codeSpoken: 'Lobbycode: {{characters}}',
            copyCode: 'Lobbycode {{characters}} kopiëren',
            copied: 'Gekopieerd',
            readAloud: 'Lees hem voor, of',
            shareLinkLabel: 'Deel de link naar deze lobby',
            shareLink: 'Deel de link',
            linkCopied: 'Link gekopieerd',
            shareFailed: 'Delen lukte niet',
            players: 'Spelers',
            playerCount: '{{taken}} van {{max}}',
            inLobby: 'In de lobby',
            hostYou: 'HOST · JIJ',
            hostTag: 'HOST',
            ready: 'Klaar',
            away: 'Weg',
            freeSeat: 'Vrije plek',
            waiting: 'Wachten…',
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
    friends: {
        title: 'Vrienden',
        description: 'Speel samen, houd bij wie er wint en daag elkaar uit.',
        soon: {
            title: 'Binnenkort',
            message: 'Vriendenlijsten, uitnodigingen en onderlinge standen komen eraan. Voor nu speel je samen via een lobbycode.'
        }
    }
};
