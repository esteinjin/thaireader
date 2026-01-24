import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCourses } from '../lib/api';
import { Play, BookOpen } from 'lucide-react';

export default function Home() {
    const [courses, setCourses] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);

    const loadCourses = async (pageNum) => {
        setLoading(true);
        try {
            const data = await getCourses(pageNum, 9);
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
        loadCourses(1);
    }, []);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        loadCourses(nextPage);
    };

    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-12 font-sans text-slate-100">
            <div className="max-w-6xl mx-auto">
                <header className="mb-12 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                            泰语学习课程
                        </h1>
                        <p className="text-slate-400">精选泰语视频课程，沉浸式跟读体验</p>
                    </div>
                </header>

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

                {courses.length > 0 && hasMore && (
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

                {courses.length === 0 && !loading && (
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
