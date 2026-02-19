const hre = require("hardhat");

async function main() {
    const ProjectEscrow = await hre.ethers.getContractFactory("ProjectEscrow");
    const projectEscrow = await ProjectEscrow.deploy();

    await projectEscrow.waitForDeployment();

    console.log("ProjectEscrow deployed to:", await projectEscrow.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
