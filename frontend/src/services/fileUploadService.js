import axios from 'axios';

const API_URL = '/api/files';

export const uploadFile = async (file, type = 'general') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    return response.data;
};

export const getFileUrl = (fileName, type = 'general') => {
    if (!fileName) return null;
    return `${API_URL}/download/${type}/${fileName.split('/').pop()}`; // Handle paths like 'invoices/file123.pdf'
};

const fileUploadService = {
    uploadFile,
    getFileUrl
};

export default fileUploadService;
