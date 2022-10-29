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
        bytes txHash;           // record the tx hash where witness and global acc data can be found? 
    }

    // we can verify inclusion of staticAcc in globalAcc -> 
    // at this point in time, global acc contained the static acc 
    // thus we can trust the bitmap inclusion check 
    
    // this is a snapshot of history 

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

    // function getPastGlobalAcc(uint256 _id) public view returns(bytes memory, bytes memory, bytes memory) {
    //     return (bitmaps[_id].globalAcc, bitmaps[_id].witness, n); 
    // }

    function getHistoryLen() public view returns(uint256) {
        return numBitmaps; 
    }

    function getTx(uint256 _id) public view returns(bytes memory) {
        return bitmaps[_id].txHash; 
    }

    // witness for the static acc in acc 
    event proof(bytes _proof, bytes _acc); 
    event witness(bytes _wintess, bytes _acc); 
    event accValue(bytes _acc); 

    // add value to accumulator 
    // only registered issuers can do this 
    // only called when epoch ended and new bitmap added to the mapping 
    function update(uint256 _bitmap, bytes memory _staticAcc, bytes memory _globalAcc, bytes memory _w) public /*returns(bytes memory, bytes memory)*/ {
        // get the current epoch value 
        SubAccumulator acc = SubAccumulator(subAccumulatorAddress); 
        uint256 epoch = acc.getEpoch(); 
        bitmaps[epoch].bitmap = _bitmap;        // bitmap 
        bitmaps[epoch].staticAcc = _staticAcc;  // static accumulator
        globalAcc = _globalAcc;                 // global accumulator updated
        numBitmaps = epoch;  
        // emit proof(_proof, _globalAcc); 
        emit witness(_w, _globalAcc);
        // emit accValue(_globalAcc); 
    }

    function updateTx(bytes memory _txHash, uint256 _id) public {
        bitmaps[_id].txHash = _txHash; 
    }

    // on-chain verification option 
    // copyright: https://github.com/oleiba/RSA-accumulator

    // function verify(bytes memory base, bytes32 e) public returns (bool) {
    //     // Count the loops required for base (blocks of 32 bytes)
    //     uint base_length = base.length;
    //     uint loops_base = (base_length + 31) / 32;
    //     // Count the loops required for modulus (blocks of 32 bytes)
    //     uint modulus_length = n.length;
    //     uint loops_modulus = (modulus_length + 31) / 32;
    //     bytes memory _modulus = n;

    //     bytes memory p;
    //     // are all of these inside the precompile now?
    //     assembly {
    //     // define pointer
    //         p := mload(0x40)
    //     // store data assembly-favouring ways
    //         mstore(p, base_length)

    //         mstore(add(p, 0x20), 0x180)  // Length of Base
    //         mstore(add(p, 0x40), 0x20)  // Length of Exponent
    //         mstore(add(p, 0x60), 0x180)  // Length of Modulus

    //         for { let i := 0 } lt(i, loops_base) { i := add(1, i) } { mstore(add(add(p, 0x80), mul(32, i)), mload(add(base, mul(32, add(i, 1))))) }  // Base

    //         mstore(add(p, 0x200), e)  // Exponent

    //     // Add the contents of b to the array
    //         for { let i := 0 } lt(i, loops_modulus) { i := add(1, i) } { mstore(add(add(p, 0x220), mul(32, i)), mload(add(_modulus, mul(32, add(i, 1))))) }  // Modulus

    //     // call modexp precompile!
    //         let success := call(sub(gas(), 2000), 0x05, 0, add(p, 0x20), 0x380, add(p, 0x20), 0x180)

    //     // gas fiddling
    //         switch success case 0 {
    //             revert(0, 0)
    //         }
    //     // data
    //         mstore(0x40, add(p, add(0x20, base_length)))
    //     // o := p
    //     }

    //     // return p.equal(globalAcc);
    //     return equal(p, globalAcc); 
    // }

    // function equal(bytes memory _preBytes, bytes memory _postBytes) internal pure returns (bool) {
    //     bool success = true;

    //     assembly {
    //         let length := mload(_preBytes)

    //     // if lengths don't match the arrays are not equal
    //         switch eq(length, mload(_postBytes))
    //         case 1 {
    //         // cb is a circuit breaker in the for loop since there's
    //         //  no said feature for inline assembly loops
    //         // cb = 1 - don't breaker
    //         // cb = 0 - break
    //             let cb := 1

    //             let mc := add(_preBytes, 0x20)
    //             let end := add(mc, length)

    //             for {
    //                 let cc := add(_postBytes, 0x20)
    //             // the next line is the loop condition:
    //             // while(uint(mc < end) + cb == 2)
    //             } eq(add(lt(mc, end), cb), 2) {
    //                 mc := add(mc, 0x20)
    //                 cc := add(cc, 0x20)
    //             } {
    //             // if any of these checks fails then arrays are not equal
    //                 if iszero(eq(mload(mc), mload(cc))) {
    //                 // unsuccess:
    //                     success := 0
    //                     cb := 0
    //                 }
    //             }
    //         }
    //         default {
    //         // unsuccess:
    //             success := 0
    //         }
    //     }

    //     return success;
    // }
}