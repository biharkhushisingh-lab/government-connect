try {
    const config = require('./src/config/config');
    console.log("Config loaded successfully:", config);
} catch (e) {
    console.error("Config load failed:", e);
}
