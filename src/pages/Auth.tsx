import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useEffect } from 'react';

export default function Auth() {
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/profile');
    }
  }, [user, navigate]);

  return (
    <div className="bg-background-light font-sans text-on-background min-h-screen flex items-center justify-center p-4 relative antialiased">
      <header className="absolute top-0 left-0 w-full p-6 sm:p-8 flex items-center z-10 glass-nav">
        <button 
          onClick={() => navigate('/')}
          className="group flex items-center text-outline hover:text-primary transition-colors focus:outline-none"
        >
          <span className="material-symbols-outlined text-2xl mr-2">arrow_back</span>
          <span className="text-sm font-semibold tracking-wide uppercase">Return to Gallery</span>
        </button>
      </header>
      
      <main className="w-full max-w-md prompt-card p-10 sm:p-12 relative z-20">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl font-bold tracking-tight text-on-background mb-2">Welcome Back</h1>
          <p className="text-outline text-sm">Sign in to continue curating.</p>
        </div>
        
        <div className="space-y-6">
          <button 
            onClick={signInWithGoogle}
            className="w-full bg-primary text-white font-medium py-3 px-4 rounded-lg hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors flex justify-center items-center shadow-sm"
          >
            <span>Sign in with Google</span>
          </button>
        </div>
      </main>
    </div>
  );
}
