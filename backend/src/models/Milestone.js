const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Milestone = sequelize.define('Milestone', {
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
        allowNull: true,
    },
    amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'VERIFIED', 'REJECTED', 'PAID'),
        defaultValue: 'PENDING',
    },
    tenantId: {
        type: DataTypes.UUID,
        allowNull: false, // In prod, make this false. For migration compatibility, handle carefully.
        defaultValue: '00000000-0000-0000-0000-000000000000' // Default system tenant
    },
    projectId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Projects',
            key: 'id',
        },
    },
    // Optional: link to Bid if milestone is specific to a contractor's bid/execution
    // For now, linking to Project is sufficient as per prompt, but tracking which Bid/Contract is useful.
    // The prompt only asked for projectId (FK). But usually milestones are part of the accepted contract.
    // I'll stick to prompt requirements mainly but might add bidId if needed later.
}, {
    indexes: [
        { fields: ['tenantId'] },
        { fields: ['projectId'] },
        { fields: ['status'] }
    ]
});

module.exports = Milestone;
