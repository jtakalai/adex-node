# AdEx node Endpoints
    The AdEx node accepts and returns 'application/josn' content type

# Endpoints

## Non authentication required endpoints:

## `/auth` - returns user session

```
POST: 
    body params:
        userid, 
        signature, 
        authToken, 
        mode, // *adex-constants [exchange]
        typedData, 
        hash, 
        prefixed
```
`*`  [adex-constants [exchange]](https://github.com/AdExNetwork/adex-constants/blob/master/src/exchange.js)

## Authentication required endpoints:

`'x-user-signature' header ` with user signature value is  required

### `/auth-check` - check if the request is authenticated

### `/image` 
```
POST (adds image to ipfs and returns ipfs hash):
    Multipart form data with image field for the image blob
```

### `/items`
```
POST (add new item): 
    body params: *adex-models [items] 
```
`*` [adex-models [items]](https://github.com/AdExNetwork/adex-models/tree/master/src/models)

```
PUT (update existing item):
    body params: *adex-models [items] 
    entire item is required 
    for AdUnit only 'description' can be updated
    for AdSlot '_fallbackAdImg' , '_fallbackAdUrl' and '_meta.img' can be update in addition
```
`*` [adex-models [items]](https://github.com/AdExNetwork/adex-models/tree/master/src/models)

```
GET (returns user's items):
    query params:
        type: *adex-constants [items]
```

`*`  [adex-constants [items]](https://github.com/AdExNetwork/adex-constants/blob/master/src/items.js)

### `/items/:id`
```
GET (returns item by id)
```

### `/item-to-item`
```
POST (adds item to collection):
    query params:
        item, user, type, collection
```
```
DELETE (removes item from collection):
    query params:
        item, user, type, collection
```

### `/tags`
```
GET (returns all available tags)
```

### `/bids`
```
POST (adds new bid):
    body params: *adex-models [bid] 
```
`*` [adex-models [bid]](https://github.com/AdExNetwork/adex-models/blob/master/src/models/Bid.js)
```
GET (returns bids by different query params):
    query params:
        unit - returns bids by adUnit
        slot - returns bids by adSlot
        sizeAndType, tags(optional), filterByTags(optional) - returns not accepted bids by this filters  
        side - 'advertiser' or 'publisher'
```

### `/bid-state`
```
POST (updates bid state):
    query params:
        bidId,
        state,
        trHash
```

### `/bid-report`
```
GET (returns bid report):
    query params:
        bidId
```

### `/view`
```
GET (returns adUnits for active bids by slot ipfs hash):
    query params:
        slotIpfs
```

### `/submit`
```
POST (submits events form adex-adview to collector):
    body params:
        signature,
        sigMode,
        type,
        address,
        adunit,
        bid
```