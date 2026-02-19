try {
    console.log("1. Loading redis.service...");
    require('./src/services/redis.service');
    console.log("PASS: redis.service");

    console.log("2. Loading models...");
    require('./src/models');
    console.log("PASS: models");

    console.log("3. Loading dashboard.controller...");
    require('./src/controllers/dashboard.controller');
    console.log("PASS: dashboard.controller");

    console.log("4. Loading dashboard.routes...");
    require('./src/routes/dashboard.routes');
    console.log("PASS: dashboard.routes");

} catch (e) {
    console.error("FAIL!");
    console.error(e.stack);
}
