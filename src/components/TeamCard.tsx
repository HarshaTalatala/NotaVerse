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
      className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/70 p-6 pt-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600/50 transition-all duration-200 cursor-pointer group focus-within:ring-2 focus-within:ring-blue-500 outline-none"
      tabIndex={0}
      aria-label={`Team card for ${team.name}`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button[data-menu-button]') || target.closest('div[data-menu-panel]')) return;
        if (team.id) navigate(`/teams/${team.id}`);
      }}
    >
      <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-70 group-hover:opacity-100 transition-opacity" />
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
              {team.name}
            </h3>
            {team.isPrivate && (
              <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </div>
          {team.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 leading-snug">
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
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          
          {showMenu && (
            <div
              data-menu-panel
              role="menu"
              className="absolute right-0 mt-2 w-48 bg-white/95 dark:bg-gray-800/95 backdrop-blur rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 py-1 focus:outline-none"
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
        <div className="flex flex-wrap gap-2 mb-4">
          {team.tags.slice(0, 4).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-md border border-indigo-200/60 dark:border-indigo-700/50"
            >
              {tag}
            </span>
          ))}
          {team.tags.length > 4 && (
            <span className="px-2 py-1 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md">+{team.tags.length - 4}</span>
          )}
        </div>
      )}

      {/* Members Section */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400 uppercase flex items-center">
            <svg className="w-3.5 h-3.5 mr-1.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 00-5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 0 1 6 0z" /></svg>
            Members ({team.members.length})
          </h4>
          {currentMember && (
            <span className={`px-2 py-1 text-[10px] font-medium rounded-md shadow-sm ${getRoleColor(currentMember.teamRole)}`}>
              {currentMember.teamRole}
            </span>
          )}
        </div>
        <div className="flex items-center -space-x-2">
          {team.members.slice(0, 5).map((member: TeamMember, idx) => (
            <div key={member.userId} className="relative group inline-flex">
              <div className="w-8 h-8 ring-2 ring-white dark:ring-gray-800 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shadow cursor-default">
                {getMemberAvatarInitials(member.userName)}
              </div>
              <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900/95 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {member.userName} • {member.teamRole}
              </div>
            </div>
          ))}
          {team.members.length > 5 && (
            <div className="w-8 h-8 ring-2 ring-white dark:ring-gray-800 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 text-[10px] font-medium shadow">
              +{team.members.length - 5}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center">
            <svg className="w-3.5 h-3.5 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12a8 8 0 11-16 0 8 8 0 0116 0z"/></svg>
            {new Date(team.createdAt).toLocaleDateString()}
          </span>
          <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${
            team.isPrivate 
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' 
              : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
          }`}>
            {team.isPrivate ? 'Private' : 'Public'}
          </span>
        </div>
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            if (team.id) navigate(`/teams/${team.id}`);
          }}
          className="bg-blue-600/90 hover:bg-blue-700 text-white shadow-sm"
        >
          Open
        </Button>
      </div>
    </div>
  );
};