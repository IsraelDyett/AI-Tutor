// app/(dashboard)/dashboard/team/team-page-client.tsx
'use client';

import { useState, useTransition } from 'react';
import { 
  Users, Mail, Crown, UserMinus, Clock, Globe, 
  CheckCircle2, XCircle, Loader2, BarChart2, Plus, X, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { inviteTeamMember, removeTeamMember } from '@/app/(login)/actions';
import { cancelInvitationAction, removeMemberAction, updateTeamEducationLevelsAction } from './actions';
import type { TeamMemberWithUser, TeamOverview } from './actions';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PendingInvite {
  id: number;
  email: string;
  role: string;
  invitedAt: Date;
  status: string;
}

interface TeamPageClientProps {
  members: TeamMemberWithUser[];
  pendingInvites: PendingInvite[];
  currentUserId: number;
  isAdmin: boolean;
  overview: TeamOverview | null;
}

function getInitials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-orange-100 text-orange-700',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
  'bg-pink-100 text-pink-700',
  'bg-amber-100 text-amber-700',
];

function avatarColor(userId: number) {
  return AVATAR_COLORS[userId % AVATAR_COLORS.length];
}

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

// ─── Invite Form ──────────────────────────────────────────────────────────────
function InviteForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'owner'>('member');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!email.trim()) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set('email', email.trim());
      formData.set('role', role);
      const result = await inviteTeamMember({ error: '' }, formData);
      if (result?.error) {
        setStatus({ type: 'error', message: result.error });
      } else {
        setStatus({ type: 'success', message: `Invitation sent to ${email}` });
        setEmail('');
        setTimeout(onDone, 1500);
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
        <div>
          <Label htmlFor="invite-email" className="text-xs text-gray-500 mb-1">Email address</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="student@example.com"
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500 mb-1">Role</Label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'member' | 'owner')}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="member">Member</option>
            <option value="owner">Admin</option>
          </select>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isPending || !email.trim()}
          className="h-9 bg-orange-500 hover:bg-orange-600 text-white"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Invite'}
        </Button>
      </div>
      {status && (
        <p className={`text-sm flex items-center gap-1.5 ${status.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
          {status.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {status.message}
        </p>
      )}
    </div>
  );
}

// ─── Member Card ──────────────────────────────────────────────────────────────
function MemberCard({
  member,
  isCurrentUser,
  isAdmin,
  onRemove,
}: {
  member: TeamMemberWithUser;
  isCurrentUser: boolean;
  isAdmin: boolean;
  onRemove: (memberId: number) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleRemove = () => {
    if (!confirming) { setConfirming(true); return; }
    startTransition(async () => {
      await removeMemberAction(member.memberId);
      onRemove(member.memberId);
    });
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isCurrentUser ? 'border-orange-200 bg-orange-50/40' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor(member.userId)}`}>
        {getInitials(member.name, member.email)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 text-sm truncate">
            {member.name ?? member.email.split('@')[0]}
          </span>
          {isCurrentUser && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">You</span>
          )}
          {member.role === 'owner' && (
            <span className="flex items-center gap-0.5 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              <Crown className="h-3 w-3" /> Admin
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">{member.email}</p>
        <div className="flex items-center gap-3 mt-0.5">
          {member.country && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Globe className="h-3 w-3" /> {member.country}
            </span>
          )}
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Joined {timeAgo(member.joinedAt)}
          </span>
        </div>
      </div>

      {/* Actions */}
      {isAdmin && !isCurrentUser && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {confirming ? (
            <>
              <button
                onClick={handleRemove}
                disabled={isPending}
                className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors"
              >
                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="text-xs text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <button
              onClick={handleRemove}
              className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
              title="Remove member"
            >
              <UserMinus className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Pending Invite Row ───────────────────────────────────────────────────────
function PendingInviteRow({
  invite,
  onCancel,
}: {
  invite: PendingInvite;
  onCancel: (id: number) => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
        <Mail className="h-4 w-4 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700 truncate">{invite.email}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">Pending</span>
          <span className="text-xs text-gray-400">{timeAgo(invite.invitedAt)}</span>
        </div>
      </div>
      <button
        onClick={() => {
          startTransition(async () => {
            await cancelInvitationAction(invite.id);
            onCancel(invite.id);
          });
        }}
        disabled={isPending}
        className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 flex-shrink-0"
        title="Cancel invitation"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TeamPageClient({
  members: initialMembers,
  pendingInvites: initialInvites,
  currentUserId,
  isAdmin,
  overview,
}: TeamPageClientProps) {
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const router = useRouter();

  const [optimisticLevels, setOptimisticLevels] = useState<string[]>(overview?.activeEducationLevels || ['CSEC']);
  const [isUpdatingLevel, startUpdatingLevel] = useTransition();

  const handleToggleLevel = (lvl: string) => {
    // If it's already active, remove it. Otherwise, add it.
    const newLevels = optimisticLevels.includes(lvl) 
      ? optimisticLevels.filter(l => l !== lvl)
      : [...optimisticLevels, lvl];
      
    // Prevent unselecting all of them (must have at least one active)
    if (newLevels.length === 0) return;

    setOptimisticLevels(newLevels);
    startUpdatingLevel(async () => {
      await updateTeamEducationLevelsAction(newLevels);
    });
  };

  const handleMemberRemoved = (memberId: number) => {
    setMembers((prev) => prev.filter((m) => m.memberId !== memberId));
  };

  const handleInviteCancelled = (inviteId: number) => {
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
  };

  const handleInviteSent = () => {
    setShowInviteForm(false);
    router.refresh();
  };

  // Separate owners and regular members
  const owners = members.filter((m) => m.role === 'owner');
  const regularMembers = members.filter((m) => m.role !== 'owner');

  return (
    <main className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6 text-orange-500" />
              {overview?.teamName ?? 'Your Team'}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {members.length} member{members.length !== 1 ? 's' : ''}
              {overview?.planName ? ` · ${overview.planName} plan` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild className="border-orange-200 text-orange-600 hover:bg-orange-50">
              <Link href="/dashboard/team/performance">
                <BarChart2 className="h-4 w-4 mr-2" /> Performance
              </Link>
            </Button>
            {isAdmin && (
              <Button
                onClick={() => setShowInviteForm(!showInviteForm)}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Invite Member
              </Button>
            )}
          </div>
        </div>

        {/* Usage Stats (admin only) */}
        {isAdmin && overview?.usage && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Voice sessions', value: overview.usage.voiceTutorSessionsCount },
              { label: 'Text sessions', value: overview.usage.textTutorSessionsCount },
              { label: 'Flashcard sets', value: overview.usage.flashcardsGenerated },
              { label: 'Past papers', value: overview.usage.pastPapersGenerated },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
{isAdmin && overview && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-orange-500" /> Enrollments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {/* DYNAMICALLY map over the levels allowed for this specific team */}
                {overview.allowedEducationLevels.map((lvl) => {
                  const isActive = optimisticLevels.includes(lvl);
                  return (
                    <Button
                      key={lvl}
                      variant={isActive ? 'default' : 'outline'}
                      onClick={() => handleToggleLevel(lvl)}
                      disabled={isUpdatingLevel}
                      className={`min-w-[100px] transition-all ${
                        isActive 
                          ? 'bg-orange-500 hover:bg-orange-600 text-white border-transparent shadow-sm' 
                          : 'border-orange-200 text-orange-700 hover:bg-orange-50'
                      }`}
                    >
                      {lvl}
                    </Button>
                  );
                })}
              </div>
              
              {/* Optional: Show a message if they are restricted */}
              {overview.allowedEducationLevels.length < 3 ? (
                <p className="text-sm text-gray-500 mt-3">
                  Select the active education levels for your and your team. Access to other curriculums is currently restricted for your organization. Contact support to unlock more.
                </p>
              ) : (
                <p className="text-sm text-gray-500 mt-3">
                  Select the active education levels for your and your team. You can enable multiple curriculums at once. This controls which subjects are visible in the sidebar menu.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Invite Form */}
        {isAdmin && showInviteForm && (
          <Card className="border-orange-200 bg-orange-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-orange-800 flex items-center gap-2">
                <Mail className="h-4 w-4" /> Invite a new member
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InviteForm onDone={handleInviteSent} />
            </CardContent>
          </Card>
        )}

        {/* Members List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {isAdmin ? 'Admins' : 'Team Admins'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {owners.map((member) => (
              <MemberCard
                key={member.memberId}
                member={member}
                isCurrentUser={member.userId === currentUserId}
                isAdmin={isAdmin}
                onRemove={handleMemberRemoved}
              />
            ))}
          </CardContent>
        </Card>

        {regularMembers.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {regularMembers.map((member) => (
                <MemberCard
                  key={member.memberId}
                  member={member}
                  isCurrentUser={member.userId === currentUserId}
                  isAdmin={isAdmin}
                  onRemove={handleMemberRemoved}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Pending Invitations (admin only) */}
        {isAdmin && invites.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-amber-700 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Pending Invitations ({invites.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invites.map((invite) => (
                <PendingInviteRow
                  key={invite.id}
                  invite={invite}
                  onCancel={handleInviteCancelled}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Empty state for non-admin with no team mates */}
        {!isAdmin && members.length <= 1 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">You're the only one here so far.</p>
              <p className="text-gray-400 text-sm mt-1">Ask your admin to invite more members.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}