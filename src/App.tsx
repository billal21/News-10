import { useState, useEffect } from 'react';
import { 
  Globe, 
  Flag, 
  FileText, 
  Facebook, 
  ExternalLink, 
  RefreshCw, 
  Copy, 
  Check,
  ChevronRight,
  TrendingUp,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { INTERNATIONAL_FEEDS, BANGLA_FEEDS } from './constants';
import { NewsItem, GeneratedNews, TabType } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('international');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<GeneratedNews | null>(null);
  const [selectedSourceUrl, setSelectedSourceUrl] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState(false);

  // Fetch news when tab changes between international and national
  useEffect(() => {
    if (activeTab === 'international' || activeTab === 'national') {
      fetchNews();
    }
  }, [activeTab]);

  const fetchNews = async () => {
    setLoading(true);
    setNews([]); // Clear old news
    setApiKeyError(false); // Reset error state on fetch
    const feeds = activeTab === 'international' ? INTERNATIONAL_FEEDS : BANGLA_FEEDS;
    
    try {
      const promises = feeds.map(async (feed) => {
        try {
          const res = await fetch(`/api/rss?url=${encodeURIComponent(feed.url)}`);
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.details || `Status ${res.status}`);
          }
          const data = await res.json();
          return (data.items || []).map((item: any) => ({
            ...item,
            sourceName: feed.name
          }));
        } catch (e) {
          console.error(`Failed to fetch ${feed.name}:`, e);
          return [];
        }
      });

      const results = await Promise.all(promises);
      let allNews: NewsItem[] = results.flat().sort((a, b) => {
        return new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime();
      });

      if (allNews.length === 0) {
        // If everything failed, try a fallback feed just to show something
        // (Optional: can add another source here)
      }

      // Limit to top 20
      allNews = allNews.slice(0, 20);
      
      setNews(allNews);
      setLoading(false);

      // Trigger automatic translation for international news in background
      if (activeTab === 'international' && allNews.length > 0) {
        setTranslating(true);
        setApiKeyError(false);
        const titlesToTranslate = allNews.map(n => n.title);
        try {
          const transRes = await fetch('/api/translate-list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titles: titlesToTranslate })
          });
          const data = await transRes.json();
          if (transRes.ok) {
            if (Array.isArray(data)) {
              setNews(prevNews => prevNews.map((item, index) => ({
                ...item,
                title: data[index] || item.title
              })));
            }
          } else {
             if (data.error && (data.error.includes('API Key') || data.error.includes('INVALID_ARGUMENT') || data.error.includes('API_KEY_INVALID') || data.error.includes('400'))) {
               setApiKeyError(true);
             }
          }
        } catch (e) {
          console.error('Auto-translation failed', e);
        } finally {
          setTranslating(false);
        }
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
      setLoading(false);
    }
  };

  const generateAIContent = async (item: NewsItem) => {
    if (!item.link && !item.title) return;
    
    // Switch tab first if not already there
    if (activeTab !== 'web-post') {
      setActiveTab('web-post');
    }
    
    setGenerating(true);
    setGeneratedResult(null);
    setSelectedSourceUrl(item.link);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sourceUrl: item.link, 
          sourceTitle: item.title,
          sourceMedia: item.sourceName || "International Media",
          sourceText: (item.title || "") + " " + (item.contentSnippet || "") 
        })
      });
      
      if (!res.ok) {
        let errorMessage = 'Unknown error';
        try {
          const errorData = await res.json();
          errorMessage = errorData.details || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = await res.text() || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      setGeneratedResult(data);
    } catch (error) {
      console.error('Generation error:', error);
      alert(`নিউজ জেনারেট করতে সমস্যা হয়েছে: ${error instanceof Error ? error.message : 'আবার চেষ্টা করুন'}`);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-['Hind_Siliguri',sans-serif] text-slate-900 pb-24">
      {/* Header */}
      <header className="bg-slate-900 text-white p-4 shadow-xl sticky top-0 z-50 border-b-2 border-red-600">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-1.5 rounded-lg shadow-lg group">
              <TrendingUp className="text-white w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter italic text-white flex items-center gap-1">
                CN<span className="text-red-600">10</span>
              </h1>
              <p className="text-[8px] uppercase tracking-[0.2em] opacity-70 font-black text-red-100">GLOBAL NEWS NETWORK</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => alert("CN10 টিউটোরিয়াল:\n১. নিউজ দেখতে Navigation ব্যবহার করুন।\n২. 'ইউনিক নিউজ' বাটনে ক্লিক করে আর্টিকেল তৈরি করুন।\n৩. সোশ্যাল মিডিয়া পোস্ট কপি করে শেয়ার করুন।\n৪. আরও ফিচারের জন্য My_Key Secrets যোগ করুন।")}
              className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider border border-white/10"
            >
              নির্দেশনা
            </button>
            {(activeTab === 'international' || activeTab === 'national') && (
              <button 
                onClick={fetchNews}
                disabled={loading}
                className="p-2 hover:bg-red-600 rounded-lg transition-all border border-white/20"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {apiKeyError && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mb-6 bg-amber-50 border-2 border-amber-200 p-5 rounded-2xl flex items-start gap-4 shadow-sm"
          >
            <div className="bg-amber-100 p-3 rounded-xl text-amber-600 shadow-inner">
              <Globe className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-900 text-lg mb-1">এপিআই কি (API Key) ছাড়াই কাজ করছে!</h3>
              <p className="text-sm text-amber-700 leading-relaxed">
                আপনার জেমিনি এপিআই কি কাজ না করায় অটোমেটিক "সাধারণ অনুবাদক" চালু হয়েছে। স্মার্ট নিউজ বা ইউনিক জেনারেট করতে চাইলে Secrets ট্যাবে My_Key নামে কি-টি ঠিকভাবে যোগ করুন। তবে না করলেও আপনি নিউজ পড়তে এবং অনুবাদ দেখতে পারবেন।
              </p>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'international' || activeTab === 'national' ? (
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  {activeTab === 'international' ? (
                    <><Globe className="text-blue-600 w-5 h-5" /> আন্তর্জাতিক সংবাদ</>
                  ) : (
                    <><Flag className="text-emerald-600 w-5 h-5" /> বাংলাদেশি সংবাদ</>
                  )}
                </h2>
                <span className="text-xs bg-slate-200 px-2 py-1 rounded-full font-medium text-slate-600">
                  {news.length} টি সংবাদ পাওয়া গেছে
                  {translating && " (অনুবাদ হচ্ছে...)"}
                </span>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
                  <p className="text-slate-500 font-medium">সংবাদ লোড হচ্ছে...</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {news.map((item, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 -rotate-45 translate-x-12 -translate-y-12 pointer-events-none group-hover:bg-red-600/10 transition-colors"></div>
                      <div className="flex justify-between items-start mb-2 relative z-10">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded shadow-sm uppercase tracking-tighter w-fit">
                            {item.sourceName} Verified
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                            Auth Code: CN10-{(idx + 100).toString(16).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-full border">
                          <Clock className="w-3 h-3 mr-1" />
                          {item.pubDate ? new Date(item.pubDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                        </div>
                      </div>
                      <h3 className="font-extrabold text-slate-900 leading-snug mb-2 group-hover:text-red-600 transition-colors text-lg">
                        {item.title}
                      </h3>
                      {item.contentSnippet && (
                        <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                          {item.contentSnippet}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <a 
                          href={item.link} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 text-slate-600 py-2 rounded-lg text-xs font-bold hover:bg-slate-100 border border-slate-200 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> মূল নিউজ
                        </a>
                        <button 
                          onClick={() => generateAIContent(item)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm transition-all active:scale-95"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> ইউনিক নিউজ তৈরি
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : activeTab === 'web-post' ? (
            <motion.div 
              key="web-post"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="text-purple-600 w-6 h-6" />
                  <h2 className="text-xl font-bold text-slate-800">ওয়েবসাইট বিস্তারিত নিউজ</h2>
                </div>
                {generating && (
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-600"></span>
                  </span>
                )}
              </div>

              {/* Manual Input Fallback */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">ম্যানুয়ালি নিউজ লিঙ্ক বা টেক্সট দিন (ঐচ্ছিক)</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="নিউজ লিঙ্ক বা মূল তথ্য এখানে পেস্ট করুন..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    value={selectedSourceUrl || ''}
                    onChange={(e) => {
                      setSelectedSourceUrl(e.target.value);
                      if (generatedResult) setGeneratedResult(null);
                    }}
                  />
                  <button 
                    onClick={() => generateAIContent({ link: selectedSourceUrl || '', title: '' })}
                    disabled={generating || !selectedSourceUrl}
                    className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    তৈরি করুন
                  </button>
                </div>
              </div>

              {generating ? (
                <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-lg text-center flex flex-col items-center gap-6">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
                    <RefreshCw className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-600 w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1">জেমিনি এআই নিউজ লিখছে...</h3>
                    <p className="text-sm text-slate-400">এটি সম্পূর্ণ ইউনিক এবং কপিরাইট মুক্ত হবে।</p>
                  </div>
                </div>
              ) : generatedResult ? (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
                    <div className="bg-slate-50 p-3 border-b flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">মূল নিউজের লিঙ্ক (Source Link)</span>
                      <button 
                        onClick={() => copyToClipboard(selectedSourceUrl || '', 'source_link')}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                          copiedField === 'source_link' ? 'bg-green-100 text-green-700' : 'bg-white text-slate-600 hover:bg-slate-100 border'
                        }`}
                      >
                        {copiedField === 'source_link' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedField === 'source_link' ? 'কপি হয়েছে' : 'লিঙ্ক কপি করুন'}
                      </button>
                    </div>
                    <div className="p-4 flex items-center gap-2 overflow-hidden bg-slate-50/50">
                      <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-500 truncate font-medium">
                        {selectedSourceUrl}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 p-3 border-b flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">শিরোনাম (Headline)</span>
                      <button 
                        onClick={() => copyToClipboard(generatedResult.webTitle, 'title')}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                          copiedField === 'title' ? 'bg-green-100 text-green-700' : 'bg-white text-slate-600 hover:bg-slate-100 border'
                        }`}
                      >
                        {copiedField === 'title' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedField === 'title' ? 'কপি হয়েছে' : 'কপি করুন'}
                      </button>
                    </div>
                    <div className="p-4">
                      <h1 className="text-2xl font-black text-slate-900 leading-tight">
                        {generatedResult.webTitle}
                      </h1>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 p-3 border-b flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">বিস্তারিত নিউজ (Full Article)</span>
                      <button 
                        onClick={() => copyToClipboard(generatedResult.webFullArticle, 'article')}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                          copiedField === 'article' ? 'bg-green-100 text-green-700' : 'bg-white text-slate-600 hover:bg-slate-100 border'
                        }`}
                      >
                        {copiedField === 'article' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedField === 'article' ? 'কপি হয়েছে' : 'সব কপি করুন'}
                      </button>
                    </div>
                    <div className="p-6 whitespace-pre-wrap text-slate-700 leading-relaxed text-lg font-medium selection:bg-purple-100">
                      {generatedResult.webFullArticle}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                  <p className="text-slate-400">কোন নিউজ সিলেক্ট করা হয়নি। ট্যাব ১ বা ২ থেকে একটি নিউজ সিলেক্ট করুন।</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="fb-post"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 mb-2">
                <Facebook className="text-blue-600 w-6 h-6" />
                <h2 className="text-xl font-bold text-slate-800">ফেসবুক স্মার্ট পোস্ট</h2>
              </div>

              {generating ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
                  <p className="text-slate-500">জেমিনি এআই পোস্ট ফরম্যাট করছে...</p>
                </div>
              ) : generatedResult ? (
                <div className="space-y-6">
                  {/* FB Caption Card */}
                  <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden border-l-4 border-l-blue-600">
                    <div className="bg-blue-50 p-3 border-b flex justify-between items-center">
                      <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">FB CAPTION (পোস্টের ক্যাপশন)</span>
                      <button 
                        onClick={() => copyToClipboard(generatedResult.fbCaption, 'fbCap')}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                          copiedField === 'fbCap' ? 'bg-green-100 text-green-700' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-100'
                        }`}
                      >
                        {copiedField === 'fbCap' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        কপি করুন
                      </button>
                    </div>
                    <div className="p-5">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 italic text-slate-700 text-lg font-medium">
                        "{generatedResult.fbCaption}"
                      </div>
                    </div>
                  </div>

                  {/* FB Comment Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden border-l-4 border-l-slate-400">
                    <div className="bg-slate-50 p-3 border-b flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">FIRST COMMENT (কমেন্টে বিস্তারিত)</span>
                      <button 
                        onClick={() => copyToClipboard(generatedResult.fbCommentDetail, 'fbCom')}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                          copiedField === 'fbCom' ? 'bg-green-100 text-green-700' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {copiedField === 'fbCom' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        সব কপি করুন
                      </button>
                    </div>
                    <div className="p-5">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {generatedResult.fbCommentDetail}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                  <p className="text-slate-400">আগে নিউজ জেনারেট করুন।</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 pb-safe z-50">
        <div className="max-w-4xl mx-auto flex justify-around p-2 gap-1">
          <NavItem 
            id="international" 
            activeId={activeTab} 
            onClick={setActiveTab} 
            icon={<Globe />} 
            label="আন্তর্জাতিক" 
          />
          <NavItem 
            id="national" 
            activeId={activeTab} 
            onClick={setActiveTab} 
            icon={<Flag />} 
            label="বাংলাদেশ" 
          />
          <NavItem 
            id="web-post" 
            activeId={activeTab} 
            onClick={setActiveTab} 
            icon={<FileText />} 
            label="ওয়েব পোস্ট" 
            badge={generating}
          />
          <NavItem 
            id="fb-post" 
            activeId={activeTab} 
            onClick={setActiveTab} 
            icon={<Facebook />} 
            label="ফেসবুক" 
          />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ id, activeId, onClick, icon, label, badge = false }: any) {
  const isActive = activeId === id;
  const colors: Record<TabType, string> = {
    'international': 'text-blue-600',
    'national': 'text-emerald-600',
    'web-post': 'text-purple-600',
    'fb-post': 'text-blue-600'
  };

  return (
    <button 
      onClick={() => onClick(id)}
      className={`flex-1 flex flex-col items-center py-2 px-1 rounded-xl transition-all relative ${
        isActive ? `${colors[id as TabType]} bg-slate-50` : 'text-slate-400 hover:bg-slate-50'
      }`}
    >
      {badge && (
        <span className="absolute top-2 right-1/2 translate-x-4 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
        </span>
      )}
      <div className={`${isActive ? 'scale-110' : 'scale-100'} transition-transform duration-300`}>
        {icon}
      </div>
      <span className={`text-[10px] mt-1 font-bold ${isActive ? 'opacity-100' : 'opacity-80'}`}>
        {label}
      </span>
    </button>
  );
}
