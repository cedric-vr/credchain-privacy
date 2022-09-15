// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AdminAccounts {

    // notes the platform owner accounts, which have the right to manage 
    // issuers and manipulate their DIDs in Issuer Registry 

    address admin;                          // current administrator of the platform
    address temporaryAdmin;                 // for ownership change 

    bool delegated;                         // whether delegates were set up 
    uint256 delegatesNo;                    // total number of delegates 
    address[] delegates;                    // // list of delegates that can help recovering the identity 

    bool agreeing;                          // indicates if there's an outstanding request for admin change  
    uint256 aThreshold;                     // the minimum number of votes of delegates to replace the ownership
    uint256 uThreshold;                     // update threshold to help to recover identity 
    mapping (address => bool) agreeState;   // voting results of each address


    modifier onlyAdmin() { require(msg.sender == admin); _; }

    // anyone can register as an admin - need modification 
    function registerAdmin() public {
        admin = msg.sender; 
    }

    function changeAdmin(address _newAdmin) public onlyAdmin() {
        admin = _newAdmin; 
    }

    function isAdmin(address _admin) public view returns(bool) {
        if (admin == _admin) { return true; }
        else { return false; }
    }

    function setupDelegate(uint256 _aThreshold, uint256 _uThreshold, address[] memory _delegates) public {
        require(delegated == true, "The delegate already set up"); 
        delegatesNo = _delegates.length; 
        aThreshold = _aThreshold;
        uThreshold = _uThreshold; 
        delegates = _delegates; 
        agreeing = false;

        for (uint256 i = 0; i < delegatesNo; i++) {
            agreeState[_delegates[i]] = false;
        }
        delegated = true; 
    }

    function recoverAdminRequest() public {
        require(agreeing == false, ""); 
        temporaryAdmin = msg.sender; 
        agreeing = true; 
    }

    function recoverAdmin() public {
        if (agreeResult()) {
            admin = temporaryAdmin; 
            delete temporaryAdmin; 
            agreeing = false; 
            for (uint256 i = 0; i < delegatesNo; i++) {
                agreeState[delegates[i]] == false; 
            }
        }
    }

    function agreeResult() internal view returns(bool) {
        uint256 k = 0; 
        for (uint256 i = 0; i < delegatesNo; i++) {
            if (agreeState[delegates[i]] == true) { k++; }
        }
        if (k >= aThreshold) { return true; }
        else { return false; }
    } 

}