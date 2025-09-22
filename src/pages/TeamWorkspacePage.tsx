import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTeams } from '../hooks/useTeams';
import { useNotes } from '../hooks/useNotes';
import { useActivities } from '../hooks/useActivities';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { FileUpload } from '../components/ui/FileUpload';
import { FileManager } from '../components/ui/FileManager';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { TeamSettingsModal, MemberManagementModal } from '../components/TeamManagement';
import { Note, Activity, Team } from '../types';
import { formatShort } from '../utils/date';
import { UploadResult } from '../services/azureBlobService';

const TeamWorkspacePage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'notes' | 'files' | 'members' | 'activities'>('notes');
  
  // Enhanced UI state management
  const [showCreateNote, setShowCreateNote] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showTeamSettings, setShowTeamSettings] = useState(false);
  const [showMemberManagement, setShowMemberManagement] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  
  // Note creation state
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  
  // File management state
  const [files, setFiles] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  


  // Load team data with enhanced parameters
  const { teams, fetchTeams, loading: teamsLoading, error: teamsError } = useTeams();
  
  // Load team-specific data with filtered parameters
  const { notes, loading: notesLoading, error: notesError, createNote, fetchNotes } = useNotes({
    teamId: teamId,
    autoRefresh: true
  });
  const { activities, loading: activitiesLoading, fetchActivities } = useActivities({
    teamId: teamId,
    limit: 20,
    autoRefresh: true
  });

  useEffect(() => {
    fetchTeams();
  }, []); // Empty dependency array - only run once on mount

  useEffect(() => {
    if (teamId) {
      fetchNotes();
      fetchActivities();
    }
  }, [teamId, fetchNotes, fetchActivities]);

  const team = useMemo(() => {
    const foundTeam = teams.find(t => t.id === teamId);
    return foundTeam;
  }, [teams, teamId]);

  // Filter notes and activities for this team
  const teamNotes = useMemo(() => {
    return notes.filter(note => note.teamId === teamId);
  }, [notes, teamId]);

  const teamActivities = useMemo(() => {
    // Filter activities related to this team (by metadata or entity)
    return activities.filter(activity => 
      activity.metadata?.teamId === teamId || 
      (activity.entityType === 'team' && activity.entityId === teamId)
    );
  }, [activities, teamId]);

  const canEdit = team?.members.some(m => m.userId === user?.uid && (m.teamRole === 'owner' || m.teamRole === 'admin' || m.teamRole === 'editor'));
  const canAdmin = team?.members.some(m => m.userId === user?.uid && (m.teamRole === 'owner' || m.teamRole === 'admin'));
  const userRole = team?.members.find(m => m.userId === user?.uid)?.teamRole;
  
  // Enhanced helper functions
  const handleCreateNote = async () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) {
      setNoteError('Please provide both title and content for the note.');
      return;
    }
    
    try {
      setNoteError(null);
      await createNote({
        title: newNoteTitle,
        content: newNoteContent,
        authorId: user?.uid || '',
        authorName: user?.displayName || user?.email || 'Unknown',
        authorRole: role || 'student',
        isPublic: false,
        teamId: teamId,
        tags: [],
        collaborators: []
      });
      
      setNewNoteTitle('');
      setNewNoteContent('');
      setShowCreateNote(false);
      fetchNotes(); // Refresh notes
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : 'Failed to create note');
    }
  };
  
  const handleFileUpload = (results: UploadResult[]) => {
    setUploadMessage(`Successfully uploaded ${results.length} file(s)`);
    setTimeout(() => setUploadMessage(null), 3000);
    // Refresh files list if implemented
  };
  
  const handleManageTeam = () => {
    if (canAdmin && team) {
      setSelectedTeam(team);
      setShowTeamSettings(true);
    }
  };
  
  const handleManageMembers = () => {
    if (canAdmin && team) {
      setSelectedTeam(team);
      setShowMemberManagement(true);
    }
  };



  // Show loading state
  if (teamsLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
        <div className="ml-4 text-gray-600 dark:text-gray-400">Loading team workspace...</div>
      </div>
    );
  }
  
  // Show error state
  if (teamsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error Loading Team</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{teamsError}</p>
          <div className="space-x-3">
            <Button onClick={() => fetchTeams()} className="bg-blue-600 hover:bg-blue-700 text-white">
              Try Again
            </Button>
            <Button variant="outline" onClick={() => navigate('/collaboration')}>
              Back to Hub
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show team not found
  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.364 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Team not found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">The team you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate('/collaboration')} className="bg-blue-600 hover:bg-blue-700 text-white">
            Back to Collaboration Hub
          </Button>
        </div>
      </div>
    );
  }

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'notes':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Notes</h3>
              {canEdit && (
                <Button 
                  size="sm" 
                  onClick={() => setShowCreateNote(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Note
                </Button>
              )}
            </div>
            
            {/* Note creation modal */}
            {showCreateNote && (
              <Card className="p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-blue-200 dark:border-blue-800/50 shadow-xl">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Note</h4>
                </div>
                {noteError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-800 dark:text-red-200 text-sm">{noteError}</p>
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter note title..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Content
                    </label>
                    <textarea
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Write your note content..."
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowCreateNote(false);
                        setNewNoteTitle('');
                        setNewNoteContent('');
                        setNoteError(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateNote}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Create Note
                    </Button>
                  </div>
                </div>
              </Card>
            )}
            
            {notesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading notes...</span>
              </div>
            ) : notesError ? (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200">Error loading notes: {notesError}</p>
              </div>
            ) : teamNotes.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No notes yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Get started by creating your team's first note.</p>
                {canEdit && (
                  <Button 
                    onClick={() => setShowCreateNote(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Create First Note
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {teamNotes.map((note) => (
                  <Card key={note.id} className="group p-5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-200 border border-gray-200/60 dark:border-gray-700/60 hover:border-blue-200 dark:hover:border-blue-800/60 hover:shadow-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full mb-4 opacity-60"></div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{note.title}</h4>
                        <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 mb-4 leading-relaxed">{note.content}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center space-x-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>{note.authorName || 'Unknown'}</span>
                          </span>
                          <span>•</span>
                          <span>{formatShort(note.lastModified || note.createdAt)}</span>
                          {note.tags && note.tags.length > 0 && (
                            <>
                              <span>•</span>
                              <div className="flex space-x-1">
                                {note.tags.slice(0, 2).map(tag => (
                                  <span key={tag} className="px-2 py-1 bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium border border-blue-200/50 dark:border-blue-800/40">
                                    {tag}
                                  </span>
                                ))}
                                {note.tags.length > 2 && (
                                  <span className="text-gray-400">+{note.tags.length - 2}</span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex space-x-2">
                        <Button variant="outline" size="sm" className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Button>
                        {canEdit && (
                          <Button variant="outline" size="sm" className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'files':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Files</h3>
              {canEdit && (
                <Button 
                  size="sm" 
                  onClick={() => setShowFileUpload(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload File
                </Button>
              )}
            </div>
            
            {/* Upload message */}
            {uploadMessage && (
              <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-800 dark:text-green-200 text-sm">{uploadMessage}</p>
              </div>
            )}
            
            {/* File upload component */}
            {showFileUpload && (
              <Card className="p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-green-200 dark:border-green-800/50 shadow-xl">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-green-500 to-emerald-600 flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Files</h4>
                </div>
                <FileUpload
                  onUploadComplete={(result) => {
                    handleFileUpload([result]);
                  }}
                  onError={(error) => setUploadMessage(`Upload error: ${error}`)}
                  accept="image/*,.pdf,.doc,.docx,.txt,.md"
                  maxSize={10}
                  folder={`teams/${teamId}`}
                  multiple={true}
                  userId={user?.uid}
                  userName={user?.displayName || user?.email || 'Unknown'}
                  userRole={role || 'student'}
                />
                <div className="mt-4 flex justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowFileUpload(false)}
                  >
                    Close
                  </Button>
                </div>
              </Card>
            )}
            
            {filesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading files...</span>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 2a1 1 0 000 2h6a1 1 0 100-2H9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No files yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Upload files to share with your team members.</p>
                {canEdit && (
                  <Button 
                    onClick={() => setShowFileUpload(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Upload First File
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      
      case 'members':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Members</h3>
              {canEdit && (
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Invite Member
                </Button>
              )}
            </div>
            <div className="grid gap-4">
              {team.members.map((member) => (
                <Card key={member.userId} className="p-5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 hover:border-indigo-200 dark:hover:border-indigo-800/60 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
                        <span className="text-sm font-bold text-white">
                          {member.userName?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{member.userName || 'Unknown User'}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{member.userRole}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase border ${
                        member.teamRole === 'owner' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800/40' :
                        member.teamRole === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800/40' :
                        member.teamRole === 'editor' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800/40' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-700/40'
                      }`}>
                        {member.teamRole}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      
      case 'activities':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live updates</span>
              </div>
            </div>
            
            {activitiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading activities...</span>
              </div>
            ) : teamActivities.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No activity yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Team activity will appear here as members interact with the workspace.</p>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <p>Activities include:</p>
                  <ul className="mt-2 space-y-1">
                    <li>• Notes created and updated</li>
                    <li>• Files uploaded and shared</li>
                    <li>• Members joining or leaving</li>
                    <li>• Team settings changes</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {teamActivities.slice(0, 20).map((activity) => (
                  <Card key={activity.id} className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-200 border border-gray-200/60 dark:border-gray-700/60 hover:border-blue-200 dark:hover:border-blue-800/60">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white">
                          <span className="font-semibold">{activity.userName}</span>
                          <span className="ml-1">{activity.description}</span>
                        </p>
                        <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>{formatShort(activity.createdAt)}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            activity.userRole === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800/40' :
                            activity.userRole === 'alumni' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800/40' :
                            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800/40'
                          }`}>
                            {activity.userRole}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                
                {teamActivities.length > 20 && (
                  <div className="text-center py-4">
                    <Button variant="outline" size="sm">
                      Load More Activities
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Breadcrumb Navigation */}
      <div className="bg-white/80 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200/80 dark:border-gray-700/60">
        <div className="px-6 py-3">
          <nav className="flex items-center space-x-2 text-sm">
            <button
              onClick={() => navigate('/collaboration')}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-medium"
            >
              Collaboration Hub
            </button>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-500 dark:text-gray-400">Teams</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">{team.name}</span>
          </nav>
        </div>
      </div>
      {/* Header */}
      <div className="relative bg-white/90 dark:bg-gray-900/95 backdrop-blur-lg border-b border-gray-200/60 dark:border-gray-700/40 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-indigo-600/5 to-purple-600/5 dark:from-blue-400/10 dark:via-indigo-400/10 dark:to-purple-400/10"></div>
        <div className="relative px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg ring-4 ring-white/20 dark:ring-gray-800/40">
                <span className="text-lg font-bold text-white">
                  {team.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent">{team.name}</h1>
                <div className="flex items-center space-x-3 mt-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase ${
                    team.isPrivate 
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40' 
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                  }`}>
                    {team.isPrivate ? 'Private' : 'Public'}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                    {team.members.length} members
                  </span>
                  {userRole && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                      {userRole}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {canAdmin && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleManageMembers}
                    className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 backdrop-blur-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    Members
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleManageTeam}
                    className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 backdrop-blur-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Button>
                </>
              )}
              <Button 
                variant="outline" 
                onClick={() => navigate('/collaboration')}
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 backdrop-blur-sm"
              >
                Back to Hub
              </Button>
            </div>
          </div>
          {team.description && (
            <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-3xl">{team.description}</p>
          )}
          
          {/* Quick stats */}
          <div className="mt-4 flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{teamNotes.length} notes</span>
            </div>
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{teamActivities.length} activities</span>
            </div>
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Updated {formatShort(team.updatedAt || team.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-b border-gray-200/60 dark:border-gray-700/40">
        <div className="px-6">
          <nav className="flex space-x-8">
            {[
              { id: 'notes', name: 'Notes', count: teamNotes.length },
              { id: 'files', name: 'Files', count: 0 },
              { id: 'members', name: 'Members', count: team.members.length },
              { id: 'activities', name: 'Activity', count: teamActivities.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative py-4 px-1 border-b-2 font-semibold text-sm transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.name}
                {tab.count > 0 && (
                  <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="relative">
          {renderTabContent()}
        </div>
      </div>
      
      {/* Team Management Modals */}
      {selectedTeam && (
        <TeamSettingsModal
          team={selectedTeam}
          isOpen={showTeamSettings}
          onClose={() => {
            setShowTeamSettings(false);
            setSelectedTeam(null);
          }}
          onUpdateTeam={async (teamId, updates) => {
            // Handle team update
            await fetchTeams();
            setShowTeamSettings(false);
          }}
          currentUserId={user?.uid}
        />
      )}
      
      {selectedTeam && (
        <MemberManagementModal
          team={selectedTeam}
          isOpen={showMemberManagement}
          onClose={() => {
            setShowMemberManagement(false);
            setSelectedTeam(null);
          }}
          onInviteMember={async (teamId, email, role) => {
            // Handle member invitation
            await fetchTeams();
          }}
          onUpdateMemberRole={async (teamId, userId, role) => {
            // Handle member role update
            await fetchTeams();
          }}
          onRemoveMember={async (teamId, userId) => {
            // Handle member removal
            await fetchTeams();
          }}
          currentUserId={user?.uid}
        />
      )}
    </div>
  );
};

export default TeamWorkspacePage;