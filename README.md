# Sync mParticle Audiences to Split Segments

## Overview

A Split lambda with function URL exists as a POST-able endpoint for mParticle, which sends well formatted events.  The events can trigger creation of a new segment, or add keys to an existing segment.

## Limitations

This code is not fully implemented, and currently designed to sync only mpid keys to a mpid traffic type.  To achieve an actual flow of events, work must be done with mParticle to create the Split audience output option.

Under construction as of 9/18/2022

david.martin@split.io
