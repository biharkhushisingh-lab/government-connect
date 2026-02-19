const axios = require('axios');

async function test() {
    try {
        console.log("Testing analyze-invoice for inv1...");
        const res = await axios.post('http://127.0.0.1:5000/experiment/analyze-invoice', {
            invoiceId: 'inv1'
        });
        console.log("SUCCESS!");
        console.log(JSON.stringify(res.data, null, 2));

        console.log("\nTesting analyze-invoice for inv2 (High Risk)...");
        const res2 = await axios.post('http://127.0.0.1:5000/experiment/analyze-invoice', {
            invoiceId: 'inv2'
        });
        console.log("SUCCESS!");
        console.log(JSON.stringify(res2.data, null, 2));

    } catch (e) {
        console.error("FAILED!");
        if (e.response) {
            console.error(e.response.status, e.response.data);
        } else {
            console.error(e.message);
        }
    }
}

test();
