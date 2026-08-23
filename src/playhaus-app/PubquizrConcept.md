I worked out the game idea for the "PubquizR" game. Lets start by creating the backend for it. All tables and some endpoints should be set up. This is the idea:

Pubquizr game with 5 rounds you can play with 3 to 8 players.

# The game
Round 1:
- These are 20 questions that can be about anything. You can say classic trivia. They are open questions and the category can be anything. 

Round 2: ABCD
- 4 options to chose from A B C or D. with hard questions (possible but hard). Each player gets 1 (or 2 if you are with less then 8 players).

Round 3:
- Closest guess. E.g. How many bones in the human body? Everybody (except the quiz master) can guess once and the person closest wins. Always a number.

Round 4 - 30 Seconds
- Each player gets 2 words that they should describe (e.g. Bradd Pitt and Milk). Then they have to describe that and the other people have to guess. If someones guesses a word the Quizmaster and the 

Round 5:
- 8 questions with 4 "answers we search". You get points for each correct answer. An example question might be "what are the top 4 luxurious hand bag brands) with answers (Gucci, Chanel, Lacoste and Louis Vuitton. Not sure if that really is the right answer but it is an example to understand the structure of the questions. Each player has to answer within 25 seconds. When not guessed the turn goes to the next person. E.g. is person 1 has 2 correct answers the next person can still guess the other items. Or what do you know about Vincent van Gogh and then 4 keywords we search for (e.g. Dutch, painer etc).

Round 5:
The 2 persons with the most points will battle each other in the finale.

# Modes explained

## Single device mode:
Flow: click single device -> Fill in names of the players you play with. Should be in order from left to right as how you are sitting because the phone has to rotate. Player 1 begins as quiz master. He reads the question and player 2 has to guess. Then if player 2 has a wrong answer the turn goes to player 3 untill someone has it correct or there are no other players except the game master. Then go to next question and the game master will be the person the question is asked to. The person the the right of you (before you) always begins with asking the question to you.

So the quiz master role rotates.  

## Multi-device mode:
- Will not be implemented in the initial version. Is a version where everybody plays with their own phone.


Create the following endpoints:
- GET GetQuizrQuiz based on the ID
- GET ListQuizes that returns the most recent quizes. Paginated (with query filters for weekly, official or community quiz).
- POST StartSingleDeviceQuiz. Starts the quiz for this specific player. Takes the quiz ID and the names of the people who are playing as parameters.

There are 3 categories of quizes:
- Weekly, every wednesday a new weekly official quiz is uploaded;
- Official, just a set of official quizes with different specific subjects
- Community, community created quizes (still work in progress).







There is 1 quiz master each round. It starts at a random person (based on the order the users that are joined fill in)

Validation for single device: the 




Now that the league of letters domain is fully implemented, I want to implement the PubquizR game. I already worked out the concept. There are different play modes you can start a Quiz with. These are:
- Classic: the way as described below;
- Layback: same but without time
- Trivia only. Only the trivia questions 


These game modes are only relevant for a StartedQuiz. The quiz content itself is a different table (or tables) and how you want to play is not relevant when creating the Quiz. 


Lets start with the backend. I want the following endpoints:
- StartOneDeviceQuiz. Takes a QuizID and starts for the current user the quiz. Creates a new ActiveQuiz record. 
- Get quiz by ID. This fetches the whole quiz without answers (all rounds). 


Dont implement anything in the frontend yet. Just for now these backend endpoints.

A quiz can be an official quiz (I make as the creator of the app) or a community quiz that people can make themselves. This should be a field on the quiz because later I want to query on offcial or community.



2 soortes quizes. Official and community quiz.








-------------------------
Multi device mode = iedereen kan tegelijk antwoorden en dan moet de host goedkeuren of niet