const sequelize = require('../config/database');
const User = require('./User');
const Project = require('./Project');
const Bid = require('./Bid');
const ContractorProfile = require('./ContractorProfile');
const Milestone = require('./Milestone');
const Payment = require('./Payment');
const AuditLog = require('./AuditLog');
const ContractorScore = require('./ContractorScore');

// --- Associations ---

// User & Profile
User.hasOne(ContractorProfile, { foreignKey: 'userId', onDelete: 'CASCADE' });
ContractorProfile.belongsTo(User, { foreignKey: 'userId' });

// User & Score
User.hasOne(ContractorScore, { foreignKey: 'contractorId', onDelete: 'CASCADE' });
ContractorScore.belongsTo(User, { foreignKey: 'contractorId' });

// User & AuditLog (Logs performed by user)
User.hasMany(AuditLog, { foreignKey: 'performedBy' });
AuditLog.belongsTo(User, { foreignKey: 'performedBy' });

// Project & User (Creator)
User.hasMany(Project, { foreignKey: 'createdBy', onDelete: 'CASCADE' });
Project.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Bid & Project
Project.hasMany(Bid, { foreignKey: 'projectId', onDelete: 'CASCADE' });
Bid.belongsTo(Project, { foreignKey: 'projectId' });

// Bid & User (Contractor)
User.hasMany(Bid, { foreignKey: 'contractorId', onDelete: 'CASCADE' });
Bid.belongsTo(User, { foreignKey: 'contractorId', as: 'contractor' });

// Milestone & Project
Project.hasMany(Milestone, { foreignKey: 'projectId', onDelete: 'CASCADE' });
Milestone.belongsTo(Project, { foreignKey: 'projectId' });

// Payment & Milestone
Milestone.hasMany(Payment, { foreignKey: 'milestoneId', onDelete: 'CASCADE' });
Payment.belongsTo(Milestone, { foreignKey: 'milestoneId' });

const models = {
    User,
    Project,
    Bid,
    ContractorProfile,
    Milestone,
    Payment,
    AuditLog,
    ContractorScore,
};

module.exports = { ...models, sequelize };
