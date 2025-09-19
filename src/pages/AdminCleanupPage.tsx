import { useState } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';

type OrphanedUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  collection: string;
};

export default function AdminCleanupPage() {
  const { role: userRole } = useAuth();
  const [orphanedUsers, setOrphanedUsers] = useState<OrphanedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState('');

  // Check if user is admin
  if (userRole !== 'admin') {
    return (
      <div className="container-responsive py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            You don't have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  const findOrphanedUsers = async () => {
    if (!db) {
      setError('Database not available');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const orphaned: OrphanedUser[] = [];
      
      // Check users collection
      const usersSnapshot = await getDocs(collection(db, 'users'));
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        orphaned.push({
          id: doc.id,
          email: data.email || 'Unknown',
          displayName: data.displayName || 'Unknown',
          role: data.role || 'Unknown',
          collection: 'users'
        });
      });

      // Check students collection
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      studentsSnapshot.forEach(doc => {
        const data = doc.data();
        orphaned.push({
          id: doc.id,
          email: data.email || 'Unknown',
          displayName: data.name || 'Unknown',
          role: 'student',
          collection: 'students'
        });
      });

      // Check alumni collection
      const alumniSnapshot = await getDocs(collection(db, 'alumni'));
      alumniSnapshot.forEach(doc => {
        const data = doc.data();
        orphaned.push({
          id: doc.id,
          email: data.email || 'Unknown',
          displayName: data.name || 'Unknown',
          role: 'alumni',
          collection: 'alumni'
        });
      });

      setOrphanedUsers(orphaned);
      setSuccess(`Found ${orphaned.length} user documents in Firestore`);
    } catch (err: any) {
      console.error('Error finding orphaned users:', err);
      setError('Failed to search for users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const searchUserByEmail = async () => {
    if (!db || !searchEmail.trim()) {
      setError('Please enter an email to search');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const found: OrphanedUser[] = [];
      
      // Search in users collection
      const usersQuery = query(collection(db, 'users'), where('email', '==', searchEmail.trim()));
      const usersSnapshot = await getDocs(usersQuery);
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        found.push({
          id: doc.id,
          email: data.email || 'Unknown',
          displayName: data.displayName || 'Unknown',
          role: data.role || 'Unknown',
          collection: 'users'
        });
      });

      // Search in students collection
      const studentsQuery = query(collection(db, 'students'), where('email', '==', searchEmail.trim()));
      const studentsSnapshot = await getDocs(studentsQuery);
      studentsSnapshot.forEach(doc => {
        const data = doc.data();
        found.push({
          id: doc.id,
          email: data.email || 'Unknown',
          displayName: data.name || 'Unknown',
          role: 'student',
          collection: 'students'
        });
      });

      // Search in alumni collection
      const alumniQuery = query(collection(db, 'alumni'), where('email', '==', searchEmail.trim()));
      const alumniSnapshot = await getDocs(alumniQuery);
      alumniSnapshot.forEach(doc => {
        const data = doc.data();
        found.push({
          id: doc.id,
          email: data.email || 'Unknown',
          displayName: data.name || 'Unknown',
          role: 'alumni',
          collection: 'alumni'
        });
      });

      setOrphanedUsers(found);
      if (found.length === 0) {
        setSuccess(`No user documents found for email: ${searchEmail}`);
      } else {
        setSuccess(`Found ${found.length} document(s) for email: ${searchEmail}`);
      }
    } catch (err: any) {
      console.error('Error searching for user:', err);
      setError('Failed to search for user: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (user: OrphanedUser) => {
    if (!db) {
      setError('Database not available');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${user.displayName} (${user.email}) from ${user.collection}?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, user.collection, user.id));
      setOrphanedUsers(prev => prev.filter(u => !(u.id === user.id && u.collection === user.collection)));
      setSuccess(`Deleted ${user.displayName} from ${user.collection}`);
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user: ' + err.message);
    }
  };

  const deleteAllFoundUsers = async () => {
    if (!db || orphanedUsers.length === 0) {
      setError('No users to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ALL ${orphanedUsers.length} user documents? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      orphanedUsers.forEach(user => {
        const userRef = doc(db!, user.collection, user.id);
        batch.delete(userRef);
      });

      await batch.commit();
      setSuccess(`Successfully deleted ${orphanedUsers.length} user documents`);
      setOrphanedUsers([]);
    } catch (err: any) {
      console.error('Error deleting users:', err);
      setError('Failed to delete users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-responsive py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200 mb-2">
          Admin Database Cleanup
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Find and clean up orphaned user documents in Firestore
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
              <div className="mt-1 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
              </div>
            </div>
            <div className="flex-shrink-0 ml-3">
              <button
                onClick={() => setError(null)}
                className="bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded text-xs font-medium text-red-800 dark:text-red-200"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Success</h3>
              <div className="mt-1 text-sm text-green-700 dark:text-green-300">
                <p>{success}</p>
              </div>
            </div>
            <div className="flex-shrink-0 ml-3">
              <button
                onClick={() => setSuccess(null)}
                className="bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded text-xs font-medium text-green-800 dark:text-green-200"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Controls */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Enter email to search for specific user..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="input-primary flex-1"
            />
            <button
              onClick={searchUserByEmail}
              disabled={loading}
              className="btn btn-primary whitespace-nowrap"
            >
              {loading ? 'Searching...' : 'Search Email'}
            </button>
          </div>
        </div>
        <button
          onClick={findOrphanedUsers}
          disabled={loading}
          className="btn btn-outline"
        >
          {loading ? 'Searching...' : 'Find All Users'}
        </button>
      </div>

      {/* Results */}
      {orphanedUsers.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">
              Found Users ({orphanedUsers.length})
            </h2>
            <button
              onClick={deleteAllFoundUsers}
              disabled={loading}
              className="btn btn-outline text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-600"
            >
              Delete All
            </button>
          </div>

          <div className="grid gap-4">
            {orphanedUsers.map((user, index) => (
              <div key={`${user.collection}-${user.id}`} className="card-elevated p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-neutral-800 dark:text-neutral-200">
                      {user.displayName}
                    </h3>
                    <p className="text-neutral-600 dark:text-neutral-400">{user.email}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="badge bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                        {user.role}
                      </span>
                      <span className="badge bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200">
                        {user.collection}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">ID: {user.id}</p>
                  </div>
                  <button
                    onClick={() => deleteUser(user)}
                    className="btn btn-ghost text-red-600 hover:bg-red-50 dark:text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {orphanedUsers.length === 0 && !loading && (success || error) && (
        <div className="text-center py-12">
          <p className="text-neutral-600 dark:text-neutral-400">
            No user documents found.
          </p>
        </div>
      )}
    </div>
  );
}