const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [8, 100], // Minimum length 8
        },
    },
    role: {
        type: DataTypes.ENUM('GOVERNMENT', 'CONTRACTOR', 'BANK'),
        allowNull: false,
        defaultValue: 'CONTRACTOR',
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    // Retaining existing fields that might be useful given context, or can remove if strict adherence is required. 
    // The prompt didn't ask to remove others, but "create... with...". I'll keep useful ones or just stick to requested + necessary.
    // walletAddress/isVerified were there. Let's keep isVerified as it was used in other logic (anti-corruption).
    // But strict adherence to "Create... with..." usually implies defining the structure. 
    // I will add the requested fields and keep isVerified/credibilityScore as they are critical for the app logic we built earlier.
    walletAddress: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
    },
    isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    credibilityScore: {
        type: DataTypes.INTEGER,
        defaultValue: 50,
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['email']
        }
    ],
    hooks: {
        beforeSave: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        },
    },
});

User.prototype.isPasswordMatch = async function (password) {
    return bcrypt.compare(password, this.password);
};

// Start: Remove password from JSON response
User.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());
    delete values.password;
    return values;
};

module.exports = User;
