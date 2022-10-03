// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IssuerRegistry.sol"; 

contract SubAccumulator {

    // copyright: https://github.com/wanseob/solidity-bloom-filter

    address issuerRegistryAddress;

    bool lock = false;              // lock for initial set up functions 

    struct Filter {
        uint8 hashCount;            // how many hashes for element 
        uint256 bitmap;             // whole bitmap 
        uint256 capacity;           // total capacity filter can hold 
        uint256 currentCount;       // track how many elements has been added 
        uint256 currentEpoch;       // track the id of the epoch 
    }

    Filter public filter; 

    constructor(address _issuerRegistryAddress) { 
        issuerRegistryAddress = _issuerRegistryAddress; 
        filter.currentEpoch = 1; 
    }

    modifier initiated(bool _status) { require(lock == _status); _; }

    // UTILITY FUNCTIONS ----------------------------------------------------

    /** 
     * @dev    get the bitmap infromation 
     * @return uint256 latest bitmap 
     * @return uint8 number of hash functions required 
     *
     */
    function getFilter() public view returns(uint256, uint256, uint256, uint256, uint256) {
        return (filter.bitmap, filter.hashCount, filter.currentCount, filter.capacity, filter.currentEpoch); 
    }

    /**
     * @dev   storing the latest bitmap, anyone can access;
     *        increase counter by 1 every time bitmap updated
     * @param _bitmap latest bitmap to store in contract
     */
    function updateBitmap(uint256 _bitmap) public {
        filter.bitmap = _bitmap; filter.currentCount++; 
    }

    /**
     * @dev   update the number of hash func required and capacity
     *        called once during deployment 
     * @param _hashCount how many hashes are required
     */
    function updateHashCount(uint8 _hashCount, uint256 _capacity) public initiated(false) {
        lock = true; // lock this function, no one can change hash count and capacity 
        filter.hashCount = _hashCount; filter.capacity = _capacity; 
    }

    /**
     * @dev helper function to reset lock to false 
     * TODO: restrict access who can unlock
     */
    function updateLock() public initiated(true) {
        lock = false; 
    }

    /**
     * @dev once the filter is reset, update the epoch count 
     * TODO: move this function inside addToBitmap so that when 
     *       bitmap is 0, new epoch started 
     */
    function updateEpoch() public {
        // check that the epoch actually ended 
        require(filter.currentCount + 10 == filter.capacity, "capacity has not been reached");
        filter.currentEpoch++; 
    }
   
    // BITMAP FUNCTIONS -----------------------------------------------------
    
    /**
     * @dev It returns how many times it should be hashed, when the expected
     *      number of input items is _itenNum.
     * @param _itemNum Expected number of input items
     */
    function getHashCount(uint _itemNum) public pure returns(uint8) {
        uint numOfHash = (256 * 144) / (_itemNum * 100) + 1;
        if(numOfHash < 256) return uint8(numOfHash);
        else return 255;
    }

    /**
     * @dev It returns updated bitmap when a new item is added into the bitmap
     * @param _bitmap Original bitmap
     * @param _hashCount How many times to hash. You should use the same value with the one
                         which is used for the original bitmap.
     * @param _item Hash value of an item
     */
    function addToBitmap(uint256 _bitmap, uint8 _hashCount, bytes32 _item) public pure returns(uint256 _newBitmap) {
        // if (_bitmap == 0) { filter.currentEpoch++; }
        _newBitmap = _bitmap;
        require(_hashCount > 0, "Hash count can not be zero");
        for(uint i = 0; i < _hashCount; i++) {
            uint256 position = uint256(keccak256(abi.encodePacked(_item, i))) % 256;
            require(position < 256, "Overflow error");
            uint256 digest = 1 << position;
            _newBitmap = _newBitmap | digest; // logical NOT 
        }
        return _newBitmap;
    }

    /**
     * @dev It returns it may exist or definitely not exist.
     * @param _bitmap Original bitmap
     * @param _hashCount How many times to hash. You should use the same value with the one
                         which is used for the original bitmap.
     * @param _item Hash value of an item
     */
    function falsePositive(uint256 _bitmap,  uint8 _hashCount, bytes32 _item) public pure returns(bool _probablyPresent){
        require(_hashCount > 0, "Hash count can not be zero");
        for(uint i = 0; i < _hashCount; i++) {
            uint256 position = uint256(keccak256(abi.encodePacked(_item, i))) % 256;
            require(position < 256, "Overflow error");
            uint256 digest = 1 << position;
            if(_bitmap != _bitmap | digest) return false;
        }
        return true;
    }

}