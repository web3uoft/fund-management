// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// Import ERC20 token contract from OpenZeppelin
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Define the W3BToken contract, inheriting from ERC20
contract W3BToken is ERC20 {
    /**
     * @dev Constructor initializes the W3B Fund Management Token.
     * It mints 10 million W3B tokens to the deployer's address.
     */
    constructor() ERC20("W3B Fund Management Token", "W3B") {
        // Mint 10 million tokens to the contract deployer
        // Note: Solidity uses the smallest unit of the token, similar to wei in Ethereum.
        // Therefore, to mint 10 million tokens, we specify the amount in wei.
        _mint(msg.sender, 10000000 * (10 ** uint256(decimals())));
    }
}
