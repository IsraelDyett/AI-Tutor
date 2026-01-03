'use server';

import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  User,
  users,
  teams,
  teamMembers,
  activityLogs,
  type NewUser,
  type NewTeam,
  type NewTeamMember,
  type NewActivityLog,
  ActivityType,
  teamUsage, // <--- Add this import
  invitations, 
  plans
} from '@/lib/db/schema';
import { sendInvitationEmail } from '@/lib/email';
import { comparePasswords, hashPassword, setSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createCheckoutSession } from '@/lib/payments/stripe';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import {
  validatedAction,
  validatedActionWithUser
} from '@/lib/auth/middleware';
import { revalidatePath } from 'next/cache'; 


async function logActivity(
  teamId: number | null | undefined,
  userId: number,
  type: ActivityType,
  ipAddress?: string
) {
  if (teamId === null || teamId === undefined) {
    return;
  }
  const newActivity: NewActivityLog = {
    teamId,
    userId,
    action: type,
    ipAddress: ipAddress || ''
  };
  await db.insert(activityLogs).values(newActivity);
}

const signInSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100)
});

export const signIn = validatedAction(signInSchema, async (data, formData) => {
  const { email, password } = data;

  const userWithTeam = await db
    .select({
      user: users,
      team: teams
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .leftJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(users.email, email))
    .limit(1);

  if (userWithTeam.length === 0) {
    return {
      error: 'Invalid email or password. Please try again.',
      email,
      password
    };
  }

  const { user: foundUser, team: foundTeam } = userWithTeam[0];

  const isPasswordValid = await comparePasswords(
    password,
    foundUser.passwordHash
  );

  if (!isPasswordValid) {
    return {
      error: 'Invalid email or password. Please try again.',
      email,
      password
    };
  }

  await Promise.all([
    setSession(foundUser),
    logActivity(foundTeam?.id, foundUser.id, ActivityType.SIGN_IN)
  ]);

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    return createCheckoutSession({ team: foundTeam, priceId });
  }

  redirect('/dashboard');
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8), 
  inviteId: z.string().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // Error will be associated with the confirmPassword field
});

export const signUp = validatedAction(signUpSchema, async (data, formData) => {
  const { email, password, inviteId } = data;

  // 1. Check for existing user first
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    return {
      error: 'An account with this email already exists.',
      email,
      password,
    };
  }

  // --- Start of The Fix ---

  let teamId: number;
  let userRole: string;
  let createdTeam: typeof teams.$inferSelect | null = null;
  let invitation: (typeof invitations.$inferSelect) | undefined;

  // 2. Handle the two distinct paths: Invitation vs. New Team
  if (inviteId) {
    // --- PATH 1: User is accepting an invitation ---
    [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.id, parseInt(inviteId)),
          eq(invitations.email, email),
          eq(invitations.status, 'pending')
        )
      )
      .limit(1);

    if (!invitation) {
      // The invite ID was provided but it's invalid or expired. Stop the process.
      return { error: 'Invalid or expired invitation.', email, password };
    }

    // Set role and teamId from the existing invitation. Do NOT create a new team.
    userRole = invitation.role;
    teamId = invitation.teamId;

  } else {
    // --- PATH 2: New user is creating their own team ---
    userRole = 'owner';
    const newTeam: NewTeam = { name: `${email}'s Team` };
    [createdTeam] = await db.insert(teams).values(newTeam).returning();

    // This check now ONLY applies to the new team creation path.
    if (!createdTeam) {
      return { error: 'Failed to create team. Please try again.', email, password };
    }

    teamId = createdTeam.id;

    // Create the usage record for the new team
    await db.insert(teamUsage).values({
      teamId: teamId,
      activeMembers: 1, // The owner is the first member
    });
  }

  // 3. Create the user with the role determined above
  const passwordHash = await hashPassword(password);
  const newUser: NewUser = {
    email,
    passwordHash,
    role: userRole,
  };

  const [createdUser] = await db.insert(users).values(newUser).returning();

  if (!createdUser) {
    return { error: 'Failed to create user. Please try again.', email, password };
  }

  // 4. Log the appropriate activity based on the path taken
  if (invitation) {
    await db
      .update(invitations)
      .set({ status: 'accepted' })
      .where(eq(invitations.id, invitation.id));
    await logActivity(teamId, createdUser.id, ActivityType.ACCEPT_INVITATION);
  } else {
    await logActivity(teamId, createdUser.id, ActivityType.CREATE_TEAM);
  }

  // 5. Create the link between the user and the team
  const newTeamMember: NewTeamMember = {
    userId: createdUser.id,
    teamId: teamId, // This is now guaranteed to be assigned
    role: userRole,
  };

  await Promise.all([
    db.insert(teamMembers).values(newTeamMember),
    logActivity(teamId, createdUser.id, ActivityType.SIGN_UP),
    setSession(createdUser),
  ]);

  // 6. Handle redirect to checkout or dashboard
  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    // If the team was just created, use that object. Otherwise, fetch it.
    const teamForCheckout = createdTeam ?? (await db.query.teams.findFirst({ where: eq(teams.id, teamId) }));

    if (!teamForCheckout) {
      return { error: 'Failed to retrieve team information. Please contact support.' };
    }
    
    return createCheckoutSession({ team: teamForCheckout, priceId });
  }

  // --- End of The Fix ---

  redirect('/pricing');
});



export async function signOut() {
  const user = (await getUser()) as User;
  const userWithTeam = await getUserWithTeam(user.id);
  await logActivity(userWithTeam?.teamId, user.id, ActivityType.SIGN_OUT);
  (await cookies()).delete('session');
}

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(100),
  newPassword: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100)
});

export const updatePassword = validatedActionWithUser(
  updatePasswordSchema,
  async (data, _, user) => {
    const { currentPassword, newPassword, confirmPassword } = data;

    const isPasswordValid = await comparePasswords(
      currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'Current password is incorrect.'
      };
    }

    if (currentPassword === newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'New password must be different from the current password.'
      };
    }

    if (confirmPassword !== newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'New password and confirmation password do not match.'
      };
    }

    const newPasswordHash = await hashPassword(newPassword);
    const userWithTeam = await getUserWithTeam(user.id);

    await Promise.all([
      db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, user.id)),
      logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_PASSWORD)
    ]);

    return {
      success: 'Password updated successfully.'
    };
  }
);

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100)
});

export const deleteAccount = validatedActionWithUser(
  deleteAccountSchema,
  async (data, _, user) => {
    const { password } = data;

    const isPasswordValid = await comparePasswords(password, user.passwordHash);
    if (!isPasswordValid) {
      return {
        password,
        error: 'Incorrect password. Account deletion failed.'
      };
    }

    const userWithTeam = await getUserWithTeam(user.id);

    await logActivity(
      userWithTeam?.teamId,
      user.id,
      ActivityType.DELETE_ACCOUNT
    );

    // Soft delete
    await db
      .update(users)
      .set({
        deletedAt: sql`CURRENT_TIMESTAMP`,
        email: sql`CONCAT(email, '-', id, '-deleted')` // Ensure email uniqueness
      })
      .where(eq(users.id, user.id));

    if (userWithTeam?.teamId) {
      await db
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.userId, user.id),
            eq(teamMembers.teamId, userWithTeam.teamId)
          )
        );
    }

    (await cookies()).delete('session');
    redirect('/sign-in');
  }
);

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address')
});

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _, user) => {
    const { name, email } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    await Promise.all([
      db.update(users).set({ name, email }).where(eq(users.id, user.id)),
      logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_ACCOUNT)
    ]);

    return { name, success: 'Account updated successfully.' };
  }
);

const removeTeamMemberSchema = z.object({
  memberId: z.number()
});

export const removeTeamMember = validatedActionWithUser(
  removeTeamMemberSchema,
  async (data, _, user) => {
    const { memberId } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

        // --- Start of The Fix ---

    // Get the member limit from your environment variables
    const maxMembers = parseInt(process.env.MAX_MEMBER_LIMIT || '5');

    // Define the expression for the new member count
    const newMemberCountExpr = sql`GREATEST(0, ${teamUsage.activeMembers} - 1)`;

    // We will run the deletion and the usage update in parallel
    await Promise.all([
      // 1. Delete the member from the team
      db
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.id, memberId),
            eq(teamMembers.teamId, userWithTeam.teamId)
          )
        ),

      // 2. Decrement the active member count and update the limit flag
      db
        .update(teamUsage)
        .set({
          activeMembers: newMemberCountExpr,
          // The limit is no longer reached if the new count is less than the max
          isMemberLimitReached: sql`${newMemberCountExpr} >= ${maxMembers}`,
          updatedAt: new Date()
        })
        .where(eq(teamUsage.teamId, userWithTeam.teamId)),
      
      // 3. Log the activity (already existed)
      logActivity(
        userWithTeam.teamId,
        user.id,
        ActivityType.REMOVE_TEAM_MEMBER
      )
    ]);
    
    // --- End of The Fix ---

    // The original separate db calls are now inside the Promise.all
    // so they can be removed from here.




    // await db
    //   .delete(teamMembers)
    //   .where(
    //     and(
    //       eq(teamMembers.id, memberId),
    //       eq(teamMembers.teamId, userWithTeam.teamId)
    //     )
    //   );

    // await logActivity(
    //   userWithTeam.teamId,
    //   user.id,
    //   ActivityType.REMOVE_TEAM_MEMBER
    // );

    return { success: 'Team member removed successfully' };
  }
);

const inviteTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'owner'])
});

export const inviteTeamMember = validatedActionWithUser(
  inviteTeamMemberSchema,
  async (data, _, user) => {
    const { email, role } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId  || !userWithTeam?.team) {
      return { error: 'User is not part of a team' };
    }

    if (!userWithTeam?.team.planName) {
      return { error: 'Team does not have an active plan.' };
    }

        // 1. Get the member limit from the team's plan in the DB
        const planResult = await db
        .select({
          // ASSUMPTION: Your 'plans' table has a 'member_limit' column
          limit: plans.active_members_limit,
        })
        .from(plans)
        .where(eq(plans.name, userWithTeam.team.planName))
        .limit(1);
  
      if (planResult.length === 0) {
        return { error: `Invalid plan configured for your team.` };
      }
      
      const maxMembers = planResult[0].limit; // The limit is now dynamic
  

    // 1. Check if the team is already at its member limit
    // const maxMembers = parseInt(process.env.MAX_MEMBER_LIMIT || '5'); // Get limit from .env, with a default

    const currentUsage = await db.query.teamUsage.findFirst({
        where: eq(teamUsage.teamId, userWithTeam.teamId),
        columns: {
            activeMembers: true,
            isMemberLimitReached: true,
        }
    });

    // If usage data exists and the limit is reached, block the invitation.
    if (currentUsage?.isMemberLimitReached || (currentUsage && currentUsage.activeMembers >= maxMembers)) {
      return { error: 'Your team has reached the maximum number of members. Please upgrade your plan or remove a member.' };
    }

    const existingMember = await db
      .select()
      .from(users)
      .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
      .where(
        and(eq(users.email, email), eq(teamMembers.teamId, userWithTeam.teamId))
      )
      .limit(1);

    if (existingMember.length > 0) {
      return { error: 'User is already a member of this team' };
    }

    // Check if there's an existing invitation
    const existingInvitation = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email),
          eq(invitations.teamId, userWithTeam.teamId),
          eq(invitations.status, 'pending')
        )
      )
      .limit(1);

    if (existingInvitation.length > 0) {
      return { error: 'An invitation has already been sent to this email' };
    }

    // // Create a new invitation
    // await db.insert(invitations).values({
    //   teamId: userWithTeam.teamId,
    //   email,
    //   role,
    //   invitedBy: user.id,
    //   status: 'pending'
    // });

    
    // --- Start of The Fix ---

    // 2. Create the invitation and get its ID
    const [newInvitation] = await db
      .insert(invitations)
      .values({
        teamId: userWithTeam.teamId,
        email,
        role,
        invitedBy: user.id,
        status: 'pending'
      })
      .returning({ id: invitations.id }); // Get the new invitation ID

    if (!newInvitation || !newInvitation.id) {
        return { error: 'Failed to create the invitation record.' };
    }

    // 3. Construct the unique sign-up URL
    const signUpUrl = new URL('/sign-up', process.env.NEXT_PUBLIC_APP_URL);
    signUpUrl.searchParams.set('inviteId', newInvitation.id.toString()); // Ensure ID is a string

    // 4. Send the invitation email with the correct URL
    try {
      await sendInvitationEmail(email, userWithTeam.team.name, signUpUrl.toString());
    } catch (error) {
      console.error(error);
      // If email fails, the user still has an invitation record, but we should report the error.
      return { error: 'The invitation was created, but we failed to send the email. Please try again later.' };
    }
    
    // --- End of The Fix ---

    

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.INVITE_TEAM_MEMBER
    );

    // TODO: Send invitation email and include ?inviteId={id} to sign-up URL
    // await sendInvitationEmail(email, userWithTeam.team.name, role)

    return { success: 'Invitation sent successfully' };
  });

  
const salesManualSchema = z.object({
  manualText: z.string().max(100000, 'Manual cannot exceed 100,000 characters.'),
});

type ActionState = {
  error?: string;
  success?: string;
};

export const saveSalesManual = async (
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const user = await getUser();
  if (!user) {
    return { error: 'You must be logged in to perform this action.' };
  }

  const userTeamMembership = await getUserWithTeam(user.id);

  if (
    !userTeamMembership ||
    !userTeamMembership.teamId ||
    userTeamMembership.role !== 'owner'
  ) {
    return { error: 'You must be a team owner to save the sales manual.' };
  }
  
  const teamId = userTeamMembership.teamId;

  const validatedFields = salesManualSchema.safeParse({
    manualText: formData.get('manualText'),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors.manualText?.[0],
    };
  }

  try {
    await db
      .update(teams)
      .set({ 
        salesManual: validatedFields.data.manualText, 
        updatedAt: new Date() 
      })
      .where(eq(teams.id, teamId));

    revalidatePath('/settings'); // Refresh the data on the settings page
    return { success: 'Sales manual saved successfully!' };
  } catch (error) {
    console.error('Error saving sales manual:', error);
    return { error: 'An unexpected error occurred. Please try again.' };
  }
};