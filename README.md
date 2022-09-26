# Sync mParticle Audiences to Split Segments

See discussion in sibling repository:

https://github.com/splitio/mparticle-audiences-batch

## Configure

Expects config.json at root directory, e.g.
```json
{
  "audiencesBatchEndpoint" : "https://5.6.7.8:5010/audiences",
  "audiencesBatchAuthKey" : "secret_batch_auth_token"
}
```

## Overview

A Split lambda with function URL exists as a POST-able endpoint for mParticle, which sends well formatted events.  The events can trigger creation of a new segment, or add keys to an existing segment.

TBD API calls to the batch server ignore the self-signed key.  This should be updated as soon as the batch server gets a proper HTTP key.

## Limitations

This code is not fully implemented, and currently designed to sync only mpid keys to a mpid traffic type.  To achieve an actual flow of events, work must be done with mParticle to create the Split audience output option.

Under construction as of 9/18/2022

david.martin@split.io
