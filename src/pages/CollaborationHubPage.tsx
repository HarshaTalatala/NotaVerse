import React, { useState, useEffect } from 'react';
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

const CollaborationHubPage: React.FC = () => {
  const { user } = useAuth();
  const { notes, loading: notesLoading, createNote } = useNotes();
  const { teams, loading: teamsLoading, createTeam, fetchTeams } = useTeams();
  const { activities, loading: activitiesLoading } = useActivities();
  
  // UI State
  const [showCreateNote, setShowCreateNote] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [fileRefreshKey, setFileRefreshKey] = useState(0); // triggers FileManager remount

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

  // Note Creation State
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  // Team creation state (missing after previous edit)
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');

  // Get recent notes (last 5)
  const recentNotes = notes.slice(0, 5);

  // Get user's teams
  const userTeams = teams.filter(team => 
    team.members.some(member => member.userId === user?.uid)
  );

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

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;

    try {
      await createTeam({
        name: newTeamName,
        description: newTeamDescription,
        createdBy: user?.uid || '',
        createdByName: user?.displayName || user?.email || 'Unknown',
        isPrivate: false
      });
      setNewTeamName('');
      setNewTeamDescription('');
      setShowCreateTeam(false);
    } catch (error) {
      console.error('Failed to create team:', error);
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

  // Initialize dummy teams if none exist
  useEffect(() => {
    const initializeDummyTeams = async () => {
      if (!teamsLoading && teams.length === 0 && user?.uid) {
        try {
          // Create NotaVerse team
          await createTeam({
            name: 'NotaVerse',
            description: 'The official NotaVerse development team focused on building the next-generation student collaboration platform. Working on innovative features including AI-powered document analysis, real-time collaboration tools, and seamless academic workflows. Our team consists of 6 dedicated developers working on cutting-edge educational technology.',
            createdBy: user.uid,
            createdByName: user.displayName || user.email || 'System Admin',
            isPrivate: false,
            tags: ['development', 'platform', 'education', 'collaboration', 'ai', 'students']
          });

          // Create Team REconnect
          await createTeam({
            name: 'Team REconnect',
            description: 'Our dynamic hackathon team specializing in innovative solutions for reconnecting alumni with their institutions and peers. We focus on building bridges between past and present, creating meaningful connections through technology. Team members: Jessica Thompson (Alumni Lead), Ryan Patel, Maria Garcia, James Wilson, Lisa Zhang, and our Team Lead - bringing together 6 passionate innovators for meaningful alumni engagement.',
            createdBy: user.uid,
            createdByName: user.displayName || user.email || 'Team Lead',
            isPrivate: false,
            tags: ['hackathon', 'alumni', 'networking', 'innovation', 'reconnect', 'competition']
          });

          // Create additional demo team
          await createTeam({
            name: 'AI Research Collective',
            description: 'A collaborative research group focused on advancing artificial intelligence applications in education. Our interdisciplinary team of 6 researchers explores machine learning, natural language processing, and educational technology to create smarter learning experiences.',
            createdBy: user.uid,
            createdByName: user.displayName || user.email || 'Research Lead',
            isPrivate: false,
            tags: ['ai', 'research', 'machine-learning', 'education', 'innovation']
          });
          
          // Refresh teams after creation
          await fetchTeams();
        } catch (error) {
          console.error('Failed to initialize dummy teams:', error);
        }
      }
    };

    initializeDummyTeams();
  }, [teamsLoading, teams.length, user, createTeam, fetchTeams]);

  if (notesLoading || teamsLoading || activitiesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Collaboration Hub
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your notes, teams, and collaborate with others.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white dark:bg-gray-800 p-6">
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

        <Card className="bg-white dark:bg-gray-800 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 00-5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 0 1 6 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">My Teams</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{userTeams.length}</p>
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

        <Card className="bg-white dark:bg-gray-800 p-6">
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


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Notes */}
        <div className="lg:col-span-2">
          <Card className="bg-white dark:bg-gray-800 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Notes</h2>
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

        {/* Teams & Activity */}
        <div className="space-y-6">
          {/* My Teams */}
          <Card className="bg-white dark:bg-gray-800 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">My Teams</h2>
            {userTeams.length > 0 ? (
              <div className="space-y-3">
                {userTeams.map((team: Team) => (
                  <div key={team.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{team.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 rounded-full">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 00-5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 0 1 6 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">No teams yet</p>
                <Button 
                  size="sm"
                  onClick={() => setShowCreateTeam(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Create Team
                </Button>
              </div>
            )}
          </Card>

          {/* Recent Activity */}
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

      {/* Create Team Modal */}
      {showCreateTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New Team</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter team name..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter team description..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowCreateTeam(false)}
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTeam}
                disabled={!newTeamName.trim()}
                className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
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
                  onUploadComplete={(file) => {
                    handleFileUpload(file);
                    setFileRefreshKey(k => k + 1);
                  }}
                  onError={handleFileUploadError}
                  maxSize={50}
                  accept="*/*"
                  className="mb-4"
                  userId={user?.uid}
                  userName={user?.displayName || user?.email || 'Unknown'}
                  userRole={'admin'}
                />
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Uploaded Files</h4>
                <FileManager
                  key={fileRefreshKey}
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
  );
};

export default CollaborationHubPage;







