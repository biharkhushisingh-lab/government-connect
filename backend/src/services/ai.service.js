const axios = require('axios');
const FormData = require('form-data');
const logger = require('../utils/logger');
const config = require('../config/config');

// Use config.services.ai with fallback
const AI_SERVICE_URL = config.services?.ai || config.aiServiceUrl || 'http://localhost:8000';

const analyzeFraud = async (data) => {
    try {
        const formData = new FormData();
        for (const key in data) {
            formData.append(key, String(data[key]));
        }

        logger.info(`Calling AI analyze at ${AI_SERVICE_URL}/analyze`);
        const response = await axios.post(`${AI_SERVICE_URL}/analyze`, formData, {
            headers: { ...formData.getHeaders() }
        });
        return response.data;
    } catch (error) {
        logger.error(`AI Service Error (analyze): ${error.message}`);
        return { status: 'GREEN', riskScore: 0, reasons: ['AI Service Unavailable'] };
    }
};

const predictContractorRisk = async (features) => {
    try {
        const formData = new FormData();
        for (const key in features) {
            formData.append(key, String(features[key]));
        }

        logger.info(`Calling AI predict-risk at ${AI_SERVICE_URL}/predict-risk`);
        const response = await axios.post(`${AI_SERVICE_URL}/predict-risk`, formData, {
            headers: { ...formData.getHeaders() }
        });

        return response.data;
    } catch (error) {
        logger.error(`AI Risk Prediction Error: ${error.message}`);
        return null; // Fail gracefully
    }
};

module.exports = {
    analyzeFraud,
    predictContractorRisk
};
