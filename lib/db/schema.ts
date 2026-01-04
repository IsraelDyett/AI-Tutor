import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  pgEnum,
  decimal,
  boolean,
  jsonb
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planName: varchar('plan_name', { length: 50 }),
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
  salesManual: text('sales_manual'),
});

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  role: varchar('role', { length: 50 }).notNull(),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});

export const plans = pgTable('plans', {
  id: serial('id').primaryKey(),
  displayName: varchar('displayName', { length: 50 }).notNull(),
  name: varchar('name', { length: 50 }).notNull(),
  description: varchar('description', { length: 300 }).notNull(),
  monthlyPrice: integer('monthly_price').notNull(),
  annuallyPrice: integer('annuallyPrice').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  features: text('features').array().notNull().default([]),
  coaching_calls_limit: integer('coaching_calls_limit').notNull().default(0),
  active_members_limit: integer('active_members_limit').notNull().default(0),
  transcript_uploads_limit: integer('transcript_uploads_limit').notNull().default(0),
  flashcards_limit: integer('flashcards_limit').notNull().default(0),
  past_papers_limit: integer('past_papers_limit').notNull().default(0),
  voice_tutor_sessions_limit: integer('voice_tutor_sessions_limit').notNull().default(0),
  text_tutor_sessions_limit: integer('text_tutor_sessions_limit').notNull().default(0),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
});


// // Define the new table for transcriptions
// export const transcriptions = pgTable('transcriptions', {
//   id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
//   fileName: varchar('file_name', { length: 255 }).notNull(),
//   status: varchar('status', { length: 50 }).default('uploaded').notNull(),
//   createdAt: timestamp('created_at').defaultNow().notNull(),
//   userId: text('user_id').notNull().references(() => users.id),
//   teamId: text('team_id').notNull().references(() => teams.id),
// });

export const transcriptionStatusEnum = pgEnum(
  'transcription_status',
  ['pending',
    'transcript processing',
    'transcript completed',
    'analytics processing',
    'analytics completed',
    'completed',
    'failed']);

export const managerComments = pgTable('manager_comments', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),

  // Foreign key linking to the specific transcription file
  transcriptionFileId: integer('transcription_file_id')
    .notNull()
    .references(() => transcriptionFiles.id, { onDelete: 'cascade' }), // If a transcript is deleted, its comments are also deleted

  // Foreign key linking to the user (manager) who wrote the comment
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }), // If a user is deleted, their comments are also deleted
});

export const managerCommentsRelations = relations(
  managerComments,
  ({ one }) => ({
    // A comment belongs to one transcription file
    transcriptionFile: one(transcriptionFiles, {
      fields: [managerComments.transcriptionFileId],
      references: [transcriptionFiles.id],
    }),
    // A comment is written by one author (user)
    author: one(users, {
      fields: [managerComments.authorId],
      references: [users.id],
    }),
  })
);

// New table for transcription files
export const transcriptionFiles = pgTable('transcription_files', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  url: text('url').notNull(),
  transcription: text('transcription'),
  status: transcriptionStatusEnum('status').default('pending'),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),

  // --- LLM Analysis Metrics (Nullable as they are populated later) ---

  // Ratios and Durations
  talkToListenRatio: varchar('talk_to_listen_ratio', { length: 15 }), // e.g., "40:60"
  callDuration: varchar('call_duration', { length: 15 }), // e.g., "00:15:32"
  longestRepMonologue: varchar('longest_rep_monologue', { length: 15 }), // e.g., "00:02:10"

  // Quantitative Metrics
  questionRate: decimal('question_rate', { precision: 5, scale: 2 }), // Questions per minute
  objectionCount: integer('objection_count'),
  speechRateWPM: integer('speech_rate_wpm'), // Words Per Minute

  // Scores
  objectionHandlingEffectivenessScore: decimal('objection_handling_effectiveness_score', { precision: 5, scale: 2 }),
  callPerformanceScore: decimal('call_performance_score', { precision: 5, scale: 2 }),

  // JSON / Array Metrics
  objectionTypeDistribution: jsonb('objection_type_distribution'), // e.g., { "price": 2, "timing": 1 }
  fillerWordFrequency: jsonb('filler_word_frequency'), // e.g., { "um": 10, "like": 5 }
  strengthsHighlight: text('strengths_highlight').array(), // e.g., ["Good rapport", "Clear explanation"]
  areasForImprovement: text('areas_for_improvement').array(), // e.g., ["Ask more open-ended questions"]

});

// Relations for the new table
export const transcriptionFilesRelations = relations(
  transcriptionFiles,
  ({ one, many }) => ({
    user: one(users, {
      fields: [transcriptionFiles.userId],
      references: [users.id]
    }),
    team: one(teams, {
      fields: [transcriptionFiles.teamId],
      references: [teams.id]
    }),
    // --- Start of The Fix ---
    // A transcription file can have many manager comments
    comments: many(managerComments),
    // --- End of The Fix --
  })
);

export const invitations = pgTable('invitations', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  invitedBy: integer('invited_by')
    .notNull()
    .references(() => users.id),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
});


export const teamUsage = pgTable('team_usage', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }) // Deletes usage record if team is deleted
    .unique(), // Ensures one usage record per team

  // --- Usage Counters (for the current billing cycle) ---
  transcriptsUploaded: integer('transcripts_uploaded').notNull().default(0),
  coachingCallsUsed: integer('coaching_calls_used').notNull().default(0),
  activeMembers: integer('active_members').notNull().default(0),
  flashcardsGenerated: integer('flashcards_generated').notNull().default(0),
  pastPapersGenerated: integer('past_papers_generated').notNull().default(0),
  voiceTutorSessionsCount: integer('voice_tutor_sessions_count').notNull().default(0),
  textTutorSessionsCount: integer('text_tutor_sessions_count').notNull().default(0),

  // --- Boolean Flags for Limit Status ---
  isTranscriptLimitReached: boolean('is_transcript_limit_reached').notNull().default(false),
  isMemberLimitReached: boolean('is_member_limit_reached').notNull().default(false),
  isCoachingCallLimitReached: boolean('is_coaching_call_limit_reached').notNull().default(false),
  isFlashcardLimitReached: boolean('is_flashcard_limit_reached').notNull().default(false),
  isPastPaperLimitReached: boolean('is_past_paper_limit_reached').notNull().default(false),
  isVoiceTutorLimitReached: boolean('is_voice_tutor_limit_reached').notNull().default(false),
  isTextTutorLimitReached: boolean('is_text_tutor_limit_reached').notNull().default(false),

  // --- Timestamps for Usage Cycle Management ---
  cycleStartDate: timestamp('cycle_start_date').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});


// Relations for the new teamUsage table
export const teamUsageRelations = relations(
  teamUsage,
  ({ one }) => ({
    team: one(teams, {
      fields: [teamUsage.teamId],
      references: [teams.id]
    })
  })
);

export const teamsRelations = relations(teams, ({ many, one }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
  transcriptionFiles: many(transcriptionFiles), // Add this line
  usage: one(teamUsage), // <-- Add this line for the one-to-one relationship
  salesSprints: many(salesSprints),
}));

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  invitationsSent: many(invitations),
  transcriptionFiles: many(transcriptionFiles),
  comments: many(managerComments),
  salesSprints: many(salesSprints),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}));


export const salesSprints = pgTable('sales_sprints', {
  id: serial('id').primaryKey(),
  sprintName: varchar('sprint_name', { length: 255 }).notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),

  // User-inputted data
  goals: jsonb('goals'), // e.g., [{ metric: 'Calls Made', target: 100 }]
  outcomes: jsonb('outcomes'), // e.g., [{ metric: 'Calls Made', actual: 110 }]

  // AI-generated analysis (nullable)
  summary: text('summary'),
  performanceScore: decimal('performance_score', { precision: 5, scale: 2 }),
  strengths: text('strengths').array(),
  areasForImprovement: text('areas_for_improvement').array(),

  // Foreign keys
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sprintManagerComments = pgTable('sprint_manager_comments', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),

  sprintId: integer('sprint_id')
    .notNull()
    .references(() => salesSprints.id, { onDelete: 'cascade' }),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

// --- Relations for new tables ---

export const salesSprintsRelations = relations(salesSprints, ({ one, many }) => ({
  user: one(users, {
    fields: [salesSprints.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [salesSprints.teamId],
    references: [teams.id],
  }),
  comments: many(sprintManagerComments),
}));

export const sprintManagerCommentsRelations = relations(sprintManagerComments, ({ one }) => ({
  sprint: one(salesSprints, {
    fields: [sprintManagerComments.sprintId],
    references: [salesSprints.id],
  }),
  author: one(users, {
    fields: [sprintManagerComments.authorId],
    references: [users.id],
  }),
}));


export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  team: one(teams, {
    fields: [activityLogs.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

// --- ADD THE NEW BLOG POSTS TABLE AT THE END OF THE FILE ---
export const blogPosts = pgTable('blog_posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  // A slug is a URL-friendly version of the title, e.g., "my-first-post"
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  // The main content of the blog, can be very long
  content: text('content').notNull(),
  // URL to the thumbnail image
  thumbnailUrl: text('thumbnail_url').notNull(),
  // Foreign key to link to the author in the 'users' table
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type blogPosts = typeof blogPosts.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type NewManagerComment = typeof managerComments.$inferInsert;
export type NewPlan = typeof plans.$inferInsert;
export type SalesSprint = typeof salesSprints.$inferSelect;
export type NewSalesSprint = typeof salesSprints.$inferInsert;
export type TeamDataWithMembers = Team & {
  teamMembers: (TeamMember & {
    user: Pick<User, 'id' | 'name' | 'email'>;
  })[];
};

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
}

// --- Education Platform Tables ---

export const subjectsEnum = pgEnum('subjects', [
  'English',
  'Biology',
  'Spanish',
  'French',
  'Chemistry',
  'Physics',
  'History',
  'POA',
  'POB',
  'Literature'
]);

export const topics = pgTable('topics', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .references(() => teams.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  subject: subjectsEnum('subject').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const flashcards = pgTable('flashcards', {
  id: serial('id').primaryKey(),
  topicId: integer('topic_id')
    .notNull()
    .references(() => topics.id, { onDelete: 'cascade' }),
  front: text('front').notNull(),
  back: text('back').notNull(),
  explanation: text('explanation'), // Logic for "why this is the answer"
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const passedPaperQuestions = pgTable('passed_paper_questions', {
  id: serial('id').primaryKey(),
  topicId: integer('topic_id')
    .notNull()
    .references(() => topics.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  year: varchar('year', { length: 10 }), // e.g. "2023", "2023 Jan"
  answerMarkdown: text('answer_markdown'), // Generated answer
  explanationMarkdown: text('explanation_markdown'), // Generated explanation
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const studySessions = pgTable('study_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  topicId: integer('topic_id')
    .notNull() // Can be null if it's a general subject session? For now, enforce topic.
    .references(() => topics.id, { onDelete: 'cascade' }),
  transcript: text('transcript'),
  summary: text('summary'),
  durationSeconds: integer('duration_seconds'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  endedAt: timestamp('ended_at'),
});

// --- Relations for Education Tables ---

export const topicsRelations = relations(topics, ({ one, many }) => ({
  team: one(teams, {
    fields: [topics.teamId],
    references: [teams.id],
  }),
  flashcards: many(flashcards),
  passedPaperQuestions: many(passedPaperQuestions),
  studySessions: many(studySessions),
}));

export const flashcardsRelations = relations(flashcards, ({ one }) => ({
  topic: one(topics, {
    fields: [flashcards.topicId],
    references: [topics.id],
  }),
}));

export const passedPaperQuestionsRelations = relations(passedPaperQuestions, ({ one }) => ({
  topic: one(topics, {
    fields: [passedPaperQuestions.topicId],
    references: [topics.id],
  }),
}));

export const studySessionsRelations = relations(studySessions, ({ one }) => ({
  user: one(users, {
    fields: [studySessions.userId],
    references: [users.id],
  }),
  topic: one(topics, {
    fields: [studySessions.topicId],
    references: [topics.id],
  }),
}));

export const flashcardTests = pgTable('flashcard_tests', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  topicId: integer('topic_id')
    .notNull()
    .references(() => topics.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  totalQuestions: integer('total_questions').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const flashcardTestsRelations = relations(flashcardTests, ({ one }) => ({
  user: one(users, {
    fields: [flashcardTests.userId],
    references: [users.id],
  }),
  topic: one(topics, {
    fields: [flashcardTests.topicId],
    references: [topics.id],
  }),
}));
