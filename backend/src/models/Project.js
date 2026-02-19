const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Project = sequelize.define('Project', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    budget: {
        type: DataTypes.DECIMAL(15, 2), // Supports large budgets
        allowNull: false,
    },
    location: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    deadline: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('OPEN', 'AWARDED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
        defaultValue: 'OPEN',
    },
    createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id',
        },
    }
}, {
    indexes: [
        {
            fields: ['status']
        },
        {
            fields: ['createdBy']
        }
    ]
});

module.exports = Project;
