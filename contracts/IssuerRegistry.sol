// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./AdminAccountRegistry.sol"; 

contract IssuerRegistry {

    // issuer registry stores addresses that are eligible to issue credentials 
    // issuer can only be added and removed only by the admin (single admin?)
    // issuer registry is required because only issuer can revoke a credential 

    // modifications done: 
    // removed arrays issuerDID and issuerID, and replaced with mapping registry 
    // since the only purpose of this contract is to verify that the caller of 
    // the function is eligible to generate/revoke credential for the user;
    // thus, we only need to know whether their public key (address) is in 
    // the registry 
    // not quite sure why we need to have issuer DID here

    // only the original issuer of the credential can revoke it 

    // issuer ID (address) => issuer DID => true/false
    // mapping(address => mapping(string => bool)) public registry;
    // issuer DID => true/false
    // mapping(string => bool) public dids; 
    // issuer address (ID) => true/false
    mapping(address => bool) public registry; 

    // mapping(string => bool) public registryDID; 

    address adminRegistryAddress; 

    constructor(address _adminRegistryAddress) {
        adminRegistryAddress = _adminRegistryAddress; 
    }

    // modifier onlyAdmin() { require(AdminAccounts(adminRegistryAddress).isAdmin(msg.sender)); _; }

    // only admin can add issuer to the registry 
    function addIssuer(address _address) public /*onlyAdmin()*/ {
        registry[_address] = true; 
    }

    function deleteIssuer(address _address) public /*onlyAdmin()*/ {
        delete registry[_address]; 
    }

    function checkIssuer(address _address) external view returns(bool) {
        if (registry[_address]) { return true; }
        return false; 
    }
    
    // string[] issuerDID; // bytes memory 
    // address[] issuerID; 

    // function addIssuer(string memory _did, address _address) public onlyAdmin() {
    //     issuerDID.push(_did);
    //     issuerID.push(_address); 
    // }

    //     // issuer should be bytes memory or bytes32 
    // function getPublicKey(string memory _issuer) public view returns(address) {
    //     for (uint256 i = 0; i < issuerDID.length; i++) {
    //         if (keccak256(abi.encodePacked(issuerDID[i])) == keccak256(abi.encodePacked(_issuer))) {
    //             return issuerID[i]; 
    //         }
    //     }
    //     return address(0); 
    // }

    // function checkIssuer(string memory _issuer) public view returns(bool) {
    //     for (uint256 i = 0; i < issuerDID.length; i++) {
    //         if (keccak256(abi.encodePacked(issuerDID[i])) == keccak256(abi.encodePacked(_issuer))) {
    //             return true; 
    //         }
    //     }
    //     return false; 
    // }

}