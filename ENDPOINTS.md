# AdEx node Endpoints
    The AdEx node accepts and returns 'application/josn' content type

# Endpoints

 [`adex-constants`](https://github.com/AdExNetwork/adex-constants/blob/a83700fdba692b0fbdbf70504e407b7dca7f7c10/src/exchange.js)

 ## Non authentication required endpoints:

* `/auth` - returns user session

```
POST: 
    body params:
        userid, 
        signature, 
        authToken, 
        mode, //adex-constants [exchange]
        typedData, 
        hash, 
        prefixed
```

## Authentication required endpoints:

`'x-user-signature' header ` with user signature value is  required

### `/auth-check` - check if the request is authenticated

### `/image` 
```
POST:
    Multipart form data with image field for the image blob
```

### `/items`
```
POST (add new item): 
    body params - see adex-constants [items] 
```

```
PUT (update existing item):
    body params - see adex-constants [items] 
    entire item is required 
    for AdUnit only 'description' can be updated
    for AdSlot '_fallbackAdImg' , '_fallbackAdUrl' and '_meta.img' can be update in addition
```

```
GET (returns user's items):
    query params:
        type - see adex-constants [items]
```

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
    body params - see adex-constants [bid] 
```
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