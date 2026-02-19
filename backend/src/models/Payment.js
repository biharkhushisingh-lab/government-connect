const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'RELEASED', 'FAILED'),
        defaultValue: 'PENDING',
    },
    milestoneId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Milestones',
            key: 'id',
        },
    },
    transactionHash: {
        type: DataTypes.STRING, // Blockchain Tx Hash
        allowNull: true,
    }
}, {
    indexes: [
        {
            fields: ['milestoneId']
        },
        {
            fields: ['status']
        }
    ]
});

module.exports = Payment;
