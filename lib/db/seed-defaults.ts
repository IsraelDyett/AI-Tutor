import { db } from './drizzle';
import { topics, flashcards, passedPaperQuestions } from './schema';
import { and, isNull, eq } from 'drizzle-orm';

const defaultContent = [
    {
        subject: 'English',
        topic: 'Basic Grammar and Punctuation',
        flashcards: [
            { front: 'What is a noun?', back: 'A word that represents a person, place, thing, or idea.', explanation: 'Fundamental building block of sentences.' },
            { front: 'What is a verb?', back: 'A word used to describe an action, state, or occurrence.', explanation: 'Verbs are the "doing" words.' },
            { front: 'When do you use a semicolon?', back: 'To join two closely related independent clauses.', explanation: 'Helps avoid "comma splices".' },
            { front: 'What is an adjective?', back: 'A word that describes or modifies a noun or pronoun.', explanation: 'Adds detail to nouns.' },
            { front: 'What is an adverb?', back: 'A word that modifies a verb, adjective, or another adverb.', explanation: 'Often ends in -ly.' }
        ],
        questions: [
            { year: '2023', question: 'Identify the part of speech for the underlined word: The *quick* brown fox jumps.', answer: 'Adjective', explanation: 'It describes the noun "fox".' },
            { year: '2022', question: 'Correct the following sentence: me and him went to the store.', answer: 'He and I went to the store.', explanation: 'Subject pronouns should be used.' }
        ]
    },
    {
        subject: 'Biology',
        topic: 'Cell Biology Essentials',
        flashcards: [
            { front: 'What is the powerhouse of the cell?', back: 'Mitochondria', explanation: 'They generate most of the cell\'s supply of adenosine triphosphate (ATP).' },
            { front: 'What is photosynthesis?', back: 'Process used by plants to convert light energy into chemical energy.', explanation: 'Occurs in the chloroplasts.' },
            { front: 'What is DNA?', back: 'Deoxyribonucleic acid; the hereditary material in humans and almost all other organisms.', explanation: 'Stores genetic information.' },
            { front: 'Difference between Prokaryotic and Eukaryotic cells?', back: 'Eukaryotic cells have a nucleus and membrane-bound organelles; Prokaryotic do not.', explanation: 'Bacteria are prokaryotic.' },
            { front: 'What is mitosis?', back: 'A type of cell division that results in two daughter cells each having the same number and kind of chromosomes as the parent nucleus.', explanation: 'Used for growth and repair.' }
        ],
        questions: [
            { year: '2023 Jan', question: 'Describe the function of the ribosome.', answer: 'Protein synthesis', explanation: 'Ribosomes translate mRNA into polypeptide chains.' },
            { year: '2022 June', question: 'What is the primary product of photosynthesis?', answer: 'Glucose and Oxygen', explanation: 'Plants use CO2, water, and sunlight to produce energy-rich glucose.' }
        ]
    },
    {
        subject: 'Spanish',
        topic: 'Common Phrases and Verbs',
        flashcards: [
            { front: 'How do you say "Hello" in Spanish?', back: 'Hola', explanation: 'Standard greeting.' },
            { front: 'What does "Gracias" mean?', back: 'Thank you', explanation: 'Expressing gratitude.' },
            { front: 'Conjugate "hablar" in the present tense (Yo form).', back: 'Hablo', explanation: 'Regular -ar verb ending.' },
            { front: 'What is "The library" in Spanish?', back: 'La biblioteca', explanation: 'Common place noun.' },
            { front: 'How do you say "I am hungry"?', back: 'Tengo hambre', explanation: 'Uses "tener" (to have) idiomatically.' }
        ],
        questions: [
            { year: '2023', question: 'Translate to Spanish: I live in a house.', answer: 'Vivo en una casa.', explanation: 'Vivri (to live) in present tense.' },
            { year: '2021', question: 'What is the opposite of "pequeño"?', answer: 'Grande', explanation: 'Small vs Large.' }
        ]
    },
    {
        subject: 'French',
        topic: 'Introductory Vocabulary',
        flashcards: [
            { front: 'How do you say "Good morning" in French?', back: 'Bonjour', explanation: 'Literally "Good day".' },
            { front: 'What does "S\'il vous plaît" mean?', back: 'Please', explanation: 'Formal version.' },
            { front: 'Conjugate "être" for "Je".', back: 'Je suis', explanation: 'Irregular verb "to be".' },
            { front: 'What is "The water" in French?', back: 'L\'eau', explanation: 'Feminine noun with elision.' },
            { front: 'How do you say "I am 15 years old"?', back: 'J\'ai 15 ans', explanation: 'Uses "avoir" (to have) for age.' }
        ],
        questions: [
            { year: '2023', question: 'Translate to French: My name is Paul.', answer: 'Je m\'appelle Paul.', explanation: 'Uses reflexive verb s\'appeler.' },
            { year: '2022', question: 'What is the French word for "Apple"?', answer: 'Pomme', explanation: 'Common fruit.' }
        ]
    },
    {
        subject: 'Chemistry',
        topic: 'Atomic Structure and Bonding',
        flashcards: [
            { front: 'What are the three subatomic particles?', back: 'Protons, Neutrons, Electrons', explanation: 'Found in an atom.' },
            { front: 'What is an ionic bond?', back: 'A bond formed by the transfer of electrons from one atom to another.', explanation: 'Typically between a metal and a non-metal.' },
            { front: 'What is the atomic number?', back: 'The number of protons in the nucleus of an atom.', explanation: 'Unique to each element.' },
            { front: 'What is a covalent bond?', back: 'A bond formed by the sharing of electron pairs between atoms.', explanation: 'Typically between non-metals.' },
            { front: 'What is pH?', back: 'A scale used to specify the acidity or basicity of an aqueous solution.', explanation: 'Rangess from 0 to 14.' }
        ],
        questions: [
            { year: '2023', question: 'What is the chemical formula for water?', answer: 'H2O', explanation: 'Two hydrogen atoms and one oxygen atom.' },
            { year: '2022', question: 'Define an Isotope.', answer: 'Atoms of the same element with different numbers of neutrons.', explanation: 'Same protons, different mass.' }
        ]
    },
    {
        subject: 'Physics',
        topic: 'Forces and Motion',
        flashcards: [
            { front: 'What is Newton\'s First Law?', back: 'An object at rest stays at rest unless acted upon by an external force.', explanation: 'Also known as the Law of Inertia.' },
            { front: 'What is the formula for Force?', back: 'F = m * a (Force = mass * acceleration)', explanation: 'Newton\'s Second Law.' },
            { front: 'What is Velocity?', back: 'Speed in a specific direction.', explanation: 'It is a vector quantity.' },
            { front: 'What is Kinetic Energy?', back: 'The energy an object possesses due to its motion.', explanation: 'Formula is 1/2 * m * v^2.' },
            { front: 'What is Gravity?', back: 'A force that pulls objects toward each other.', explanation: 'On Earth, approx 9.8 m/s^2.' }
        ],
        questions: [
            { year: '2023', question: 'A car travels 100m in 5 seconds. What is its average speed?', answer: '20 m/s', explanation: 'Speed = distance / time.' },
            { year: '2021', question: 'Define Work in physics.', answer: 'Work is done when a force acts upon an object to cause a displacement.', explanation: 'Work = Force * displacement.' }
        ]
    },
    {
        subject: 'History',
        topic: 'World War II Overview',
        flashcards: [
            { front: 'When did WWII start?', back: '1939', explanation: 'Marked by the invasion of Poland.' },
            { front: 'Who were the Allied Powers?', back: 'UK, USSR, USA, China, and others.', explanation: 'Opposed the Axis.' },
            { front: 'Who were the Axis Powers?', back: 'Germany, Italy, Japan.', explanation: 'Initiated the conflict.' },
            { front: 'When did WWII end?', back: '1945', explanation: 'Ends with the surrender of Germany and Japan.' },
            { front: 'What was the D-Day invasion?', back: 'Allied invasion of Normandy, France, on June 6, 1944.', explanation: 'Turning point in the Western front.' }
        ],
        questions: [
            { year: '2022', question: 'Which event led the USA to join WWII?', answer: 'The attack on Pearl Harbor.', explanation: 'December 7, 1941.' },
            { year: '2020', question: 'Where were the peace treaties signed after WWII?', answer: 'Paris Peace Conference', explanation: 'Restored peace to Europe.' }
        ]
    },
    {
        subject: 'POA',
        topic: 'Principles of Accounts Basics',
        flashcards: [
            { front: 'What is the Accounting Equation?', back: 'Assets = Liabilities + Equity', explanation: 'Foundational concept.' },
            { front: 'What is a Debit?', back: 'An entry recording an amount owed, listed on the left-hand side.', explanation: 'Increases assets or decreases liabilities.' },
            { front: 'What is a Credit?', back: 'An entry recording a sum received, listed on the right-hand side.', explanation: 'Decreases assets or increases liabilities.' },
            { front: 'What is a Balance Sheet?', back: 'Financial statement that reports a company\'s assets, liabilities, and shareholders\' equity.', explanation: 'Point-in-time snapshot.' },
            { front: 'What is Depreciation?', back: 'Allocation of the cost of an asset over its useful life.', explanation: 'Non-cash expense.' }
        ],
        questions: [
            { year: '2023', question: 'If Assets are $50,000 and Liabilities are $20,000, what is the Equity?', answer: '$30,000', explanation: 'Equity = Assets - Liabilities.' },
            { year: '2022', question: 'Define Current Assets.', answer: 'Assets expected to be converted to cash within one year.', explanation: 'e.g., Inventory, Accounts Receivable.' }
        ]
    },
    {
        subject: 'POB',
        topic: 'Principles of Business Essentials',
        flashcards: [
            { front: 'What is a Sole Trader?', back: 'A business owned and operated by one person.', explanation: 'Simple structure, unlimited liability.' },
            { front: 'What is Marketing?', back: 'The action or business of promoting and selling products or services.', explanation: 'Includes market research and advertising.' },
            { front: 'What are the 4 Ps of Marketing?', back: 'Product, Price, Place, Promotion', explanation: 'Commonly known as the Marketing Mix.' },
            { front: 'What is a Partnership?', back: 'A business owned by two or more people.', explanation: 'Shared responsibility and profits.' },
            { front: 'What is HR Management?', back: 'The strategic approach to managing people in a company.', explanation: 'Recruitment, training, employee relations.' }
        ],
        questions: [
            { year: '2023', question: 'State one advantage of a Limited Liability Company.', answer: 'Owners are not personally responsible for the company\'s debts.', explanation: 'Protects personal assets.' },
            { year: '2021', question: 'What is a SWOT analysis?', answer: 'Strengths, Weaknesses, Opportunities, Threats', explanation: 'Strategic planning tool.' }
        ]
    },
    {
        subject: 'Literature',
        topic: 'Literary Devices and Shakespeare',
        flashcards: [
            { front: 'What is a Metaphor?', back: 'A figure of speech that describes an object or action in a way that isn’t literally true, but helps explain an idea.', explanation: 'Comparison without using "like" or "as".' },
            { front: 'What is an Onomatopoeia?', back: 'A word that phonetically imitates the sound it describes.', explanation: 'e.g., "Buzz", "Bang".' },
            { front: 'Who wrote "Romeo and Juliet"?', back: 'William Shakespeare', explanation: 'Famous tragedy.' },
            { front: 'What is a Sonnet?', back: 'A poem of fourteen lines using any of a number of formal rhyme schemes.', explanation: 'Shakespeare is famous for them.' },
            { front: 'What is Irony?', back: 'The expression of one\'s meaning by using language that normally signifies the opposite.', explanation: 'Expectation vs Reality.' }
        ],
        questions: [
            { year: '2022', question: 'Define "Hyperbole".', answer: 'Exaggerated statements or claims not meant to be taken literally.', explanation: 'Used for emphasis.' },
            { year: '2020', question: 'What is the theme of a story?', answer: 'The underlying message or main idea.', explanation: 'Universal truth.' }
        ]
    }
];

async function seedDefaults() {
    console.log('Seeding default educational content...');

    for (const item of defaultContent) {
        console.log(`- Seeding ${item.subject}...`);

        // 1. Check if topic already exists for this subject with no teamId
        const existingTopics = await db
            .select()
            .from(topics)
            .where(
                and(
                    isNull(topics.teamId),
                    eq(topics.subject, item.subject as any),
                    eq(topics.name, item.topic)
                )
            );

        let topicId;
        if (existingTopics.length === 0) {
            console.log(`  - Creating topic: ${item.topic}`);
            const [newTopic] = await db.insert(topics).values({
                subject: item.subject as any,
                name: item.topic,
                description: `Default content for ${item.subject}`,
            }).returning();
            topicId = newTopic.id;
        } else {
            console.log(`  - Topic already exists: ${item.topic}`);
            topicId = existingTopics[0].id;
        }

        // 2. Seed Flashcards
        for (const card of item.flashcards) {
            const existingCards = await db
                .select()
                .from(flashcards)
                .where(
                    and(
                        eq(flashcards.topicId, topicId),
                        eq(flashcards.front, card.front)
                    )
                );

            if (existingCards.length === 0) {
                await db.insert(flashcards).values({
                    topicId,
                    front: card.front,
                    back: card.back,
                    explanation: card.explanation,
                });
            }
        }

        // 3. Seed Past Paper Questions
        for (const q of item.questions) {
            const existingQuestions = await db
                .select()
                .from(passedPaperQuestions)
                .where(
                    and(
                        eq(passedPaperQuestions.topicId, topicId),
                        eq(passedPaperQuestions.question, q.question)
                    )
                );

            if (existingQuestions.length === 0) {
                await db.insert(passedPaperQuestions).values({
                    topicId,
                    year: q.year,
                    question: q.question,
                    answerMarkdown: q.answer,
                    explanationMarkdown: q.explanation,
                });
            }
        }
    }
    console.log('Default content seeding completed.');
}

seedDefaults()
    .catch((error) => {
        console.error('Seed process failed:', error);
        process.exit(1);
    })
    .finally(() => {
        process.exit(0);
    });
