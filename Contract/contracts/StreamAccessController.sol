// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IStreamToken} from "./interfaces/IStreamToken.sol";

contract StreamAccessController is AccessControlUpgradeable, PausableUpgradeable {
    using SafeERC20 for IERC20;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    struct AccessRecord {
        uint256 eventId;
        uint256 expiresAt;
        bool active;
    }

    IERC20 public sprxToken;
    IERC20 public stablecoin;
    address public ticketContract;

    uint256 public sprxPerStable;
    uint256 public stableCostPerMinute;
    uint256 public feeBps;
    uint256 public accumulatedFees;

    mapping(address => mapping(uint256 => AccessRecord)) public userAccess;

    uint256 private _locked;

    uint256[50] private __gap;

    event AccessGranted(address indexed user, uint256 indexed eventId, uint256 expiresAt);
    event TokensPurchased(address indexed buyer, uint256 stableAmount, uint256 sprxAmount);
    event TokensSold(address indexed seller, uint256 sprxAmount, uint256 stableAmount, uint256 fee);
    event FeesWithdrawn(address indexed to, uint256 amount);
    event RatesUpdated(uint256 sprxPerStable, uint256 stableCostPerMinute, uint256 feeBps);

    modifier nonReentrant() {
        require(_locked == 1, "StreamAccessController: reentrant call");
        _locked = 2;
        _;
        _locked = 1;
    }

    function initialize(
        address streamToken_,
        address ticketContract_,
        address stablecoin_,
        uint256 sprxPerStable_,
        uint256 stableCostPerMinute_,
        uint256 feeBps_,
        address defaultAdmin
    ) external initializer {
        __AccessControl_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(PAUSER_ROLE, defaultAdmin);
        _grantRole(OPERATOR_ROLE, defaultAdmin);

        sprxToken = IERC20(streamToken_);
        ticketContract = ticketContract_;
        stablecoin = IERC20(stablecoin_);
        sprxPerStable = sprxPerStable_;
        stableCostPerMinute = stableCostPerMinute_;
        feeBps = feeBps_;

        _locked = 1;
    }

    function burnForAccess(
        uint256 eventId,
        uint256 accessMinutes,
        uint256 burnAmount
    ) external nonReentrant whenNotPaused {
        uint256 requiredBurn = _calculateBurnAmount(accessMinutes);
        require(burnAmount >= requiredBurn, "StreamAccessController: insufficient burn amount");

        IStreamToken(address(sprxToken)).burnFrom(msg.sender, burnAmount);

        uint256 expiresAt = block.timestamp + (accessMinutes * 1 minutes);
        userAccess[msg.sender][eventId] = AccessRecord({
            eventId: eventId,
            expiresAt: expiresAt,
            active: true
        });

        emit AccessGranted(msg.sender, eventId, expiresAt);
    }

    function payStableForAccess(
        uint256 eventId,
        uint256 accessMinutes
    ) external nonReentrant whenNotPaused {
        uint256 cost = stableCostPerMinute * accessMinutes;
        uint256 fee = (cost * feeBps) / 10000;
        uint256 totalCost = cost + fee;

        stablecoin.safeTransferFrom(msg.sender, address(this), totalCost);
        accumulatedFees += fee;

        uint256 expiresAt = block.timestamp + (accessMinutes * 1 minutes);
        userAccess[msg.sender][eventId] = AccessRecord({
            eventId: eventId,
            expiresAt: expiresAt,
            active: true
        });

        emit AccessGranted(msg.sender, eventId, expiresAt);
    }

    function buyTokens(uint256 stableAmount) external nonReentrant whenNotPaused {
        uint256 sprxAmount = stableAmount * sprxPerStable * 1e12;
        require(sprxAmount > 0, "StreamAccessController: amount too low");

        stablecoin.safeTransferFrom(msg.sender, address(this), stableAmount);
        sprxToken.safeTransfer(msg.sender, sprxAmount);

        emit TokensPurchased(msg.sender, stableAmount, sprxAmount);
    }

    function sellTokens(uint256 sprxAmount) external nonReentrant whenNotPaused {
        require(sprxAmount > 0, "StreamAccessController: amount must be greater than 0");

        uint256 stableAmount = (sprxAmount * 1e6) / (sprxPerStable * 1e18);
        uint256 fee = (stableAmount * feeBps) / 10000;
        uint256 netStable = stableAmount - fee;

        require(netStable > 0, "StreamAccessController: amount too low after fees");

        sprxToken.safeTransferFrom(msg.sender, address(this), sprxAmount);
        stablecoin.safeTransfer(msg.sender, netStable);
        accumulatedFees += fee;

        emit TokensSold(msg.sender, sprxAmount, netStable, fee);
    }

    function hasAccess(address user, uint256 eventId) external view returns (bool) {
        AccessRecord memory record = userAccess[user][eventId];
        return record.active && record.expiresAt > block.timestamp;
    }

    function withdrawFees(address to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 fees = accumulatedFees;
        require(fees > 0, "StreamAccessController: no fees to withdraw");
        accumulatedFees = 0;
        stablecoin.safeTransfer(to, fees);
        emit FeesWithdrawn(to, fees);
    }

    function setRates(
        uint256 newSprxPerStable,
        uint256 newStableCostPerMinute,
        uint256 newFeeBps
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newSprxPerStable > 0, "StreamAccessController: invalid rate");
        require(newFeeBps <= 1000, "StreamAccessController: fee too high");

        sprxPerStable = newSprxPerStable;
        stableCostPerMinute = newStableCostPerMinute;
        feeBps = newFeeBps;

        emit RatesUpdated(newSprxPerStable, newStableCostPerMinute, newFeeBps);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _calculateBurnAmount(uint256 accessMinutes) internal view returns (uint256) {
        uint256 stableCost = stableCostPerMinute * accessMinutes;
        return stableCost * sprxPerStable * 1e12;
    }
}
