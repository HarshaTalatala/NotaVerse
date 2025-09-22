import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Team, TeamMember } from '../types';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/StatusBadge';

interface TeamCardProps {
  team: Team;
  currentUserId?: string;
  onEditTeam: (team: Team) => void;
  onManageMembers: (team: Team) => void;
  onLeaveTeam: (teamId: string) => void;
  onDeleteTeam: (teamId: string) => void;
}

export const TeamCard: React.FC<TeamCardProps> = ({
  team,
  currentUserId,
  onEditTeam,
  onManageMembers,
  onLeaveTeam,
  onDeleteTeam
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  
  const currentMember = team.members.find(m => m.userId === currentUserId);
  const isOwner = currentMember?.teamRole === 'owner';
  const isAdmin = currentMember?.teamRole === 'admin';
  const canManage = isOwner || isAdmin;

  const getMemberAvatarInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'editor': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'viewer': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // Close menu on outside click or Escape
  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showMenu]);

  return (
    <div
      className="relative bg-white/98 dark:bg-gray-800/98 backdrop-blur-xl rounded-2xl border border-gray-200/80 dark:border-gray-700/60 p-6 shadow-xl shadow-gray-200/40 dark:shadow-gray-900/60 hover:shadow-2xl hover:shadow-gray-300/50 dark:hover:shadow-gray-900/80 hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 ease-out cursor-pointer group focus-within:ring-3 focus-within:ring-blue-500/30 outline-none"
      tabIndex={0}
      aria-label={`Team card for ${team.name}`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button[data-menu-button]') || target.closest('div[data-menu-panel]')) return;
        if (team.id) navigate(`/teams/${team.id}`);
      }}
    >
      <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 group-hover:from-blue-500 group-hover:via-indigo-500 group-hover:to-purple-500 transition-all duration-300 shadow-md" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-indigo-50/15 to-purple-50/20 dark:from-blue-900/10 dark:via-indigo-900/5 dark:to-purple-900/10 rounded-2xl pointer-events-none opacity-50 group-hover:opacity-70 transition-opacity duration-300" />
      {/* Header */}
      <div className="relative flex items-start justify-between mb-5">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-300 leading-tight">
              {team.name}
            </h3>
            {team.isPrivate && (
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/30 shadow-md border border-yellow-200/50 dark:border-yellow-700/30">
                <svg className="w-3.5 h-3.5 text-yellow-700 dark:text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            )}
          </div>
          {team.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
              {team.description}
            </p>
          )}
        </div>
        
        {/* Actions Menu */}
        <div className="relative" ref={menuRef}>
          <button
            data-menu-button
            onClick={() => setShowMenu(v => !v)}
            aria-haspopup="menu"
            aria-expanded={showMenu}
            aria-label="Open team actions menu"
            className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-white/90 dark:hover:bg-gray-700/90 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all duration-200 shadow-md hover:shadow-lg border border-gray-200/50 dark:border-gray-600/30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          
          {showMenu && (
            <div
              data-menu-panel
              role="menu"
              className="absolute right-0 mt-3 w-52 bg-white/98 dark:bg-gray-800/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/80 dark:border-gray-700/60 z-20 py-2 focus:outline-none animate-in slide-in-from-top-1 duration-200"
            >
              <div className="py-1">
                {canManage && (
                  <>
                    <button
                      onClick={() => {
                        onEditTeam(team);
                        setShowMenu(false);
                      }}
                      role="menuitem"
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center focus:bg-gray-100 dark:focus:bg-gray-700"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Team
                    </button>
                    <button
                      onClick={() => {
                        onManageMembers(team);
                        setShowMenu(false);
                      }}
                      role="menuitem"
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center focus:bg-gray-100 dark:focus:bg-gray-700"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      Manage Members
                    </button>
                  </>
                )}
                {!isOwner && (
                  <button
                    onClick={() => {
                      if (team.id) onLeaveTeam(team.id);
                      setShowMenu(false);
                    }}
                    role="menuitem"
                    className="w-full text-left px-4 py-2 text-sm text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 flex items-center focus:bg-yellow-100/60"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Leave Team
                  </button>
                )}
                {isOwner && (
                  <button
                    onClick={() => {
                      if (team.id) onDeleteTeam(team.id);
                      setShowMenu(false);
                    }}
                    role="menuitem"
                    className="w-full text-left px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center focus:bg-red-100/60"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Team
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Team Tags */}
      {team.tags && team.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {team.tags.slice(0, 4).map((tag, index) => (
            <span
              key={index}
              className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-200/60 dark:border-indigo-700/50 shadow-sm"
            >
              {tag}
            </span>
          ))}
          {team.tags.length > 4 && (
            <span className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-600">+{team.tags.length - 4}</span>
          )}
        </div>
      )}

      {/* Members Section */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/30 flex items-center justify-center mr-2 shadow-md border border-blue-200/50 dark:border-blue-700/30">
              <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 00-5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 0 1 6 0z" />
              </svg>
            </div>
            Team Members ({team.members.length})
          </h4>
          {currentMember && (
            <span className={`px-3 py-1 text-xs font-medium rounded-lg shadow-md border ${getRoleColor(currentMember.teamRole)}`}>
              {currentMember.teamRole}
            </span>
          )}
        </div>
        <div className="flex items-center -space-x-3">
          {team.members.slice(0, 5).map((member: TeamMember, idx) => (
            <div key={member.userId} className="relative group inline-flex">
              <div className="w-10 h-10 ring-3 ring-white dark:ring-gray-800 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-lg cursor-default transform group-hover:scale-105 transition-transform duration-200">
                {getMemberAvatarInitials(member.userName)}
              </div>
              <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 bg-gray-900/95 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none backdrop-blur-xl border border-gray-700/50">
                <div className="font-medium">{member.userName}</div>
                <div className="text-gray-300 text-xs capitalize">{member.teamRole}</div>
              </div>
            </div>
          ))}
          {team.members.length > 5 && (
            <div className="w-10 h-10 ring-3 ring-white dark:ring-gray-800 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 rounded-xl flex items-center justify-center text-gray-700 dark:text-gray-300 text-xs font-bold shadow-lg">
              +{team.members.length - 5}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-5 border-t border-gray-200/80 dark:border-gray-700/80">
        <div className="flex items-center space-x-4">
          <span className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12a8 8 0 11-16 0 8 8 0 0116 0z"/>
            </svg>
            {new Date(team.createdAt).toLocaleDateString()}
          </span>
          <span className={`px-3 py-1.5 text-xs font-medium rounded-lg shadow-md border ${
            team.isPrivate 
              ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 dark:from-yellow-900/40 dark:to-yellow-800/30 dark:text-yellow-300 border-yellow-300/50 dark:border-yellow-700/40' 
              : 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900/40 dark:to-green-800/30 dark:text-green-300 border-green-300/50 dark:border-green-700/40'
          }`}>
            {team.isPrivate ? 'Private' : 'Public'}
          </span>
        </div>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            if (team.id) navigate(`/teams/${team.id}`);
          }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2.5 rounded-lg font-medium transform hover:scale-102"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          Open Team
        </Button>
      </div>
    </div>
  );
};