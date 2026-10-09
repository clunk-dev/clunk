// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ClunkVault} from "../ClunkVault.sol";
contract MockToken is ERC20 {
    uint8 private immutable precision;
    bool public taxed;
    constructor(uint8 d) ERC20("Test token", "TOKEN") { precision=d; }
    function decimals() public view override returns(uint8){return precision;}
    function faucet(address to,uint256 amount) external {_mint(to,amount);}
    function setTax(bool value) external {taxed=value;}
    function _update(address from,address to,uint256 amount) internal override {
        if(taxed && from!=address(0) && to!=address(0)){super._update(from,address(0),amount/100);super._update(from,to,amount-amount/100);}
        else super._update(from,to,amount);
    }
}
contract ReentrantReceiver is IERC721Receiver {
    ClunkVault public vault;
    bool public attempted;
    constructor(ClunkVault v){vault=v;}
    function run(MockToken token) external {token.approve(address(vault),type(uint256).max);vault.mint(vault.nextAvailableId());}
    function onERC721Received(address,address,uint256 id,bytes calldata) external returns(bytes4){
        attempted=true;
        try vault.redeem(id) {revert("Reentrancy succeeded");} catch {}
        return this.onERC721Received.selector;
    }
}
contract RejectReceiver is IERC721Receiver {
    function run(MockToken token,ClunkVault vault) external {token.approve(address(vault),type(uint256).max);vault.mint(vault.nextAvailableId());}
    function onERC721Received(address,address,uint256,bytes calldata) external pure returns(bytes4){revert("No NFTs");}
}
contract MintActor is IERC721Receiver {
    constructor(MockToken token,ClunkVault vault){token.faucet(address(this),vault.backingAmount());token.approve(address(vault),vault.backingAmount());vault.mint(vault.nextAvailableId());}
    function onERC721Received(address,address,uint256,bytes calldata) external pure returns(bytes4){return this.onERC721Received.selector;}
}
contract BatchMint {
    function run(MockToken token,ClunkVault vault,uint256 count) external {for(uint256 i=0;i<count;i++){new MintActor(token,vault);}}
}
