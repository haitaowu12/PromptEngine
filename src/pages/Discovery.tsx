import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import TopNavBar from '../components/TopNavBar';
import Marquee from '../components/Marquee';
import { useNavigate, useLocation } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../lib/errors';

interface Prompt {
  id: string;
  imageUrl: string;
  promptText: string;
  category?: string;
  summary?: string;
  tags?: string[];
}

export default function Discovery() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const categoryFilter = searchParams.get('category') || 'image';

  useEffect(() => {
    const q = query(
      collection(db, 'prompts'),
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let newPrompts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Prompt[];
      
      setPrompts(newPrompts);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'prompts');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const displayedPrompts = prompts.filter(p => (p.category || 'image') === categoryFilter);

  return (
    <div className="flex flex-col min-h-screen bg-background-light text-on-background">
      <div className="relative flex h-auto w-full flex-col bg-surface-bright group/design-root overflow-x-hidden border-b border-outline-variant">
        <div className="layout-container flex h-full grow flex-col w-full">
          <div className="px-4 md:px-10 flex flex-1 justify-center py-5">
            <div className="layout-content-container flex flex-col w-full flex-1 max-w-7xl">
              <TopNavBar />
              <div className="mt-6 mb-4">
                <Marquee />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-10 py-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-t-2 border-primary animate-spin"></div>
          </div>
        ) : displayedPrompts.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[512px] text-center">
            <h3 className="text-2xl md:text-3xl font-bold text-on-background mb-4">Gallery is empty.</h3>
            <p className="text-outline font-medium text-sm">Be the first to submit a creation.</p>
          </div>
        ) : (
          <div className="masonry-grid w-full">
            {displayedPrompts.map(prompt => (
              <div 
                key={prompt.id} 
                className={`masonry-item prompt-card bg-surface-bright p-5 rounded-2xl hover:shadow-xl cursor-pointer w-full inline-block ${prompt.category === 'chat' ? 'border-2 border-surface-container' : ''}`}
                onClick={() => navigate(`/prompt/${prompt.id}`)}
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
                  <span className="px-2 py-1 bg-surface-container text-on-background text-[10px] font-bold uppercase tracking-wider rounded">{prompt.category || 'image'}</span>
                  {prompt.category === 'chat' && prompt.imageUrl && (
                    <span className="material-symbols-outlined text-[16px] text-outline">image</span>
                  )}
                </div>
                
                {prompt.category === 'chat' ? (
                  <>
                    <h3 className="font-bold text-lg mb-2 line-clamp-2 text-on-background">{prompt.summary || 'Chat Prompt'}</h3>
                    <p className="text-sm text-on-background/70 font-mono bg-surface-container/50 p-2 rounded line-clamp-3 mb-3">"{prompt.promptText}"</p>
                  </>
                ) : (
                  <p className="text-sm text-on-background/70 line-clamp-3 italic mb-3">"{prompt.promptText}"</p>
                )}
                
                {prompt.tags && prompt.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {prompt.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] text-outline font-medium px-2 py-0.5 border border-outline-variant rounded-full">{tag}</span>
                    ))}
                    {prompt.tags.length > 3 && <span className="text-[10px] text-outline">+{prompt.tags.length - 3}</span>}
                  </div>
                )}
                <div className="flex justify-end">
                  <button 
                    className="text-outline hover:text-primary transition-colors flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(prompt.promptText);
                    }}
                  >
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 0" }}>content_copy</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
