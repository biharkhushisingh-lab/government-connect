const fs = require('fs').promises;
const path = require('path');

const MOCK_DATA_DIR = path.join(__dirname, '../../mock-data');

const readJSON = async (filename) => {
    try {
        const filePath = path.join(MOCK_DATA_DIR, filename);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filename}:`, error.message);
        return [];
    }
};

const writeJSON = async (filename, data) => {
    try {
        const filePath = path.join(MOCK_DATA_DIR, filename);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Error writing ${filename}:`, error.message);
        return false;
    }
};

module.exports = {
    readJSON,
    writeJSON
};
