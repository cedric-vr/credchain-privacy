import logo from './logo.svg';
import './App.css';

import Web3 from 'web3';
import { contractAbi, contractAddress } from './utils/constants';
import { useEffect, useState } from 'react';

const web3 = new Web3("ws://localhost:8545")
const didContract = new web3.eth.Contract(contractAbi, contractAddress);

// attempted to follow this tutorial 
// https://medium.com/coinmonks/build-a-web-3-application-with-solidity-hardhat-react-and-web3js-61b7ff137885
// generates a DID and prints to the console, but allows to do it only once (revert of second attempt)

// another helpful boilerplate to use...
// https://hardhat.org/tutorial/boilerplate-project
// https://github.com/NomicFoundation/hardhat-boilerplate/tree/master/frontend 

function App() {
	const [newIdentity, setNewDID] = useState(""); 
	const [identity, createDID] = useState(""); 

	useEffect(() => async() => {
		const newDID = await registerIdentity();
		createDID(newDID); 
	}, [])

	const registerIdentity = async() => {
		let issuer = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"; // account 2
		let holder = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // account 1
		let now = new Date(); 
		let ubaasDID = web3.utils.sha3(issuer + now); 
		const register = await didContract.methods.register(holder, ubaasDID).send({ from: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'}); 
		const did = await didContract.methods.getInfo(holder).call(); 
		console.log(did[0]); 
		return did[0]; 
	}

	return (
		<div className='App'>
			<button className='read' onClick={() => registerIdentity}>
				Generate DID
			</button>
		</div>
	);
}

export default App;
