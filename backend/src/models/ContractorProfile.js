const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const ContractorProfile = sequelize.define('ContractorProfile', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    companyName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    licenseNumber: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
    },
    address: {
        type: DataTypes.TEXT,
    },
    experienceYears: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    userId: {
        type: DataTypes.INTEGER,
        unique: true, // One profile per user
        references: {
            model: User,
            key: 'id',
        },
    },
});

User.hasOne(ContractorProfile, { foreignKey: 'userId' });
ContractorProfile.belongsTo(User, { foreignKey: 'userId' });

module.exports = ContractorProfile;
