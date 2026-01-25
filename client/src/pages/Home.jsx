import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCourses } from '../lib/api';
import { Play, BookOpen } from 'lucide-react';

export default function Home() {
    const [courses, setCourses] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'novel'
    const [expandedSeries, setExpandedSeries] = useState(null);

    const loadCourses = async (pageNum, tab) => {
        setLoading(true);
        try {
            // For novels, we fetch more to ensure we can group them effectively on client side
            // Ideally this should be handled by a specific backend endpoint
            const limit = tab === 'novel' ? 100 : 9;
            const data = await getCourses(pageNum, limit, tab);

            if (pageNum === 1) {
                setCourses(data.results);
            } else {
                setCourses(prev => [...prev, ...data.results]);
            }
            setHasMore(!!data.next);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setPage(1);
        setCourses([]);
        setHasMore(true);
        loadCourses(1, activeTab);
    }, [activeTab]);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        loadCourses(nextPage, activeTab);
    };

    // Group novels by series
    const novelsBySeries = activeTab === 'novel' ? courses.reduce((acc, course) => {
        const seriesName = course.series || '其他';
        if (!acc[seriesName]) acc[seriesName] = [];
        acc[seriesName].push(course);
        return acc;
    }, {}) : {};

    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-12 font-sans text-slate-100">
            <div className="max-w-6xl mx-auto">
                <header className="mb-12">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                                泰语学习课程
                            </h1>
                            <p className="text-slate-400">精选泰语视频课程，沉浸式跟读体验</p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 border-b border-white/10 pb-1">
                        <button
                            onClick={() => setActiveTab('directory')}
                            className={`pb-3 px-4 text-sm font-bold transition-all relative ${activeTab === 'directory'
                                ? 'text-blue-400'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            泰语名录
                            {activeTab === 'directory' && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400 rounded-t-full" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('novel')}
                            className={`pb-3 px-4 text-sm font-bold transition-all relative ${activeTab === 'novel'
                                ? 'text-purple-400'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            泰语小说
                            {activeTab === 'novel' && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-400 rounded-t-full" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('drama')}
                            className={`pb-3 px-4 text-sm font-bold transition-all relative ${activeTab === 'drama'
                                ? 'text-pink-400'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            泰剧对白
                            {activeTab === 'drama' && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-pink-400 rounded-t-full" />
                            )}
                        </button>
                    </div>
                </header>

                {/* Directory & Drama View */}
                {(activeTab === 'directory' || activeTab === 'drama') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {courses.map(course => (
                            <Link key={course.id} to={`/course/${course.id}`} className="group relative block bg-slate-900 rounded-2xl overflow-hidden ring-1 ring-white/10 hover:ring-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 transform hover:-translate-y-1">
                                <div className="aspect-[4/3] relative overflow-hidden">
                                    <img
                                        src={course.coverUrl.startsWith('http') ? course.coverUrl : `http://localhost:3001${course.coverUrl}`}
                                        alt={course.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />

                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100">
                                        <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center ring-1 ring-white/30 shadow-lg">
                                            <Play className="w-6 h-6 text-white fill-current ml-1" />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5">
                                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-blue-400 transition-colors">{course.title}</h3>
                                    <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed mb-4 h-10">{course.description}</p>

                                    <div className="flex items-center text-xs text-slate-500 font-medium">
                                        <BookOpen size={14} className="mr-1.5" />
                                        <span>开始学习</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Novel View */}
                {activeTab === 'novel' && (
                    <div className="space-y-8">
                        {Object.entries(novelsBySeries).map(([seriesName, seriesCourses]) => (
                            <div key={seriesName} className="bg-slate-900/50 rounded-3xl border border-white/5 overflow-hidden">
                                <div
                                    className="p-6 flex items-center gap-6 cursor-pointer hover:bg-white/5 transition-colors"
                                    onClick={() => setExpandedSeries(expandedSeries === seriesName ? null : seriesName)}
                                >
                                    {/* Series Cover (First course cover) */}
                                    <div className="w-24 h-32 md:w-32 md:h-44 flex-shrink-0 rounded-xl overflow-hidden shadow-lg ring-1 ring-white/10 relative group">
                                        <img
                                            src={seriesCourses[0].coverUrl.startsWith('http') ? seriesCourses[0].coverUrl : `http://localhost:3001${seriesCourses[0].coverUrl}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                    </div>

                                    <div className="flex-1">
                                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{seriesName}</h2>
                                        <p className="text-slate-400 mb-4">{seriesCourses.length} 个章节</p>
                                        <button className="text-sm font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1">
                                            {expandedSeries === seriesName ? '收起章节' : '查看所有章节'}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Episodes */}
                                {expandedSeries === seriesName && (
                                    <div className="border-t border-white/5 bg-slate-900/80 p-6 animate-fade-in">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {seriesCourses.map(course => (
                                                <Link key={course.id} to={`/course/${course.id}`} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                                                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 relative">
                                                        <img
                                                            src={course.coverUrl.startsWith('http') ? course.coverUrl : `http://localhost:3001${course.coverUrl}`}
                                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <Play size={16} className="text-white opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-200 group-hover:text-purple-400 transition-colors line-clamp-1">{course.title}</h4>
                                                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{course.description}</p>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {Object.keys(novelsBySeries).length === 0 && !loading && (
                            <div className="text-center py-20 text-slate-500">
                                <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
                                <p>暂无小说内容</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Load More (Only for Directory/Drama, as Novel fetches all for now) */}
                {(activeTab === 'directory' || activeTab === 'drama') && courses.length > 0 && hasMore && (
                    <div className="mt-12 text-center">
                        <button
                            onClick={handleLoadMore}
                            disabled={loading}
                            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full font-medium transition-colors disabled:opacity-50"
                        >
                            {loading ? '加载中...' : '加载更多课程'}
                        </button>
                    </div>
                )}

                {courses.length === 0 && !loading && (activeTab === 'directory' || activeTab === 'drama') && (
                    <div className="flex flex-col items-center justify-center py-32 text-slate-500">
                        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 ring-1 ring-white/10">
                            <BookOpen size={24} className="opacity-50" />
                        </div>
                        <p className="text-lg">暂无课程</p>
                    </div>
                )}
            </div>
        </div>
    );
}
