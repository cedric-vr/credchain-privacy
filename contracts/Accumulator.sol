// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IssuerRegistry.sol"; 
import "./SubAccumulator.sol";
import "./BytesLib.sol";

contract Accumulator {

    // reference for implementation: https://eprint.iacr.org/2017/043.pdf 

    // credential has to be mapped to a prime => not disclosing credential it self to the contract 
    // because it is a large prime, the collision is negligable 
    // when credential issued, it is mapped to a prime 

    using BytesLib for bytes;

    bytes globalAcc; 
    bytes n;
    bytes g; 

    struct Bitmap {
        uint256 bitmap;         // bitmap value 
        bytes staticAcc;        // static accumulator of bitmap 
    }

    mapping(uint256 => Bitmap) bitmaps; 

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
        globalAcc = _globalAcc;                 // global accumulator updated
        numBitmaps = epoch;  
    }

    // // copyright: https://github.com/oleiba/RSA-accumulator
    // base is proof / membership witness of static acc
    // e is prime of element verifying for 
    function verifyElement(bytes memory base, bytes32 e) public returns (bool) {
        // Count the loops required for base (blocks of 32 bytes)
        uint base_length = base.length;
        uint loops_base = (base_length + 31) / 32;
        // Count the loops required for modulus (blocks of 32 bytes)
        uint modulus_length = n.length;
        uint loops_modulus = (modulus_length + 31) / 32;
        bytes memory _modulus = n;

        bytes memory p;
        // are all of these inside the precompile now?
        assembly {
        // define pointer
            p := mload(0x40)
        // store data assembly-favouring ways
            mstore(p, base_length)

            mstore(add(p, 0x20), 0x180)  // Length of Base
            mstore(add(p, 0x40), 0x20)  // Length of Exponent
            mstore(add(p, 0x60), 0x180)  // Length of Modulus

            for { let i := 0 } lt(i, loops_base) { i := add(1, i) } { mstore(add(add(p, 0x80), mul(32, i)), mload(add(base, mul(32, add(i, 1))))) }  // Base

            mstore(add(p, 0x200), e)  // Exponent

        // Add the contents of b to the array
            for { let i := 0 } lt(i, loops_modulus) { i := add(1, i) } { mstore(add(add(p, 0x220), mul(32, i)), mload(add(_modulus, mul(32, add(i, 1))))) }  // Modulus

        // call modexp precompile!
            let success := call(sub(gas(), 2000), 0x05, 0, add(p, 0x20), 0x380, add(p, 0x20), 0x180)

        // gas fiddling
            switch success case 0 {
                revert(0, 0)
            }
        // data
            mstore(0x40, add(p, add(0x20, base_length)))
        // o := p
        }

        return p.equal(globalAcc);
    }

}