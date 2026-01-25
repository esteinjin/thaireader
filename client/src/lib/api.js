import axios from 'axios';

const API_URL = '/api';

export const api = axios.create({
    baseURL: API_URL,
});

export const login = (password) => api.post('/admin/login', { password });
export const uploadCourse = (formData) => api.post('/admin/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const getCourses = (page = 1, limit = 9, category) => {
    let url = `/courses?page=${page}&limit=${limit}`;
    if (category) url += `&category=${category}`;
    return api.get(url).then(res => res.data);
};
export const getCourse = (id) => api.get(`/courses/${id}`).then(res => res.data);
export const deleteCourse = (id) => api.delete(`/admin/courses/${id}`).then(res => res.data);
export const updateCourse = (id, formData) => api.put(`/admin/courses/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
}).then(res => res.data);
export const generateAudio = (id) => api.post(`/admin/courses/${id}/generate-audio`).then(res => res.data);
