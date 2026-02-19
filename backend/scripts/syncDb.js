const { sequelize } = require('../src/models');

const syncDb = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected...');
        await sequelize.sync({ force: true }); // Use force: true for dev to reset tables
        console.log('Database synced!');
        process.exit(0);
    } catch (err) {
        console.error('Error syncing database:', err);
        process.exit(1);
    }
};

syncDb();
