import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export default function TopNavBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeCategory = searchParams.get('category') || 'image';

  return (
    <header className="glass-nav flex items-center justify-between whitespace-nowrap px-4 md:px-10 py-3 sticky top-0 z-50 h-header-height">
      <div className="flex items-center gap-4 text-on-background">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="size-5 text-primary group-hover:scale-110 transition-transform flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">account_tree</span>
          </div>
          <h2 className="text-xl font-bold leading-tight tracking-tight uppercase font-display">PromptEngine</h2>
        </Link>
      </div>
      
      <div className="hidden md:flex flex-1 justify-center">
        <div className="flex items-center gap-2 bg-surface-container p-1 rounded-full border border-outline-variant">
          <button onClick={() => navigate('/?category=image')} className={`px-6 py-1.5 rounded-full text-sm font-medium transition-colors font-sans ${activeCategory === 'image' ? 'text-surface-bright bg-primary' : 'text-on-background hover:bg-outline-variant'}`}>Image</button>
          <button onClick={() => navigate('/?category=video')} className={`px-6 py-1.5 rounded-full text-sm font-medium transition-colors font-sans ${activeCategory === 'video' ? 'text-surface-bright bg-primary' : 'text-on-background hover:bg-outline-variant'}`}>Video</button>
          <button onClick={() => navigate('/?category=chat')} className={`px-6 py-1.5 rounded-full text-sm font-medium transition-colors font-sans ${activeCategory === 'chat' ? 'text-surface-bright bg-primary' : 'text-on-background hover:bg-outline-variant'}`}>Chat</button>
        </div>
      </div>
      
      <div className="flex justify-end gap-2">
        <button 
          onClick={() => navigate('/submit')}
          className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-5 bg-primary hover:bg-primary-hover text-surface-bright text-sm font-semibold leading-normal transition-colors font-sans shadow-sm"
        >
          <span className="truncate">Submit</span>
        </button>
        
        {user ? (
          <button 
            onClick={() => navigate('/profile')}
            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-5 bg-surface-container hover:bg-outline-variant text-on-background text-sm font-semibold leading-normal transition-colors font-sans"
          >
            <span className="truncate">Profile</span>
          </button>
        ) : (
          <button 
            onClick={() => navigate('/auth')}
            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-5 bg-primary hover:bg-primary-hover text-surface-bright text-sm font-semibold leading-normal transition-colors font-sans"
          >
            <span className="truncate">Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
