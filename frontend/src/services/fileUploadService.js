import api from './api';

const API_URL = '/files';

export const uploadFile = async (file, type = 'general') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await api.post(`${API_URL}/upload`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    return response.data;
};

export const downloadFile = async (fileName, type = 'general', signal) => {
    const response = await api.get(
        `${API_URL}/download/${encodeURIComponent(type)}/${encodeURIComponent(fileName.split('/').pop())}`,
        { responseType: 'blob', signal },
    );
    return response.data;
};

export const getFileUrl = (fileName, type = 'general') =>
    `${API_URL}/download/${encodeURIComponent(type)}/${encodeURIComponent(fileName.split('/').pop())}`;

const fileUploadService = {
    uploadFile,
    downloadFile,
    getFileUrl
};

export default fileUploadService;
