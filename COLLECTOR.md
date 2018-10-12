# AdEx node Collector
This is off-chain events aggregator. The collector accepts events form [adex-adview](https://github.com/AdExNetwork/adex-adview) (the iframe for showing the ads).

After the event is submitted it goes through signature verification and checked for being unique. Then the event is added to different time specific statistics and the unique events are added to related bid state. 

Currently accepted events are `'click', 'loaded' and 'unique-click'`

For the statistics events are added in the following aggregations:

```
LIVE: for each 5 minute interval and are kept for 24 hours
HOURLY: for 1 hour intervals and expired after 31 days
DAILY: for 24 interval with no expiration time
```