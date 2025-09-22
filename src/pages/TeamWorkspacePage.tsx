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
  
  // Debug logging
  console.log('Team workspace debug:');
  console.log('- User:', user?.uid, user?.email);
  console.log('- Team members:', team?.members);
  console.log('- Can edit:', canEdit);
  console.log('- Team ID:', teamId);
  const canAdmin = team?.members.some(m => m.userId === user?.uid && (m.teamRole === 'owner' || m.teamRole === 'admin'));
  const userRole = team?.members.find(m => m.userId === user?.uid)?.teamRole;
  
  // Enhanced helper functions
  const handleCreateNote = async () => {
    console.log('handleCreateNote called');
    console.log('Title:', newNoteTitle, 'Content:', newNoteContent);
    console.log('User:', user?.uid, 'TeamId:', teamId);
    
    if (!newNoteTitle.trim() || !newNoteContent.trim()) {
      setNoteError('Please provide both title and content for the note.');
      return;
    }
    
    try {
      setNoteError(null);
      console.log('Creating note...');
      const result = await createNote({
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
      
      console.log('Note created successfully:', result);
      setNewNoteTitle('');
      setNewNoteContent('');
      setShowCreateNote(false);
      fetchNotes(); // Refresh notes
    } catch (error) {
      console.error('Error creating note:', error);
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
          <div className="space-y-8">
            {/* Enhanced Section Header */}
            <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/60 dark:border-gray-700/60 shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-purple-50/80 dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-purple-900/20 rounded-2xl"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Notes</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Share knowledge and collaborate with your team members</p>
                  </div>
                </div>
                {canEdit && (
                  <Button 
                    onClick={() => setShowCreateNote(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create New Note
                  </Button>
                )}
              </div>
            </div>
            
            {/* Enhanced Note Creation Form */}
            {showCreateNote && (
              <div className="relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl p-8 border border-blue-200/60 dark:border-blue-700/40 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 via-indigo-50/30 to-purple-50/60 dark:from-blue-900/10 dark:via-indigo-900/5 dark:to-purple-900/10 rounded-2xl"></div>
                <div className="relative">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center mr-4 shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Note</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Share your knowledge with team members</p>
                    </div>
                  </div>
                  
                  {noteError && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl shadow-sm">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-red-800 dark:text-red-200 font-medium">{noteError}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Note Title
                      </label>
                      <input
                        type="text"
                        value={newNoteTitle}
                        onChange={(e) => setNewNoteTitle(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-500 dark:placeholder-gray-400"
                        placeholder="Enter a descriptive title for your note..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Note Content
                      </label>
                      <textarea
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        rows={8}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                        placeholder="Write your note content here... You can include ideas, instructions, or any information useful to your team."
                      />
                    </div>
                    <div className="flex justify-end space-x-4 pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowCreateNote(false);
                          setNewNoteTitle('');
                          setNewNoteContent('');
                          setNoteError(null);
                        }}
                        className="px-6 py-2.5 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateNote}
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Create Note
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
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
              <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-12 border border-gray-200/60 dark:border-gray-700/60 shadow-lg text-center">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-indigo-50/20 to-purple-50/40 dark:from-blue-900/10 dark:via-indigo-900/5 dark:to-purple-900/10 rounded-2xl"></div>
                <div className="relative">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-12 h-12 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No notes yet</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto leading-relaxed">Get started by creating your team's first note. Share knowledge, document processes, or collaborate on ideas.</p>
                  {canEdit && (
                    <Button 
                      onClick={() => setShowCreateNote(true)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-3"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create First Note
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid gap-6">
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
                                  <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs">
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
                        <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          View
                        </Button>
                        {canEdit && (
                          <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            Edit
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
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Files</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Share and manage files with your team</p>
              </div>
              {canEdit && (
                <Button 
                  size="sm" 
                  onClick={() => setShowFileUpload(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
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
              <div className="text-center py-12 bg-white/95 dark:bg-gray-800/95 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
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
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Members</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Manage your team members and their roles</p>
              </div>
              {canEdit && (
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Invite Member
                </Button>
              )}
            </div>
            <div className="grid gap-4">
              {team.members.map((member) => (
                <Card key={member.userId} className="p-5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 hover:border-indigo-200 dark:hover:border-indigo-800/60 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-600 flex items-center justify-center shadow-md">
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
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        member.teamRole === 'owner' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                        member.teamRole === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        member.teamRole === 'editor' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                      }`}>
                        {member.teamRole}
                      </span>
                      {member.userId === user?.uid && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">You</span>
                      )}
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
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Track team collaboration and updates</p>
              </div>
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
                        <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{formatShort(activity.createdAt)}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            activity.userRole === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                            activity.userRole === 'alumni' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Enhanced Breadcrumb Navigation */}
      <div className="bg-white/98 dark:bg-gray-900/98 backdrop-blur-xl border-b border-gray-200/80 dark:border-gray-700/60 shadow-sm">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <nav className="flex items-center space-x-2 text-sm">
            <button
              onClick={() => navigate('/collaboration')}
              className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200 font-medium group px-2 py-1 rounded-lg hover:bg-blue-50/80 dark:hover:bg-blue-900/20"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Collaboration Hub</span>
            </button>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-500 dark:text-gray-400 px-1">Teams</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-900 dark:text-white font-semibold px-1">{team.name}</span>
          </nav>
        </div>
      </div>
      {/* Enhanced Header */}
      <div className="container max-w-7xl mx-auto px-4 py-2">
        <div className="relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-xl p-4 border border-gray-200/60 dark:border-gray-700/40 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/20 via-indigo-50/10 to-purple-50/20 dark:from-blue-900/5 dark:via-indigo-900/5 dark:to-purple-900/5 rounded-xl"></div>
          <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg ring-2 ring-white/20 dark:ring-gray-800/30">
                  <span className="text-sm font-bold text-white">
                    {team.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-gradient-to-tr from-emerald-400 to-emerald-600 border-2 border-white dark:border-gray-900 flex items-center justify-center">
                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{team.name}</h1>
                {team.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm max-w-xl leading-relaxed">{team.description}</p>
                )}
                <div className="flex items-center space-x-2 mt-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                    team.isPrivate 
                      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/50' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/50'
                  }`}>
                    <svg className={`w-2.5 h-2.5 mr-1 ${team.isPrivate ? 'text-amber-500' : 'text-emerald-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {team.isPrivate ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      )}
                    </svg>
                    {team.isPrivate ? 'Private Team' : 'Public Team'}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700/50">
                    <svg className="w-2.5 h-2.5 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    {team.members.length} {team.members.length === 1 ? 'Member' : 'Members'}
                  </span>
                  {userRole && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/50">
                      <svg className="w-2.5 h-2.5 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
              {/* Enhanced Stats Cards */}
              <div className="flex flex-1 space-x-3">
                <div className="flex-1 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg p-3 border border-blue-100 dark:border-blue-800/30 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{teamNotes.length}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Notes</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg p-3 border border-purple-100 dark:border-purple-800/30 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-sm">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{files.length}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Files</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg p-3 border border-emerald-100 dark:border-emerald-800/30 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{teamActivities.length}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Activities</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                {canAdmin && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleManageMembers}
                      className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 px-3 py-1.5 text-xs"
                    >
                      <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      Members
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleManageTeam}
                      className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 px-3 py-1.5 text-xs"
                    >
                      <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </Button>
                  </>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/collaboration')}
                  className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 px-3 py-1.5 text-xs"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </Button>
              </div>
            </div>
          </div>
          {team.description && (
            <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-3xl">{team.description}</p>
          )}
          </div>
        </div>
      </div>

      {/* Enhanced Navigation Tabs */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl">
        <div className="container max-w-7xl mx-auto px-4 py-1">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-1.5 border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
            <nav className="flex space-x-1">
              {[
                { id: 'notes', name: 'Notes', count: teamNotes.length, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'blue' },
              { id: 'files', name: 'Files', count: files.length, icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12', color: 'purple' },
              { id: 'members', name: 'Members', count: team.members.length, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 00-5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 0 1 6 0z', color: 'emerald' },
              { id: 'activities', name: 'Activity', count: teamActivities.length, icon: 'M13 10V3L4 14h7v7l9-11h-7z', color: 'orange' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`group relative flex items-center px-4 py-2.5 text-sm font-medium transition-all duration-300 rounded-lg ${
                  activeTab === tab.id
                    ? `text-${tab.color}-700 dark:text-${tab.color}-300 bg-gradient-to-r from-${tab.color}-50/80 to-${tab.color}-100/60 dark:from-${tab.color}-900/30 dark:to-${tab.color}-800/20 shadow-sm`
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50/80 dark:hover:bg-gray-800/50'
                }`}
              >
                {/* Icon Container */}
                <div className={`flex items-center justify-center w-6 h-6 mr-2 rounded-md transition-all duration-300 ${
                  activeTab === tab.id
                    ? `bg-${tab.color}-100 dark:bg-${tab.color}-800/50 shadow-sm`
                    : 'bg-gray-100/60 dark:bg-gray-700/40 group-hover:bg-gray-200/80 dark:group-hover:bg-gray-600/60'
                }`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                </div>
                
                {/* Tab Label */}
                <span className="relative">{tab.name}</span>
                
                {/* Count Badge */}
                {tab.count > 0 && (
                  <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? `bg-${tab.color}-500 text-white shadow-sm`
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400 group-hover:bg-gray-300 dark:group-hover:bg-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto px-4 py-3">
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