const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ContractorScore = sequelize.define('ContractorScore', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    contractorId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true, // One score record per contractor
        references: {
            model: 'Users',
            key: 'id',
        },
    },
    completionRate: {
        type: DataTypes.FLOAT,
        defaultValue: 100.0, // Start perfect
        validate: { min: 0, max: 100 }
    },
    delayPenalty: {
        type: DataTypes.FLOAT,
        defaultValue: 0.0,
        validate: { min: 0 }
    },
    fraudFlags: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: { min: 0 }
    },
    financialCompliance: {
        type: DataTypes.FLOAT,
        defaultValue: 100.0,
        validate: { min: 0, max: 100 }
    },
    totalScore: {
        type: DataTypes.FLOAT,
        defaultValue: 100.0,
        validate: { min: 0, max: 100 }
    },
    predictedRisk: {
        type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'UNKNOWN'),
        defaultValue: 'UNKNOWN'
    },
    predictedProbability: {
        type: DataTypes.FLOAT,
        defaultValue: 0.0
    }
}, {
    hooks: {
        beforeSave: (record) => {
            // Auto-calculate on save if not explicitly set? 
            // Or rely on service. The prompt asked for a service to calculate.
            // We'll leave the calculation to the service to ensure logic centralization.
        }
    },
    indexes: [
        { fields: ['contractorId'] },
        { fields: ['totalScore'] }
    ]
});

module.exports = ContractorScore;
