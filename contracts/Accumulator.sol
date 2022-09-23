// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IssuerRegistry.sol"; 

contract Accumulator {

    // reference for implementation: https://eprint.iacr.org/2017/043.pdf 

    // credential has to be mapped to a prime => not disclosing credential it self to the contract 
    // because it is a large prime, the collision is negligable 
    // when credential issued, it is mapped to a prime 

    // public values 
    // accumulator value 
    uint256 accumulator; 
    uint256 n;              // mod n 

    address issuerRegistryAddress; 

    constructor(address _issuerRegistryAddress) {
        issuerRegistryAddress = _issuerRegistryAddress; 
    }

    // only issuer can add values
    // need issuer registry for this 
    modifier onlyIssuer(address _issuer) { require(Issuers(issuerRegistryAddress).checkIssuer(_issuer)); _; }

    // generate accumulator 
    function Gen() public {

    }

    // add value to accumulator 
    // only registered issuers can do this 
    function Add(uint256 _credential) public onlyIssuer(msg.sender) {
        // check if prime 
    }

    // verify credential membership in the accumulator 
    // anyone can call this function 
    function VerMem(uint256 _credential, uint256 _witness, uint256 _accumulator) public {
        // do we need an actual non-membership calulation? 
        // can we just evaluate membership instead? 
        // a = w^x mod n 
        // if a == 1, then member 
        // if a == 0, then non-member
    }

    // update witness for the given credential 
    function UpdWit(uint256 _credential) public {

    }

}