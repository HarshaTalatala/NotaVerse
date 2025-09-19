import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Navbar from '@/components/Navbar';
import CustomDropdown from '@/components/CustomDropdown';

type Role = 'alumni' | 'student'; // Only alumni and student can register

interface StudentFields {
  studentId: string;
  year: string;
  major: string;
  gpa: string;
  phone: string;
  address: string;
  emergencyContact: string;
  expectedGraduation: string;
  clubs: string;
}

interface AlumniFields {
  graduationYear: string;
  company: string;
  title: string;
  location: string;
  linkedIn: string;
  bio: string;
  industry: string;
  skills: string;
  experience: string;
}

export default function RegisterPage() {
  const { submitRegistration } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as Role
  });
  const [studentFields, setStudentFields] = useState<StudentFields>({
    studentId: '',
    year: '',
    major: '',
    gpa: '',
    phone: '',
    address: '',
    emergencyContact: '',
    expectedGraduation: '',
    clubs: ''
  });
  const [alumniFields, setAlumniFields] = useState<AlumniFields>({
    graduationYear: '',
    company: '',
    title: '',
    location: '',
    linkedIn: '',
    bio: '',
    industry: '',
    skills: '',
    experience: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    // Role-specific validation
    if (formData.role === 'student') {
      if (!studentFields.studentId.trim()) {
        setError('Student ID is required');
        return false;
      }
    } else if (formData.role === 'alumni') {
      if (!alumniFields.graduationYear.trim()) {
        setError('Graduation year is required for alumni');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError(null);
    
    try {
      // Prepare role-specific data
      const roleData = formData.role === 'student' ? studentFields : alumniFields;
      
      await submitRegistration(formData.email, formData.password, {
        name: formData.name,
        role: formData.role,
        roleData: roleData
      });
      
      // Show success message and redirect
      navigate('/login', { 
        state: { 
          message: 'Registration submitted successfully! Please wait for admin approval before signing in.' 
        }
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleStudentFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setStudentFields(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleAlumniFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAlumniFields(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar
        variant="landing"
        theme={theme}
        onToggleTheme={toggleTheme}
        showAuthButtons={false}
        hideNavigation
      />
      <div className="flex items-center justify-center p-4 pt-20">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200 mb-2">
              Create Account
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Join the NotaVerse community
            </p>
          </div>

          {/* Registration Form */}
          <div className="card-elevated p-8 animate-fade-in-up">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input-primary w-full"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="input-primary w-full"
                  placeholder="Enter your email"
                  required
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Account Type
                </label>
                <CustomDropdown
                  options={[
                    { value: 'student', label: 'Student' },
                    { value: 'alumni', label: 'Alumni' }
                  ]}
                  value={formData.role}
                  onChange={(value) => setFormData(prev => ({ ...prev, role: value as Role }))}
                  placeholder="Select account type"
                  className="w-full"
                />
              </div>

              {/* Role-specific fields */}
              {formData.role === 'student' && (
                <div className="space-y-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="text-lg font-medium text-blue-800 dark:text-blue-200">Student Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Student ID *
                      </label>
                      <input
                        type="text"
                        name="studentId"
                        value={studentFields.studentId}
                        onChange={handleStudentFieldChange}
                        className="input-primary w-full"
                        placeholder="Enter your student ID"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Year
                      </label>
                      <CustomDropdown
                        options={[
                          { value: '', label: 'Select year' },
                          { value: '1', label: '1st Year' },
                          { value: '2', label: '2nd Year' },
                          { value: '3', label: '3rd Year' },
                          { value: '4', label: '4th Year' }
                        ]}
                        value={studentFields.year}
                        onChange={(value) => setStudentFields(prev => ({ ...prev, year: value }))}
                        placeholder="Select year"
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Major
                      </label>
                      <input
                        type="text"
                        name="major"
                        value={studentFields.major}
                        onChange={handleStudentFieldChange}
                        className="input-primary w-full"
                        placeholder="Your major/program"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        GPA
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        name="gpa"
                        value={studentFields.gpa}
                        onChange={handleStudentFieldChange}
                        className="input-primary w-full"
                        placeholder="0.00 (Scale: 0-10)"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={studentFields.phone}
                        onChange={handleStudentFieldChange}
                        className="input-primary w-full"
                        placeholder="Your phone number"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Expected Graduation Year
                      </label>
                      <input
                        type="number"
                        min="2024"
                        max="2035"
                        name="expectedGraduation"
                        value={studentFields.expectedGraduation}
                        onChange={handleStudentFieldChange}
                        className="input-primary w-full"
                        placeholder="2026"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Emergency Contact
                    </label>
                    <input
                      type="text"
                      name="emergencyContact"
                      value={studentFields.emergencyContact}
                      onChange={handleStudentFieldChange}
                      className="input-primary w-full"
                      placeholder="Emergency contact info"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Clubs/Organizations
                    </label>
                    <input
                      type="text"
                      name="clubs"
                      value={studentFields.clubs}
                      onChange={handleStudentFieldChange}
                      className="input-primary w-full"
                      placeholder="Clubs or organizations (comma-separated)"
                    />
                  </div>
                </div>
              )}

              {formData.role === 'alumni' && (
                <div className="space-y-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <h3 className="text-lg font-medium text-green-800 dark:text-green-200">Alumni Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Graduation Year *
                      </label>
                      <input
                        type="number"
                        min="1950"
                        max="2024"
                        name="graduationYear"
                        value={alumniFields.graduationYear}
                        onChange={handleAlumniFieldChange}
                        className="input-primary w-full"
                        placeholder="Year you graduated"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Current Company
                      </label>
                      <input
                        type="text"
                        name="company"
                        value={alumniFields.company}
                        onChange={handleAlumniFieldChange}
                        className="input-primary w-full"
                        placeholder="Your current employer"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Job Title
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={alumniFields.title}
                        onChange={handleAlumniFieldChange}
                        className="input-primary w-full"
                        placeholder="Your current job title"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        name="location"
                        value={alumniFields.location}
                        onChange={handleAlumniFieldChange}
                        className="input-primary w-full"
                        placeholder="City, Country"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Industry
                      </label>
                      <input
                        type="text"
                        name="industry"
                        value={alumniFields.industry}
                        onChange={handleAlumniFieldChange}
                        className="input-primary w-full"
                        placeholder="Technology, Finance, etc."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        name="experience"
                        value={alumniFields.experience}
                        onChange={handleAlumniFieldChange}
                        className="input-primary w-full"
                        placeholder="Years of work experience"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      LinkedIn Profile
                    </label>
                    <input
                      type="url"
                      name="linkedIn"
                      value={alumniFields.linkedIn}
                      onChange={handleAlumniFieldChange}
                      className="input-primary w-full"
                      placeholder="https://linkedin.com/in/yourprofile"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Skills
                    </label>
                    <input
                      type="text"
                      name="skills"
                      value={alumniFields.skills}
                      onChange={handleAlumniFieldChange}
                      className="input-primary w-full"
                      placeholder="Your skills (comma-separated)"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Bio
                    </label>
                    <textarea
                      name="bio"
                      value={alumniFields.bio}
                      onChange={handleAlumniFieldChange}
                      className="input-primary w-full h-24 resize-none"
                      placeholder="Brief description about yourself"
                    />
                  </div>
                </div>
              )}

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="input-primary w-full"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="input-primary w-full"
                  placeholder="Confirm your password"
                  required
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full btn btn-primary py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </span>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            {/* Sign In Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </div>

            {/* Account Approval Notice */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-xs text-blue-600 dark:text-blue-400 text-center">
                Your account will need approval before you can access all features.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



