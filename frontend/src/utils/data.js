import api from './api';

export const createProject = async (projectData) => {
    const response = await api.post('/projects', projectData);
    return response.data;
};

export const getProjects = async () => {
    const response = await api.get('/projects');
    return response.data;
};

export const getProject = async (id) => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
};

export const placeBid = async (bidData) => {
    const response = await api.post('/bids', bidData);
    return response.data;
}

export const getMyBids = async () => {
    const response = await api.get('/bids');
    return response.data;
}
