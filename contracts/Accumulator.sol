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
        bool lock;              // lock the bitmap once its data added, so no one can change it 
        uint256 bitmap;         // bitmap value 
        bytes staticAcc;        // static accumulator of bitmap 
        bytes signature;        // signature of the issuer who added this bitmap 
        bytes32 bitmapHash;     // hash of the bitmap 
        bytes32 transaction;    // record the tx hash where witness and global acc data can be found? 
        // bytes32 transactionSig; // sign the tx hash 
    }

    struct Signature {
        bytes32 messageHash;    // hash of the message 
        bytes signature;        // signature for this message  
    }   

    // we can verify inclusion of staticAcc in globalAcc -> 
    // at this point in time, global acc contained the static acc 
    // thus we can trust the bitmap inclusion check 
    
    // this is a snapshot of history 

    mapping(uint256 => Bitmap) bitmaps; 
    // txHash => (message hash, signature)
    mapping(bytes32 => Signature) signTx;
    // 
    // mapping(bytes32 => Signature) signBitmap;

    // uint256 numBitmaps; 
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
    modifier onlyIssuer(address _issuer) { require(IssuerRegistry(issuerRegistryAddress).checkIssuer(_issuer)); _; }


    // get the accumulator and n values stored in contract 
    function getGlobalAcc() public view returns(bytes memory, bytes memory, bytes memory) {
        return (globalAcc, n, g); 
    }

    function getModulus() public view returns(bytes memory) {
        return (n); 
    }

    // can remove static acc, only need bitmap 
    function getStaticAcc(uint256 _id) public view returns(uint256, bytes memory) {
        return (bitmaps[_id].bitmap, bitmaps[_id].staticAcc); 
    }

    function getTx(uint256 _id) public view returns(bytes32) {
        return bitmaps[_id].transaction; 
    }

    event pastStaticAcc(bytes); 
    event pastGlobalAcc(bytes); 
    event pastHash(bytes32); 
    event signature(bytes32, bytes); 

    bytes globalAcc_; 
    function updateAcc(bytes memory _globalAcc) public {
        globalAcc_ = _globalAcc; 
    }

    // add value to accumulator 
    // only registered issuers can do this 
    // only called when epoch ended and new bitmap added to the mapping 
    function update(uint256 _bitmap, bytes memory _staticAcc, bytes memory _newGlobalAcc, bytes32 _bitmapHash, bytes memory _signature) public /*returns(bytes memory, bytes memory)*/ {
        // check if the message being passed is created by authorised issuer 
        require(checkIssuer(_bitmapHash, _signature) == true, "issuer is not authorised"); 
        // get the current epoch value 
        SubAccumulator acc = SubAccumulator(subAccumulatorAddress); 
        uint256 epoch = acc.getEpoch(); 

        bitmaps[epoch].bitmap = _bitmap;            // bitmap 
        bitmaps[epoch].staticAcc = _staticAcc;      // static accumulator
        bitmaps[epoch].signature = _signature;      // issuer signature 
        bitmaps[epoch].bitmapHash = _bitmapHash;    // hash of the message  

        emit pastStaticAcc(_staticAcc); 
        emit pastGlobalAcc(globalAcc); 
        emit pastHash(keccak256(abi.encodePacked(globalAcc, _newGlobalAcc))); 

        globalAcc = _newGlobalAcc;                 // global accumulator updated
    }

    // should include lock function, lock any tx updates once its been updated 
    // acc => txHash -> hash(pastAcc, currAcc) 
    function updateTx(uint256 _id, bytes32 _txHash, bytes32 _msgHash, bytes memory _signature) public {
        // check if the message being passed is created by authorised issuer 
        require(checkIssuer(_msgHash, _signature) == true, "issuer is not authorised"); 
        bitmaps[_id].transaction = _txHash; 
        signTx[_txHash].messageHash = _msgHash;
        signTx[_txHash].signature = _signature; 
    }

    function checkIssuer(bytes32 _bitmapHash, bytes memory _signature) internal view returns(bool) {
        // recover address of the issuer 
        address issuer = recoverSigner(_bitmapHash, _signature); 
        // check if signer authentic issuer 
        IssuerRegistry iss = IssuerRegistry(issuerRegistryAddress); 
        if (iss.checkIssuer(issuer) == true) { return true; }
        else { return false; }
    }

    function verifyBitmapSignature(uint256 _epoch) public view returns(bool) {
        bytes32 bitmapHash_ = bitmaps[_epoch].bitmapHash;
        bytes memory signature_ = bitmaps[_epoch].signature; 
        return checkIssuer(bitmapHash_, signature_); 
    }
    
    function verifyTransactionSignature(bytes32 _txHash) public view returns(bool) {
        bytes32 messageHash_ = signTx[_txHash].messageHash; 
        bytes memory signature_ = signTx[_txHash].signature; 
        return checkIssuer(messageHash_, signature_); 
    }

    function verifyHash(bytes memory _acci, bytes memory _accj, bytes32 _targetHash) public pure returns(bool) {
        if (keccak256(abi.encodePacked(_acci, _accj)) == _targetHash) { return true; }
        else { return false; }
    }

    /**
     * @notice functions recovers the signer of the certificate from the provided certificate 
               (message signed by authority) and signature 
     * @dev    called internally from placeBid function  
     * @return signer address (authority who issued/signed the certificate to the bidder)
    **/
    // copyright: https://github.com/protofire/zeppelin-solidity/blob/master/contracts/ECRecovery.sol
    function recoverSigner(bytes32 hash, bytes memory sig) internal pure returns(address) {
        bytes32 r; bytes32 s; uint8 v;
        //Check the signature length
        if (sig.length != 65) { return (address(0)); }
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        if (v < 27) { v += 27; }

        // If the version is correct return the signer address
        if (v != 27 && v != 28) { return (address(0)); } 
        else { return ecrecover(hash, v, r, s); }
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