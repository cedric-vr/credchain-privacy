// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IssuerRegistry.sol"; 

contract Accumulator {

    // reference for implementation: https://eprint.iacr.org/2017/043.pdf 

    // credential has to be mapped to a prime => not disclosing credential it self to the contract 
    // because it is a large prime, the collision is negligable 
    // when credential issued, it is mapped to a prime 

    bytes accumulator; 
    bytes n;

    
    // uint256 current;        // keep track of how many bitmaps in the mapping 

    // id => bitmap 
    mapping(uint256 => uint256) bitmaps; 

    address issuerRegistryAddress; 
    address subAccumulatorAddress; 

    constructor(address _issuerRegistryAddress, address _subAccumulatorAddress, bytes memory _accumulator, bytes memory _n) {
        issuerRegistryAddress = _issuerRegistryAddress; 
        subAccumulatorAddress = _subAccumulatorAddress; 
        accumulator = _accumulator; 
        n = _n; 
    }

    // only issuer can add values
    // need issuer registry for this 
    modifier onlyIssuer(address _issuer) { require(Issuers(issuerRegistryAddress).checkIssuer(_issuer)); _; }


    // get the accumulator and n values stored in contract 
    function getAccumulator() public view returns(bytes memory, bytes memory) {
        return (accumulator, n); 
    }

    function getBitmap(uint256 _id) public returns(uint256) {
        // require(_id == keccak256(abi.encodePacked(bitmaps[_id])), "id is not correct"); 
        
    }

    // add value to accumulator 
    // only registered issuers can do this 
    function add(uint256 _bitmap) public returns(bytes memory, uint256) {
        // uint256 id = keccak256(abi.encodePacked(_bitmap)); 
        // bitmaps[id] = _bitmap; 
        
        return (accumulator, _bitmap); 
    }

    // verify credential membership in the accumulator 
    // anyone can call this function 
    function verMem(uint256 _credential, uint256 _witness, uint256 _accumulator) public {
        // do we need an actual non-membership calulation? 
        // can we just evaluate membership instead? 
        // a = w^x mod n 
        // if a == 1, then member 
        // if a == 0, then non-member
    }

    // // update witness for the given credential 
    // function UpdWit(uint256 _credential) public {

    // }

}