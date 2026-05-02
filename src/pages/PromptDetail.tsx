import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, getDoc, updateDoc, deleteDoc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/errors';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../lib/AuthContext';

interface Prompt {
  id: string;
  imageUrl: string;
  promptText: string;
  authorId: string;
  model?: string;
  seed?: string;
  cfgScale?: number;
  steps?: number;
  aspectRatio?: string;
  stylize?: number;
  upvotes: number;
  category?: string;
  summary?: string;
  tags?: string[];
}

interface UserProfile {
  displayName: string;
  photoURL: string;
}

export default function PromptDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [author, setAuthor] = useState<UserProfile | null>(null);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPromptText, setEditedPromptText] = useState('');
  const [editedSummary, setEditedSummary] = useState('');
  const [editedImageUrl, setEditedImageUrl] = useState('');
  const [editedModel, setEditedModel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarred, setIsStarred] = useState(false);

  useEffect(() => {
    if (!prompt || !user) return;
    const saveId = `${user.uid}_${prompt.id}`;
    const unsub = onSnapshot(doc(db, 'saves', saveId), (docSnap) => {
      setIsStarred(docSnap.exists());
    });
    return () => unsub();
  }, [prompt?.id, user?.uid]);

  const toggleStar = async () => {
    if (!prompt || !user) return;
    const promptRef = doc(db, 'prompts', prompt.id);
    const saveId = `${user.uid}_${prompt.id}`;
    const saveRef = doc(db, 'saves', saveId);
    
    try {
      if (isStarred) {
        // Unstar
        await updateDoc(promptRef, { upvotes: increment(-1) });
        await deleteDoc(saveRef);
      } else {
        // Star
        await updateDoc(promptRef, { upvotes: increment(1) });
        await setDoc(saveRef, { 
          userId: user.uid, 
          promptId: prompt.id, 
          createdAt: serverTimestamp() 
        });
      }
    } catch(e) {
      handleFirestoreError(e, OperationType.UPDATE, `prompts/${prompt.id}`);
    }
  };

  const handleDelete = async () => {
    if (!prompt || !user || user.uid !== prompt.authorId) return;
    if (!window.confirm("Are you sure you want to delete this prompt?")) return;
    try {
      await deleteDoc(doc(db, 'prompts', prompt.id));
      navigate('/');
    } catch(e) {
      handleFirestoreError(e, OperationType.DELETE, `prompts/${prompt.id}`);
    }
  };

  const handleSaveEdit = async () => {
    if (!prompt || !user || user.uid !== prompt.authorId) return;
    setIsSubmitting(true);
    try {
      const updateData: any = {};
      if (editedPromptText !== prompt.promptText) updateData.promptText = editedPromptText;
      if (editedSummary !== prompt.summary) updateData.summary = editedSummary || '';
      if (editedImageUrl !== prompt.imageUrl) updateData.imageUrl = editedImageUrl || '';
      if (editedModel !== prompt.model) updateData.model = editedModel || '';
      
      // Ensure required fields are present for legacy documents
      if (prompt.status === undefined) updateData.status = 'published';
      if (prompt.upvotes === undefined) updateData.upvotes = 0;
      if (prompt.authorId === undefined) updateData.authorId = user.uid;
      if (prompt.createdAt === undefined) updateData.createdAt = serverTimestamp();
      if (prompt.imageUrl === undefined && !updateData.imageUrl) updateData.imageUrl = '';
      if (prompt.promptText === undefined && !updateData.promptText) updateData.promptText = '';
      
      if (Object.keys(updateData).length > 0) {
        await updateDoc(doc(db, 'prompts', prompt.id), updateData);
      }
      setIsEditing(false);
    } catch(e) {
      handleFirestoreError(e, OperationType.UPDATE, `prompts/${prompt.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkIsOwner = () => user?.uid === prompt?.authorId;

  // Initialize edit states when entering edit mode
  const startEditing = () => {
    if (prompt) {
      setEditedPromptText(prompt.promptText);
      setEditedSummary(prompt.summary || '');
      setEditedImageUrl(prompt.imageUrl || '');
      setEditedModel(prompt.model || '');
      setIsEditing(true);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image is too large. Please select an image under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/webp', 0.8);
        setEditedImageUrl(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'prompts', id), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Prompt;
        setPrompt({ id: docSnap.id, ...data });
        
        try {
          const userSnap = await getDoc(doc(db, 'users', data.authorId));
          if (userSnap.exists()) {
            setAuthor(userSnap.data() as UserProfile);
          }
        } catch (e) {
          console.error("Failed to fetch author", e);
        }
      } else {
        setPrompt(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `prompts/${id}`);
    });
    return () => unsub();
  }, [id]);

  if (!prompt) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  if (prompt.category === 'chat') {
    return (
      <div className="flex flex-col min-h-screen w-full bg-background-light text-on-background antialiased relative">
        <div className="sticky top-0 z-10 glass-nav px-6 py-4 lg:px-10 flex justify-between items-center shrink-0 border-b border-outline-variant h-[72px]">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')} 
              className="flex items-center justify-center w-10 h-10 border border-outline-variant hover:bg-surface-container bg-surface-bright rounded-full text-on-background transition-colors duration-200 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <button 
              onClick={toggleStar} 
              className={`flex items-center gap-2 border border-outline-variant rounded-full px-4 py-1.5 shadow-sm bg-surface-bright transition-colors focus:outline-none ${isStarred ? 'text-primary border-primary bg-primary/5' : 'text-outline hover:text-on-background hover:bg-surface-container'}`}
            >
              <span className={`material-symbols-outlined text-[20px] ${isStarred ? 'fill-current' : ''}`}>
                {isStarred ? 'star' : 'star_border'}
              </span>
              <span className="font-semibold text-sm tracking-wide">{prompt.upvotes || 0}</span>
            </button>
            
            {checkIsOwner() && (
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <button onClick={startEditing} className="flex items-center justify-center w-10 h-10 border border-outline-variant hover:bg-surface-container bg-surface-bright rounded-full text-on-background transition-colors duration-200 cursor-pointer text-sm font-medium">
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                ) : (
                  <button onClick={handleSaveEdit} disabled={isSubmitting} className="flex items-center justify-center px-4 h-10 bg-primary hover:bg-primary-hover text-white rounded-full transition-colors duration-200 cursor-pointer text-sm font-medium">
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </button>
                )}
                <button onClick={handleDelete} className="flex items-center justify-center w-10 h-10 border border-error/30 hover:bg-error/10 bg-surface-bright rounded-full text-error transition-colors duration-200 cursor-pointer text-sm font-medium">
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => {
              navigator.clipboard.writeText(prompt.promptText);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="group flex items-center gap-2 bg-primary text-white border border-transparent px-5 py-2 rounded-full text-xs uppercase tracking-wide font-medium hover:bg-primary-hover shadow-sm transition-all duration-200 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">{copied ? 'check' : 'content_copy'}</span>
            <span>{copied ? 'Copied!' : 'Copy Prompt'}</span>
          </button>
        </div>

        <main className="flex-1 w-full max-w-4xl mx-auto px-6 lg:px-10 py-12 flex flex-col items-center">
          <div className="w-full flex flex-col items-start mb-8">
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="px-3 py-1 bg-surface-container text-on-background text-xs font-bold uppercase tracking-wider rounded border border-outline-variant">
                chat
              </span>
              {prompt.tags?.map(tag => (
                <span key={tag} className="px-3 py-1 text-outline text-xs font-medium border border-outline-variant rounded-full">
                  {tag}
                </span>
              ))}
            </div>
            
            {isEditing ? (
              <input
                type="text"
                value={editedSummary}
                onChange={(e) => setEditedSummary(e.target.value)}
                className="w-full text-3xl lg:text-5xl font-display font-bold mb-4 tracking-tight bg-transparent border-b-2 border-primary focus:outline-none"
                placeholder="Chat Summary"
              />
            ) : (
              <h1 className="text-3xl lg:text-5xl font-display font-bold mb-4 tracking-tight">
                {prompt.summary || 'Chat Prompt'}
              </h1>
            )}
          </div>
          
          <div className="w-full bg-surface-bright border border-outline-variant rounded-2xl p-6 lg:p-10 mb-12 shadow-sm relative group">
            <div className="absolute top-4 right-4 opacity-50 group-hover:opacity-100 transition-opacity">
               <span className="material-symbols-outlined text-outline">format_quote</span>
            </div>
            {isEditing ? (
              <textarea
                value={editedPromptText}
                onChange={(e) => setEditedPromptText(e.target.value)}
                className="w-full min-h-[200px] text-lg leading-relaxed text-on-background/90 whitespace-pre-wrap font-mono relative z-10 bg-transparent border border-primary rounded p-4 focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Prompt text..."
              />
            ) : (
              <p className="text-lg leading-relaxed text-on-background/90 whitespace-pre-wrap font-mono relative z-10">
                {prompt.promptText}
              </p>
            )}
          </div>

          {prompt.imageUrl && !isEditing && (
            <div className="w-full mb-12 flex justify-center">
               <img src={prompt.imageUrl} className="max-h-[500px] object-cover rounded-2xl border border-outline-variant shadow-sm" alt="Reference" />
            </div>
          )}
          
          {isEditing && (
             <div className="w-full mb-6">
                <div className="w-full flex flex-col items-center justify-center gap-4 mb-4">
                  <div className="w-full relative group">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary">link</span>
                    <input 
                      type="text" 
                      placeholder="Paste Image URL..." 
                      value={editedImageUrl.startsWith('data:') ? '' : editedImageUrl}
                      onChange={(e) => setEditedImageUrl(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-surface-container/50 border border-outline-variant rounded-xl text-sm text-on-background focus:border-primary focus:bg-surface-bright focus:outline-none transition-all"
                    />
                  </div>
                  
                  <div className="flex items-center gap-4 w-full px-4">
                    <div className="flex-1 h-px bg-outline-variant"></div>
                    <span className="text-outline text-xs font-semibold uppercase tracking-widest">OR</span>
                    <div className="flex-1 h-px bg-outline-variant"></div>
                  </div>
                  
                  <label className="w-full cursor-pointer flex flex-col items-center justify-center gap-2 bg-surface-container hover:bg-outline-variant/30 px-6 py-6 rounded-xl text-sm font-semibold transition-all duration-200 text-on-background border border-outline-variant border-dashed hover:border-solid hover:border-outline group">
                    <span className="material-symbols-outlined text-3xl text-outline group-hover:text-primary transition-colors">cloud_upload</span>
                    <span>Browse files to upload</span>
                    <span className="text-xs text-outline font-normal mt-1">Image size will be optimized</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
                 {editedImageUrl && <img src={editedImageUrl} className="mt-4 max-h-[30vh] object-contain rounded-xl mx-auto border border-outline-variant" />}
             </div>
          )}

          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-outline-variant pt-12">
            <div>
              <h2 className="text-xs uppercase tracking-wider text-outline mb-4 font-semibold">Author</h2>
              {author && (
                <div className="flex gap-4 p-4 border border-outline-variant rounded-xl bg-surface-bright shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-surface-container flex-shrink-0 overflow-hidden border border-outline-variant">
                    <img src={author.photoURL} alt={author.displayName} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-sm font-semibold text-on-background">{author.displayName}</p>
                    {prompt.model && !isEditing && <p className="text-xs text-outline font-medium tracking-wide">Model: {prompt.model}</p>}
                  </div>
                </div>
              )}
            </div>
            
            {isEditing && (
              <div>
                <h2 className="text-xs uppercase tracking-wider text-outline mb-4 font-semibold">Model</h2>
                <input
                  type="text"
                  value={editedModel}
                  onChange={(e) => setEditedModel(e.target.value)}
                  className="w-full text-sm leading-relaxed text-on-background font-mono bg-transparent border border-primary rounded p-4 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Model used (optional)..."
                />
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-background-light text-on-background antialiased">
      <div className="relative w-full lg:w-[60%] h-[460px] lg:h-full bg-black overflow-hidden group">
        <button 
          onClick={() => navigate('/')} 
          className="absolute top-4 left-4 lg:top-8 lg:left-8 z-20 flex items-center justify-center w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-colors duration-200 cursor-pointer"
        >
          <span className="material-symbols-outlined font-light text-[20px]">arrow_back</span>
        </button>
        <div className="w-full h-full cursor-pointer overflow-hidden flex items-center justify-center">
          {isEditing ? (
            <div className="w-full h-full flex flex-col justify-center p-8 lg:p-16">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-4">Image URL</label>
              
              <div className="w-full flex flex-col items-center justify-center gap-4 mb-4">
                  <div className="w-full relative group">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-white">link</span>
                    <input 
                      type="text" 
                      placeholder="Paste Image URL..." 
                      value={editedImageUrl.startsWith('data:') ? '' : editedImageUrl}
                      onChange={(e) => setEditedImageUrl(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-sm text-white focus:border-white focus:bg-white/10 focus:outline-none transition-all placeholder:text-white/30"
                    />
                  </div>
                  
                  <div className="flex items-center gap-4 w-full px-4">
                    <div className="flex-1 h-px bg-white/10"></div>
                    <span className="text-white/30 text-xs font-semibold uppercase tracking-widest">OR</span>
                    <div className="flex-1 h-px bg-white/10"></div>
                  </div>
                  
                  <label className="w-full cursor-pointer flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 px-6 py-6 rounded-xl text-sm font-semibold transition-all duration-200 text-white border border-white/20 border-dashed hover:border-solid hover:border-white/40 group">
                    <span className="material-symbols-outlined text-3xl text-white/50 group-hover:text-white transition-colors">cloud_upload</span>
                    <span>Browse files to upload</span>
                    <span className="text-xs text-white/50 font-normal mt-1">Image size will be optimized</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>

               {editedImageUrl && <img src={editedImageUrl} className="mt-4 max-h-[40vh] object-contain rounded-xl border border-white/10 mx-auto" />}
            </div>
          ) : prompt.imageUrl ? (
            <img 
              src={prompt.imageUrl} 
              alt="Generative Artwork" 
              className="w-full h-full object-cover transition-transform duration-700 ease-out origin-center group-hover:scale-105" 
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-white/50 bg-black w-full h-full">
              <span className="material-symbols-outlined text-6xl mb-4">chat</span>
              <p className="text-sm uppercase tracking-widest font-semibold">Chat Category</p>
            </div>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent lg:hidden pointer-events-none"></div>
      </div>
      
      <div className="w-full lg:w-[40%] h-[563px] lg:h-full bg-surface-bright flex flex-col border-l border-outline-variant overflow-hidden">
        <div className="sticky top-0 z-10 glass-nav px-6 py-4 lg:px-10 flex justify-between items-center shrink-0 border-b-0 h-[72px]">
          <button 
            onClick={toggleStar} 
            className={`flex items-center gap-2 border border-outline-variant rounded-full px-4 py-1.5 shadow-sm bg-background-light transition-colors focus:outline-none ${isStarred ? 'text-primary border-primary bg-primary/5' : 'text-outline hover:text-on-background hover:bg-surface-container'}`}
          >
            <span className={`material-symbols-outlined text-[20px] ${isStarred ? 'fill-current' : ''}`}>
              {isStarred ? 'star' : 'star_border'}
            </span>
            <span className="font-semibold text-sm tracking-wide">{prompt.upvotes || 0}</span>
          </button>
          
          <div className="flex items-center gap-2">
            {checkIsOwner() && (
              <>
                {!isEditing ? (
                  <button onClick={startEditing} className="flex items-center justify-center w-10 h-10 border border-outline-variant hover:bg-surface-container bg-surface-bright rounded-full text-on-background transition-colors duration-200 cursor-pointer">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                ) : (
                  <button onClick={handleSaveEdit} disabled={isSubmitting} className="flex items-center justify-center px-4 h-10 bg-primary hover:bg-primary-hover text-white rounded-full transition-colors duration-200 cursor-pointer text-sm font-medium">
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </button>
                )}
                <button onClick={handleDelete} className="flex items-center justify-center w-10 h-10 border border-error/30 hover:bg-error/10 bg-surface-bright rounded-full text-error transition-colors duration-200 cursor-pointer text-sm font-medium">
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </>
            )}
            
            <button 
              onClick={() => {
                navigator.clipboard.writeText(prompt.promptText);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="group flex items-center gap-2 bg-primary text-white border border-transparent px-5 py-2 rounded-full text-xs uppercase tracking-wide font-medium hover:bg-primary-hover shadow-sm transition-all duration-200 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">{copied ? 'check' : 'content_copy'}</span>
              <span>{copied ? 'Copied!' : 'Copy Prompt'}</span>
            </button>
          </div>
        </div>
        
        <div className="flex-grow overflow-y-auto custom-scrollbar pb-24 lg:pb-12">
          <div className="px-6 py-10 lg:px-10 lg:py-14">
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="px-3 py-1 bg-surface-container text-on-background text-xs font-bold uppercase tracking-wider rounded border border-outline-variant">
                {prompt.category || 'image'}
              </span>
              {prompt.tags?.map(tag => (
                <span key={tag} className="px-3 py-1 text-outline text-xs font-medium border border-outline-variant rounded-full">
                  {tag}
                </span>
              ))}
            </div>
            {isEditing ? (
              <textarea
                value={editedPromptText}
                onChange={(e) => setEditedPromptText(e.target.value)}
                className="w-full min-h-[200px] text-2xl lg:text-3xl leading-relaxed italic text-on-background font-medium font-display bg-transparent border border-primary rounded p-4 focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Prompt text..."
              />
            ) : (
              <h1 className="text-2xl lg:text-3xl leading-relaxed italic text-on-background font-medium font-display">
                "{prompt.promptText}"
              </h1>
            )}
          </div>
          
          <div className="px-6 lg:px-10 mb-8 mt-8">
            {isEditing && (
              <div>
                <label className="text-xs uppercase tracking-wider text-outline mb-4 font-semibold block">Model</label>
                <input
                  type="text"
                  value={editedModel}
                  onChange={(e) => setEditedModel(e.target.value)}
                  className="w-full text-sm leading-relaxed text-on-background font-mono bg-transparent border border-primary rounded p-4 focus:outline-none focus:ring-1 focus:ring-primary mb-6"
                  placeholder="Model used (optional)..."
                />
              </div>
            )}
            
            <div className="flex items-center justify-between mb-6 border-b border-outline-variant pb-3">
              <h2 className="text-xs uppercase tracking-wider text-outline font-semibold">Author</h2>
            </div>
            {author && (
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-surface-container flex-shrink-0 overflow-hidden border border-outline-variant">
                    <img src={author.photoURL} alt={author.displayName} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-sm font-semibold text-on-background">{author.displayName}</p>
                    {prompt.model && !isEditing && <p className="text-xs text-outline font-medium tracking-wide">Model: {prompt.model}</p>}
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
