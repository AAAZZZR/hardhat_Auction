const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const hre = require("hardhat");

describe("SmartContract", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployInitialFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    // Contracts are deployed using the first signer/account by default
    const Auction = await hre.ethers.getContractFactory("Auction");
    const auctionContract = await Auction.deploy();
  
    await auctionContract.deployed();
    return {Auction,auctionContract, owner,addr1,addr2};


  }
  describe("Deployment", function(){
    it("set right owner",async function(){
      const {owner,auctionContract} = await loadFixture(deployInitialFixture);
      expect(await auctionContract.owner()).to.equal(owner.address);
    })


  })

  describe("function placeBid", function(){
    it("owner cannot call it",async function(){
      const {owner,auctionContract} = await loadFixture(deployInitialFixture);
      await expect(auctionContract.connect(owner).placeBid()).to.be.reverted;
    })

    it("currentBid > highestBindingBid ",async function(){
      const {auctionContract,addr1,addr2} = await loadFixture(deployInitialFixture);
      await auctionContract.connect(addr1).placeBid({value:1});
      await expect(auctionContract.connect(addr2).placeBid({value:1})).to.be.reverted;
    })

    it("Test who is higher bidder",async function(){
      const {auctionContract,addr2} = await loadFixture(deployInitialFixture);
      await auctionContract.connect(addr2).placeBid({value:2});
      expect(await auctionContract.highestBidder()).to.equal(addr2.address);
    })
  })


  describe("finalizedAuction", function () {
    describe("Validations", function () {
      it("Should revert with the right error if called too soon", async function () {
        const { lock } = await loadFixture(deployOneYearLockFixture);

        await expect(lock.withdraw()).to.be.revertedWith
          "You can't withdraw yet"
      });
    });

      it("Should revert with the right error if called from another account", async function () {
        const { lock, unlockTime, otherAccount } = await loadFixture(
          deployOneYearLockFixture
        );

        // We can increase the time in Hardhat Network
        await time.increaseTo(unlockTime);

        // We use lock.connect() to send a transaction from another account
        await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
          "You aren't the owner"
        );
      });

      it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
        const { lock, unlockTime } = await loadFixture(
          deployOneYearLockFixture
        );

        // Transactions are sent using the first signer by default
        await time.increaseTo(unlockTime);

        await expect(lock.withdraw()).not.to.be.reverted;
      });
    });

    describe("Events", function () {
      it("Should emit an event on withdrawals", async function () {
        const { lock, unlockTime, lockedAmount } = await loadFixture(
          deployOneYearLockFixture
        );

        await time.increaseTo(unlockTime);

        await expect(lock.withdraw())
          .to.emit(lock, "Withdrawal")
          .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
      });
    });

    describe("Transfers", function () {
      it("Should transfer the funds to the owner", async function () {
        const { lock, unlockTime, lockedAmount, owner } = await loadFixture(
          deployOneYearLockFixture
        );

        await time.increaseTo(unlockTime);

        await expect(lock.withdraw()).to.changeEtherBalances(
          [owner, lock],
          [lockedAmount, -lockedAmount]
        );
      });
    });
  });

