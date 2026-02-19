// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GovProcurement {
    address public owner;

    struct Project {
        uint256 projectId;
        address contractor;
        uint256 totalBudget;
        bool active;
    }

    struct Milestone {
        uint256 milestoneId;
        uint256 amount;
        bool verified;
        bool paid;
    }

    // Mappings
    mapping(uint256 => Project) public projects;
    mapping(uint256 => Milestone) public milestones;
    // Map milestoneId to projectId for validation
    mapping(uint256 => uint256) public milestoneProject;

    event ProjectCreated(uint256 indexed projectId, address indexed contractor, uint256 totalBudget);
    event MilestoneVerified(uint256 indexed milestoneId, uint256 indexed projectId);
    event PaymentReleased(uint256 indexed milestoneId, uint256 indexed projectId, uint256 amount, address indexed contractor);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only government can call this");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createProject(uint256 _projectId, address _contractor, uint256 _totalBudget) external onlyOwner {
        require(projects[_projectId].projectId == 0, "Project already exists");
        
        projects[_projectId] = Project({
            projectId: _projectId,
            contractor: _contractor,
            totalBudget: _totalBudget,
            active: true
        });

        emit ProjectCreated(_projectId, _contractor, _totalBudget);
    }

    function addMilestone(uint256 _milestoneId, uint256 _projectId, uint256 _amount) external onlyOwner {
        require(projects[_projectId].active, "Project not active");
        require(milestones[_milestoneId].milestoneId == 0, "Milestone exists");

        milestones[_milestoneId] = Milestone({
            milestoneId: _milestoneId,
            amount: _amount,
            verified: false,
            paid: false
        });
        milestoneProject[_milestoneId] = _projectId;
    }

    function verifyMilestone(uint256 _milestoneId) external onlyOwner {
        Milestone storage m = milestones[_milestoneId];
        require(m.milestoneId != 0, "Milestone not found");
        require(!m.verified, "Already verified");

        m.verified = true;
        emit MilestoneVerified(_milestoneId, milestoneProject[_milestoneId]);
    }

    function releasePayment(uint256 _milestoneId) external onlyOwner {
        Milestone storage m = milestones[_milestoneId];
        require(m.verified, "Milestone not verified");
        require(!m.paid, "Already paid");

        Project memory p = projects[milestoneProject[_milestoneId]];
        require(p.active, "Project ended");

        // Transfer Logic (Assuming contract is funded)
        // require(address(this).balance >= m.amount, "Insufficient funds in contract");
        // payable(p.contractor).transfer(m.amount);
        
        // For MVP/Simulation, we just mark as paid and emit event
        m.paid = true;

        emit PaymentReleased(_milestoneId, p.projectId, m.amount, p.contractor);
    }

    // Function to fund the contract
    receive() external payable {}
}
