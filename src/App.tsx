/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Youtube, 
  Search, 
  Download, 
  Copy, 
  ExternalLink, 
  Sparkles, 
  AlertCircle,
  Check,
  ChevronRight,
  Monitor,
  Smartphone,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface ThumbnailOption {
  key: string;
  label: string;
  resolution: string;
  url: string;
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

interface VideoMetadata {
  title: string;
  author: string;
  thumbnailUrl: string;
}

export default function App() {
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // AI Suggestions State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const extractVideoId = (input: string) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = input.match(regExp);
    if (match && match[7].length === 11) {
      return match[7];
    }
    
    // Check for Shorts
    const shortsRegExp = /\/shorts\/([a-zA-Z0-9_-]{11})/;
    const shortsMatch = input.match(shortsRegExp);
    if (shortsMatch) {
      return shortsMatch[1];
    }

    return null;
  };

  const fetchVideoInfo = async (id: string) => {
    try {
      // Use oEmbed to get title and author
      const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`);
      const data = await response.json();
      if (data.title) {
        setVideoInfo({
          title: data.title,
          author: data.author_name,
          thumbnailUrl: data.thumbnail_url
        });
        generateAiSuggestions(data.title);
      } else {
        setVideoInfo(null);
      }
    } catch (err) {
      console.error("Failed to fetch oEmbed data", err);
      setVideoInfo(null);
    }
  };

  const generateAiSuggestions = async (title: string) => {
    setAiLoading(true);
    try {
      const prompt = `Based on the YouTube video title "${title}", suggest 3 high-CTR title alternatives and 2 descriptive keywords that would make a thumbnail pop. Keep suggestions concise. Format: JSON array of strings.`;
      
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      const text = response.text || '';
      // Simple extraction of JSON array from text
      const match = text.match(/\[.*\]/s);
      if (match) {
        setAiSuggestions(JSON.parse(match[0]));
      }
    } catch (err) {
      console.error("AI Generation failed", err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleExtract = () => {
    setError(null);
    const id = extractVideoId(url);
    if (id) {
      setVideoId(id);
      fetchVideoInfo(id);
    } else {
      setError('Please enter a valid YouTube video URL');
      setVideoId(null);
      setVideoInfo(null);
    }
  };

  const getThumbnails = (id: string): ThumbnailOption[] => [
    { key: 'maxres', label: 'Ultra HD', resolution: '1280 x 720', url: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`, size: 'xl' },
    { key: 'sd', label: 'Standard HD', resolution: '640 x 480', url: `https://img.youtube.com/vi/${id}/sddefault.jpg`, size: 'lg' },
    { key: 'hq', label: 'High Quality', resolution: '480 x 360', url: `https://img.youtube.com/vi/${id}/hqdefault.jpg`, size: 'md' },
    { key: 'mq', label: 'Medium Quality', resolution: '320 x 180', url: `https://img.youtube.com/vi/${id}/mqdefault.jpg`, size: 'sm' },
    { key: 'default', label: 'Small', resolution: '120 x 90', url: `https://img.youtube.com/vi/${id}/default.jpg`, size: 'xs' },
  ];

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadImage = async (imageUrl: string, fileName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // If CORS blocks, just open in new tab
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans selection:bg-red-900 selection:text-white overflow-x-hidden">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-red-900/30 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-stone-800/30 blur-[120px] rounded-full" />
      </div>

      <div className="relative flex flex-col min-h-screen">
        {/* Header */}
        <header className="flex items-center justify-between px-6 md:px-10 py-6 border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-600/20">
              <Youtube className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">TubeSnap<span className="text-red-600">.</span></span>
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-400">
            <a href="#" className="text-white border-b-2 border-red-600 pb-1">Extractor</a>
            <a href="#" className="hover:text-white transition-colors">History</a>
            <a href="#" className="hover:text-white transition-colors">API</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
          </nav>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold hidden sm:inline">Live Status</span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-12 md:py-20 flex flex-col gap-12">
          {/* Hero/Input Area */}
          <div className="w-full max-w-3xl mx-auto text-center space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-tight">
                Thumbnail <span className="text-red-600">Generator</span>
              </h1>
              <p className="text-gray-400 text-lg md:text-xl">
                Instant, high-resolution extraction for any YouTube video.
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-red-600 blur-2xl opacity-0 group-focus-within:opacity-10 transition-opacity rounded-2xl" />
              <div className="relative flex items-center bg-[#141414] border border-white/10 focus-within:border-red-600/50 transition-all rounded-2xl p-2 shadow-2xl overflow-hidden">
                <div className="pl-4 text-gray-500">
                  <Youtube className="w-6 h-6" />
                </div>
                <input 
                  type="text" 
                  placeholder="Paste YouTube video URL here..."
                  className="flex-1 px-4 py-4 bg-transparent outline-none text-white text-lg placeholder:text-gray-600"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
                />
                <button 
                  onClick={handleExtract}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  <span className="hidden sm:inline">Generate</span>
                </button>
              </div>
            </motion.div>
            
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-center gap-2 text-red-500 bg-red-500/5 p-4 rounded-xl border border-red-500/20"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-semibold">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Results Display */}
          <AnimatePresence mode="wait">
            {videoId ? (
              <motion.div 
                key={videoId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                {/* Video Info Card */}
                {videoInfo && (
                  <div className="bg-[#141414] border border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row gap-8 items-center">
                    <div className="w-full md:w-80 aspect-video bg-black rounded-2xl overflow-hidden border border-white/5 relative group">
                      <img 
                        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} 
                        alt="Preview" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Youtube className="w-12 h-12 text-red-600 fill-white" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-6">
                      <div className="space-y-2">
                        <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight line-clamp-2">{videoInfo.title}</h2>
                        <p className="text-gray-400 font-medium text-lg">{videoInfo.author}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 text-xs bg-white/5 px-4 py-2 rounded-full border border-white/5 text-gray-400 font-mono">
                          <Info className="w-3.5 h-3.5" />
                          <span>ID: {videoId}</span>
                        </div>
                        <a 
                          href={`https://youtube.com/watch?v=${videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-red-500 hover:text-red-400 transition-colors font-bold uppercase tracking-wider"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Original Link</span>
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Suggestions Box */}
                {(aiLoading || aiSuggestions.length > 0) && (
                  <div className="bg-[#141414] border border-white/5 rounded-3xl p-8 relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                      <Sparkles className="w-32 h-32 text-red-600" />
                    </div>
                    
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-red-600/10 rounded-lg">
                        <Sparkles className="w-5 h-5 text-red-600 fill-red-600" />
                      </div>
                      <h3 className="text-xl font-bold text-white tracking-tight">AI Optimization Insights</h3>
                    </div>
                    
                    {aiLoading ? (
                      <div className="flex items-center gap-4 text-gray-500 py-4">
                        <div className="flex gap-1.5">
                          {[0, 1, 2].map(i => (
                            <div key={i} className="w-2 h-2 rounded-full bg-red-600 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                          ))}
                        </div>
                        <span className="text-sm font-medium tracking-wide uppercase italic">Generating viral suggestions...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {aiSuggestions.map((suggestion, idx) => (
                          <div key={idx} className="group relative bg-black/40 p-5 rounded-2xl border border-white/5 hover:border-red-600/30 transition-all hover:bg-black/60 shadow-inner">
                            <p className="text-sm text-gray-300 leading-relaxed italic">{suggestion}</p>
                            <button 
                              onClick={() => copyToClipboard(suggestion, `ai-${idx}`)}
                              className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:text-white transition-colors"
                            >
                              {copiedKey === `ai-${idx}` ? (
                                <><Check className="w-3.5 h-3.5 text-green-500" /> Copied</>
                              ) : (
                                <><Copy className="w-3.5 h-3.5" /> Copy Ideal Title</>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Thumbnail Result Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {getThumbnails(videoId).map((thumb) => (
                    <motion.div 
                      key={thumb.key}
                      layoutId={thumb.key}
                      className="bg-[#141414] border border-white/5 rounded-3xl overflow-hidden p-3 flex flex-col gap-4 shadow-xl hover:shadow-red-600/5 transition-all group"
                    >
                      <div className="relative aspect-video rounded-2xl overflow-hidden bg-black">
                        <img 
                          src={thumb.url} 
                          alt={thumb.label}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
                          {thumb.label}
                        </div>
                        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                             onClick={() => copyToClipboard(thumb.url, thumb.key)}
                             className="p-2 bg-white text-black rounded-lg shadow-xl"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="px-2 pb-2 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-gray-100">{thumb.resolution}</h4>
                          <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">{thumb.key}</p>
                        </div>
                        
                        <button 
                          onClick={() => downloadImage(thumb.url, `yt-thumb-${videoId}-${thumb.key}.jpg`)}
                          className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 active:scale-95 group/dl"
                        >
                          <Download className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 md:py-32 space-y-8"
              >
                <div className="relative flex justify-center">
                  <div className="absolute inset-0 bg-red-600/10 blur-3xl rounded-full" />
                  <div className="relative w-32 h-32 rounded-3xl bg-[#141414] border border-white/5 flex items-center justify-center text-gray-700 shadow-2xl">
                    <Youtube className="w-16 h-16 opacity-20" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-3xl font-bold text-white/40 tracking-tight">Ready for extraction</h3>
                  <p className="text-gray-600 max-w-sm mx-auto text-lg">Enter a YouTube link above to access maximum HD thumbnails and AI insights.</p>
                </div>
                
                <div className="flex flex-wrap justify-center gap-10 pt-8">
                  {[
                    { icon: Monitor, text: "Ultra 4K HD" },
                    { icon: Smartphone, text: "Shorts Ready" },
                    { icon: Sparkles, text: "AI Optimized" }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-gray-700">
                      <item.icon className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-widest">{item.text}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="px-6 md:px-10 py-8 border-t border-white/5 bg-[#0d0d0d] flex flex-col md:flex-row items-center justify-between gap-6 text-[11px] font-medium text-gray-500 uppercase tracking-widest">
          <div className="flex gap-8">
            <a href="#" className="hover:text-red-500 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-red-500 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-red-500 transition-colors">Open Source</a>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
              <span>Operational Status</span>
            </div>
            <span className="text-gray-800 hidden md:inline">|</span>
            <span className="text-gray-600">v2.4.0-stable</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
