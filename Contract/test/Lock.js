const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Tokenized SPRX Integration Tests", function () {
  async function deployFixture() {
    const [admin, user1, user2] = await ethers.getSigners();

    const StreamToken = await ethers.getContractFactory("StreamToken");
    const streamToken = await upgrades.deployProxy(
      StreamToken,
      ["Stream Token", "SPRX", ethers.parseEther("1000000"), admin.address],
      { initializer: "initialize", kind: "transparent" }
    );
    await streamToken.waitForDeployment();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await upgrades.deployProxy(MockUSDC, [], {
      initializer: "initialize",
      kind: "transparent",
    });
    await usdc.waitForDeployment();

    const TokenizedAccess = await ethers.getContractFactory("TokenizedAccess");
    const ticket = await upgrades.deployProxy(
      TokenizedAccess,
      ["Stream Access NFT", "SPRXNFT", admin.address, 250, admin.address],
      { initializer: "initialize", kind: "transparent" }
    );
    await ticket.waitForDeployment();

    const StreamAccessController = await ethers.getContractFactory("StreamAccessController");
    const controller = await upgrades.deployProxy(
      StreamAccessController,
      [
        await streamToken.getAddress(),
        await ticket.getAddress(),
        await usdc.getAddress(),
        100, 10000, 100, admin.address,
      ],
      { initializer: "initialize", kind: "transparent" }
    );
    await controller.waitForDeployment();

    const controllerAddr = await controller.getAddress();
    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

    await streamToken.grantRole(MINTER_ROLE, controllerAddr);
    await ticket.grantRole(MINTER_ROLE, controllerAddr);

    await streamToken.transfer(controllerAddr, ethers.parseEther("500000"));
    await usdc.mint(controllerAddr, 1000000000);

    await usdc.mint(user1.address, 1000000000);
    await streamToken.transfer(user1.address, ethers.parseEther("10000"));
    await streamToken.transfer(user2.address, ethers.parseEther("10000"));

    return { streamToken, usdc, ticket, controller, admin, user1, user2 };
  }

  describe("Test 1: Deployment and Initial State", function () {
    it("Should deploy all contracts with correct initial state", async function () {
      const { streamToken, usdc, ticket, controller, admin } = await loadFixture(deployFixture);

      expect(await streamToken.name()).to.equal("Stream Token");
      expect(await streamToken.symbol()).to.equal("SPRX");
      expect(await streamToken.totalSupply()).to.equal(ethers.parseEther("1000000"));

      expect(await ticket.name()).to.equal("Stream Access NFT");
      expect(await ticket.symbol()).to.equal("SPRXNFT");

      expect(await controller.sprxPerStable()).to.equal(100);
      expect(await controller.stableCostPerMinute()).to.equal(10000);
      expect(await controller.feeBps()).to.equal(100);
      expect(await controller.sprxToken()).to.equal(await streamToken.getAddress());
      expect(await controller.stablecoin()).to.equal(await usdc.getAddress());
      expect(await controller.ticketContract()).to.equal(await ticket.getAddress());

      const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
      const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));
      const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
      const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));

      expect(await streamToken.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await streamToken.hasRole(MINTER_ROLE, admin.address)).to.be.true;
      expect(await controller.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await controller.hasRole(PAUSER_ROLE, admin.address)).to.be.true;
      expect(await controller.hasRole(OPERATOR_ROLE, admin.address)).to.be.true;
      expect(await streamToken.hasRole(MINTER_ROLE, await controller.getAddress())).to.be.true;
      expect(await ticket.hasRole(MINTER_ROLE, await controller.getAddress())).to.be.true;
    });
  });

  describe("Test 2: Buy SPRX Tokens with USDC", function () {
    it("Should allow buying SPRX tokens with USDC", async function () {
      const { usdc, streamToken, controller, user1 } = await loadFixture(deployFixture);
      const controllerAddr = await controller.getAddress();

      const stableAmount = 1000000;
      const expectedSprx = ethers.parseEther("100");

      await usdc.connect(user1).approve(controllerAddr, stableAmount);

      const sprxBalanceBefore = await streamToken.balanceOf(user1.address);
      const usdcBalanceBefore = await usdc.balanceOf(user1.address);

      await controller.connect(user1).buyTokens(stableAmount);

      const sprxBalanceAfter = await streamToken.balanceOf(user1.address);
      const usdcBalanceAfter = await usdc.balanceOf(user1.address);

      expect(sprxBalanceAfter - sprxBalanceBefore).to.equal(expectedSprx);
      expect(usdcBalanceBefore - usdcBalanceAfter).to.equal(stableAmount);
    });
  });

  describe("Test 3: Burn SPRX for Access", function () {
    it("Should grant access when burning SPRX tokens", async function () {
      const { streamToken, controller, user1 } = await loadFixture(deployFixture);
      const controllerAddr = await controller.getAddress();

      const eventId = 1;
      const accessMinutes = 60;
      const burnAmount = ethers.parseEther("60");

      await streamToken.connect(user1).approve(controllerAddr, burnAmount);

      const sprxBalanceBefore = await streamToken.balanceOf(user1.address);

      await controller.connect(user1).burnForAccess(eventId, accessMinutes, burnAmount);

      const sprxBalanceAfter = await streamToken.balanceOf(user1.address);
      expect(sprxBalanceBefore - sprxBalanceAfter).to.equal(burnAmount);

      const hasAccess = await controller.hasAccess(user1.address, eventId);
      expect(hasAccess).to.be.true;

      const record = await controller.userAccess(user1.address, eventId);
      expect(record.active).to.be.true;
      expect(record.eventId).to.equal(eventId);
      expect(record.expiresAt).to.be.gt(0);
    });
  });

  describe("Test 4: Mint NFT Ticket for Event", function () {
    it("Should mint NFT ticket and track event ownership", async function () {
      const { ticket, user1 } = await loadFixture(deployFixture);

      const eventId = 1;
      const tx = await ticket.mintTicket(user1.address, eventId, 1, "A1", "ipfs://QmTest123");
      await tx.wait();

      expect(await ticket.ownerOf(1)).to.equal(user1.address);
      expect(await ticket.hasTicketForEvent(user1.address, eventId)).to.be.true;
      expect(await ticket.hasTicketForEvent(user1.address, 999)).to.be.false;

      const data = await ticket.getTicketData(1);
      expect(data.eventId).to.equal(eventId);
      expect(data.accessLevel).to.equal(1);
      expect(data.seat).to.equal("A1");
      expect(await ticket.tokenURI(1)).to.equal("ipfs://QmTest123");
    });
  });

  describe("Test 5: Access Expires Correctly", function () {
    it("Should deny access after expiration", async function () {
      const { streamToken, controller, user1 } = await loadFixture(deployFixture);
      const controllerAddr = await controller.getAddress();

      const eventId = 2;
      const accessMinutes = 1;
      const burnAmount = ethers.parseEther("1");

      await streamToken.connect(user1).approve(controllerAddr, burnAmount);
      await controller.connect(user1).burnForAccess(eventId, accessMinutes, burnAmount);

      expect(await controller.hasAccess(user1.address, eventId)).to.be.true;

      await time.increase(120);

      expect(await controller.hasAccess(user1.address, eventId)).to.be.false;
    });
  });

  describe("Test 6: Sell SPRX Tokens for USDC", function () {
    it("Should allow selling SPRX tokens for USDC with fee deduction", async function () {
      const { streamToken, usdc, controller, user1 } = await loadFixture(deployFixture);
      const controllerAddr = await controller.getAddress();

      const sprxAmount = ethers.parseEther("100");
      const expectedStable = 1000000;
      const fee = 10000;
      const netStable = 990000;

      await streamToken.connect(user1).approve(controllerAddr, sprxAmount);

      const sprxBalanceBefore = await streamToken.balanceOf(user1.address);
      const usdcBalanceBefore = await usdc.balanceOf(user1.address);

      await controller.connect(user1).sellTokens(sprxAmount);

      const sprxBalanceAfter = await streamToken.balanceOf(user1.address);
      const usdcBalanceAfter = await usdc.balanceOf(user1.address);

      expect(sprxBalanceBefore - sprxBalanceAfter).to.equal(sprxAmount);
      expect(usdcBalanceAfter - usdcBalanceBefore).to.equal(netStable);
      expect(await controller.accumulatedFees()).to.equal(fee);
    });
  });
});
