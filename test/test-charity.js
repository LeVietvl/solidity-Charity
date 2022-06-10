const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("Charity", function () {
  let [fundRaiser1, fundRaiser2, donator1, donator2, donator3, recipient] = []
  let charity
  let amount = ethers.utils.parseEther("100")
  let address0 = "0x0000000000000000000000000000000000000000"
  beforeEach(async () => {
    [fundRaiser1, fundRaiser2, donator1, donator2, donator3, recipient] = await ethers.getSigners();

    const Charity = await ethers.getContractFactory("Charity");
    charity = await Charity.deploy()
    await charity.deployed()

  })

  describe("create a charity", function () {
    it("should revert if target amount = 0", async function () {
      await expect(charity.connect(fundRaiser1).createCharity(0, recipient.address)).to.be.revertedWith("Charity: targetAmount must be greater than 0")
    });
    it("should revert if recipient = address(0)", async function () {
      await expect(charity.connect(fundRaiser1).createCharity(amount, address0)).to.be.revertedWith("Charity: recipient must be different from address 0")
    });
    it("should create charity correctly)", async function () {
      const charityTx1 = await charity.connect(fundRaiser1).createCharity(amount, recipient.address)
      const blockNum1 = await ethers.provider.getBlockNumber()
      const block1 = await ethers.provider.getBlock(blockNum1)
      await expect(charityTx1).to.be.emit(charity, "CreateCharity").withArgs(1, fundRaiser1.address, amount, recipient.address, false, false, block1.timestamp)

      const charityTx2 = await charity.connect(fundRaiser2).createCharity(amount.mul(2), recipient.address)
      const blockNum2 = await ethers.provider.getBlockNumber()
      const block2 = await ethers.provider.getBlock(blockNum2)
      await expect(charityTx2).to.be.emit(charity, "CreateCharity").withArgs(2, fundRaiser2.address, amount.mul(2), recipient.address, false, false, block2.timestamp)
    });
  })

  describe("cancel a charity", function () {
    beforeEach(async () => {
      await charity.connect(fundRaiser1).createCharity(amount, recipient.address)
      await charity.connect(fundRaiser2).createCharity(amount.mul(2), recipient.address)
    });
    it("should revert if charityID does not exist", async function () {
      await expect(charity.connect(fundRaiser1).cancelCharity(3)).to.be.revertedWith("Charity: CharityId does not existed")
    });
    it("should revert if the caller is not the creator", async function () {
      await expect(charity.connect(fundRaiser1).cancelCharity(2)).to.be.revertedWith("Charity: The caller is not the creator")
    });
    it("should revert if the charity is aldready executed", async function () {
      await charity.connect(donator1).donate(1, { value: ethers.utils.parseEther("200") })
      await charity.connect(fundRaiser1).excuteCharity(1)
      await expect(charity.connect(fundRaiser1).cancelCharity(1)).to.be.revertedWith("Charity: The charity is aldready executed")
    });
    it("should revert if the charity is aldready removed", async function () {
      await charity.connect(fundRaiser1).cancelCharity(1)
      await expect(charity.connect(fundRaiser1).cancelCharity(1)).to.be.revertedWith("Charity: The charity is aldready removed")
    });
    it("should cancel charity correctly", async function () {
      await charity.connect(fundRaiser1).cancelCharity(1)
      const charityTx = await charity.charities(1)
      expect(charityTx.isRemoved).to.be.equal(true)
    });
  })
  describe("donate", function () {
    beforeEach(async () => {
      await charity.connect(fundRaiser1).createCharity(amount, recipient.address)
      await charity.connect(fundRaiser2).createCharity(amount.mul(2), recipient.address)
    });
    it("should revert if charityID does not exist", async function () {
      await expect(charity.connect(donator1).donate(3)).to.be.revertedWith("Charity: CharityId does not existed")
    });
    it("should revert if the charity is aldready executed", async function () {
      await charity.connect(donator1).donate(1, { value: ethers.utils.parseEther("200") })
      await charity.connect(fundRaiser1).excuteCharity(1)
      await expect(charity.connect(fundRaiser1).donate(1)).to.be.revertedWith("Charity: The charity is aldready executed")
    });
    it("should revert if the charity is aldready removed", async function () {
      await charity.connect(fundRaiser1).cancelCharity(1)
      await expect(charity.connect(donator1).donate(1)).to.be.revertedWith("Charity: The charity is aldready removed")
    });
    it("should donate correctly", async function () {
      const donateTx1 = await charity.connect(donator1).donate(1, { value: ethers.utils.parseEther("50") })
      await expect(donateTx1).to.be.emit(charity, "Donate").withArgs(1, donator1.address, ethers.utils.parseEther("50"))
      const charityTx1 = await charity.charities(1)
      expect(charityTx1.totalCharityAmount).to.be.equal(ethers.utils.parseEther("50"))
      const charityAmountTx1 = await charity.charityAmount(1, donator1.address)
      expect(charityAmountTx1).to.be.equal(ethers.utils.parseEther("50"))
      const charityBalance1 = await ethers.provider.getBalance(charity.address)
      expect(charityBalance1).to.be.equal(ethers.utils.parseEther("50"))

      const donateTx2 = await charity.connect(donator1).donate(1, { value: ethers.utils.parseEther("50") })
      await expect(donateTx2).to.be.emit(charity, "Donate").withArgs(1, donator1.address, ethers.utils.parseEther("50"))
      const charityTx2 = await charity.charities(1)
      expect(charityTx2.totalCharityAmount).to.be.equal(ethers.utils.parseEther("100"))
      const charityAmountTx2 = await charity.charityAmount(1, donator1.address)
      expect(charityAmountTx2).to.be.equal(ethers.utils.parseEther("100"))
      const charityBalance2 = await ethers.provider.getBalance(charity.address)
      expect(charityBalance2).to.be.equal(ethers.utils.parseEther("100"))

      const donateTx3 = await charity.connect(donator2).donate(2, { value: ethers.utils.parseEther("120") })
      await expect(donateTx3).to.be.emit(charity, "Donate").withArgs(2, donator2.address, ethers.utils.parseEther("120"))
      const charityTx3 = await charity.charities(2)
      expect(charityTx3.totalCharityAmount).to.be.equal(ethers.utils.parseEther("120"))
      const charityAmountTx3 = await charity.charityAmount(2, donator2.address)
      expect(charityAmountTx3).to.be.equal(ethers.utils.parseEther("120"))
      const charityBalance3 = await ethers.provider.getBalance(charity.address)
      expect(charityBalance3).to.be.equal(ethers.utils.parseEther("220"))
    });
  })

  describe("undonate", function () {
    beforeEach(async () => {
      await charity.connect(fundRaiser1).createCharity(amount, recipient.address)
      await charity.connect(donator1).donate(1, { value: ethers.utils.parseEther("50") })
      await charity.connect(donator2).donate(1, { value: ethers.utils.parseEther("30") })
    });
    it("should revert if the caller have not donated yet", async function () {
      await expect(charity.connect(donator3).unDonate(1)).to.be.revertedWith("Charity: You have not doneted yet")
    });
    it("should revert if the charity is aldready executed", async function () {
      await charity.connect(donator1).donate(1, { value: ethers.utils.parseEther("100") })
      await charity.connect(fundRaiser1).excuteCharity(1)
      await expect(charity.connect(donator1).unDonate(1)).to.be.revertedWith("Charity: The charity is aldready executed")
    });
    it("should undonate correctly", async function () {
      await charity.connect(donator1).unDonate(1)
      const charityTx = await charity.charities(1)
      expect(charityTx.totalCharityAmount).to.be.equal(ethers.utils.parseEther("30"))
      const charityAmountTx = await charity.charityAmount(1, donator1.address)
      expect(charityAmountTx).to.be.equal(0)
      const charityBalance = await ethers.provider.getBalance(charity.address)
      expect(charityBalance).to.be.equal(ethers.utils.parseEther("30"))
    });
  })
  describe("execute charity", function () {
    beforeEach(async () => {
      await charity.connect(fundRaiser1).createCharity(amount, recipient.address)
      await charity.connect(donator1).donate(1, { value: ethers.utils.parseEther("50") })
      await charity.connect(donator2).donate(1, { value: ethers.utils.parseEther("30") })
    });
    it("should revert if the caller is not the creator", async function () {
      await expect(charity.connect(fundRaiser2).excuteCharity(1)).to.be.revertedWith("Charity: The caller is not the creator")
    });
    it("should revert if the charity is aldready executed", async function () {
      await charity.connect(donator3).donate(1, { value: ethers.utils.parseEther("20") })
      await charity.connect(fundRaiser1).excuteCharity(1)
      await expect(charity.connect(fundRaiser1).excuteCharity(1)).to.be.revertedWith("Charity: The charity is aldready executed")
    });
    it("should revert if the charity is aldready canceled", async function () {
      await charity.connect(donator3).donate(1, { value: ethers.utils.parseEther("20") })
      await charity.connect(fundRaiser1).cancelCharity(1)
      await expect(charity.connect(fundRaiser1).excuteCharity(1)).to.be.revertedWith("Charity: The charity is aldready removed")
    });
    it("should execute correctly", async function () {
      await charity.connect(donator3).donate(1, { value: ethers.utils.parseEther("20") })
      const executeCharityTx = await charity.connect(fundRaiser1).excuteCharity(1)
      await expect(executeCharityTx).to.be.emit(charity, "ExecuteCharity").withArgs(1, ethers.utils.parseEther("100"))
      const charityTx = await charity.charities(1)
      expect(charityTx.isExecuted).to.be.equal(true)
      const charityBalance = await ethers.provider.getBalance(charity.address)
      expect(charityBalance).to.be.equal(0)
    });
  })
})