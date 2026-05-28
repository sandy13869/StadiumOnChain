// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import {ERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

contract TokenizedAccess is
    ERC721Upgradeable,
    ERC721URIStorageUpgradeable,
    ERC2981Upgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable
{
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    struct TicketData {
        uint256 eventId;
        uint8 accessLevel;
        string seat;
    }

    uint256 private _tokenIdCounter;
    mapping(uint256 => TicketData) private _tickets;
    mapping(uint256 => mapping(address => uint256)) private _eventBalances;

    uint256[50] private __gap;

    event TicketMinted(address indexed to, uint256 indexed tokenId, uint256 indexed eventId, uint8 accessLevel, string seat);

    function initialize(
        string memory name_,
        string memory symbol_,
        address royaltyReceiver,
        uint96 royaltyFeeNumerator,
        address defaultAdmin
    ) external initializer {
        __ERC721_init(name_, symbol_);
        __ERC721URIStorage_init();
        __ERC2981_init();
        __AccessControl_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(PAUSER_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, defaultAdmin);

        _setDefaultRoyalty(royaltyReceiver, royaltyFeeNumerator);
    }

    function mintTicket(
        address to,
        uint256 eventId,
        uint8 accessLevel,
        string calldata seat,
        string calldata uri
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        _tickets[tokenId] = TicketData({
            eventId: eventId,
            accessLevel: accessLevel,
            seat: seat
        });

        _eventBalances[eventId][to]++;

        emit TicketMinted(to, tokenId, eventId, accessLevel, seat);
        return tokenId;
    }

    function hasTicketForEvent(address owner, uint256 eventId) external view returns (bool) {
        return _eventBalances[eventId][owner] > 0;
    }

    function getTicketData(uint256 tokenId) external view returns (TicketData memory) {
        require(_ownerOf(tokenId) != address(0), "TokenizedAccess: token does not exist");
        return _tickets[tokenId];
    }

    function setDefaultRoyaltyConfig(address receiver, uint96 feeNumerator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _update(address to, uint256 tokenId, address auth) internal override whenNotPaused returns (address) {
        address from = _ownerOf(tokenId);

        if (from != address(0) && tokenId <= _tokenIdCounter) {
            uint256 eventId = _tickets[tokenId].eventId;
            if (from != address(0)) {
                _eventBalances[eventId][from]--;
            }
            if (to != address(0)) {
                _eventBalances[eventId][to]++;
            }
        }

        return super._update(to, tokenId, auth);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable, ERC2981Upgradeable, AccessControlUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
