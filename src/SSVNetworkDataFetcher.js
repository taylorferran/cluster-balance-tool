import React, { useState } from 'react';
import { Switch } from "@headlessui/react";


const SSVNetworkDataFetcher = () => {
  const [accountAddress, setAccountAddress] = useState("");
  const [operatorIDs, setOperatorIDs] = useState([]);
  const [clusterBalance, setClusterBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testnet, setTestnet] = useState(false)
  const [error, setError] = useState(null);

  const handleNumbersChange = (e) => {
    const inputValue = e.target.value;
    const idArray = inputValue.split(',').map(item => item.trim());
    setOperatorIDs(idArray);
  };

  const holesky_url = "https://api.studio.thegraph.com/query/71118/ssv-network-holesky/version/latest";
  const mainnet_url = "https://api.studio.thegraph.com/query/71118/ssv-network-ethereum/version/latest"

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    const operatorIds = operatorIDs.map(x => x.toString())
    const clusterId = `${accountAddress.toLocaleLowerCase()}-${operatorIDs.join("-")}`


    const query = `{
      _meta {
        block {
          number
        }
      }
      daovalues(id: "0x38A4794cCEd47d3baf7370CcC43B560D3a1beEFA") {
        networkFee
        networkFeeIndex
        networkFeeIndexBlockNumber
      }
      operators(where: {id_in: ["${operatorIds.join('", "')}"]}) {
        fee
        feeIndex
        feeIndexBlockNumber
      }
      cluster(id: "${clusterId}") {
        validatorCount
        networkFeeIndex
        index
        balance
      }
    }`;

    let url 
    if(testnet) {
      url = holesky_url
    } else {
      url = mainnet_url
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
      });

      const responseData = await response.json();

      const networkFee = responseData.data.daovalues.networkFeeIndex + (responseData.data._meta.block.number - responseData.data.daovalues.networkFeeIndexBlockNumber) * responseData.data.daovalues.networkFee - (responseData.data.cluster.networkFeeIndex*10000000);

      let operatorFee = 0;
      for (const operator of responseData.data.operators) {
        const temp = (operator.feeIndex + (responseData.data._meta.block.number - operator.feeIndexBlockNumber) * operator.fee) - (responseData.data.cluster.index*10000000);
        if(temp > 0) {
          operatorFee += temp;
        }
      }

      const calculatedClusterBalance = responseData.data.cluster.balance - (networkFee + operatorFee) * responseData.data.cluster.validatorCount;
      
      setClusterBalance((calculatedClusterBalance/1000000000000000000).toFixed(3));
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("An error occurred while fetching data.");
    } finally {
      setLoading(false);
    }
  };

  return (
<div className="flex justify-center items-center min-h-screen bg-gray-100">
  <div className="bg-white shadow-md rounded-lg p-8 w-full max-w-md">
    <h2 className="text-3xl font-bold text-center mb-6">SSV Cluster Balance</h2>

    <div className="flex justify-center items-center my-6 mx-5">
      <span className="text-gray-700 font-medium mr-4">Mainnet</span>
      <Switch
        checked={testnet}
        onChange={setTestnet}
        className={`${testnet ? 'bg-red-700' : 'bg-green-700'}
          relative inline-flex h-[21px] w-[45px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75`}
      >
        <span
          aria-hidden="true"
          className={`${testnet ? 'translate-x-6' : 'translate-x-0'}
            pointer-events-none inline-block h-[17px] w-[17px] transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
        />
      </Switch>
      <span className="text-gray-700 font-medium ml-4">Holesky</span>
    </div>

    <div className="mb-4">
      <input 
        value={accountAddress} 
        onChange={(event) => setAccountAddress(event.target.value)}
        placeholder="Enter account address"
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>

    <div className="mb-4">
      <input 
        value={operatorIDs} 
        onChange={handleNumbersChange}
        placeholder="Enter operator IDs"
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>

    <button 
      onClick={fetchData} 
      disabled={loading} 
      className={`w-full mb-4 py-2 px-4 font-semibold text-white rounded-lg 
        ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
    >
      {loading ? 'Fetching...' : 'Fetch Data'}
    </button>
    
    {error && <p className="text-red-500 text-center mb-2">{error}</p>}
    
    {clusterBalance !== null && (
      <p className="text-lg text-center">
        Cluster Balance: <span className="font-semibold">{clusterBalance}</span> SSV
      </p>
    )}
  </div>
</div>

  );
};

export default SSVNetworkDataFetcher;