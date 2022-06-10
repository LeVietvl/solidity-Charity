//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/* Create a charity Forum where people can raise charity for charity purposes:
1. Everyone can create charity.
2. People feel to donate and undonate to the charity campaign.
2. After reaching the money goal, charity raiser can end the charity and send money to the recipient.
*/

contract Charity is Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _charityIdCount;

    event CreateCharity(
        uint256 indexed charityId,
        address indexed creator,
        uint256 targetAmount,
        address recipient,
        bool isExecuted,
        bool isRemoved,
        uint256 timestamp
    );

    event Donate(
        uint256 indexed charityId,
        address indexed donator,
        uint256 donationAmount
    );

    event ExecuteCharity(uint256 charityId, uint256 totalDonationAmount);

    struct CharityInfo {
        address creator;
        uint256 targetAmount;
        uint256 totalCharityAmount;
        address payable recipient;
        bool isExecuted;
        bool isRemoved;
    }

    mapping(uint256 => CharityInfo) public charities;
    mapping(uint256 => mapping(address => uint256)) public charityAmount;

    receive() external payable {}

    function createCharity(uint256 _targetAmount, address payable _recipient)
        external
    {
        require(
            _targetAmount > 0,
            "Charity: targetAmount must be greater than 0"
        );
        require(
            _recipient != address(0),
            "Charity: recipient must be different from address 0"
        );
        _charityIdCount.increment();
        uint256 _charityId = _charityIdCount.current();
        CharityInfo storage charity = charities[_charityId];
        charity.creator = _msgSender();
        charity.targetAmount = _targetAmount;
        charity.totalCharityAmount = 0;
        charity.recipient = _recipient;
        charity.isExecuted = false;
        charity.isRemoved = false;

        emit CreateCharity(
            _charityId,
            _msgSender(),
            _targetAmount,
            _recipient,
            false,
            false,
            block.timestamp
        );
    }

    function cancelCharity(uint256 _charityId) external {
        require(
            _charityId <= _charityIdCount.current(),
            "Charity: CharityId does not existed"
        );
        CharityInfo storage charity = charities[_charityId];
        require(
            charity.creator == _msgSender(),
            "Charity: The caller is not the creator"
        );
        require(
            charity.isExecuted == false,
            "Charity: The charity is aldready executed"
        );
        require(
            charity.isRemoved == false,
            "Charity: The charity is aldready removed"
        );
        charity.isRemoved = true;
    }

    function donate(uint256 _charityId) external payable {
        require(
            _charityId <= _charityIdCount.current(),
            "Charity: CharityId does not existed"
        );
        CharityInfo storage charity = charities[_charityId];
        require(
            charity.isExecuted == false,
            "Charity: The charity is aldready executed"
        );
        require(
            charity.isRemoved == false,
            "Charity: The charity is aldready removed"
        );

        charity.totalCharityAmount += msg.value;
        charityAmount[_charityId][_msgSender()] += msg.value;
        emit Donate(_charityId, _msgSender(), msg.value);
    }

    function unDonate(uint256 _charityId) external payable {
        require(
            charityAmount[_charityId][_msgSender()] > 0,
            "Charity: You have not doneted yet"
        );
        CharityInfo storage charity = charities[_charityId];
        require(
            charity.isExecuted == false,
            "Charity: The charity is aldready executed"
        );
        uint256 unDonatedAmount = charityAmount[_charityId][_msgSender()];
        charity.totalCharityAmount -= unDonatedAmount;
        charityAmount[_charityId][_msgSender()] = 0;
        payable(_msgSender()).transfer(unDonatedAmount);
    }

    function excuteCharity(uint256 _charityId) external payable {
        CharityInfo storage charity = charities[_charityId];
        require(
            charity.creator == _msgSender(),
            "Charity: The caller is not the creator"
        );
        require(
            charity.isExecuted == false,
            "Charity: The charity is aldready executed"
        );
        require(
            charity.isRemoved == false,
            "Charity: The charity is aldready removed"
        );
        require(
            charity.totalCharityAmount >= charity.targetAmount,
            "Charity: Not reach the target amount"
        );
        charity.isExecuted = true;
        payable(charity.recipient).transfer(charity.totalCharityAmount);

        emit ExecuteCharity(_charityId, charity.totalCharityAmount);
    }
}
