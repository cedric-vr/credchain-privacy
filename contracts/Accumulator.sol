// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IssuerRegistry.sol"; 
import "./SubAccumulator.sol";

contract Accumulator {

    // reference for implementation: https://eprint.iacr.org/2017/043.pdf 

    // credential has to be mapped to a prime => not disclosing credential it self to the contract 
    // because it is a large prime, the collision is negligable 
    // when credential issued, it is mapped to a prime 

    bytes globalAcc; 
    bytes n;
    bytes g; 

    struct Bitmap {
        uint256 bitmap;         // bitmap value 
        bytes staticAcc;        // static accumulator of bitmap 
        // bytes product; 
    }

    mapping(uint256 => Bitmap) bitmaps; 

    // uint256 current;        // keep track of how many bitmaps in the mapping 

    // id => bitmap 
    // mapping(uint256 => uint256) bitmaps; 
    // id => bitmap => static acc 
    // mapping(uint256 => mapping(uint256 => bytes)) bitmaps; 
    uint256 numBitmaps; 

    address issuerRegistryAddress; 
    address subAccumulatorAddress; 

    constructor(address _issuerRegistryAddress, address _subAccumulatorAddress, bytes memory _g, bytes memory _n) {
        issuerRegistryAddress = _issuerRegistryAddress; 
        subAccumulatorAddress = _subAccumulatorAddress; 
        globalAcc = _g; 
        n = _n; 
        g = _g; 
    }

    // only issuer can add values
    // need issuer registry for this 
    modifier onlyIssuer(address _issuer) { require(Issuers(issuerRegistryAddress).checkIssuer(_issuer)); _; }


    // get the accumulator and n values stored in contract 
    function getGlobalAcc() public view returns(bytes memory, bytes memory, bytes memory) {
        return (globalAcc, n, g); 
    }

    function getStaticAcc(uint256 _id) public view returns(uint256, bytes memory) {
        return (bitmaps[_id].bitmap, bitmaps[_id].staticAcc); 
    }

    function getHistoryLen() public view returns(uint256) {
        return numBitmaps; 
    }

    // add value to accumulator 
    // only registered issuers can do this 
    // only called when epoch ended and new bitmap added to the mapping
    function update(uint256 _bitmap, bytes memory _staticAcc, bytes memory _globalAcc) public {
        // get the current epoch value 
        SubAccumulator acc = SubAccumulator(subAccumulatorAddress); 
        uint256 epoch = acc.getEpoch(); 

        bitmaps[epoch].bitmap = _bitmap;        // bitmap 
        bitmaps[epoch].staticAcc = _staticAcc;  // static accumulator
        // bitmaps[epoch].product = _product;      // update product of accs
        globalAcc = _globalAcc;                 // global accumulator updated
        numBitmaps = epoch;  
    }

    // verify credential membership in the accumulator 
    // anyone can call this function 
    function verMem() public {
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