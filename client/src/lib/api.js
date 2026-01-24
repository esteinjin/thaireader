import axios from 'axios';

const API_URL = '/api';

export const api = axios.create({
    baseURL: API_URL,
});

export const login = (password) => api.post('/admin/login', { password });
export const uploadCourse = (formData) => api.post('/admin/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const getCourses = (page = 1, limit = 9) => api.get(`/courses?page=${page}&limit=${limit}`).then(res => res.data);
export const getCourse = (id) => api.get(`/courses/${id}`).then(res => res.data);
export const deleteCourse = (id) => api.delete(`/admin/courses/${id}`).then(res => res.data);
export const updateCourse = (id, formData) => api.put(`/admin/courses/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
}).then(res => res.data);
