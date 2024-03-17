const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FundManagement", () => {
  let Token, token, owner, addr1, addr2, addr3, addr4, addr5, addr6;

  beforeEach(async () => {
    [owner, addr1, addr2, addr3, addr4, addr5, addr6] =
      await ethers.getSigners();
    Token = await ethers.getContractFactory("FundManagement");
    token = await Token.deploy(owner.address);
  });

  describe("Deployment", () => {
    it("should set the right owner", async () => {
      expect(await token.admin()).to.equal(owner.address);
    });

    it("allows depositing exactly the minimum required amount", async () => {
      await token
        .connect(addr1)
        .deposit({ value: ethers.utils.parseEther("0.1") });
      const balance = await token.stakeholders(addr1.address);
      expect(balance).to.equal(ethers.utils.parseEther("0.1"));
    });

    it("reverts when depositing less than the minimum required amount", async () => {
      await expect(
        token
          .connect(addr1)
          .deposit({ value: ethers.utils.parseEther("0.099") })
      ).to.be.revertedWith("Deposit below minimum threshold");
    });

    it("checks for the exact deposit amount matching message value", async () => {
      await expect(
        token.connect(addr1).deposit({ value: ethers.utils.parseEther("0") })
      ).to.be.revertedWith("Deposit below minimum threshold");
    });
  });

  describe("Creating a Spending Request", () => {
    it("requires admin privileges to create a spending request", async () => {
      await expect(
        token
          .connect(addr1)
          .createSpending(addr2.address, ethers.utils.parseEther("1"), "A gift")
      ).to.be.revertedWith("Admin rights required");
    });

    it("allows admin to create a spending request", async () => {
      await token
        .connect(owner)
        .createSpending(
          addr2.address,
          ethers.utils.parseEther("1"),
          "A gift from owner"
        );
      const spending = await token.spendings(0);
      expect(spending.purpose).to.equal("A gift from owner");
      expect(spending.receiver).to.equal(addr2.address);
      expect(spending.amount.toString()).to.equal(
        ethers.utils.parseEther("1").toString()
      );
    });
  });

  describe("Approving and Executing Spending Request", () => {
    beforeEach(async () => {
      // Setup: owner creates a spending request and stakeholders deposit funds
      await setupSpendingAndDeposits();
    });

    it("only allows stakeholders to approve spending requests", async () => {
      await expect(
        token.connect(addr7).approveSpending(0, true)
      ).to.be.revertedWith("Must be a stakeholder to vote");
    });

    it("allows stakeholders to approve spending requests and aggregates approvals correctly", async () => {
      await approveSpendingByStakeholders();
      const spending = await token.spendings(0);
      // Calculate the expected approval count based on the test setup
      const expectedApprovalCount = calculateApprovalCount([
        addr1,
        addr2,
        addr3,
        addr4,
      ]);
      expect(spending.approvalCount).to.equal(expectedApprovalCount);
    });

    it("allows executing spending request with sufficient approvals", async () => {
      await approveSpendingByStakeholders();
      await expect(token.connect(owner).executeSpending(0))
        .to.emit(token, "SpendingExecuted")
        .withArgs(0);
      const spending = await token.spendings(0);
      expect(spending.executed).to.be.true;
    });

    it("prevents executing spending requests without sufficient approvals", async () => {
      // Simulate only partial approvals not meeting the required threshold
      await token.connect(addr1).approveSpending(0, true);
      await expect(token.connect(owner).executeSpending(0)).to.be.revertedWith(
        "Spending has not met the minimum vote percent"
      );
    });

    it("prevents executing a spending request more than once", async () => {
      await approveSpendingByStakeholders();
      await token.connect(owner).executeSpending(0);
      await expect(token.connect(owner).executeSpending(0)).to.be.revertedWith(
        "Spending already executed"
      );
    });
  });

  // Helper functions to set up the environment for tests
  async function setupSpendingAndDeposits() {
    // Owner creates a spending request
    await token
      .connect(owner)
      .createSpending(
        addr2.address,
        ethers.utils.parseEther("1"),
        "A gift from owner"
      );
    // Stakeholders deposit funds
    const deposits = [
      { signer: addr1, amount: "0.1" },
      { signer: addr2, amount: "0.1" },
      { signer: addr3, amount: "0.3" },
      { signer: addr4, amount: "0.2" },
      // addr5 will deposit enough to ensure a majority approval possibility
      { signer: addr5, amount: "1.0" },
    ];
    for (const { signer, amount } of deposits) {
      await token
        .connect(signer)
        .deposit({ value: ethers.utils.parseEther(amount) });
    }
  }

  async function approveSpendingByStakeholders() {
    // Stakeholders approve the spending request
    await token.connect(addr1).approveSpending(0, true);
    await token.connect(addr2).approveSpending(0, true);
    await token.connect(addr3).approveSpending(0, true);
    await token.connect(addr4).approveSpending(0, true);
  }

  function calculateApprovalCount(signers) {
    // This would calculate the expected approval count based on the deposits made by the signers
    // For simplicity, assume each approval counts as 1 regardless of deposit amount, adjust as needed
    return signers.length;
  }
});
