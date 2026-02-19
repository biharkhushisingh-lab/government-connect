const hre = require("hardhat");

async function main() {
    const GovProcurement = await hre.ethers.getContractFactory("GovProcurement");
    const contract = await GovProcurement.deploy();

    await contract.waitForDeployment();

    console.log("GovProcurement deployed to:", await contract.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
