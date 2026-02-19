// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ProjectEscrow {
    enum MilestoneStatus { PENDING, VERIFIED, PAID }

    struct Milestone {
        string description;
        uint256 amount;
        MilestoneStatus status;
        string evidenceHash; // IPFS Hash
    }

    struct Project {
        uint256 id;
        address government;
        address contractor;
        uint256 totalBudget;
        uint256 fundsDeposited;
        bool isActive;
        mapping(uint256 => Milestone) milestones;
        uint256 milestoneCount;
    }

    mapping(uint256 => Project) public projects;
    uint256 public projectCount;

    event ProjectCreated(uint256 indexed projectId, address indexed government, address indexed contractor, uint256 totalBudget);
    event FundsDeposited(uint256 indexed projectId, uint256 amount);
    event MilestoneEvidenceSubmitted(uint256 indexed projectId, uint256 indexed milestoneId, string evidenceHash);
    event MilestoneVerified(uint256 indexed projectId, uint256 indexed milestoneId);
    event FundsReleased(uint256 indexed projectId, uint256 indexed milestoneId, uint256 amount);

    modifier onlyGovernment(uint256 _projectId) {
        require(msg.sender == projects[_projectId].government, "Only Government can perform this action");
        _;
    }

    modifier onlyContractor(uint256 _projectId) {
        require(msg.sender == projects[_projectId].contractor, "Only Contractor can perform this action");
        _;
    }

    function createProject(address _contractor, uint256 _totalBudget) external payable { // Gov creates and funds
        require(msg.value == _totalBudget, "Must deposit full project budget");

        projectCount++;
        Project storage newProject = projects[projectCount];
        newProject.id = projectCount;
        newProject.government = msg.sender;
        newProject.contractor = _contractor;
        newProject.totalBudget = _totalBudget;
        newProject.fundsDeposited = msg.value;
        newProject.isActive = true;

        emit ProjectCreated(projectCount, msg.sender, _contractor, _totalBudget);
        emit FundsDeposited(projectCount, msg.value);
    }

    function addMilestone(uint256 _projectId, string memory _description, uint256 _amount) external onlyGovernment(_projectId) {
        Project storage project = projects[_projectId];
        require(project.isActive, "Project is not active");
        
        uint256 milestoneId = project.milestoneCount;
        project.milestones[milestoneId] = Milestone(_description, _amount, MilestoneStatus.PENDING, "");
        project.milestoneCount++;
    }

    function submitEvidence(uint256 _projectId, uint256 _milestoneId, string memory _evidenceHash) external onlyContractor(_projectId) {
        Project storage project = projects[_projectId];
        Milestone storage milestone = project.milestones[_milestoneId];
        require(milestone.status == MilestoneStatus.PENDING, "Milestone already verified or paid");
        
        milestone.evidenceHash = _evidenceHash;
        emit MilestoneEvidenceSubmitted(_projectId, _milestoneId, _evidenceHash);
    }

    function verifyAndRelease(uint256 _projectId, uint256 _milestoneId) external onlyGovernment(_projectId) {
        Project storage project = projects[_projectId];
        Milestone storage milestone = project.milestones[_milestoneId];
        
        require(milestone.status == MilestoneStatus.PENDING, "Milestone status invalid");
        require(bytes(milestone.evidenceHash).length > 0, "No evidence submitted");
        require(address(this).balance >= milestone.amount, "Insufficient contract balance");

        milestone.status = MilestoneStatus.PAID;
        payable(project.contractor).transfer(milestone.amount);

        emit MilestoneVerified(_projectId, _milestoneId);
        emit FundsReleased(_projectId, _milestoneId, milestone.amount);
    }
}
