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
        // bool lock;              // lock the bitmap once its data added, so no one can change it 
        uint256 bitmap;         // bitmap value 
        bytes staticAcc;        // static accumulator of bitmap 
        bytes nextStaticAcc;    // next epoch's static accumulator 
        bytes globalAcc;        // epoch's global acc 
        bytes signature;        // signature of the issuer who added this bitmap 
        bytes32 bitmapHash;     // hash of the bitmap 
    }

    struct Transaction {
        bytes32 txsHash;        // txHash => hash(prevAcc, currAcc)
        bytes32 msgHash;        // hash of the message 
        bytes signature;        // signature for the message 
    }

    uint256 prevEpoch = 0; 

    // we can verify inclusion of staticAcc in globalAcc -> 
    // at this point in time, global acc contained the static acc 
    // thus we can trust the bitmap inclusion check 
    
    // this is a snapshot of history 
    mapping(uint256 => Bitmap) bitmaps; 

    // globalAcc => { txHash, msgHash, signature }
    mapping(bytes => Transaction) transactions; 

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
    modifier onlyIssuer(bytes32 _bitmapHash, bytes memory _signature) { require(checkIssuer(_bitmapHash, _signature) == true, "issuer is not authorised"); _; }

    event pastHash(bytes32); 

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

    function getCurrGlobalAcc(uint256 _id) public view returns(bytes memory) {
        return bitmaps[_id].globalAcc; 
    }

    function getNextStaticAcc(uint256 _id) public view returns(bytes memory) {
        return bitmaps[_id].nextStaticAcc; 
    }

    function getTx(bytes memory _acc) public view returns(bytes32) {
        return transactions[_acc].txsHash; 
    }

    // add value to accumulator 
    // only registered issuers can do this 
    // only called when epoch ended and new bitmap added to the mapping 
    function update(uint256 _bitmap, bytes memory _staticAcc, bytes memory _newGlobalAcc, bytes32 _bitmapHash, bytes memory _signature) public onlyIssuer(_bitmapHash, _signature) {
        // check if the message being passed is created by authorised issuer 
        // require(checkIssuer(_bitmapHash, _signature) == true, "issuer is not authorised"); 
        // get the current epoch value 
        SubAccumulator acc = SubAccumulator(subAccumulatorAddress); 
        uint256 epoch = acc.getEpoch(); 

        bitmaps[epoch].bitmap = _bitmap;            // bitmap 
        bitmaps[epoch].staticAcc = _staticAcc;      // static accumulator
        bitmaps[epoch].signature = _signature;      // issuer signature 
        bitmaps[epoch].bitmapHash = _bitmapHash;    // hash of the message  
        bitmaps[epoch].globalAcc = _newGlobalAcc;   // corresponding global acc for _bitmap 

        bitmaps[prevEpoch].nextStaticAcc = _staticAcc; 

        emit pastHash(keccak256(abi.encodePacked(globalAcc, _newGlobalAcc))); 

        prevEpoch = epoch;                         // set prev to new curr epoch 
        globalAcc = _newGlobalAcc;                 // global accumulator updated
    }

    // should include lock function, lock any tx updates once its been updated 
    // acc => txHash -> hash(pastAcc, currAcc) 
    function updateTx(uint256 _id, bytes32 _txHash, bytes32 _msgHash, bytes memory _signature) public onlyIssuer(_msgHash, _signature) {
        bytes memory acc = bitmaps[_id].globalAcc;     // get the corresponding acc value for epoch 
        transactions[acc].txsHash = _txHash;           // txHash related to the globalAcc value 
        transactions[acc].msgHash = _msgHash;          // signed hash of the transaction 
        transactions[acc].signature = _signature;      // signature for the hash for verification
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
    
    function verifyTransactionSignature(uint256 _id) public view returns(bool) {
        bytes memory acc = bitmaps[_id].globalAcc; 
        bytes memory sig = transactions[acc].signature; 
        bytes32 msgHash = transactions[acc].msgHash; 
        return checkIssuer(msgHash, sig); 
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
}