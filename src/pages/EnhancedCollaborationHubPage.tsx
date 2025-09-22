import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotes } from '../hooks/useNotes';
import { useTeams } from '../hooks/useTeams';

import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
// File upload UI removed from Collaboration Hub header
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { TeamCard } from '../components/TeamCard';
import { TeamSettingsModal, MemberManagementModal } from '../components/TeamManagement';
import { EnhancedTeamCreationModal } from '../components/EnhancedTeamCreationModal';
import { Note, Team } from '../types';
// Upload helpers not needed here anymore
import { teamsApi } from '../services/collaborationApi';

const EnhancedCollaborationHubPage: React.FC = () => {
  const { user } = useAuth();
  const { notes, loading: notesLoading, createNote } = useNotes();
  const { teams, loading: teamsLoading, createTeam, fetchTeams } = useTeams();

  
  // UI State
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  // Removed Add Note and Upload File controls

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

  // Note creation removed from this page header

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


  // Removed inline note creation state

  // Removed: handleCreateNote (managed elsewhere if needed)

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

  // Removed: file upload helpers

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

  const loadingState = notesLoading || teamsLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="container max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="relative bg-white/90 dark:bg-gray-900/95 backdrop-blur-lg rounded-xl p-4 border border-gray-200/60 dark:border-gray-700/40 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-indigo-600/5 to-purple-600/5 dark:from-blue-400/10 dark:via-indigo-400/10 dark:to-purple-400/10 rounded-xl"></div>
            <div className="relative">
              <h1 className="text-2xl font-semibold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent mb-2">
                Collaboration Hub
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your notes, teams, and collaborate with others.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 border border-gray-200/60 dark:border-gray-700/60 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-200 hover:shadow-lg">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Notes</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{notes.length}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 border border-gray-200/60 dark:border-gray-700/60 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-200 hover:shadow-lg">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 00-5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 0 1 6 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">My Teams</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{filteredAndSortedTeams.length}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 border border-gray-200/60 dark:border-gray-700/60 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-200 hover:shadow-lg">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Comments</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">0</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 border border-gray-200/60 dark:border-gray-700/60 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-200 hover:shadow-lg">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l2 2 4-4" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Files</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">0</p>
            </div>
          </div>
        </Card>
      </div>

        {/* Enhanced Teams Header */}
        <div className="bg-white/95 dark:bg-gray-800/95 rounded-xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700/80 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 00-5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 0 1 6 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    My Teams
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {!loadingState && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {filteredAndSortedTeams.length} {filteredAndSortedTeams.length === 1 ? 'Team' : 'Teams'}
                      </span>
                    )}
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      Active
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Collaborate seamlessly with your team members and work together on projects.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Filter and Action Row */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
                {/* Filter Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
                  {/* Privacy Filter */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">Privacy:</label>
                    <select
                      value={filterPrivacy}
                      onChange={(e) => setFilterPrivacy(e.target.value as 'all' | 'public' | 'private')}
                      className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Types</option>
                      <option value="public">Public Only</option>
                      <option value="private">Private Only</option>
                    </select>
                  </div>

                  {/* Sort Filter */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">Sort:</label>
                    <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'name' | 'created' | 'members')}
                        className="px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:outline-none border-r border-gray-300 dark:border-gray-600"
                      >
                        <option value="created">Date Created</option>
                        <option value="name">Team Name</option>
                        <option value="members">Member Count</option>
                      </select>
                      <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="px-2 py-2 bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                      >
                        <svg className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* View and Action Controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {/* View Mode Toggle */}
                  <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`flex-1 sm:flex-initial px-3 py-2 text-sm font-medium flex items-center justify-center space-x-2 transition-all ${
                        viewMode === 'grid' 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm' 
                          : 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      <span className="hidden sm:inline">Grid</span>
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`flex-1 sm:flex-initial px-3 py-2 text-sm font-medium flex items-center justify-center space-x-2 transition-all ${
                        viewMode === 'list' 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm' 
                          : 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      <span className="hidden sm:inline">List</span>
                    </button>
                  </div>

                  {/* Create Team Button */}
                  <Button
                    onClick={() => setShowCreateTeam(true)}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-4 py-2 justify-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Team
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Tags Filter */}
        <div className="bg-white/95 dark:bg-gray-800/95 rounded-xl p-4 border border-gray-200/80 dark:border-gray-700/80 shadow-sm mb-6">
          <div className="space-y-4">
            {/* Enhanced Search Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all text-sm"
                placeholder="Search teams, members, descriptions..."
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Tags Filter and Clear Button */}
            {allTags.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Tags:</label>
                    {selectedTags.length > 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedTags.length} selected
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={clearFilters}
                    variant="outline"
                    size="sm"
                    className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 text-sm"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="hidden sm:inline">Reset</span>
                    <span className="sm:hidden">Clear</span>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTagFilter(tag)}
                        className={`px-3 py-1.5 text-sm rounded-full border transition-all duration-200 ${
                          active 
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 border-transparent text-white shadow-md' 
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                      >
                        {active && (
                          <svg className="w-3 h-3 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {tag}
                      </button>
                    );
                  })}
                  {selectedTags.length > 0 && (
                    <button
                      onClick={() => setSelectedTags([])}
                      className="px-3 py-1.5 text-sm rounded-full bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
                    >
                      <svg className="w-3 h-3 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear All Tags
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Teams List / Grid */}
        {loadingState ? (
          <div className={`grid ${viewMode==='grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-8`}>
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
          <div className={`grid ${viewMode==='grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-8`}>
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
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl p-16 border border-gray-200/80 dark:border-gray-700/80 shadow-xl">
            <div className="text-center">
              {/* Empty State Icon */}
              <div className="relative mx-auto mb-8 w-32 h-32">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full"></div>
                <div className="absolute inset-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-800/20 dark:to-purple-800/20 rounded-full"></div>
                <div className="absolute inset-8 flex items-center justify-center">
                  <svg className="w-16 h-16 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 00-5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 0 1 6 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>

              <div className="max-w-md mx-auto">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  {searchTerm || selectedTags.length > 0 || filterPrivacy !== 'all' 
                    ? 'No Teams Found' 
                    : 'Start Your Team Journey'
                  }
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg leading-relaxed">
                  {searchTerm || selectedTags.length > 0 || filterPrivacy !== 'all'
                    ? 'No teams match your current search and filter criteria. Try adjusting your filters or search terms to find what you\'re looking for.'
                    : 'Teams are where great ideas come to life. Create your first team to start collaborating, sharing knowledge, and building something amazing together.'
                  }
                </p>

                {(!searchTerm && selectedTags.length === 0 && filterPrivacy === 'all') ? (
                  <div className="space-y-6">
                    <Button
                      onClick={() => setShowCreateTeam(true)}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-3 text-lg"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create Your First Team
                    </Button>

                    {/* Feature Benefits */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Collaborate</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Share ideas and work together in real-time</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Share Knowledge</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Create and share notes within your team</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Track Progress</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Monitor team activity and achievements</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      onClick={clearFilters}
                      variant="outline"
                      className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Clear Filters
                    </Button>
                    <Button
                      onClick={() => setShowCreateTeam(true)}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create New Team
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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
    </div>
  );
};

export default EnhancedCollaborationHubPage;