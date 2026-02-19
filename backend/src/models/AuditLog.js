const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    action: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    performedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id',
        },
    },
    entityType: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    entityId: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
}, {
    indexes: [
        {
            fields: ['entityId']
        },
        {
            fields: ['performedBy']
        },
        {
            fields: ['action'] // Often useful to filter by action type
        }
    ],
    updatedAt: false, // Immutable log, no updates
    hooks: {
        beforeUpdate: (record, options) => {
            throw new Error('Audit logs are immutable and cannot be updated.');
        },
        beforeDestroy: (record, options) => {
            throw new Error('Audit logs are immutable and cannot be deleted.');
        },
        beforeBulkUpdate: (options) => {
            throw new Error('Audit logs are immutable and cannot be updated.');
        },
        beforeBulkDestroy: (options) => {
            throw new Error('Audit logs are immutable and cannot be deleted.');
        }
    }
});

module.exports = AuditLog;
