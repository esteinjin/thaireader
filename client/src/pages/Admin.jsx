import { useState, useEffect } from 'react';
import { login, uploadCourse, getCourses, deleteCourse, updateCourse } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { Upload, Lock, FileAudio, FileImage, FileJson, ChevronLeft, List, ChevronRight, LayoutDashboard, LogOut, Trash2, RefreshCw, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

export default function Admin() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'list'
    const [editingCourse, setEditingCourse] = useState(null); // Course object being edited

    // List State
    const [courses, setCourses] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
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
            const data = await getCourses(pageNum, limit);
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
    }, [isAuthenticated, activeTab, page]);

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

    const handleEdit = (course) => {
        setEditingCourse(course);
        setActiveTab('upload');
    };

    const cancelEdit = () => {
        setEditingCourse(null);
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

                    {activeTab === 'list' && (
                        <div className="bg-slate-900 p-8 rounded-3xl border border-white/5 shadow-2xl flex flex-col animate-fade-in">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                                    <List className="w-6 h-6 text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">课程列表</h2>
                                    <p className="text-slate-400 text-xs">共 {total} 个课程</p>
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

                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
            </div>
        </div>
    );
}
