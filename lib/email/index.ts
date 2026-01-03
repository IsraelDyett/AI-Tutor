import { Resend } from 'resend';

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

// The email address you want to send from.
// NOTE: You must verify this domain in your Resend account.
const fromEmail = 'onboarding@aurahsell.com';

/**
 * Sends a team invitation email to a new member.
 * @param inviteeEmail - The email address of the person being invited.
 * @param teamName - The name of the team they are invited to.
 * @param inviteUrl - The unique URL for the invitee to sign up.
 */
export const sendInvitationEmail = async (
  inviteeEmail: string,
  teamName: string,
  inviteUrl: string
) => {
  try {
    await resend.emails.send({
      from: fromEmail,
      to: inviteeEmail,
      subject: `You're invited to join the ${teamName} team!`,
      html: `
        <h1>You're Invited!</h1>
        <p>You have been invited to join the <strong>${teamName}</strong> team.</p>
        <p>Click the link below to accept your invitation and create your account:</p>
        <a href="${inviteUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Accept Invitation
        </a>
        <p>If you did not expect this invitation, you can safely ignore this email.</p>
        <hr />
        <p>The ${teamName} Team</p>
      `
    });
    console.log(`Invitation email sent to ${inviteeEmail}`);
    console.log(`Resend ${resend}`);
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    // Optionally, re-throw the error or handle it as needed
    throw new Error('Could not send the invitation email.');
  }
};