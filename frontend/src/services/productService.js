import api from './api';

export const productService = {
    getAll: (params) => api.get('/products', { params }),
    getById: (id) => api.get(`/products/${id}`),
    create: (data) => api.post('/products', data),
    update: (id, data) => api.put(`/products/${id}`, data),
    delete: (id) => api.delete(`/products/${id}`),
    search: (query, params) => api.get('/products/search', { params: { ...params, query } }),
    getLowStock: () => api.get('/products/low-stock'),
    getFeatured: () => api.get('/products/featured'),
    updateStock: (id, quantity) => api.patch(`/products/${id}/stock`, null, { params: { quantity } }),
    getByCategory: (categoryId, params) => api.get(`/products/category/${categoryId}`, { params }),
    getByBrand: (brandId, params) => api.get(`/products/brand/${brandId}`, { params }),
    getByBarcode: (barcode) => api.get(`/products/barcode/${encodeURIComponent(barcode)}`),
    getByHsn: (hsnCode, params) => api.get(`/products/hsn/${encodeURIComponent(hsnCode)}`, { params }),
    getImages: (productId) => api.get(`/products/${productId}/images`),
    uploadImage: (productId, file, isPrimary, displayOrder) => {
        const formData = new FormData();
        formData.append('file', file);
        if (isPrimary !== undefined && isPrimary !== null) {
            formData.append('isPrimary', isPrimary);
        }
        if (displayOrder !== undefined && displayOrder !== null) {
            formData.append('displayOrder', displayOrder);
        }
        return api.post(`/products/${productId}/images`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
    deleteImage: (productId, imageId) => api.delete(`/products/${productId}/images/${imageId}`),
    bulkCatalogUpload: (brandId, file) => {
        const formData = new FormData();
        formData.append('brandId', brandId);
        formData.append('file', file);
        return api.post('/products/bulk-catalog-upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
};

export const brandService = {
    getAll: () => api.get('/brands'),
    getActive: () => api.get('/brands/active'),
    getById: (id) => api.get(`/brands/${id}`),
    create: (data) => api.post('/brands', data),
    update: (id, data) => api.put(`/brands/${id}`, data),
    delete: (id) => api.delete(`/brands/${id}`),
};

export const categoryService = {
    getAll: () => api.get('/categories'),
    getActive: () => api.get('/categories/active'),
    getRoots: () => api.get('/categories/roots'),
    getSubs: (parentId) => api.get(`/categories/${parentId}/subs`),
    getById: (id) => api.get(`/categories/${id}`),
    create: (data) => api.post('/categories', data),
    update: (id, data) => api.put(`/categories/${id}`, data),
    delete: (id) => api.delete(`/categories/${id}`),
};
