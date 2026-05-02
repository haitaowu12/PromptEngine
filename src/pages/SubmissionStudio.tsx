import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/errors';

export default function SubmissionStudio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [promptText, setPromptText] = useState('');
  const [summary, setSummary] = useState('');
  const [classification, setClassification] = useState('Image');
  const [model, setModel] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
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
        setImageUrl(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagsInput.trim() && tags.length < 10) {
      e.preventDefault();
      if (!tags.includes(tagsInput.trim())) {
        setTags([...tags, tagsInput.trim()]);
      }
      setTagsInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const submitPrompt = async () => {
    if (!user) return navigate('/auth');
    if (!promptText || (classification !== 'Chat' && !imageUrl)) return;

    setLoading(true);
    try {
      const docRef = doc(collection(db, 'prompts'));
      const promptData: any = {
        authorId: user.uid,
        promptText,
        category: classification.toLowerCase(),
        status: 'published',
        upvotes: 0,
        createdAt: serverTimestamp()
      };
      
      if (classification !== 'Chat') {
        promptData.imageUrl = imageUrl;
        promptData.seed = Math.floor(Math.random() * 999999999).toString();
        promptData.cfgScale = parseFloat((Math.random() * 5 + 5).toFixed(1));
        promptData.steps = Math.floor(Math.random() * 30 + 20);
      } else {
        promptData.imageUrl = imageUrl || ''; // Optional image for chat
      }
      
      if (tags.length > 0) promptData.tags = tags;
      if (summary) promptData.summary = summary;
      if (model) promptData.model = model;

      await setDoc(docRef, promptData);
      navigate(`/prompt/${docRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'prompts');
      setLoading(false);
    }
  };

  return (
    <div className="bg-background-light text-background-dark font-sans antialiased min-h-screen flex flex-col relative">
      {loading && (
        <div className="fixed top-0 left-0 w-full h-1 bg-background-dark/10 z-50">
          <div className="h-full bg-primary w-1/3 transition-all duration-1000 animate-pulse"></div>
        </div>
      )}
      
      <header className="h-16 px-8 flex items-center glass-nav sticky top-0 z-40">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-outline hover:text-primary transition-colors cursor-pointer group">
          <span className="material-symbols-outlined text-xl group-hover:-translate-x-1 transition-transform">arrow_back</span>
          <span className="text-sm font-semibold tracking-wide uppercase">Back to Gallery</span>
        </button>
        <div className="ml-auto text-sm font-semibold uppercase tracking-wide text-outline">
          Submission Studio
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        <section className="p-8 lg:p-16 flex flex-col lg:border-r border-outline-variant min-h-[512px] lg:min-h-[calc(100vh-4rem)] relative">
          {classification !== 'Chat' ? (
            <div className="flex-1 prompt-card border-dashed flex flex-col items-center justify-center p-8 relative">
              <div className="w-full flex items-center justify-center gap-4 mb-6">
                <input 
                  type="text" 
                  placeholder="Paste Image URL..." 
                  value={imageUrl.startsWith('data:') ? '' : imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="flex-1 text-center bg-transparent border-b border-outline p-2 text-sm text-on-background focus:border-primary focus:outline-none transition-colors"
                  title="Only paste external URLs here"
                />
                <span className="text-outline text-sm font-medium">OR</span>
                <label className="cursor-pointer bg-surface-container hover:bg-outline-variant px-4 py-2 rounded-full text-sm font-medium transition-colors text-on-background border border-outline-variant">
                  Upload Image
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
              {imageUrl ? (
                <img src={imageUrl} alt="Preview" className="max-h-[60vh] object-contain rounded-lg" />
              ) : (
                <div className="flex flex-col items-center text-outline">
                  <span className="material-symbols-outlined text-3xl mb-4">image</span>
                  <p className="text-sm font-semibold uppercase tracking-wide">Provide Image URL</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 prompt-card border-dashed flex flex-col p-8 relative">
              <div className="w-full mb-8 flex-1">
                <label className="text-sm font-semibold text-outline uppercase tracking-wider mb-4 block">Chat Summary / Title</label>
                <textarea
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  placeholder="What does this prompt do? (e.g. Generate a blog post, acting as a UNIX terminal...)"
                  className="w-full bg-surface-container/30 border border-outline-variant p-4 rounded-xl text-on-background focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors resize-none mb-4 text-sm font-medium"
                  rows={4}
                />
              </div>
              
              <div className="w-full border-t border-outline-variant/50 pt-6">
                <div className="w-full flex items-center justify-center gap-4 mb-4">
                  <input 
                    type="text" 
                    placeholder="Optional: Paste Image URL..." 
                    value={imageUrl.startsWith('data:') ? '' : imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="flex-1 text-center bg-transparent border-b border-outline p-2 text-sm text-on-background focus:border-primary focus:outline-none transition-colors"
                  />
                  <span className="text-outline text-sm font-medium">OR</span>
                  <label className="cursor-pointer bg-surface-container hover:bg-outline-variant px-4 py-2 rounded-full text-sm font-medium transition-colors text-on-background border border-outline-variant">
                    Upload Image
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
                {imageUrl && (
                  <img src={imageUrl} alt="Preview" className="max-h-[30vh] object-contain rounded-lg mx-auto mt-4" />
                )}
              </div>
            </div>
          )}
        </section>

        <section className="p-8 lg:p-16 flex flex-col gap-12 lg:min-h-[calc(100vh-4rem)] pb-32">
          <div className="flex flex-col gap-4">
            <textarea 
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="w-full resize-none bg-transparent border-none focus:ring-0 text-xl lg:text-2xl font-display text-on-background placeholder:text-outline typewriter-input p-0 focus:outline-none" 
              placeholder="Enter your exact generative prompt here..." 
              rows={6}
            />
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-sm text-outline uppercase tracking-wider border-b border-outline-variant pb-2">Category</h3>
            <div className="flex flex-wrap gap-2">
              {['Image', 'Video', 'Chat'].map(opt => (
                <button 
                  key={opt}
                  onClick={() => setClassification(opt)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${classification === opt ? 'bg-primary text-white shadow-sm' : 'bg-surface-container text-on-background hover:bg-outline-variant'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-sm text-outline uppercase tracking-wider border-b border-outline-variant pb-2">Tags</h3>
            <div className="flex flex-col gap-2">
              <input 
                type="text" 
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onKeyDown={addTag}
                placeholder="Type a tag and press Enter..." 
                className="w-full bg-transparent border-0 border-b border-outline px-0 py-2 text-on-background focus:border-b-2 focus:border-primary focus:ring-0 transition-all text-sm"
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 bg-surface-container text-on-background px-3 py-1 rounded-full text-xs font-medium border border-outline-variant">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="text-outline hover:text-primary material-symbols-outlined text-[14px]">close</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {classification !== 'Chat' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-outline-variant pb-2">
                <h3 className="font-semibold text-sm text-outline uppercase tracking-wider">Generation DNA</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-1 gap-8 mt-4">
                <div className="flex flex-col relative group">
                  <label className="text-xs font-medium uppercase tracking-wider text-outline mb-1 absolute -top-5 left-0 transition-all group-focus-within:text-primary">Model Version</label>
                  <input list="models" value={model} onChange={e => setModel(e.target.value)} className="w-full bg-transparent border-0 border-b border-outline px-0 py-2 text-on-background focus:border-b-2 focus:border-primary focus:ring-0 transition-all text-sm" placeholder="Search or specify..." />
                  <datalist id="models">
                    {classification === 'Image' ? (
                      <>
                        <option value="Midjourney v6.0" />
                        <option value="Midjourney Niji" />
                        <option value="DALL-E 3" />
                        <option value="Stable Diffusion 3" />
                        <option value="Stable Diffusion XL" />
                        <option value="Flux 1.1 Pro" />
                      </>
                    ) : classification === 'Video' ? (
                      <>
                        <option value="Runway Gen-3 Alpha" />
                        <option value="Luma Dream Machine" />
                        <option value="Sora" />
                        <option value="Kling" />
                        <option value="Haiper" />
                      </>
                    ) : null}
                  </datalist>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <div className="fixed bottom-8 right-8 z-50">
        <button 
          onClick={submitPrompt}
          disabled={loading || !promptText || (classification !== 'Chat' && !imageUrl)}
          className="w-60 h-14 rounded-full bg-primary text-white flex items-center justify-between px-6 cursor-pointer hover:bg-primary-hover shadow-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-sm font-semibold tracking-wide">Publish</span>
          <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
