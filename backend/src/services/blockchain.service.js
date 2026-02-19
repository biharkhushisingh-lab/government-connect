const ethers = require('ethers');
const config = require('../config/config');
const logger = require('../utils/logger');

// Mock ABI for the keys we need (In real app, import from artifacts)
const CONTRACT_ABI = [
    "function releasePayment(uint256 _milestoneId) external",
    "event PaymentReleased(uint256 indexed milestoneId, uint256 indexed projectId, uint256 amount, address indexed contractor)"
];

class BlockchainService {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.contract = null;
        this.isConnected = false;

        // this.initialize();
    }

    initialize() {
        try {
            // Default to local hardhat node if not configured
            const rpcUrl = config.blockchainRpcUrl || 'http://127.0.0.1:8545';
            this.provider = new ethers.JsonRpcProvider(rpcUrl);

            // In local dev, use the first account private key from Hardhat
            // For production, this should be an env var
            const privateKey = config.blockchainPrivateKey || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

            this.wallet = new ethers.Wallet(privateKey, this.provider);

            // Address from deployment - needs to be set in config or env
            // Using a dummy address if not set, will fail calls but allow app start
            const contractAddress = config.blockchainContractAddress || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

            this.contract = new ethers.Contract(contractAddress, CONTRACT_ABI, this.wallet);

            this.isConnected = true;
            logger.info('Blockchain Service Initialized');
        } catch (error) {
            logger.error(`Blockchain Initialization Failed: ${error.message}`);
        }
    }

    async releaseFundsOnChain(projectId, milestoneId, amount) {
        if (!this.isConnected) {
            logger.warn('Blockchain not connected. Skipping on-chain txn.');
            return "0xMockTransactionHash";
        }

        try {
            // For MVP, since we didn't sync DB IDs with Chain IDs purely,
            // we assume milestoneId in DB maps to a valid ID on chain.
            // In a full sync app, we'd create the milestone on chain first.

            // Ensure milestoneId is numeric/bigint
            // const tx = await this.contract.releasePayment(milestoneId);
            // await tx.wait();
            // return tx.hash;

            // Mocking the write because we might not have deployed/seeded the contract state
            logger.info(`[MOCK CHAIN] ReleasePayment called for Milestone ${milestoneId} ($${amount})`);
            return "0x" + Math.random().toString(16).substr(2, 64);

        } catch (error) {
            logger.error(`Smart Contract Call Failed: ${error.message}`);
            // Don't block the backend flow for this MVP if chain fails
            return null;
        }
    }
}

module.exports = new BlockchainService();
