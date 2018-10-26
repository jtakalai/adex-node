# AdEx node Endpoints
The AdEx node accepts and returns 'application/josn' content type
Production version of this node is running at [https://node.adex.network](https://node.adex.network)

# Endpoints
This endpoints are not finalized

## Non authentication required endpoints:

### `/auth`

```
POST: 
    body params:
        userid, 
        signature, 
        authToken, 
        mode, *adex-constants [SIGN_TYPES]
        typedData,
        hash, 
        prefixed
```
[`*adex-constants [SIGNATURE_MODE]`](https://github.com/AdExNetwork/adex-constants/blob/master/src/exchange.js)

Returns user sessions in format 
```
{
  "status": "OK",
  "signature": "0xfd3360e247321a4126467e225d98e2ad299cb0eb99b5d3ec8d21f0e0a34deccd571f05b6aec9e21bb2274dba1a1aec826eeb6f5d7a40f497755061807006b2a51b",
  "authToken": "4797227259654222",
  "sigMode": 1,
  "expiryTime": 1541927204484
}
```

## Authentication required endpoints:

`'x-user-signature'` header with user signature value is  required

### `/auth-check`
check if the request is authenticated

### `/image` 

```
POST:
    Multipart form data with image field for the image blob
```
Adds adds image to ipfs
Returns ipfs hash in format
```
{ ipfs: 'QmeQqaZC1ftKp1uWbpVRVhbCwBBrysTa3DBg9JUr6NWrQx' }
```
Can be accessed through https://ipfs.adex.network/ipfs/QmeQqaZC1ftKp1uWbpVRVhbCwBBrysTa3DBg9JUr6NWrQx



### `/items`
```
POST: 
    body params: *adex-models [items] 
```
[`*adex-models [items]`](https://github.com/AdExNetwork/adex-models/tree/master/src/models)

Accepts: item object structured as models above
Returns: parsed and verified item with id as the models
```
PUT:
    body params: *adex-models [items] 
```
[`*adex-models [items]`](https://github.com/AdExNetwork/adex-models/tree/master/src/models)

Accepts: item model and updates it. Full item is required 
* for AdUnit only 'description' can be updated
* for AdSlot '_fallbackAdImg' , '_fallbackAdUrl' and '_meta.img' can be update in addition

Returns: entire updated object

```
GET:
    query params:
        type: *adex-constants [items]
```
[`*adex-constants [ItemsTypes]`](https://github.com/AdExNetwork/adex-constants/blob/master/src/items.js)

Returns: Array of user's [adex-models [items]](https://github.com/AdExNetwork/adex-models/tree/master/src/models)

### `/items/:id`
```
GET
```
Returns: [adex-models [items]](https://github.com/AdExNetwork/adex-models/tree/master/src/models)
 object

### `/item-to-item`
```
POST:
    query params:
        item, user, type, collection
```
Adds: item to collection
Returns: updated item

```
DELETE:
    query params:
        item, user, type, collection
```
Removes: item from collection
Returns: updated item


### `/tags`
```
GET:
```
Returns all available tags

### `/bids`
```
POST:
    body params: *adex-models [bid] 
```
[`*adex-models [bid]`](https://github.com/AdExNetwork/adex-models/blob/master/src/models/Bid.js)
Adds: Signed message for bid
Accepts: Bid model
Returns: Validated and parsed bid with id

```
GET:
    query params:
        unit - returns bids by adUnit
        slot - returns bids by adSlot
        sizeAndType, tags(optional), filterByTags(optional) - returns not accepted bids by this filters  
        side - 'advertiser' or 'publisher'
```
Returns: bids filtered by different query params

### `/bid-state`
```
POST:
    query params:
        bidId,
        state,
        trHash
```
Updates: Bid unconfirmed state (not validated on the blockchain)

### `/bid-report`
```
GET:
    query params:
        bidId
```
Returns: bid report

### `/view`
```
GET:
    query params:
        slotIpfs
```
Returns: adUnits for active bids by slot ipfs hash

### `/submit`
[collector](COLLECTOR.md)
```
POST:
    body params:
        signature,
        sigMode,
        type,
        address,
        adunit,
        bid
```
Adds: events form adex-adview to the collector (off-chain event aggregator)

### `/events`
[collector](COLLECTOR.md)
```
GET:
    query params:
        bid, // bid ipfs hash
        bids, // array of bids ipfs hashes
        start, // UTC timestamp
        end, // UTC timestamp
        interval // Currently not in use
```
Returns: stats in format 
```
{
  "bidsStats": {
    "0xf7346a21a7c385bef04957885d67367d8ce13bd908bd4d4c32f7acfc36896157": {
      "live": {
        "clicks": 0,
        "loaded": 0,
        "uniqueClick": 0
      },
      "hourly": {
        "clicks": 0,
        "loaded": 0,
        "uniqueClick": 0
      },
      "daily": {
        "clicks": 0,
        "loaded": 0,
        "uniqueClick": 0
      }
    }
  "stats": {
    "live": {
      "interval": 300000,
      "intervalStats": {
        
      }
    },
    "hourly": {
      "interval": 3600000,
      "intervalStats": {
        
      }
    },
    "daily": {
      "interval": 86400000,
      "intervalStats": {
        "17651": {
          "clicks": 0,
          "loaded": 0,
          "uniqueClick": 0
        },
        "17652": {
          "clicks": 0,
          "loaded": 0,
          "uniqueClick": 0
        },
       ...
      }
    }
  }
}
```