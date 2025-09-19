import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, setDoc, serverTimestamp, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Pagination from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import CustomDropdown from '@/components/CustomDropdown';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

type PendingRegistration = {
  id: string;
  name: string;
  email: string;
  password: string; // This should be hashed in production
  role: 'student' | 'alumni';
  roleData: any;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: any;
  reviewedAt?: any;
  reviewedBy?: string;
  rejectionReason?: string;
};

export default function RegistrationsPage() {
  const { role: userRole } = useAuth();
  const [registrations, setRegistrations] = useState<PendingRegistration[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<PendingRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [page, setPage] = useState(1);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<PendingRegistration | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const pageSize = 10;

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

  useEffect(() => {
    const fetchRegistrations = () => {
      try {
        if (!db) throw new Error('Database not ready');
        
        const q = query(
          collection(db, 'pendingRegistrations'), 
          orderBy('submittedAt', 'desc')
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const registrationsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as PendingRegistration[];
          
          setRegistrations(registrationsData);
          setLoading(false);
        }, (err) => {
          console.error('Error fetching registrations:', err);
          setError('Failed to load registrations data');
          setLoading(false);
        });

        return unsubscribe;
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };
    
    const unsubscribe = fetchRegistrations();
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    let filtered = [...registrations];

    // Status filter
    if (filterStatus) {
      filtered = filtered.filter(reg => reg.status === filterStatus);
    }

    // Role filter
    if (filterRole) {
      filtered = filtered.filter(reg => reg.role === filterRole);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(reg =>
        reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRegistrations(filtered);
    setPage(1); // Reset to first page when filters change
  }, [registrations, searchTerm, filterRole, filterStatus]);

  const approveRegistration = async (registration: PendingRegistration) => {
    if (!auth || !db) {
      setError('Authentication or database not available');
      return;
    }
    
    setProcessingId(registration.id);
    setError(null); // Clear any previous errors
    
    try {
      // Check role-specific collections for existing data
      if (registration.role === 'student') {
        const studentsQuery = query(collection(db, 'students'), where('email', '==', registration.email));
        const existingStudentsSnapshot = await getDocs(studentsQuery);
        
        if (!existingStudentsSnapshot.empty) {
          throw new Error(`Student record with email ${registration.email} already exists. Please use the Admin Cleanup tool to resolve this conflict.`);
        }
      } else if (registration.role === 'alumni') {
        const alumniQuery = query(collection(db, 'alumni'), where('email', '==', registration.email));
        const existingAlumniSnapshot = await getDocs(alumniQuery);
        
        if (!existingAlumniSnapshot.empty) {
          throw new Error(`Alumni record with email ${registration.email} already exists. Please use the Admin Cleanup tool to resolve this conflict.`);
        }
      }

      // Create role-specific profile document immediately (without Firebase Auth account yet)
      // We'll use the email as a temporary ID and update with UID when they sign up
      const tempId = registration.email.replace(/[.@]/g, '_'); // Firebase-safe ID
      
      if (registration.role === 'student') {
        const studentData: any = {
          name: registration.name,
          email: registration.email,
          tempId: tempId,
          createdAt: serverTimestamp(),
          status: 'active',
          approvedByAdmin: true,
          approvedAt: serverTimestamp(),
          approvedBy: auth.currentUser?.email
        };

        // Add role-specific data with validation
        const roleData = registration.roleData || {};
        if (roleData.studentId) studentData.studentId = String(roleData.studentId).trim();
        if (roleData.year) {
          const year = parseInt(roleData.year);
          if (!isNaN(year) && year >= 1 && year <= 4) {
            studentData.year = year;
          }
        }
        if (roleData.major) studentData.major = String(roleData.major).trim();
        if (roleData.gpa) {
          const gpa = parseFloat(roleData.gpa);
          if (!isNaN(gpa) && gpa >= 0 && gpa <= 10) {
            studentData.gpa = gpa;
          }
        }
        if (roleData.phone) studentData.phone = String(roleData.phone).trim();
        if (roleData.address) studentData.address = String(roleData.address).trim();
        if (roleData.emergencyContact) studentData.emergencyContact = String(roleData.emergencyContact).trim();
        if (roleData.expectedGraduation) {
          const gradYear = parseInt(roleData.expectedGraduation);
          if (!isNaN(gradYear) && gradYear >= new Date().getFullYear()) {
            studentData.expectedGraduation = gradYear;
          }
        }
        if (roleData.clubs && typeof roleData.clubs === 'string') {
          studentData.clubs = roleData.clubs.split(',').map((c: string) => c.trim()).filter(Boolean);
        }

        await setDoc(doc(db, 'students', tempId), studentData);
      } else if (registration.role === 'alumni') {
        const alumniData: any = {
          name: registration.name,
          email: registration.email,
          tempId: tempId,
          createdAt: serverTimestamp(),
          approvedByAdmin: true,
          approvedAt: serverTimestamp(),
          approvedBy: auth.currentUser?.email
        };

        // Add role-specific data with validation
        const roleData = registration.roleData || {};
        if (roleData.graduationYear) {
          const gradYear = parseInt(roleData.graduationYear);
          if (!isNaN(gradYear) && gradYear >= 1950 && gradYear <= new Date().getFullYear()) {
            alumniData.graduationYear = gradYear;
          }
        }
        if (roleData.company) alumniData.company = String(roleData.company).trim();
        if (roleData.title) alumniData.title = String(roleData.title).trim();
        if (roleData.location) alumniData.location = String(roleData.location).trim();
        if (roleData.linkedIn && typeof roleData.linkedIn === 'string') {
          const linkedIn = roleData.linkedIn.trim();
          if (linkedIn.includes('linkedin.com') || linkedIn.startsWith('http')) {
            alumniData.linkedIn = linkedIn;
          }
        }
        if (roleData.bio) alumniData.bio = String(roleData.bio).trim();
        if (roleData.industry) alumniData.industry = String(roleData.industry).trim();
        if (roleData.experience) {
          const exp = parseInt(roleData.experience);
          if (!isNaN(exp) && exp >= 0 && exp <= 50) {
            alumniData.experience = exp;
          }
        }
        if (roleData.skills && typeof roleData.skills === 'string') {
          alumniData.skills = roleData.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
        }

        await setDoc(doc(db, 'alumni', tempId), alumniData);
      }

      // Update registration status to approved
      await updateDoc(doc(db, 'pendingRegistrations', registration.id), {
        status: 'approved',
        reviewedAt: serverTimestamp(),
        reviewedBy: auth.currentUser?.email,
        tempDocId: tempId,
        approvalNote: 'Registration approved. Profile created and ready for account activation.'
      });

      console.log('✅ Registration approved and profile created successfully for:', registration.email);
      
      // Show success message
      setError(null);
      
    } catch (error: any) {
      console.error('❌ Failed to approve registration:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Failed to approve registration: ';
      
      if (error.message.includes('already exists')) {
        errorMessage += error.message;
      } else if (error.code === 'permission-denied') {
        errorMessage += 'Permission denied. Please ensure you have admin privileges.';
      } else if (error.code === 'network-request-failed') {
        errorMessage += 'Network error. Please check your internet connection and try again.';
      } else {
        errorMessage += error.message || 'An unexpected error occurred.';
      }
      
      setError(errorMessage);
    } finally {
      setProcessingId(null);
    }
  };

  const rejectRegistration = async () => {
    if (!selectedRegistration || !db) return;
    
    setProcessingId(selectedRegistration.id);
    try {
      await updateDoc(doc(db, 'pendingRegistrations', selectedRegistration.id), {
        status: 'rejected',
        reviewedAt: serverTimestamp(),
        reviewedBy: auth?.currentUser?.email,
        rejectionReason: rejectionReason.trim() || 'No reason provided'
      });

      setShowRejectModal(false);
      setSelectedRegistration(null);
      setRejectionReason('');
      console.log('✅ Registration rejected successfully');
    } catch (error: any) {
      console.error('❌ Failed to reject registration:', error);
      setError('Failed to reject registration: ' + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const deleteRegistration = async (registrationId: string) => {
    if (!db) return;
    
    try {
      await deleteDoc(doc(db, 'pendingRegistrations', registrationId));
      console.log('✅ Registration deleted successfully');
    } catch (error: any) {
      console.error('❌ Failed to delete registration:', error);
      setError('Failed to delete registration: ' + error.message);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'badge bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
      case 'approved':
        return 'badge bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      case 'rejected':
        return 'badge bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
      default:
        return 'badge';
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredRegistrations.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedRegistrations = filteredRegistrations.slice(startIndex, startIndex + pageSize);

  if (loading) {
    return (
      <div className="container-responsive py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Only show full-page error for critical errors (like auth/db not available)
  if (error && (error.includes('not available') || error.includes('Failed to load registrations'))) {
    return (
      <div className="container-responsive py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Registration Management Error
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => setError(null)}
                    className="bg-red-100 dark:bg-red-900/40 px-3 py-2 rounded-md text-sm font-medium text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-responsive py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200 mb-2">
          Registration Management
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Review and approve pending user registrations
        </p>
      </div>

      {/* Inline Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error
              </h3>
              <div className="mt-1 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
              </div>
            </div>
            <div className="flex-shrink-0 ml-3">
              <button
                onClick={() => setError(null)}
                className="bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded text-xs font-medium text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-primary"
        />
        
        <CustomDropdown
          options={[
            { value: '', label: 'All Status' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' }
          ]}
          value={filterStatus}
          onChange={setFilterStatus}
          placeholder="All Status"
          className="w-full"
        />
        
        <CustomDropdown
          options={[
            { value: '', label: 'All Roles' },
            { value: 'student', label: 'Student' },
            { value: 'alumni', label: 'Alumni' }
          ]}
          value={filterRole}
          onChange={setFilterRole}
          placeholder="All Roles"
          className="w-full"
        />

        <div className="text-sm text-neutral-600 dark:text-neutral-400 flex items-center">
          Total: {filteredRegistrations.length} registrations
        </div>
      </div>

      {/* Registrations List */}
      <div className="space-y-4">
        {paginatedRegistrations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-600 dark:text-neutral-400">
              No registrations found matching your criteria.
            </p>
          </div>
        ) : (
          paginatedRegistrations.map((registration) => (
            <div key={registration.id} className="card-elevated p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
                    {registration.name}
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 mb-2">
                    {registration.email}
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={getStatusBadge(registration.status)}>
                      {registration.status.charAt(0).toUpperCase() + registration.status.slice(1)}
                    </span>
                    <span className="badge bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                      {registration.role.charAt(0).toUpperCase() + registration.role.slice(1)}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-500">
                    Submitted: {formatDate(registration.submittedAt)}
                  </p>
                  {registration.reviewedAt && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-500">
                      Reviewed: {formatDate(registration.reviewedAt)}
                    </p>
                  )}
                </div>

                {/* Role-specific Data */}
                <div>
                  <h4 className="font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    {registration.role.charAt(0).toUpperCase() + registration.role.slice(1)} Details
                  </h4>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                    {registration.role === 'student' ? (
                      <>
                        {registration.roleData.studentId && (
                          <p><span className="font-medium">Student ID:</span> {registration.roleData.studentId}</p>
                        )}
                        {registration.roleData.year && (
                          <p><span className="font-medium">Year:</span> {registration.roleData.year}</p>
                        )}
                        {registration.roleData.major && (
                          <p><span className="font-medium">Major:</span> {registration.roleData.major}</p>
                        )}
                        {registration.roleData.gpa && (
                          <p><span className="font-medium">GPA:</span> {registration.roleData.gpa}/10</p>
                        )}
                      </>
                    ) : (
                      <>
                        {registration.roleData.graduationYear && (
                          <p><span className="font-medium">Graduation:</span> {registration.roleData.graduationYear}</p>
                        )}
                        {registration.roleData.company && (
                          <p><span className="font-medium">Company:</span> {registration.roleData.company}</p>
                        )}
                        {registration.roleData.title && (
                          <p><span className="font-medium">Title:</span> {registration.roleData.title}</p>
                        )}
                        {registration.roleData.industry && (
                          <p><span className="font-medium">Industry:</span> {registration.roleData.industry}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {registration.status === 'pending' && (
                    <>
                      <button
                        onClick={() => approveRegistration(registration)}
                        disabled={processingId === registration.id}
                        className="btn btn-primary text-sm disabled:opacity-50"
                      >
                        {processingId === registration.id ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRegistration(registration);
                          setShowRejectModal(true);
                        }}
                        disabled={processingId === registration.id}
                        className="btn btn-outline text-sm text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-950"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {registration.status === 'rejected' && registration.rejectionReason && (
                    <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                      <span className="font-medium">Reason:</span> {registration.rejectionReason}
                    </div>
                  )}
                  <button
                    onClick={() => deleteRegistration(registration.id)}
                    className="btn btn-ghost text-sm text-neutral-500 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredRegistrations.length}
            onChange={setPage}
          />
        </div>
      )}

      {/* Reject Modal */}
      <ConfirmationModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedRegistration(null);
          setRejectionReason('');
        }}
        onConfirm={rejectRegistration}
        title="Reject Registration"
        message={
          <div>
            <p>Are you sure you want to reject the registration for {selectedRegistration?.name}?</p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Rejection Reason (Optional)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="input-primary w-full h-20 resize-none"
                placeholder="Enter reason for rejection..."
              />
            </div>
          </div>
        }
        confirmText="Reject"
        confirmVariant="danger"
        loading={processingId === selectedRegistration?.id}
      />
    </div>
  );
}