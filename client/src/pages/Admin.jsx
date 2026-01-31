import { useState, useEffect } from 'react';
import { login, uploadCourse, getCourses, deleteCourse, updateCourse, generateAudio } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { Upload, Lock, FileAudio, FileImage, FileJson, ChevronLeft, List, ChevronRight, LayoutDashboard, LogOut, Trash2, RefreshCw, X, Volume2, BookOpen, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

export default function Admin() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'list'
    const [editingCourse, setEditingCourse] = useState(null); // Course object being edited
    const [generatingId, setGeneratingId] = useState(null);

    // Form State
    const [category, setCategory] = useState('directory');
    const [series, setSeries] = useState('');

    // List State
    const [courses, setCourses] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [categoryFilter, setCategoryFilter] = useState(''); // '' | 'directory' | 'novel' | 'drama'
    const limit = 8;


    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await login(password);
            if (res.data.success) {
                setIsAuthenticated(true);
            }
        } catch (err) {
            alert('密码错误');
        }
    };

    const loadCourses = async (pageNum) => {
        try {
            const data = await getCourses(pageNum, limit, categoryFilter);
            setCourses(data.results);
            setTotal(data.total);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (isAuthenticated && activeTab === 'list') {
            loadCourses(page);
        }
    }, [isAuthenticated, activeTab, page, categoryFilter]);

    const handleUpload = async (e) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target);

        try {
            if (editingCourse) {
                await updateCourse(editingCourse.id, formData);
                alert('更新成功！');
                setEditingCourse(null);
            } else {
                await uploadCourse(formData);
                alert('上传成功！');
            }
            e.target.reset();
            setCategory('directory');
            setSeries('');
            setActiveTab('list');
            loadCourses(1);
        } catch (err) {
            alert((editingCourse ? '更新' : '上传') + '失败: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('确定要删除这个课程吗？此操作无法撤销。')) return;
        try {
            await deleteCourse(id);
            alert('删除成功');
            loadCourses(page);
        } catch (err) {
            alert('删除失败: ' + err.message);
        }
    };

    const handleGenerateAudio = async (id) => {
        if (generatingId) return;
        setGeneratingId(id);
        try {
            const res = await generateAudio(id);
            console.log('Generate Audio Response:', res);
            console.log(`生成成功！共生成 ${res.updatedCount} 个单词语音。`);
            loadCourses(activePage); // Refresh stats
        } catch (err) {
            console.error('生成失败:', err);
        } finally {
            setGeneratingId(null);
        }
    };

    const handleEdit = (course) => {
        setEditingCourse(course);
        setCategory(course.category || 'directory');
        setSeries(course.series || '');
        setActiveTab('upload');
    };

    const cancelEdit = () => {
        setEditingCourse(null);
        setCategory('directory');
        setSeries('');
        setActiveTab('list');
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans">
                <form onSubmit={handleLogin} className="bg-slate-900 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/5">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                            <Lock className="w-8 h-8 text-blue-400" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2 text-center">管理员登录</h2>
                    <p className="text-slate-400 text-center mb-8 text-sm">请输入密码以访问后台</p>

                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="输入密码"
                        className="w-full bg-slate-800 text-white px-4 py-3 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-white/5 placeholder-slate-500 transition-all"
                    />
                    <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20">
                        登录
                    </button>

                    <div className="mt-6 text-center">
                        <Link to="/" className="text-sm text-slate-500 hover:text-white transition-colors">返回首页</Link>
                    </div>
                </form>
            </div>
        );
    }

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex">
            {/* Sidebar */}
            <div className="w-64 bg-slate-900 border-r border-white/5 flex flex-col p-6">
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <LayoutDashboard size={18} className="text-white" />
                    </div>
                    <span className="font-bold text-lg tracking-wide">管理后台</span>
                </div>

                <nav className="flex-1 space-y-2">
                    <button
                        onClick={() => { setActiveTab('upload'); setEditingCourse(null); }}
                        className={clsx(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                            activeTab === 'upload'
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                                : "text-slate-400 hover:bg-white/5 hover:text-white"
                        )}
                    >
                        <Upload size={18} />
                        {editingCourse ? '更新课程' : '上传课程'}
                    </button>
                    <button
                        onClick={() => { setActiveTab('list'); setEditingCourse(null); }}
                        className={clsx(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                            activeTab === 'list'
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                                : "text-slate-400 hover:bg-white/5 hover:text-white"
                        )}
                    >
                        <List size={18} />
                        课程列表
                    </button>
                    <button
                        onClick={() => { setActiveTab('audio-tasks'); setEditingCourse(null); }}
                        className={clsx(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                            activeTab === 'audio-tasks'
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                                : "text-slate-400 hover:bg-white/5 hover:text-white"
                        )}
                    >
                        <Volume2 size={18} />
                        语音任务
                    </button>
                </nav>

                <div className="pt-6 border-t border-white/5">
                    <Link to="/" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all text-sm font-medium">
                        <LogOut size={18} />
                        退出后台
                    </Link>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 overflow-y-auto h-screen">
                <div className="max-w-4xl mx-auto">

                    {activeTab === 'upload' && (
                        <div className="bg-slate-900 p-8 rounded-3xl border border-white/5 shadow-2xl max-w-2xl mx-auto animate-fade-in relative">
                            {editingCourse && (
                                <button onClick={cancelEdit} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            )}

                            <div className="flex items-center gap-4 mb-8">
                                <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center", editingCourse ? "bg-orange-500/10" : "bg-green-500/10")}>
                                    {editingCourse ? <RefreshCw className="w-6 h-6 text-orange-400" /> : <Upload className="w-6 h-6 text-green-400" />}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">{editingCourse ? '更新课程内容' : '上传新课程'}</h2>
                                    <p className="text-slate-400 text-xs">
                                        {editingCourse ? `正在更新: ${editingCourse.title}` : '请上传课程所需的三个核心文件'}
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleUpload} className="space-y-5">
                                {/* Category Selection */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="group">
                                        <label className="flex items-center gap-2 text-slate-300 mb-2 text-sm font-medium group-hover:text-blue-400 transition-colors">
                                            <List size={16} />
                                            内容分类
                                        </label>
                                        <select
                                            name="category"
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            className="block w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                        >
                                            <option value="directory">泰语名录</option>
                                            <option value="novel">泰语小说</option>
                                            <option value="drama">泰剧对白</option>
                                        </select>
                                    </div>

                                    {(category === 'novel' || category === 'drama') && (
                                        <div className="group animate-fade-in">
                                            <label className="flex items-center gap-2 text-slate-300 mb-2 text-sm font-medium group-hover:text-blue-400 transition-colors">
                                                <BookOpen size={16} />
                                                {category === 'novel' ? '小说系列名称' : '剧集名称'}
                                            </label>
                                            <input
                                                type="text"
                                                name="series"
                                                value={series}
                                                onChange={(e) => setSeries(e.target.value)}
                                                placeholder={category === 'novel' ? "例如：诚实咖啡" : "例如：天生一对"}
                                                required={category === 'novel'}
                                                className="block w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder-slate-500"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Cover Image */}
                                <div className="group">
                                    <label className="flex items-center gap-2 text-slate-300 mb-2 text-sm font-medium group-hover:text-blue-400 transition-colors">
                                        <FileImage size={16} />
                                        封面图片 (PNG/JPG) {editingCourse && <span className="text-xs text-slate-500 font-normal ml-auto">不修改请留空</span>}
                                    </label>
                                    <input type="file" name="cover" accept="image/*" required={!editingCourse}
                                        className="block w-full text-xs text-slate-400
                                file:mr-4 file:py-2.5 file:px-4
                                file:rounded-lg file:border-0
                                file:text-xs file:font-semibold
                                file:bg-slate-800 file:text-blue-400
                                hover:file:bg-slate-700
                                cursor-pointer border border-dashed border-slate-700 rounded-xl p-2 hover:border-slate-500 transition-colors"
                                    />
                                </div>

                                {/* Audio File */}
                                <div className="group">
                                    <label className="flex items-center gap-2 text-slate-300 mb-2 text-sm font-medium group-hover:text-blue-400 transition-colors">
                                        <FileAudio size={16} />
                                        音频文件 (WAV/MP3) {editingCourse && <span className="text-xs text-slate-500 font-normal ml-auto">不修改请留空</span>}
                                    </label>
                                    <input type="file" name="audio" accept="audio/*" required={!editingCourse}
                                        className="block w-full text-xs text-slate-400
                                file:mr-4 file:py-2.5 file:px-4
                                file:rounded-lg file:border-0
                                file:text-xs file:font-semibold
                                file:bg-slate-800 file:text-blue-400
                                hover:file:bg-slate-700
                                cursor-pointer border border-dashed border-slate-700 rounded-xl p-2 hover:border-slate-500 transition-colors"
                                    />
                                </div>

                                {/* JSON File */}
                                <div className="group">
                                    <label className="flex items-center gap-2 text-slate-300 mb-2 text-sm font-medium group-hover:text-blue-400 transition-colors">
                                        <FileJson size={16} />
                                        课程数据 (JSON) {editingCourse && <span className="text-xs text-slate-500 font-normal ml-auto">不修改请留空</span>}
                                    </label>
                                    <input type="file" name="json" accept=".json" required={!editingCourse}
                                        className="block w-full text-xs text-slate-400
                                file:mr-4 file:py-2.5 file:px-4
                                file:rounded-lg file:border-0
                                file:text-xs file:font-semibold
                                file:bg-slate-800 file:text-blue-400
                                hover:file:bg-slate-700
                                cursor-pointer border border-dashed border-slate-700 rounded-xl p-2 hover:border-slate-500 transition-colors"
                                    />
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={clsx(
                                            "w-full text-white py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2 text-sm",
                                            editingCourse
                                                ? "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 shadow-orange-900/20"
                                                : "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-blue-900/20"
                                        )}
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                {editingCourse ? '更新中...' : '上传中...'}
                                            </>
                                        ) : (
                                            <>
                                                {editingCourse ? <RefreshCw size={18} /> : <Upload size={18} />}
                                                {editingCourse ? '确认更新' : '开始上传'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'audio-tasks' && (
                        <AudioTasksView />
                    )}

                    {activeTab === 'list' && (
                        <div className="bg-slate-900 p-8 rounded-3xl border border-white/5 shadow-2xl flex flex-col animate-fade-in">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                                        <List className="w-6 h-6 text-purple-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">课程列表</h2>
                                        <p className="text-slate-400 text-xs">共 {total} 个课程</p>
                                    </div>
                                </div>

                                <div className="flex bg-slate-800 p-1 rounded-lg">
                                    {[
                                        { id: '', label: '全部' },
                                        { id: 'directory', label: '名录' },
                                        { id: 'novel', label: '小说' },
                                        { id: 'drama', label: '对白' }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => { setCategoryFilter(tab.id); setPage(1); }}
                                            className={clsx(
                                                "px-3 py-1.5 text-xs font-bold rounded-md transition-all",
                                                categoryFilter === tab.id
                                                    ? "bg-slate-600 text-white shadow-sm"
                                                    : "text-slate-400 hover:text-white"
                                            )}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 space-y-3 mb-6">
                                {courses.map(course => (
                                    <div key={course.id} className="bg-slate-800/50 p-4 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors flex gap-4 items-center group">
                                        <img
                                            src={course.coverUrl.startsWith('http') ? course.coverUrl : `http://localhost:3001${course.coverUrl}`}
                                            className="w-20 h-14 object-cover rounded-lg bg-slate-700"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-bold text-white truncate group-hover:text-blue-400 transition-colors">{course.title}</h3>
                                            <p className="text-xs text-slate-500 truncate mt-1">{new Date(course.createdAt).toLocaleString('zh-CN')}</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col items-end mr-2">
                                                {course.stats && (
                                                    <>
                                                        <span className={clsx(
                                                            "text-xs font-bold px-2 py-0.5 rounded-full mb-1",
                                                            course.stats.isComplete
                                                                ? "bg-green-500/20 text-green-400"
                                                                : "bg-yellow-500/20 text-yellow-400"
                                                        )}>
                                                            {course.stats.isComplete ? "语音已就绪" : "语音未完成"}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500">
                                                            {course.stats.hasAudioCount} / {course.stats.totalWords} 词
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleEdit(course)}
                                                title="重新上传/更新"
                                                className="p-2 bg-white/5 rounded-lg hover:bg-orange-500 hover:text-white transition-colors text-slate-400"
                                            >
                                                <RefreshCw size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(course.id)}
                                                title="删除课程"
                                                className="p-2 bg-white/5 rounded-lg hover:bg-red-500 hover:text-white transition-colors text-slate-400"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                            <Link to={`/course/${course.id}`} title="查看课程" className="p-2 bg-white/5 rounded-lg hover:bg-blue-500 hover:text-white transition-colors text-slate-400">
                                                <ChevronRight size={18} />
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                                {courses.length === 0 && (
                                    <div className="text-center text-slate-500 py-20 text-sm">暂无课程数据</div>
                                )}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-4 py-2 text-sm rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        上一页
                                    </button>
                                    <span className="text-sm text-slate-500">
                                        第 {page} / {totalPages} 页
                                    </span>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-4 py-2 text-sm rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        下一页
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div >
        </div >
    );
}

function AudioTasksView() {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    const refreshStatus = async () => {
        try {
            const data = await import('../lib/api').then(m => m.getAudioStatus());
            setStatus(data);
        } catch (e) {
            console.error(e);
        }
    };

    const triggerTask = async () => {
        setLoading(true);
        try {
            await import('../lib/api').then(m => m.triggerAudioGeneration());
            // Poll for update
            setTimeout(refreshStatus, 1000);
        } catch (e) {
            alert('Trigger failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshStatus();
        const interval = setInterval(refreshStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    if (!status) return <div className="text-white text-center py-10">加载中...</div>;

    return (
        <div className="bg-slate-900 p-8 rounded-3xl border border-white/5 shadow-2xl animate-fade-in max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center">
                    <Volume2 className="w-6 h-6 text-teal-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">语音补全任务</h2>
                    <p className="text-slate-400 text-xs">自动检测并生成缺失单词语音 (每日凌晨3点自动运行)</p>
                </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5 mb-6 text-center">
                <div className="text-sm text-slate-400 mb-2">当前状态</div>
                <div className={clsx("text-2xl font-bold mb-2", status.isRunning ? "text-green-400" : "text-slate-200")}>
                    {status.isRunning ? "正在运行中..." : "待机中"}
                </div>
                {status.isRunning && (
                    <div className="text-xs text-blue-300 animate-pulse">
                        正在处理: {status.currentProcessingCourse}
                    </div>
                )}
            </div>

            <div className="space-y-4 mb-8">
                <div className="flex justify-between text-sm py-2 border-b border-white/5">
                    <span className="text-slate-400">本次已处理单词数</span>
                    <span className="text-white font-mono">{status.processedCount}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b border-white/5">
                    <span className="text-slate-400">最新日志</span>
                    <span className="text-white font-mono text-xs max-w-[200px] truncate" title={status.lastLog}>{status.lastLog || '-'}</span>
                </div>
            </div>

            <button
                onClick={triggerTask}
                disabled={status.isRunning || loading}
                className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"
            >
                {status.isRunning ? (
                    <><RefreshCw className="animate-spin" size={18} /> 任务运行中</>
                ) : (
                    <><Play size={18} /> 立即开始扫描并生成</>
                )}
            </button>

            <MigrationPanel />
        </div>
    );
}

function MigrationPanel() {
    const [status, setStatus] = useState({ isMigrating: false, logs: [] });
    const [loading, setLoading] = useState(false);

    const refresh = async () => {
        try {
            const data = await import('../lib/api').then(m => m.getMigrationStatus());
            setStatus(data);
        } catch (e) { }
    };

    const run = async () => {
        if (!window.confirm('确定要执行全量域名迁移吗？这将会更新所有课程的OSS链接为.env中配置的自定义域名。请确保ESA/CDN配置已生效。')) return;
        setLoading(true);
        try {
            await import('../lib/api').then(m => m.triggerDomainMigration());
            setTimeout(refresh, 1000);
        } catch (e) { alert('启动失败'); }
        setLoading(false);
    };

    useEffect(() => {
        refresh();
        const t = setInterval(refresh, 5000);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="mt-8 pt-6 border-t border-white/5">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 text-indigo-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-300">OSS 域名迁移 (ESA加速)</h3>
            </div>

            <div className="bg-black/20 rounded-lg p-3 text-xs text-slate-500 font-mono mb-4 h-24 overflow-y-auto">
                {status.logs.length === 0 ? '等待操作...' : status.logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>

            <button
                onClick={run}
                disabled={status.isMigrating || loading}
                className="w-full py-2 bg-indigo-900/40 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 rounded-lg text-sm font-medium transition-colors"
            >
                {status.isMigrating ? '正在迁移...' : '执行全量域名替换'}
            </button>
        </div>
    );
}
