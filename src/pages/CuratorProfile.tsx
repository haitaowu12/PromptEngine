import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/errors';
import TopNavBar from '../components/TopNavBar';

interface Prompt {
  id: string;
  imageUrl: string;
  promptText: string;
  model: string;
  status: string;
  category?: string;
  summary?: string;
  tags?: string[];
}

export default function CuratorProfile() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'creations' | 'favorites'>('creations');
  const [publishedCount, setPublishedCount] = useState(0);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [favoritePrompts, setFavoritePrompts] = useState<Prompt[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        // Fetch User's Creations
        const q = query(
          collection(db, 'prompts'),
          where('authorId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        
        let published = 0;
        const fetchedPrompts: Prompt[] = [];
        
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.status === 'published') published++;
          fetchedPrompts.push({
            id: doc.id,
            ...data
          } as Prompt);
        });

        // Fetch User's Favorites
        const savesQuery = query(
          collection(db, 'saves'),
          where('userId', '==', user.uid)
        );
        const savesSnapshot = await getDocs(savesQuery);
        
        const fetchedFavoritePrompts: Prompt[] = [];
        
        // Use Promise.all to fetch all favorited prompts
        await Promise.all(
          savesSnapshot.docs.map(async (saveDoc) => {
            const save = saveDoc.data();
            const promptId = save.promptId;
            if (promptId) {
              try {
                const promptRef = doc(db, 'prompts', promptId);
                const promptSnap = await getDoc(promptRef);
                if (promptSnap.exists()) {
                  fetchedFavoritePrompts.push({
                    id: promptSnap.id,
                    ...promptSnap.data()
                  } as Prompt);
                }
              } catch (e) {
                // If user doesn't have permission to view a draft prompt they previously saved, ignore
                console.warn("Could not fetch a saved prompt:", e);
              }
            }
          })
        );
        
        setPublishedCount(published);
        setPrompts(fetchedPrompts);
        setFavoritePrompts(fetchedFavoritePrompts);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'prompts_s_saves');
      } finally {
        setDataLoading(false);
      }
    }

    if (user) {
      fetchData();
    }
  }, [user]);

  if (loading || dataLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin w-8 h-8 rounded-full border-t-2 border-primary"></div></div>;
  }

  if (!user) return null;

  return (
    <div className="bg-background-light text-on-background font-sans min-h-screen">
      <div className="relative flex h-auto w-full flex-col bg-surface-bright border-b border-outline-variant group/design-root overflow-x-hidden">
        <div className="layout-container flex h-full grow flex-col">
          <div className="px-4 md:px-10 flex flex-1 justify-center py-5">
            <div className="layout-content-container flex flex-col w-full flex-1 max-w-7xl">
              <TopNavBar />
            </div>
          </div>
        </div>
      </div>
      
      <main className="w-full max-w-7xl mx-auto px-4 md:px-10">
        <section className="min-h-[300px] flex flex-col pt-16 border-b border-outline-variant">
          <div className="flex items-center gap-4 mb-8">
            <img src={user.photoURL || 'https://via.placeholder.com/150'} alt="Profile" className="w-16 h-16 rounded-2xl object-cover shadow-sm" />
            <div>
              <h2 className="text-xl font-bold">{user.displayName || 'Curator'}</h2>
              <button 
                onClick={logout}
                className="text-sm text-outline hover:text-primary transition-colors font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-8 text-sm font-semibold text-outline mb-12">
            <div className="flex flex-col gap-1">
              <span className="text-on-background font-bold text-2xl leading-none">{publishedCount}</span>
              <span>Published</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-on-background font-bold text-2xl leading-none">{prompts.length - publishedCount}</span>
              <span>Drafts</span>
            </div>
          </div>
          
          <nav className="flex gap-8 relative font-semibold text-sm">
            <button 
              onClick={() => setActiveTab('creations')}
              className={`pb-4 transition-colors relative z-10 ${activeTab === 'creations' ? 'text-primary font-bold border-b-2 border-primary' : 'text-outline hover:text-on-background'}`}
            >
              Creations
            </button>
            <button 
              onClick={() => setActiveTab('favorites')}
              className={`pb-4 transition-colors relative z-10 ${activeTab === 'favorites' ? 'text-primary font-bold border-b-2 border-primary' : 'text-outline hover:text-on-background'}`}
            >
              Favorites
            </button>
          </nav>
        </section>
        
        <section className="masonry-grid w-full py-10">
          {(activeTab === 'creations' ? prompts : favoritePrompts).map((prompt) => (
            <div 
              key={prompt.id} 
              className={`masonry-item prompt-card bg-surface-bright p-5 rounded-2xl hover:shadow-xl cursor-pointer w-full inline-block ${prompt.category === 'chat' ? 'border-2 border-surface-container' : ''}`}
              onClick={() => navigate(`/prompt/${prompt.id}`)}
              style={prompt.status === 'draft' ? { opacity: 0.7 } : {}}
            >
              {prompt.category !== 'chat' && prompt.imageUrl && (
                <img 
                  src={prompt.imageUrl} 
                  alt={prompt.promptText}
                  className="w-full h-auto object-cover rounded-xl mb-4"
                  loading="lazy"
                />
              )}
              
              <div className="flex justify-between items-start mb-3">
                <span className="px-2 py-1 bg-surface-container text-on-background text-[10px] font-bold uppercase tracking-wider rounded">
                  {prompt.category || 'image'} {prompt.status === 'draft' && '- Draft'}
                </span>
                {prompt.category === 'chat' && prompt.imageUrl ? (
                  <span className="material-symbols-outlined text-[16px] text-outline">image</span>
                ) : (
                  <span className="text-xs text-outline font-medium">{prompt.model || 'model'}</span>
                )}
              </div>
              
              {prompt.category === 'chat' ? (
                <>
                  <h3 className="font-bold text-lg mb-2 line-clamp-2 text-on-background">{prompt.summary || 'Chat Prompt'}</h3>
                  <p className="text-sm text-on-background/70 font-mono bg-surface-container/50 p-2 rounded line-clamp-3 mb-3">"{prompt.promptText}"</p>
                </>
              ) : (
                <p className="text-sm text-on-background/80 line-clamp-3 mb-3">"{prompt.promptText}"</p>
              )}
              
              {prompt.tags && prompt.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {prompt.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[10px] text-outline font-medium px-2 py-0.5 border border-outline-variant rounded-full">{tag}</span>
                  ))}
                  {prompt.tags.length > 3 && <span className="text-[10px] text-outline">+{prompt.tags.length - 3}</span>}
                </div>
              )}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
