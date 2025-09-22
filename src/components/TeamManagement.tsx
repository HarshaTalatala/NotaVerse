import React, { useState, useEffect } from 'react';
import { Team, TeamMember } from '../types';
import { Button } from './ui/Button';
import { ConfirmationModal } from './ui/ConfirmationModal';

/******************************
 * Team Settings Modal
 ******************************/
interface TeamSettingsModalProps {
  team: Team | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTeam: (teamId: string, updates: Partial<Team>) => Promise<void>;
  currentUserId?: string;
}

export const TeamSettingsModal: React.FC<TeamSettingsModalProps> = ({ team, isOpen, onClose, onUpdateTeam, currentUserId }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (team) {
      setName(team.name);
      setDescription(team.description || '');
      setIsPrivate(Boolean(team.isPrivate));
      setTags(team.tags || []);
    }
  }, [team]);

  if (!isOpen || !team) return null;

  const currentMember = team.members.find(m => m.userId === currentUserId);
  const canEdit = currentMember?.teamRole === 'owner' || currentMember?.teamRole === 'admin';

  if (!canEdit) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Access Denied</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">You don't have permission to edit this team.</p>
            <Button onClick={onClose} className="w-full">Close</Button>
        </div>
      </div>
    );
  }

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags(prev => [...prev, newTag.trim()]);
      setNewTag('');
    }
  };
  const handleRemoveTag = (tagToRemove: string) => setTags(tags.filter(t => t !== tagToRemove));

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onUpdateTeam(team.id!, {
        name: name.trim(),
        description: description.trim(),
        isPrivate,
        tags,
        updatedAt: new Date()
      });
      onClose();
    } catch (e) {
      console.error('Failed to update team', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight flex items-center">
            <span className="inline-flex items-center justify-center w-8 h-8 mr-2 rounded-md bg-gradient-to-tr from-blue-500 to-indigo-600 text-white text-sm font-medium shadow">TS</span>
            Team Settings
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-8">
          <section>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-4">Basic Information</p>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Team Name *</label>
                <input value={name} onChange={e=>setName(e.target.value)} type="text" placeholder="Enter team name..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} placeholder="Enter team description..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </section>

          <section className="border-t border-dashed border-gray-200 dark:border-gray-700 pt-6">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-4">Privacy</p>
            <label className="flex items-center space-x-3">
              <input type="checkbox" checked={isPrivate} onChange={e=>setIsPrivate(e.target.checked)} className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Private Team <span className="block text-xs text-gray-500 dark:text-gray-400 font-normal">Only invited members can see and join this team</span></span>
            </label>
          </section>

          <section className="border-t border-dashed border-gray-200 dark:border-gray-700 pt-6">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-4">Tags</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map(tag => (
                <span key={tag} className="inline-flex items-center px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-400 rounded-full">
                  {tag}
                  <button onClick={()=>handleRemoveTag(tag)} className="ml-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </span>
              ))}
              {tags.length === 0 && <span className="text-xs text-gray-500 dark:text-gray-400">No tags yet</span>}
            </div>
            <div className="flex space-x-2">
              <input value={newTag} onChange={e=>setNewTag(e.target.value)} onKeyDown={e=> e.key==='Enter' && (e.preventDefault(), handleAddTag())} placeholder="Add tag..." className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <Button onClick={handleAddTag} variant="outline" size="sm" disabled={!newTag.trim()}>Add</Button>
            </div>
          </section>
        </div>

        <div className="flex justify-end space-x-3 mt-10">
          <Button variant="outline" onClick={onClose} disabled={saving} className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving} className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 shadow">{saving ? 'Saving...' : 'Save Changes'}</Button>
        </div>
      </div>
    </div>
  );
};

/******************************
 * Member Management Modal
 ******************************/
interface MemberManagementModalProps {
  team: Team | null;
  isOpen: boolean;
  onClose: () => void;
  onInviteMember: (teamId: string, email: string, role: string) => Promise<void>;
  onUpdateMemberRole: (teamId: string, userId: string, role: string) => Promise<void>;
  onRemoveMember: (teamId: string, userId: string) => Promise<void>;
  currentUserId?: string;
}

export const MemberManagementModal: React.FC<MemberManagementModalProps> = ({ team, isOpen, onClose, onInviteMember, onUpdateMemberRole, onRemoveMember, currentUserId }) => {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [memberToUpdate, setMemberToUpdate] = useState<TeamMember | null>(null);
  const [newRole, setNewRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');

  if (!isOpen || !team) return null;

  const currentMember = team.members.find(m => m.userId === currentUserId);
  const canManage = currentMember?.teamRole === 'owner' || currentMember?.teamRole === 'admin';

  if (!canManage) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Access Denied</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">You don't have permission to manage members of this team.</p>
          <Button onClick={onClose} className="w-full">Close</Button>
        </div>
      </div>
    );
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'editor': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'viewer': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !team.id) return;
    try {
      await onInviteMember(team.id, inviteEmail, inviteRole);
      setInviteEmail('');
      setInviteRole('viewer');
      setShowInvite(false);
    } catch (error) {
      console.error('Failed to invite member:', error);
    }
  };

  const handleUpdateRole = async () => {
    if (!memberToUpdate || !team.id) return;
    try {
      await onUpdateMemberRole(team.id, memberToUpdate.userId, newRole);
      setMemberToUpdate(null);
    } catch (error) {
      console.error('Failed to update member role:', error);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove || !team.id) return;
    try {
      await onRemoveMember(team.id, memberToRemove.userId);
      setMemberToRemove(null);
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <span className="inline-flex items-center justify-center w-8 h-8 mr-2 rounded-md bg-gradient-to-tr from-indigo-500 to-purple-600 text-white text-sm font-medium shadow">MM</span>
              Manage Members - {team.name}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Invite Section */}
          <div className="mb-8 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/10 rounded-lg border border-indigo-100 dark:border-indigo-800/40">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 tracking-wide">Invite New Member</h4>
              <Button onClick={() => setShowInvite(!showInvite)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow">
                {showInvite ? 'Close' : 'Invite'}
              </Button>
            </div>
            {showInvite && (
              <div className="space-y-3 animate-fade-in">
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Enter email address..." />
                <div className="flex items-center space-x-3">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Role</label>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'viewer' | 'editor' | 'admin')} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    {currentMember?.teamRole === 'owner' && <option value="admin">Admin</option>}
                  </select>
                  <Button onClick={handleInvite} disabled={!inviteEmail.trim()} size="sm" className="bg-green-600 hover:bg-green-700 text-white">Send Invite</Button>
                </div>
              </div>
            )}
          </div>

          {/* Current Members */}
          <div>
            <h4 className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400 uppercase mb-4">Current Members ({team.members.length})</h4>
            <div className="space-y-3">
              {team.members.map((member: TeamMember) => (
                <div key={member.userId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/40 rounded-md border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm">
                      {member.userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white leading-tight">{member.userName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Joined {new Date(member.joinedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-[10px] font-medium rounded-full tracking-wide uppercase ${getRoleColor(member.teamRole)}`}>{member.teamRole}</span>
                    {member.userId !== currentUserId && member.teamRole !== 'owner' && (
                      <div className="flex items-center space-x-1">
                        <button onClick={() => { setMemberToUpdate(member); setNewRole(member.teamRole as 'viewer' | 'editor' | 'admin'); }} className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500" title="Change Role">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => setMemberToRemove(member)} className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded focus:outline-none focus:ring-2 focus:ring-red-500" title="Remove Member">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-8">
            <Button variant="outline" onClick={onClose} className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">Close</Button>
          </div>
        </div>
      </div>

      {/* Role Update Modal */}
      {memberToUpdate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Update Member Role</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Change role for <strong>{memberToUpdate.userName}</strong></p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Role</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as 'viewer' | 'editor' | 'admin')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="viewer">Viewer - Can view content</option>
                <option value="editor">Editor - Can view and edit content</option>
                {currentMember?.teamRole === 'owner' && (<option value="admin">Admin - Can manage team and members</option>)}
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setMemberToUpdate(null)} className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">Cancel</Button>
              <Button onClick={handleUpdateRole} className="bg-indigo-600 hover:bg-indigo-700 text-white">Update Role</Button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation */}
      {memberToRemove && (
        <ConfirmationModal isOpen={true} onClose={() => setMemberToRemove(null)} onConfirm={handleRemoveMember} title="Remove Member" message={`Are you sure you want to remove ${memberToRemove.userName} from this team?`} confirmText="Remove" confirmVariant="danger" />
      )}
    </>
  );
};

export default { TeamSettingsModal, MemberManagementModal };