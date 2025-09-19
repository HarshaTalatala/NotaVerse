// Unified Landing Page
import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import Navbar from '@/components/Navbar';

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  const navigationLinks = [
    { href: '#features', label: 'Features' },
    { href: '#testimonials', label: 'Testimonials' },
    { href: '#about', label: 'About' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      <Navbar
        variant="landing"
        theme={theme}
        onToggleTheme={toggleTheme}
        navigationLinks={navigationLinks}
        showAuthButtons={true}
      />

      {/* Hero Section */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-800 dark:text-blue-200 text-sm font-medium mb-8 shadow-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              Connecting Students & Alumni Worldwide
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-gray-800 dark:text-gray-100 mb-8 leading-tight">
              Build Your{' '}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-bold">
                Professional Network
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
              Connect with industry leaders, find mentorship opportunities, and access exclusive events. 
              NotaVerse transforms how educational communities engage and grow together.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-20">
              <Link 
                to="/register" 
                className="px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
              >
                Join the Network
                <svg className="inline w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link 
                to="/login" 
                className="px-10 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-lg font-semibold hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:shadow-lg"
              >
                Sign In
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center bg-white/30 dark:bg-gray-800/30 p-6 rounded-2xl backdrop-blur-sm shadow-md border border-white/20">
                <div className="text-4xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  5,000+
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-sm">Active Alumni</div>
              </div>
              <div className="text-center bg-white/30 dark:bg-gray-800/30 p-6 rounded-2xl backdrop-blur-sm shadow-md border border-white/20">
                <div className="text-4xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  850+
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-sm">Mentorships</div>
              </div>
              <div className="text-center bg-white/30 dark:bg-gray-800/30 p-6 rounded-2xl backdrop-blur-sm shadow-md border border-white/20">
                <div className="text-4xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  120+
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-sm">Events/Year</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 lg:py-24 bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
              Why Choose NotaVerse?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Our platform is designed to create meaningful connections that drive career growth and community impact.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[ 
              { title: 'Smart Matching', description: 'AI-powered recommendations connect you with the most relevant alumni based on your interests and career goals.', icon: '🎯' },
              { title: 'Verified Network', description: 'Role-based verification ensures authentic connections within your educational community.', icon: '✅' },
              { title: 'Seamless Events', description: 'Discover and attend curated networking events, workshops, and career development sessions.', icon: '🎪' },
              { title: 'Mentorship Hub', description: 'Connect with experienced professionals who can guide your career journey.', icon: '🤝' },
              { title: 'Career Opportunities', description: 'Access exclusive job openings and internships shared by alumni in various industries.', icon: '💼' },
              { title: 'Global Community', description: 'Connect with alumni worldwide and expand your professional network internationally.', icon: '🌍' }
            ].map((feature, index) => (
              <div key={index} className="bg-white/60 dark:bg-gray-900/60 p-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-102 border border-gray-200/50 dark:border-gray-700/50">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">{feature.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 lg:py-32 xl:py-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
              What Our Community Says
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Hear from students and alumni who have transformed their careers through NotaVerse.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[ 
              { name: 'Sarah Chen', role: 'Software Engineer, Google', year: 'Class of 2019', quote: 'NotaVerse helped me find my mentor at Google. The networking events are incredibly valuable and opened doors I never knew existed.', avatar: 'SC', rating: 5 },
              { name: 'Michael Rodriguez', role: 'Product Manager, Microsoft', year: 'Class of 2017', quote: "I've hired 5 amazing interns through the platform. It's the best way to connect with talented students and give back to the community.", avatar: 'MR', rating: 5 },
              { name: 'Emily Johnson', role: 'Current Student', year: 'Class of 2026', quote: 'Found my dream internship through an alumnus I met on the platform. The mentorship program is absolutely game-changing for career growth!', avatar: 'EJ', rating: 5 }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 hover:scale-105 transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {testimonial.avatar}
                  </div>
                  <div className="ml-4">
                    <div className="font-semibold text-gray-900 dark:text-white text-lg">{testimonial.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">{testimonial.year}</div>
                  </div>
                </div>
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 dark:text-gray-300 italic leading-relaxed">"{testimonial.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 lg:py-32 xl:py-40 bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-semibold text-gray-800 dark:text-gray-200 mb-8">
                Empowering Educational Communities
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                Since 2020, NotaVerse has been bridging the gap between students and alumni, 
                creating meaningful connections that drive career growth and institutional pride.
              </p>
              <div className="grid grid-cols-2 gap-8">
                {[ 
                  { number: '50+', label: 'Partner Universities' },
                  { number: '95%', label: 'Success Rate' },
                  { number: '24/7', label: 'Platform Availability' },
                  { number: '100K+', label: 'Total Users' }
                ].map((stat, index) => (
                  <div key={index} className="text-center lg:text-left">
                    <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                      {stat.number}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">Why Choose Us?</h3>
              <div className="space-y-6">
                {[ 
                  { icon: '🔒', title: 'Secure & Private', desc: 'Your data is protected with enterprise-grade security' },
                  { icon: '🎯', title: 'Smart Matching', desc: 'AI-powered connections based on interests and goals' },
                  { icon: '📱', title: 'Mobile First', desc: 'Optimized experience across all devices' },
                  { icon: '🌟', title: 'Proven Results', desc: 'Thousands of successful connections and careers launched' }
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <span className="text-3xl">{feature.icon}</span>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white mb-1">{feature.title}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{feature.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 lg:py-32 xl:py-40 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-8">
            Ready to Transform Your Professional Network?
          </h2>
          <p className="text-lg text-blue-100 mb-12">
            Join thousands of students and alumni who are already building meaningful connections and advancing their careers.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
            <Link 
              to="/register" 
              className="px-10 py-4 bg-white text-blue-600 rounded-xl text-lg font-semibold hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
            >
              Start Connecting Today
              <svg className="inline w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link 
              to="/login" 
              className="px-10 py-4 border-2 border-white text-white rounded-xl text-lg font-semibold hover:bg-white hover:text-blue-600 transition-all"
            >
              Sign In to Your Account
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[ 
              { icon: '✅', title: 'Free to Join' },
              { icon: '🔒', title: 'Secure & Private' },
              { icon: '⚡', title: 'Instant Access' }
            ].map((benefit, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl mb-3">
                  {benefit.icon}
                </div>
                <span className="text-white font-semibold">{benefit.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-full mx-auto px-8 sm:px-12 lg:px-16 xl:px-20">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div className="mb-3 sm:mb-0">
              <span className="font-semibold text-gray-700 dark:text-gray-300 text-base">NotaVerse</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              © 2025 NotaVerse. Empowering educational communities worldwide.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
