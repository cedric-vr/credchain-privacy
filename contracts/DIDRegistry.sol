// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DID {

    struct PublicKey {                          // ethereum accounts as public keys, signatures and cryptographic operations
        uint256 id; 
        address controller;                     // the owner of the public key 
        address keyValue; 
    }

    struct ServiceEndPoint {                    // used for interactions amount DIDs 
        uint256 id; 
        string endpointType; 
        string endpointURL; 
    }
    
    struct DDO {                                // DID Document describing how to use DID, unique identifier for a relationship 
        address id;                             // ethereum address of identity owner 
        address owner;                          // original identity owner 
        address newOwner;                       // the identity ownership update in case for recovery process

        string did;                             // issuer account address + time now ??? 

        uint256 keyNo; 
        mapping (uint256 => PublicKey) keys;    // unique idetifier => sub-key, used to sign txs for diff identity accounts

        uint256 endpointNo; 
        mapping (uint256 => ServiceEndPoint) endpoints; // describes the interaction infromation to other DIDs

        bool agreeing;                          // indicates if there's an outstanding request for ownership recovery 
        bool delegated; 
        string[] delegates;                     // list of delegates that can help recovering the identity 
        uint256 delegatesNo;                    // total number of delegates 

        uint256 aThreshold;                     // the minimum number of votes of delegates to replace the ownership
        uint256 uThreshold;                     // update threshold to help to recover identity 
        mapping (string => bool) agreeState;    // voting results 

        
    }

    mapping (address => DDO) private identity;  // DID has a single DDO 
    mapping (address => bool) registered; 
    mapping (address => bool) revoked; 

    modifier onlyOwner (address _id) { require(msg.sender == identity[_id].owner); _; }


    /* DID DOCUMENT FUNCTIONS ----------------------------------------------------------------------------------------- */

    function register(address _id, string memory _did) public {
        require (registered[_id] == false, "the DID document already exists");
        require (revoked[_id] == false, "the DID document has been revoked");
        registered[_id] = true; 
        identity[_id].id =  _id; 
        identity[_id].owner = msg.sender; 
        identity[_id].did = _did; 
        identity[_id].delegated = false; 
        identity[_id].keyNo = 0;
        identity[_id].endpointNo = 0; 
    }


    /* PUBLIC KEY FUNCTIONS ------------------------------------------------------------------------------------------- */

    function addPublicKey(address _id, address _controller, address _keyValue) public onlyOwner(_id) {
        require (_keyValue != address(0), "the key value is null");
        identity[_id].keyNo++; 
        identity[_id].keys[identity[_id].keyNo].id = identity[_id].keyNo; 
        identity[_id].keys[identity[_id].keyNo].controller = _controller; 
        identity[_id].keys[identity[_id].keyNo].keyValue = _keyValue; 
    }

    function removePublicKey(address _id, uint256 _item) public onlyOwner(_id) {
        identity[_id].keyNo--; 
        for (uint256 i = _item; i <= identity[_id].keyNo; i++) {
            identity[_id].keys[i] = identity[_id].keys[i + 1]; 
            identity[_id].keys[i].id--; 
        }
        delete identity[_id].keys[_item]; 
    }

    function getPublicKey(address _id, uint256 _item) public view returns(uint256, address, address) {
        return (identity[_id].keys[_item].id, identity[_id].keys[_item].controller, identity[_id].keys[_item].keyValue); 
    }


    /* SERVICE ENDPOINT FUNCTIONS ------------------------------------------------------------------------------------- */

    function addServicePoint(address _id, string memory _type, string memory _url) public onlyOwner(_id) {
        identity[_id].endpointNo++; 
        identity[_id].endpoints[identity[_id].endpointNo].id = identity[_id].endpointNo;
        identity[_id].endpoints[identity[_id].endpointNo].endpointType = _type;
        identity[_id].endpoints[identity[_id].endpointNo].endpointURL = _url; 
    }

    function removeServicePoint(address _id, uint256 _item) public onlyOwner(_id) {
        identity[_id].endpointNo--;
        for (uint256 i = _item; i <= identity[_id].endpointNo; i++) {
            identity[_id].endpoints[i] = identity[_id].endpoints[i + 1];
            identity[_id].endpoints[i].id--; 
        }
        delete identity[_id].endpoints[_item]; 
    } 

    function getServicePoint(address _id, uint256 _item) public view returns(uint256, string memory, string memory) {
        return (identity[_id].endpoints[_item].id, identity[_id].endpoints[_item].endpointType, identity[_id].endpoints[_item].endpointURL); 
    }

    
    /* DID DOCUMENT FUNCTIONS ----------------------------------------------------------------------------------------- */

    function getInfo(address _id) public view returns(string memory, uint256, uint256) {
        return (identity[_id].did, identity[_id].keyNo, identity[_id].endpointNo); 
    }

    function getDID(address _id) public view returns(string memory) {
        return (identity[_id].did); 
    }

    function recoverDID(address _id) public {
        require (identity[_id].agreeing == false, "agreeing is true"); 
        identity[_id].newOwner = msg.sender; 
        identity[_id].agreeing = true; 
    }

    
    /* REVOCATION FUNCTIONS ------------------------------------------------------------------------------------------- */

    function revokeIdentity(address _id) public onlyOwner(_id) {
        delete identity[_id]; 
        registered[_id] = true; 
        revoked[_id] = true; 
    }


    /* DELEGATE FUNCTIONS --------------------------------------------------------------------------------------------- */
    
    // update to access list of delegates and push them all to the identity 
    function addDelegate(address _id, string memory _delegate) public {
        require (identity[_id].delegated == false, "the delegate exists");
        identity[_id].delegates.push(_delegate);
        identity[_id].agreeState[_delegate] = false; 
    }

    // // updated function: the delegates can be uploaded as a single list 
    // function addDelegate(address _id, string[] memory _delegates) public {
    //     require (identity[_id].delegated == false, "the delegate exists");
    //     uint256 length = _delegates.length; 
    //     for (uint256 i = 0; i < length; i++) {
    //         identity[_id].delegates.push(_delegates[i]); 
    //         identity[_id].agreeState[_delegates[i]] = false; 
    //     }
    // }

    function setupDelegate(address _id, uint256 _aThreshold, uint256 _uThreshold) public {
        require (identity[_id].delegated == false, "the delegate exists"); 
        identity[_id].aThreshold = _aThreshold;
        identity[_id].uThreshold = _uThreshold;
        identity[_id].agreeing = false; 
        identity[_id].delegatesNo = identity[_id].delegates.length; 
        identity[_id].delegated = true; 
    }

    /* VOTING FUNCTIONS ----------------------------------------------------------------------------------------------- */

    function vote(address _id) public {
        identity[_id].agreeState[identity[msg.sender].did] = true; 
    }

    /* RECOVERY FUNCTIONS --------------------------------------------------------------------------------------------- */
    
    function recoverAdmin(address _id) public {
        if (agreeResult(_id)) {
            identity[_id].owner = identity[_id].newOwner; 
            delete identity[_id].newOwner; 
            identity[_id].agreeing = false; 
            for (uint256 i = 0; i < identity[_id].delegatesNo; i++) {
                identity[_id].agreeState[identity[_id].delegates[i]] = false; 
            }
        }
    }

    function agreeResult(address _id) internal view returns(bool) {
        uint256 k = 0; 
        for (uint256 i = 0; i < identity[_id].delegatesNo; i++) {
            if (identity[_id].agreeState[identity[_id].delegates[i]] == true) { k++; }
        }
        if (k >= identity[_id].aThreshold) { return true; }
        else { return false; }
    }

}