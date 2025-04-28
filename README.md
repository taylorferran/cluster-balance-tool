# Cluster Balance Tool

## Run the tool 

In the project directory, you can run:
``` bash
npm i
npm start
```

## Code walkthrough 

We start by defining the Subgraph URL, this is where we will send the request to.

```javascript
  const hoodi_url = "https://api.studio.thegraph.com/query/71118/ssv-network-hoodi/version/latest/";
```

Then we define the query we want to send to get data on a certain account, we take in the input from what address the user enters and pass it into the query.

This query will give us the operator IDs of all active clusters for this account.

```javascript
const clusterQuery = `{
    account(id: "${accountAddress.toLocaleLowerCase()}") {
        clusters(where: {active: true}) {
        operatorIds
        }
    }
}`;
```

Next we send the request using fetch, and save each operator ID array for each cluster to another array.

```javascript
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
```

For this next step we need to get a lot of data to correctly compute the [Cluster Balance](https://docs.ssv.network/learn/stakers/clusters/cluster-balance). 

For each cluster, we get the operator IDs, and the cluster ID, then build a query using these values. 

``` javascript 
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
```

The rest of the code contained within the for loop is the programmatic version of the [Cluster Balance Formula](https://docs.ssv.network/learn/stakers/clusters/cluster-balance#cluster-balance-formula) which can be reused.
