// Preloaded default English casino activities ready to play instantly

export const DEFAULT_ACTIVITIES = [
  {
    id: 'default_slots_verbs',
    pin: 'VERB77',
    title: '🎰 High Roller: Irregular Verbs Jackpot',
    description: 'Master past simple and past participle forms! Spin the reels and hit the jackpot with verb masteries.',
    level: 'A2 - B1',
    category: 'Grammar & Verbs',
    gameType: 'slots',
    createdAt: Date.now() - 86400000 * 3,
    questions: [
      {
        id: 'sv1',
        question: "What is the past simple of the verb 'to choose'?",
        options: ['Chose', 'Chosen', 'Choosed', 'Choosing'],
        correctAnswer: 'Chose',
        explanation: "'Choose' is an irregular verb: Choose (present) -> Chose (past simple) -> Chosen (past participle).",
        category: 'Grammar',
        points: 200
      },
      {
        id: 'sv2',
        question: "Select the correct past participle form: 'She has _____ the marathon.'",
        options: ['Run', 'Ran', 'Runned', 'Running'],
        correctAnswer: 'Run',
        explanation: "The verb 'run' has the forms: Run -> Ran -> Run. So the past participle is 'run'.",
        category: 'Grammar',
        points: 250
      },
      {
        id: 'sv3',
        question: "Which of these is the correct past simple of 'freeze'?",
        options: ['Froze', 'Frozen', 'Freezed', 'Fraze'],
        correctAnswer: 'Froze',
        explanation: "Freeze -> Froze -> Frozen. E.g., 'The lake froze last winter.'",
        category: 'Grammar',
        points: 300
      },
      {
        id: 'sv4',
        question: "Complete the sentence: 'The bell has already _____.'",
        options: ['Rung', 'Rang', 'Ringed', 'Rong'],
        correctAnswer: 'Rung',
        explanation: "Ring -> Rang -> Rung. With present perfect ('has'), use the past participle 'rung'.",
        category: 'Grammar',
        points: 350
      },
      {
        id: 'sv5',
        question: "What is the past form of 'wear'?",
        options: ['Wore', 'Worn', 'Weared', 'Waring'],
        correctAnswer: 'Wore',
        explanation: "Wear -> Wore -> Worn. 'Yesterday he wore a black leather jacket.'",
        category: 'Grammar',
        points: 200
      },
      {
        id: 'sv6',
        question: "Choose the correct past participle: 'The vase was _____ by the cat.'",
        options: ['Broken', 'Broke', 'Breaked', 'Breaking'],
        correctAnswer: 'Broken',
        explanation: "Break -> Broke -> Broken. In passive voice, use past participle 'broken'.",
        category: 'Grammar',
        points: 400
      }
    ]
  },
  {
    id: 'default_roulette_travel',
    pin: 'SPIN24',
    title: '🎡 Vegas Airport & Travel Roulette',
    description: 'Spin the roulette wheel to test your travel English! Airport announcements, hotel check-ins, and ordering.',
    level: 'B1 - B2',
    category: 'Travel & Communication',
    gameType: 'roulette',
    createdAt: Date.now() - 86400000 * 2,
    questions: [
      {
        id: 'tr1',
        question: "At the airport counter, what document confirms your seat and gate number?",
        options: ['Boarding pass', 'Passport cover', 'Luggage tag', 'Flight brochure'],
        correctAnswer: 'Boarding pass',
        explanation: "A 'boarding pass' is the official document that allows a passenger to board an airplane.",
        category: 'Vocabulary',
        points: 200
      },
      {
        id: 'tr2',
        question: "What do you say when you want to ask for the total bill in a restaurant?",
        options: ['Could we have the check, please?', 'Give me the debt now', 'What is my cost, sir?', 'I demand to pay'],
        correctAnswer: 'Could we have the check, please?',
        explanation: "Polite restaurant phrase in American English is 'Could we have the check, please?' or in British English 'the bill'.",
        category: 'Speaking',
        points: 250
      },
      {
        id: 'tr3',
        question: "Choose the correct preposition: 'The flight arrives _____ Terminal 3 at 5:00 PM.'",
        options: ['At', 'In', 'On', 'To'],
        correctAnswer: 'At',
        explanation: "We use 'at' for specific points/locations within a facility (e.g. 'at Terminal 3', 'at Gate 12').",
        category: 'Grammar',
        points: 300
      },
      {
        id: 'tr4',
        question: "What is a 'layover' or 'stopover' during an international journey?",
        options: ['A brief stop between flights', 'A canceled ticket', 'Lost baggage', 'A flight upgrade'],
        correctAnswer: 'A brief stop between flights',
        explanation: "A layover is a transition period spent waiting at an intermediate airport before connecting to the next flight.",
        category: 'Vocabulary',
        points: 350
      },
      {
        id: 'tr5',
        question: "Which question should you ask the hotel receptionist to leave bags before check-in?",
        options: ['Could you hold my luggage until check-in?', 'Can you hide my suitcases?', 'Take my bags away', 'Where do you throw baggage?'],
        correctAnswer: 'Could you hold my luggage until check-in?',
        explanation: "'Could you hold my luggage' is standard polite hotel English when your room is not ready yet.",
        category: 'Speaking',
        points: 300
      },
      {
        id: 'tr6',
        question: "Which of these words has a SILENT letter?",
        options: ['Island', 'Hotel', 'Ticket', 'Passport'],
        correctAnswer: 'Island',
        explanation: "In 'Island', the 's' is silent! It is pronounced /ˈaɪ.lənd/ (like 'eye-land').",
        category: 'Pronunciation',
        points: 400
      }
    ]
  },
  {
    id: 'default_blackjack_idioms',
    pin: 'CARD21',
    title: '🃏 21 Blackjack: Idioms & Expressions',
    description: 'Hit or Stand against the Dealer! Answer idioms and business English questions to draw winning cards.',
    level: 'B2 - C1',
    category: 'Idioms & Advanced',
    gameType: 'blackjack',
    createdAt: Date.now() - 86400000,
    questions: [
      {
        id: 'bj1',
        question: "What does the idiom 'to hit the jackpot' mean?",
        options: ['To have great or sudden success', 'To lose all your money', 'To break an electronic device', 'To play games all night'],
        correctAnswer: 'To have great or sudden success',
        explanation: "'To hit the jackpot' originally comes from slot machines and means to gain sudden great fortune or success.",
        category: 'Idioms',
        points: 250
      },
      {
        id: 'bj2',
        question: "If something 'costs an arm and a leg', it is...",
        options: ['Extremely expensive', 'Very cheap and easy', 'Painful to look at', 'Dangerous to buy'],
        correctAnswer: 'Extremely expensive',
        explanation: "An informal idiom meaning that something costs a very large amount of money.",
        category: 'Idioms',
        points: 200
      },
      {
        id: 'bj3',
        question: "What does it mean to 'call it a day'?",
        options: ['To stop working for the rest of the day', 'To set a calendar reminder', 'To invite friends over', 'To wake up early'],
        correctAnswer: 'To stop working for the rest of the day',
        explanation: "'Let’s call it a day' means deciding to finish working on an activity for today.",
        category: 'Idioms',
        points: 300
      },
      {
        id: 'bj4',
        question: "Which phrasal verb means 'to cancel an event'?",
        options: ['Call off', 'Call on', 'Call up', 'Call in'],
        correctAnswer: 'Call off',
        explanation: "'Call off' means to cancel something that was scheduled (e.g. 'They called off the game due to rain').",
        category: 'Grammar',
        points: 350
      },
      {
        id: 'bj5',
        question: "What does 'break the ice' mean in social situations?",
        options: ['To relieve tension and make people feel comfortable', 'To turn on the air conditioner', 'To start an intense argument', 'To speak without thinking'],
        correctAnswer: 'To relieve tension and make people feel comfortable',
        explanation: "'Break the ice' means initiating friendly conversation to overcome initial awkwardness.",
        category: 'Idioms',
        points: 250
      },
      {
        id: 'bj6',
        question: "Which word is an exact ANTONYM of 'candid'?",
        options: ['Deceptive', 'Honest', 'Frank', 'Outspoken'],
        correctAnswer: 'Deceptive',
        explanation: "'Candid' means truthful and straightforward. Its opposite is 'deceptive' or 'insincere'.",
        category: 'Vocabulary',
        points: 400
      }
    ]
  }
];
