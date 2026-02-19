try {
    console.log("Loading app...");
    require('./src/app');
    console.log("App loaded successfully!");
} catch (e) {
    console.error("App load failed!");
    console.error(e.stack);
}
