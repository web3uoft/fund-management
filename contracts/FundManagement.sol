// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

// Import the W3BToken contract
import "./W3BToken.sol";

contract FundManagement {
    // Define a struct to hold details about spending requests
    struct Spending {
        string purpose;                     // Reason for the spending
        uint amount;                        // Amount of ETH to spend
        address receiver;                   // Address to receive the ETH
        bool executed;                      // Whether the spending has been executed
        mapping(address => bool) approvals; // Record of which addresses have approved the spending
        uint approvalCount;                 // Total number of approvals
    }

    address public admin; // Admin address with special privileges
    uint public minBuy = 0.1 ether; // Minimum ETH deposit to become a stakeholder
    mapping(address => uint) public stakeholders; // Record of stakeholders' deposits
    mapping(uint => Spending) public spendings; // Record of spending requests
    uint public spendingMinVotePercent = 85; // Minimum percentage of votes required to approve a spending
    address public shareToken; // Address of the ERC20 token representing shares in the fund
    uint private spendingIdCounter = 0; // Counter for spending requests to ensure unique IDs
    uint private tokenCounter = 0; // Counter for the total number of tokens issued

    // Events for logging actions on the blockchain
    event Deposit(address indexed stakeholder, uint amount);
    event Vote(address indexed voter, bool vote);
    event NewSpending(uint indexed spendingId, address receiver, uint amount);
    event SpendingExecuted(uint indexed spendingId);

    constructor(address _admin) {
        admin = _admin; // Set the admin address upon contract deployment
        shareToken = address(new W3BToken()); // Deploy a new W3BToken contract and store its address
    }

    // Allows stakeholders to deposit ETH into the fund
    function deposit() external payable {
        require(msg.value >= minBuy, "Deposit below minimum threshold");
        stakeholders[msg.sender] += msg.value; // Record the deposit
        uint tokenAmount = (msg.value / minBuy) * 1 ether; // Calculate the number of tokens to issue
        W3BToken(shareToken).transfer(msg.sender, tokenAmount); // Issue the tokens
        tokenCounter += tokenAmount; // Update the total token count
        emit Deposit(msg.sender, msg.value); // Log the deposit
    }

    // Allows the admin to create a new spending request
    function createSpending(address _receiver, uint _amount, string calldata _purpose) external {
        require(msg.sender == admin, "Only admin can create spending requests");
        Spending storage s = spendings[spendingIdCounter++];
        s.purpose = _purpose;
        s.amount = _amount;
        s.receiver = _receiver;
        s.executed = false;
        s.approvalCount = 0;
        emit NewSpending(spendingIdCounter - 1, _receiver, _amount); // Log the new spending request
    }

    // Allows stakeholders to vote on spending requests
    function approveSpending(uint _spendingId, bool _vote) external {
        require(stakeholders[msg.sender] >= minBuy, "Must be a stakeholder to vote");
        Spending storage s = spendings[_spendingId];
        require(!s.executed, "Spending already executed");
        if (_vote && !s.approvals[msg.sender]) {
            s.approvalCount += stakeholders[msg.sender] / minBuy; // Increase the approval count based on the stakeholder's share
        }
        s.approvals[msg.sender] = _vote;
        emit Vote(msg.sender, _vote); // Log the vote
    }

    // Allows the admin to execute a spending request if it has enough approvals
    function executeSpending(uint _spendingId) external {
        require(msg.sender == admin, "Only admin can execute spending");
        Spending storage s = spendings[_spendingId];
        require(!s.executed, "Spending already executed");
        require((s.approvalCount * 100 / tokenCounter) >= spendingMinVotePercent, "Not enough approvals");
        s.executed = true;
        payable(s.receiver).transfer(s.amount); // Transfer the specified amount to the receiver
        emit SpendingExecuted(_spendingId); // Log the execution
    }
}
