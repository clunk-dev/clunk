// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @notice 300 reusable identities, each redeemable for exactly 50,000 CLUNK.
/// @dev No withdrawal, upgrade or backing-token replacement function. Standard non-rebasing ERC20 only.
contract ClunkVault is ERC721Enumerable, ReentrancyGuard, Ownable2Step {
    using SafeERC20 for IERC20;
    using Strings for uint256;
    uint256 public constant MAX_IDENTITIES = 300;
    IERC20 public immutable backingToken;
    uint8 public immutable tokenDecimals;
    uint256 public immutable backingAmount;
    string public metadataBaseURI;
    bool public mintOpen;
    mapping(address => bool) public directMintUsed;

    error MintClosed();
    error DirectMintAlreadyUsed();
    error CollectionFull();
    error NotCurrentOwner();
    error UnsupportedToken();
    error InvalidConfiguration();
    event IdentityMinted(address indexed owner, uint256 indexed tokenId, uint256 backing);
    event IdentityRedeemed(address indexed owner, uint256 indexed tokenId, uint256 backing);
    event MintOpenChanged(bool open);

    constructor(address token, address administrator, string memory baseURI)
        ERC721("Clunk Identities", "CLUNK-NFT") Ownable(administrator)
    {
        if (token.code.length == 0 || bytes(baseURI).length == 0) revert InvalidConfiguration();
        uint8 decimals_ = IERC20Metadata(token).decimals();
        if (decimals_ > 36) revert InvalidConfiguration();
        backingToken = IERC20(token);
        tokenDecimals = decimals_;
        backingAmount = 50_000 * 10 ** uint256(decimals_);
        metadataBaseURI = baseURI;
        // Closed by default; opening requires an explicit administrator transaction.
    }

    function setMintOpen(bool open) external onlyOwner {
        mintOpen = open;
        emit MintOpenChanged(open);
    }

    /// @notice Lowest available identity; deterministic, never advertised as random.
    function nextAvailableId() public view returns (uint256) {
        for (uint256 i = 1; i <= MAX_IDENTITIES; ++i) {
            if (_ownerOf(i) == address(0)) return i;
        }
        return 0;
    }

    /// @param expectedId Guards against another mint changing the identity while the wallet is open.
    function mint(uint256 expectedId) external nonReentrant returns (uint256 id) {
        if (!mintOpen) revert MintClosed();
        if (directMintUsed[msg.sender]) revert DirectMintAlreadyUsed();
        id = nextAvailableId();
        if (id == 0) revert CollectionFull();
        if (id != expectedId) revert InvalidConfiguration();
        directMintUsed[msg.sender] = true;
        uint256 beforeBalance = backingToken.balanceOf(address(this));
        backingToken.safeTransferFrom(msg.sender, address(this), backingAmount);
        if (backingToken.balanceOf(address(this)) != beforeBalance + backingAmount) revert UnsupportedToken();
        _safeMint(msg.sender, id);
        if (backingToken.balanceOf(address(this)) < totalBacking()) revert UnsupportedToken();
        emit IdentityMinted(msg.sender, id, backingAmount);
    }

    /// @notice Only the current owner can redeem, including while minting is closed.
    function redeem(uint256 id) external nonReentrant {
        if (ownerOf(id) != msg.sender) revert NotCurrentOwner();
        uint256 ownerBefore = backingToken.balanceOf(msg.sender);
        uint256 vaultBefore = backingToken.balanceOf(address(this));
        _burn(id);
        backingToken.safeTransfer(msg.sender, backingAmount);
        if (backingToken.balanceOf(msg.sender) != ownerBefore + backingAmount ||
            backingToken.balanceOf(address(this)) != vaultBefore - backingAmount) revert UnsupportedToken();
        if (backingToken.balanceOf(address(this)) < totalBacking()) revert UnsupportedToken();
        emit IdentityRedeemed(msg.sender, id, backingAmount);
    }

    function totalBacking() public view returns (uint256) { return totalSupply() * backingAmount; }

    function tokenURI(uint256 id) public view override returns (string memory) {
        _requireOwned(id);
        return string.concat(metadataBaseURI, id.toString(), ".json");
    }
}
