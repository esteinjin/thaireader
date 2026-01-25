import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getCourse } from '../lib/api';
import axios from 'axios';
import clsx from 'clsx';
import { Play, Pause, SkipBack, SkipForward, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CoursePlayer() {
    const { id } = useParams();
    const [course, setCourse] = useState(null);
    const [content, setContent] = useState(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);

    // New state for word review
    const [learnedWords, setLearnedWords] = useState([]);
    const [showSummary, setShowSummary] = useState(false);
    const [isReviewPlaying, setIsReviewPlaying] = useState(false);

    useEffect(() => {
        getCourse(id).then(async (data) => {
            setCourse(data);
            const jsonUrl = data.jsonUrl.startsWith('http') ? data.jsonUrl : `http://localhost:3001${data.jsonUrl}`;
            const res = await axios.get(jsonUrl);
            setContent(res.data);
        });
    }, [id]);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        const current = audioRef.current.currentTime;
        setCurrentTime(current);
    };

    const jumpTo = (time) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            audioRef.current.play();
            setIsPlaying(true);
            setShowSummary(false); // Hide summary if user scrubs back
        }
    };

    const wordAudioCache = useRef({});

    const playWord = async (word) => {
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
            // Sync player position to the clicked word to highlight it
            audioRef.current.currentTime = word.startTime;
            setCurrentTime(word.startTime);
        }

        // Add to learned words if not already present
        setLearnedWords(prev => {
            if (prev.find(w => w.thai === word.thai)) return prev;
            return [...prev, word];
        });

        // Use pre-generated audioUrl from OSS/Server
        if (word.audioUrl) {
            let url = word.audioUrl;
            // Handle local relative paths if any
            if (!url.startsWith('http')) {
                url = `http://localhost:3001${url}`;
            }
            new Audio(url).play();
        } else {
            console.warn('No audio URL found for word:', word.thai);
        }
    };

    const playReview = async () => {
        setIsReviewPlaying(true);
        for (const word of learnedWords) {
            let audioUrl = word.audioUrl;
            if (audioUrl && !audioUrl.startsWith('http')) {
                audioUrl = `http://localhost:3001${audioUrl}`;
            }

            if (audioUrl) {
                await new Promise(resolve => {
                    const audio = new Audio(audioUrl);
                    audio.onended = resolve;
                    audio.onerror = resolve; // Continue even if error
                    audio.play().catch(e => {
                        console.error("Audio play failed", e);
                        resolve();
                    });
                });
                // Small pause between words
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        setIsReviewPlaying(false);
    };

    if (!course || !content) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-slate-400 text-sm">加载中...</span>
            </div>
        </div>
    );

    const coverUrl = course.coverUrl.startsWith('http') ? course.coverUrl : `http://localhost:3001${course.coverUrl}`;
    const audioUrl = course.audioUrl.startsWith('http') ? course.audioUrl : `http://localhost:3001${course.audioUrl}`;

    let activeIndex = content.sentences.findIndex(s => currentTime >= s.startTime && currentTime <= s.endTime);
    if (activeIndex === -1) {
        activeIndex = content.sentences.findIndex(s => s.startTime > currentTime);
        if (activeIndex === -1 && content.sentences.length > 0) activeIndex = content.sentences.length - 1;
        if (activeIndex === -1) activeIndex = 0;
    }
    const currentSentence = content.sentences[activeIndex] || content.sentences[0];

    return (
        <div className="fixed inset-0 bg-slate-950 text-white font-sans overflow-hidden">
            {/* Background Layer */}
            <div className="absolute inset-0 z-0">
                <div
                    className="absolute inset-0 opacity-100 blur-[2px] scale-105 transition-all duration-1000"
                    style={{ backgroundImage: `url(${coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                />
                {/* Premium Gradient Overlay: Lighter at top to show image, darker at bottom for text readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-slate-900/80 to-slate-950" />
            </div>

            {/* Main Container */}
            <div className="relative z-10 h-full flex flex-col px-4 pb-0 pt-2 max-w-md mx-auto">

                {/* Top Bar */}
                <div className="flex-none flex items-center justify-between mb-2">
                    <Link to="/" className="p-2 -ml-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                        <ChevronLeft size={24} />
                    </Link>
                    <div className="text-xs font-medium tracking-widest text-white/50 uppercase truncate max-w-[200px]">
                        {course.title}
                    </div>
                    <div className="w-8" /> {/* Spacer */}
                </div>

                {/* Content Area - Flexible Space */}
                <div className="flex-1 flex flex-col min-h-0 gap-2 relative">

                    {/* Summary Overlay */}
                    {showSummary ? (
                        <div className="absolute inset-0 z-20 flex flex-col animate-fade-in bg-slate-950/80 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                            <h2 className="text-2xl font-bold text-white mb-2">🎉 课程完成</h2>
                            <p className="text-slate-400 text-sm mb-6">您在本节课中重点学习了 {learnedWords.length} 个单词</p>

                            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 mb-6">
                                {learnedWords.length > 0 ? (
                                    learnedWords.map((word, idx) => (
                                        <div key={idx} className="bg-white/5 p-3 rounded-xl flex items-center justify-between border border-white/5">
                                            <div>
                                                <div className="text-lg font-bold text-white">{word.thai}</div>
                                                <div className="text-sm font-semibold text-blue-300/80" style={{ fontFamily: '"Kanit", sans-serif' }}>{word.thai}</div>
                                            </div>
                                            <div className="text-sm text-slate-400">{word.chinese}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-slate-500 py-10">
                                        本节课没有单独点击学习的单词
                                    </div>
                                )}
                            </div>

                            {learnedWords.length > 0 && (
                                <button
                                    onClick={playReview}
                                    disabled={isReviewPlaying}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {isReviewPlaying ? <Pause size={20} /> : <Play size={20} />}
                                    {isReviewPlaying ? '正在回放...' : '快速回放生词'}
                                </button>
                            )}

                            <button
                                onClick={() => { setShowSummary(false); jumpTo(0); }}
                                className="mt-3 w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors"
                            >
                                重新开始课程
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Sentence Display (Top Half - Compact) */}
                            <div className="flex-none flex flex-col justify-start text-left space-y-2 pt-1 pb-2">
                                <h1 className="text-2xl font-bold leading-snug text-white drop-shadow-md transition-all duration-300 line-clamp-3">
                                    {currentSentence.thai}
                                </h1>
                                <p className="text-base text-white/80 font-light leading-relaxed line-clamp-2">
                                    {currentSentence.chinese}
                                </p>
                            </div>

                            {/* Word Cards (Bottom Half - Scrollable - Maximized Space) */}
                            <div className="flex-1 min-h-0 relative">
                                <div className="absolute inset-0 overflow-y-auto no-scrollbar pb-24 mask-image-gradient-vertical">
                                    <div className="flex flex-wrap content-start gap-2">
                                        {currentSentence.words.map((word, idx) => {
                                            const isActive = currentTime >= word.startTime && currentTime < word.endTime;
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => playWord(word)}
                                                    className={clsx(
                                                        "flex flex-col items-center px-3 py-2 rounded-lg transition-all duration-200 border",
                                                        isActive
                                                            ? "bg-blue-500 text-white border-blue-400 shadow-md shadow-blue-500/30 scale-105"
                                                            : "bg-white/5 text-slate-300 border-white/5 hover:bg-white/10"
                                                    )}
                                                >
                                                    {/* Standard Font */}
                                                    <span className="text-base font-bold mb-0.5">{word.thai}</span>

                                                    {/* Commercial/Ad Font (Kanit) */}
                                                    <span className="text-sm font-semibold mb-1 text-blue-300/90" style={{ fontFamily: '"Kanit", sans-serif' }}>
                                                        {word.thai}
                                                    </span>

                                                    <span className={clsx("text-[10px]", isActive ? "text-blue-100" : "text-slate-400")}>
                                                        {word.chinese}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Player Controls (Fixed Bottom - Ultra Compact) */}
                <div className="flex-none pt-3 border-t border-white/5 bg-black/40 backdrop-blur-md -mx-4 px-4 pb-6 rounded-t-2xl z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                    {/* Progress */}
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] text-white/50 font-mono w-8 text-right">
                            {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}
                        </span>
                        <div className="relative flex-1 h-1 bg-white/10 rounded-full group cursor-pointer">
                            <div
                                className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
                                style={{ width: `${(currentTime / (audioRef.current?.duration || 100)) * 100}%` }}
                            />
                            <input
                                type="range"
                                min="0"
                                max={audioRef.current?.duration || 100}
                                value={currentTime}
                                onChange={(e) => jumpTo(Number(e.target.value))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                        <span className="text-[10px] text-white/50 font-mono w-8">
                            {audioRef.current?.duration ? `${Math.floor(audioRef.current.duration / 60)}:${Math.floor(audioRef.current.duration % 60).toString().padStart(2, '0')}` : '--:--'}
                        </span>
                    </div>

                    {/* Buttons - Smaller & Compact */}
                    <div className="flex justify-center items-center gap-8">
                        <button onClick={() => jumpTo(Math.max(0, currentTime - 5))} className="p-2 text-white/60 hover:text-white transition-colors active:scale-95">
                            <SkipBack size={18} strokeWidth={2} />
                        </button>

                        <button
                            onClick={togglePlay}
                            className="w-10 h-10 bg-white text-slate-950 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10"
                        >
                            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                        </button>

                        <button onClick={() => jumpTo(currentTime + 5)} className="p-2 text-white/60 hover:text-white transition-colors active:scale-95">
                            <SkipForward size={18} strokeWidth={2} />
                        </button>
                    </div>
                </div>
            </div>

            <audio
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => {
                    setIsPlaying(false);
                    setShowSummary(true);
                }}
            />
        </div>
    );
}
