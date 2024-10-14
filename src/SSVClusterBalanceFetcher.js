import React, { useState } from 'react';
import { Switch } from "@headlessui/react";

const secondsPerDay = 86400
const avgBlockTime = 12
const blocksPerDay = secondsPerDay / avgBlockTime

const SSVClusterBalanceFetcher = () => {
  const [clusterArray, setClusterArray] = useState([]);
  const [tableFull, setTableFull] = useState(false)
  const [loading, setLoading] = useState(false);
  const [testnet, setTestnet] = useState(false)
  const [error, setError] = useState(null);

  const holesky_url = "https://api.studio.thegraph.com/query/71118/ssv-network-holesky/version/latest";
  const mainnet_url = "https://api.studio.thegraph.com/query/71118/ssv-network-ethereum/version/latest"

  const fetchData = async (accountAddress) => {
    setClusterArray([])
    setTableFull(false)
    setLoading(true);
    setError(null);


    const clusterQuery = `{
        account(id: "${accountAddress.toLocaleLowerCase()}") {
          clusters(where: {active: true}) {
            operatorIds
          }
        }
      }`;

    let url
    let daoAddress
    if(testnet) {
      url = holesky_url
      daoAddress = "0x38A4794cCEd47d3baf7370CcC43B560D3a1beEFA"
    } else {
      url = mainnet_url
      daoAddress = "0xdd9bc35ae942ef0cfa76930954a156b3ff30a4e1"
    }

    setClusterArray([])
    setTableFull(false)
    try {

      let query = clusterQuery;
      const cluster_response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
      });

      const clusterData = await cluster_response.json();

      const operatorIdArray = clusterData.data.account.clusters.map(cluster => cluster.operatorIds);


      for (const operatorIdList of operatorIdArray) {
        const operatorIds = operatorIdList.map(x => x.toString())
        const clusterId = `${accountAddress.toLocaleLowerCase()}-${operatorIds.join("-")}`

        const query = `{
          _meta {
            block {
              number
            }
          }
          daovalues(id: "${daoAddress}") {
            networkFee
            networkFeeIndex
            networkFeeIndexBlockNumber
            liquidationThreshold
            minimumLiquidationCollateral
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

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query })
        });

        const responseData = await response.json();
        const cumulativeNetworkFee = parseInt(responseData.data.daovalues.networkFeeIndex) + (responseData.data._meta.block.number - parseInt(responseData.data.daovalues.networkFeeIndexBlockNumber)) * parseInt(responseData.data.daovalues.networkFee) - (responseData.data.cluster.networkFeeIndex*10000000);
        let cumulativeOperatorFee = -responseData.data.cluster.index * 10000000;

        for (let operator of responseData.data.operators) {
            cumulativeOperatorFee += parseInt(operator.feeIndex) + (responseData.data._meta.block.number - parseInt(operator.feeIndexBlockNumber)) * parseInt(operator.fee)
        }

        const opFee = responseData.data.operators.reduce(
          (accumulator, currentValue) => accumulator + parseInt(currentValue.fee),
          0,
        )

        // Calculate cluster balance
        let currentClusterArray = clusterArray
        let calculatedClusterBalance
        if(responseData.data.cluster.validatorCount > 0){
          calculatedClusterBalance = responseData.data.cluster.balance - (cumulativeNetworkFee + cumulativeOperatorFee) * responseData.data.cluster.validatorCount;
        } else {
          calculatedClusterBalance = responseData.data.cluster.balance - (cumulativeNetworkFee + cumulativeOperatorFee)
        }

        // Calculate runway 
        const burnRate = (opFee + parseInt(responseData.data.daovalues.networkFee)) * responseData.data.cluster.validatorCount
        const mLc = responseData.data.daovalues.minimumLiquidationCollateral
        const LC = Math.max(mLc, (burnRate * responseData.data.daovalues.liquidationThreshold));
        let runwaySSV = calculatedClusterBalance - LC
        const operationalRunway = runwaySSV / burnRate

        const currentCluster = [operatorIds.join(","), (calculatedClusterBalance/1000000000000000000).toFixed(3), operationalRunway.toFixed(0)]
        currentClusterArray.push(currentCluster)
        setClusterArray(currentClusterArray)
      }
      setTableFull(true)
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("An error occurred while fetching data.");
    } finally {
      setLoading(false);
    }
  };

  return (
<div className="flex justify-center items-center min-h-screen bg-[#0E0E52]">
  <div className="bg-[#0E0E52] shadow-md rounded-lg p-8 w-full max-w-md">
    <div className="flex justify-center mb-6">
      <img src="https://ssv.network/wp-content/uploads/2024/09/Symbol.png" alt="SSV Network Logo" className="h-21 w-16" />
    </div>

    <h2 className="text-3xl font-bold text-center mb-6 text-white">Cluster Balance Check</h2>

    <div className="flex justify-center items-center my-6 mx-5">
      <span className="text-white font-medium mr-4">Mainnet</span>
      <Switch
        checked={testnet}
        onChange={setTestnet}
        className={`${testnet ? 'bg-blue-600' : 'bg-blue-600'}
          relative inline-flex h-[21px] w-[45px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75`}
      >
        <span
          aria-hidden="true"
          className={`${testnet ? 'translate-x-6' : 'translate-x-0'}
            pointer-events-none inline-block h-[17px] w-[17px] transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
        />
      </Switch>
      <span className="text-white font-medium ml-4">Holesky</span>
    </div>

    <div className="flex justify-center mb-4">
      <input 
        onChange={(event) => fetchData(event.target.value)}
        placeholder="Paste Account Address..."
        className="w-[300px] px-4 py-2 border border-gray-500 rounded-lg bg-[#0E0E52] text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>

    <div className="flex justify-center items-center">
      {loading && (
        <div className="flex justify-center items-center space-x-2">
          <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent border-solid rounded-full animate-spin"></div>
          <span className="text-blue-400 font-medium">Fetching balances...</span>
        </div>
      )}
    </div>

    {tableFull !== false && (
  <div className="w-full overflow-visible">
    <div className="mx-auto max-w-full">
      <table className="w-full bg-[#0E0E52] table-auto text-center">
        <thead>
          <tr className="bg-[#0E0E52] text-white">
            <th className="px-4 py-2 whitespace-nowrap">Operator IDs</th>
            <th className="px-4 py-2 whitespace-nowrap">Cluster Balance</th>
            <th className="px-4 py-2 whitespace-nowrap">Runway</th>
          </tr>
        </thead>
        <tbody>
          {clusterArray.map((cluster, index) => (
            <tr key={index} className="text-white">
              <td
                className="px-4 py-2"
                style={{
                  wordBreak: 'break-word',
                  maxWidth: '200px',
                  textAlign: 'center',
                }}
              >
                {cluster[0]}
              </td>
              <td className="px-4 py-2 break-words">{cluster[1]} SSV</td>
              <td className="px-4 py-2">
                {(cluster[2] / blocksPerDay).toFixed(0)} days ({cluster[2]} blocks)
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}


    {error && <p className="text-red-500 text-center mb-2">{error}</p>}
    
  </div>
</div>


  );
};

export default SSVClusterBalanceFetcher;