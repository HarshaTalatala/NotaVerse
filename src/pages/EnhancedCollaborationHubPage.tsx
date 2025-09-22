import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotes } from '../hooks/useNotes';
import { useTeams } from '../hooks/useTeams';
import { useActivities } from '../hooks/useActivities';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { FileUpload } from '../components/ui/FileUpload';
import { FileManager } from '../components/ui/FileManager';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { TeamCard } from '../components/TeamCard';
import { TeamSettingsModal, MemberManagementModal } from '../components/TeamManagement';
import { EnhancedTeamCreationModal } from '../components/EnhancedTeamCreationModal';
import { Note, Team, Activity } from '../types';
import { UploadResult } from '../services/azureBlobService';
import { teamsApi } from '../services/collaborationApi';

const EnhancedCollaborationHubPage: React.FC = () => {
  const { user } = useAuth();
  const { notes, loading: notesLoading, createNote } = useNotes();
  const { teams, loading: teamsLoading, createTeam, fetchTeams } = useTeams();
  const { activities, loading: activitiesLoading } = useActivities();
  
  // UI State
  const [showCreateNote, setShowCreateNote] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  // Team Management State
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showTeamSettings, setShowTeamSettings] = useState(false);
  const [showMemberManagement, setShowMemberManagement] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPrivacy, setFilterPrivacy] = useState<'all' | 'public' | 'private'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'members'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Note Creation State
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  // Get recent notes (last 5)
  const recentNotes = notes.slice(0, 5);

  // Get user's teams with filtering and sorting
  const filteredAndSortedTeams = React.useMemo(() => {
    let filtered = teams.filter(team => 
      team.members.some(member => member.userId === user?.uid)
    );

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(team =>
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.members.some(member => member.userName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply privacy filter
    if (filterPrivacy !== 'all') {
      filtered = filtered.filter(team => 
        filterPrivacy === 'private' ? team.isPrivate : !team.isPrivate
      );
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(team =>
        team.tags && team.tags.some(tag => selectedTags.includes(tag))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'members':
          aValue = a.members.length;
          bValue = b.members.length;
          break;
        case 'created':
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [teams, user?.uid, searchTerm, filterPrivacy, selectedTags, sortBy, sortOrder]);

  // Get all unique tags from teams
  const allTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    teams.forEach(team => {
      team.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [teams]);

  // Get recent activities (last 10)
  const recentActivities = activities.slice(0, 10);

  const handleCreateNote = async () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;

    try {
      await createNote({
        title: newNoteTitle,
        content: newNoteContent,
        tags: [],
        isPublic: false,
        authorId: user?.uid || '',
        authorName: user?.displayName || user?.email || 'Unknown',
        authorRole: 'student'
      });
      setNewNoteTitle('');
      setNewNoteContent('');
      setShowCreateNote(false);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleCreateTeam = async (teamData: {
    name: string;
    description: string;
    isPrivate: boolean;
    tags: string[];
    template?: string;
    maxMembers?: number;
  }) => {
    try {
      await createTeam({
        name: teamData.name,
        description: teamData.description,
        createdBy: user?.uid || '',
        createdByName: user?.displayName || user?.email || 'Unknown',
        isPrivate: teamData.isPrivate,
        tags: teamData.tags
      });
      await fetchTeams();
    } catch (error) {
      console.error('Failed to create team:', error);
      throw error;
    }
  };

  const handleUpdateTeam = async (teamId: string, updates: Partial<Team>) => {
    try {
      // For now, we'll just refetch teams since updateTeam API doesn't exist yet
      // In a complete implementation, you'd add PUT /teams/{id} endpoint
      console.log('Team update requested:', teamId, updates);
      await fetchTeams();
    } catch (error) {
      console.error('Failed to update team:', error);
      throw error;
    }
  };

  const handleInviteMember = async (teamId: string, email: string, role: string) => {
    try {
      // In a real app, this would send an email invitation
      console.log(`Inviting ${email} to team ${teamId} with role ${role}`);
      // For now, we'll just log it - you'd implement actual invitation logic
    } catch (error) {
      console.error('Failed to invite member:', error);
      throw error;
    }
  };

  const handleUpdateMemberRole = async (teamId: string, userId: string, role: string) => {
    try {
      await teamsApi.updateMemberRole(teamId, userId, { 
        teamRole: role as 'owner' | 'admin' | 'editor' | 'viewer', 
        updatedBy: user?.uid || '' 
      });
      await fetchTeams();
    } catch (error) {
      console.error('Failed to update member role:', error);
      throw error;
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    try {
      await teamsApi.removeMember(teamId, userId);
      await fetchTeams();
    } catch (error) {
      console.error('Failed to remove member:', error);
      throw error;
    }
  };

  const handleLeaveTeam = async (teamId: string) => {
    if (!user?.uid) return;
    try {
      await teamsApi.removeMember(teamId, user.uid);
      await fetchTeams();
    } catch (error) {
      console.error('Failed to leave team:', error);
    }
  };

  const handleDeleteTeam = async () => {
    if (!teamToDelete?.id) return;
    try {
      await teamsApi.deleteTeam(teamToDelete.id);
      await fetchTeams();
      setTeamToDelete(null);
    } catch (error) {
      console.error('Failed to delete team:', error);
    }
  };

  const handleFileUpload = (file: UploadResult) => {
    setUploadMessage(`File "${file.fileName}" uploaded successfully!`);
    setTimeout(() => setUploadMessage(null), 3000);
  };

  const handleFileUploadError = (error: string) => {
    setUploadMessage(`Upload failed: ${error}`);
    setTimeout(() => setUploadMessage(null), 5000);
  };

  const toggleTagFilter = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterPrivacy('all');
    setSelectedTags([]);
    setSortBy('created');
    setSortOrder('desc');
  };

  const loadingState = notesLoading || teamsLoading || activitiesLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="p-6">
        <div className="mb-6">
          <div className="relative bg-white/90 dark:bg-gray-900/95 backdrop-blur-lg rounded-2xl p-6 border border-gray-200/60 dark:border-gray-700/40 shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-indigo-600/5 to-purple-600/5 dark:from-blue-400/10 dark:via-indigo-400/10 dark:to-purple-400/10 rounded-2xl"></div>
            <div className="relative">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent mb-3">
                Collaboration Hub
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Manage your notes, teams, and collaborate with others.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 border border-gray-200/60 dark:border-gray-700/60 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-200 hover:shadow-lg">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Notes</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{notes.length}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 border border-gray-200/60 dark:border-gray-700/60 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-200 hover:shadow-lg">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 00-5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 0 1 6 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">My Teams</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{filteredAndSortedTeams.length}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white dark:bg-gray-800 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Comments</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">0</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 border border-gray-200/60 dark:border-gray-700/60 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-200 hover:shadow-lg">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l2 2 4-4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Files</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">0</p>
            </div>
          </div>
        </Card>
      </div>

        {/* Teams Section */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/60 dark:border-gray-700/60 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent flex items-center">
              My Teams
              {!loadingState && (
                <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-700/50">
                  {filteredAndSortedTeams.length}
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Collaborate with peers, share notes and files.</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-xs font-medium flex items-center space-x-1 ${viewMode==='grid' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h4v4H4V6zM10 6h4v4h-4V6zM16 6h4v4h-4V6zM4 12h4v4H4v-4zM10 12h4v4h-4v-4zM16 12h4v4h-4v-4z" /></svg>
                <span>Grid</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-xs font-medium flex items-center space-x-1 ${viewMode==='list' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                <span>List</span>
              </button>
            </div>
            <Button
              onClick={() => setShowCreateTeam(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Team
            </Button>
          </div>
        </div>

        {/* Sticky Filters Bar */}
        <div className="sticky top-0 z-20 -mx-4 px-4 py-4 bg-white/70 dark:bg-gray-900/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60 border-y border-gray-200 dark:border-gray-700 mb-6 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center flex-wrap gap-3">
              <div className="flex-1 relative min-w-[220px]">
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search teams, members, descriptions..."
                />
              </div>
              <select
                value={filterPrivacy}
                onChange={(e) => setFilterPrivacy(e.target.value as 'all' | 'public' | 'private')}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
              <div className="flex items-center space-x-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'created' | 'members')}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="created">Created</option>
                  <option value="name">Name</option>
                  <option value="members">Members</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  aria-label="Toggle sort order"
                >
                  <svg className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                </button>
              </div>
              <Button
                onClick={clearFilters}
                variant="outline"
                size="sm"
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                Reset
              </Button>
            </div>

            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTagFilter(tag)}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${active ? 'bg-indigo-600 border-indigo-600 text-white shadow' : 'bg-white/80 dark:bg-gray-800/80 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      {tag}
                    </button>
                  );
                })}
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => setSelectedTags([])}
                    className="px-2.5 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Clear Tags
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Teams List / Grid */}
        {loadingState ? (
          <div className={`grid ${viewMode==='grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-6`}>
            {Array.from({ length: viewMode==='grid' ? 6 : 4 }).map((_, i) => (
              <div key={i} className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 animate-pulse">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
                <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                <div className="h-3 w-5/6 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
                <div className="flex space-x-2 mb-5">
                  <div className="h-5 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-8 w-16 bg-blue-200/50 dark:bg-blue-800/40 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredAndSortedTeams.length > 0 ? (
          <div className={`grid ${viewMode==='grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-6`}>
            {filteredAndSortedTeams.map((team: Team) => (
              <div key={team.id} className={viewMode==='list' ? 'md:max-w-2xl' : ''}>
                <TeamCard
                  team={team}
                  currentUserId={user?.uid}
                  onEditTeam={(team) => {
                    setSelectedTeam(team);
                    setShowTeamSettings(true);
                  }}
                  onManageMembers={(team) => {
                    setSelectedTeam(team);
                    setShowMemberManagement(true);
                  }}
                  onLeaveTeam={handleLeaveTeam}
                  onDeleteTeam={(teamId) => {
                    const team = teams.find(t => t.id === teamId);
                    if (team) setTeamToDelete(team);
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <Card className="bg-white dark:bg-gray-800 p-12">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 00-5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 0 1 6 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm || selectedTags.length > 0 || filterPrivacy !== 'all' 
                  ? 'No teams match your filters' 
                  : 'No teams yet'
                }
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchTerm || selectedTags.length > 0 || filterPrivacy !== 'all'
                  ? 'Try adjusting your search criteria or filters.'
                  : 'Create your first team to start collaborating with others.'
                }
              </p>
              {(!searchTerm && selectedTags.length === 0 && filterPrivacy === 'all') && (
                <Button
                  onClick={() => setShowCreateTeam(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Your First Team
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
      
      {/* Quick Actions and Notes Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Notes */}
        <div className="lg:col-span-2">
          <Card className="bg-white dark:bg-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Notes</h2>
              <Button
                onClick={() => setShowCreateNote(true)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Note
              </Button>
            </div>
            
            {recentNotes.length > 0 ? (
              <div className="space-y-4">
                {recentNotes.map((note: Note) => (
                  <div key={note.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">{note.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                      {note.content}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {note.tags && note.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <span 
                        className={`px-2 py-1 text-xs rounded-full ${
                          note.isPublic 
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' 
                            : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400'
                        }`}
                      >
                        {note.isPublic ? 'Public' : 'Private'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No notes yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Get started by creating your first note.</p>
                <Button 
                  onClick={() => setShowCreateNote(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Create Your First Note
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="space-y-6">
          <Card className="bg-white dark:bg-gray-800 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
            {recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.map((activity: Activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white">{activity.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {activity.createdAt instanceof Date 
                          ? activity.createdAt.toLocaleDateString()
                          : new Date(activity.createdAt).toLocaleDateString()
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-sm text-gray-600 dark:text-gray-400">No recent activity</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modals */}
      
      {/* Enhanced Team Creation Modal */}
      <EnhancedTeamCreationModal
        isOpen={showCreateTeam}
        onClose={() => setShowCreateTeam(false)}
        onCreateTeam={handleCreateTeam}
      />

      {/* Team Settings Modal */}
      <TeamSettingsModal
        team={selectedTeam}
        isOpen={showTeamSettings}
        onClose={() => {
          setShowTeamSettings(false);
          setSelectedTeam(null);
        }}
        onUpdateTeam={handleUpdateTeam}
        currentUserId={user?.uid}
      />

      {/* Member Management Modal */}
      <MemberManagementModal
        team={selectedTeam}
        isOpen={showMemberManagement}
        onClose={() => {
          setShowMemberManagement(false);
          setSelectedTeam(null);
        }}
        onInviteMember={handleInviteMember}
        onUpdateMemberRole={handleUpdateMemberRole}
        onRemoveMember={handleRemoveMember}
        currentUserId={user?.uid}
      />

      {/* Delete Team Confirmation */}
      {teamToDelete && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setTeamToDelete(null)}
          onConfirm={handleDeleteTeam}
          title="Delete Team"
          message={
            <div>
              <p className="mb-2">Are you sure you want to delete <strong>{teamToDelete.name}</strong>?</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This action cannot be undone. All team data, notes, and files will be permanently deleted.
              </p>
            </div>
          }
          confirmText="Delete Team"
          confirmVariant="danger"
        />
      )}

      {/* Create Note Modal */}
      {showCreateNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New Note</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter note title..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Content
                </label>
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter note content..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowCreateNote(false)}
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateNote}
                disabled={!newNoteTitle.trim() || !newNoteContent.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* File Upload Modal */}
      {showFileUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">File Management</h3>
              <button
                onClick={() => setShowFileUpload(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {uploadMessage && (
              <div className={`mb-4 p-3 rounded-lg ${
                uploadMessage.includes('failed') || uploadMessage.includes('error')
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                  : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
              }`}>
                {uploadMessage}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Upload New File</h4>
                <FileUpload
                  onUploadComplete={handleFileUpload}
                  onError={handleFileUploadError}
                  maxSize={50}
                  accept="*/*"
                  className="mb-4"
                />
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Uploaded Files</h4>
                <FileManager
                  onFileSelect={(file) => {
                    console.log('File selected:', file);
                    window.open(file.url, '_blank');
                  }}
                  onFileDelete={(fileName) => {
                    setUploadMessage(`File "${fileName}" deleted successfully`);
                    setTimeout(() => setUploadMessage(null), 3000);
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button
                onClick={() => setShowFileUpload(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default EnhancedCollaborationHubPage;