# Data & privacy

A tab of Settings, open to a key with `team`, in both worlds: what the org keeps in this console's
world, how it comes out and how it goes (`screens/org-data`). The terminal's twin is
`pinecall data`; every door here is the runtime's (`docs/protocol/gateway-api.md` §7 and
§Erasing, `numbers.md` §Consent). Which of these controls Pinecall's own cloud runs, the test
that holds each one, and what it does not claim (SOC 2, HIPAA, PCI DSS) are on
[pinecall.io/compliance](https://pinecall.io/compliance/).

## Rules

The org's policy row (`GET`·`PUT /v1/org/policy`), one field saved at a time with the rest written
back as kept: how many days a sealed call is kept before the box's 04:00 run erases it (*Keep
everything* clears it, which is also an org nobody set); the hours of the called number's own day
an outbound call may ring (*Any hour* clears them); how many times one number is rung in 24 hours
(*No limit*); and *Ask for consent everywhere*, which extends to every country what a US or
Canadian number always needs. A US or Canadian number keeps the US floor — 8 to 21, three a day, a
consent on file — whatever is set wider; the sandbox and a person's own verified phone are held to
none of it.

## What a call says first

The policy's `disclosure` and `recording_notice`, said in the agent's voice before its greeting and
logged as its first turn, so a call can prove what the person heard. An outbound call opens with
the platform's sentence in the agent's language (*"This is an automated assistant calling on
behalf of …"*), the org's own words (*Say these words*), or nothing (*Say nothing*, which the card
warns against: the greeting must then disclose it). The switch has every recorded call, inbound or
outbound, say *"This call may be recorded."*; a call nobody records says no notice.

## Consent and do-not-call

Looks a number up — what stands for it and every fact about it, newest first
(`GET /v1/org/consents/{number}`) — records an express or written consent with where it came from
and the words agreed to (`POST /v1/org/consents`), and puts a number on the list
(`DELETE /v1/org/consents/{number}`); takes numbers pasted one a line, the org's own list or its
National Registry scrub, onto the list at once (`POST /v1/org/dnc`); lists the list a page at a
time (`GET /v1/org/dnc`). In production a listed number is never dialled, whatever consent a dial
carries. The sandbox keeps a list of its own and dials without looking at it, so the card says so
there: it is for trying the doors. The agent puts a caller on the list the moment they ask
(`this.call.optOut()`).

## Export, erasure, the trail

**Export** downloads the world whole as JSON Lines (`GET /v1/org/export`: every call with its log,
memories, settings, words and documents; recordings stay on each call's page). **Erase a contact**
takes the number or id a call carried and, on a second press, erases every call they were on and
every fact kept of them (`DELETE /v1/contacts/{contact}`); the dial ledger keeps the numbers and
the time. **Erasures** is the trail, both worlds, newest first: what went, when, who asked — a
person, a key, `retention`, the operator — and it outlives the org. A finished call's own page
carries *Erase this call* beside *Re-check by code*, which asks twice too (`DELETE /v1/calls/{call}`)
and lands on the calls list, and, for a key that opens `talk` and a phone number at the far end,
*Do not call this number*. Nothing erased comes back.

## Who read what

The org's access log (`GET /v1/org/reads`): a person reading a call's log or recording, here or
with their key, and the operator reading one off the box or looking a number up for a carrier's
traceback, once an hour per reader, call and kind. A server's key and a visitor's page write
nothing. A call id or a number narrows the list to that one; a reader is named where the members
door answers, by id where it does not.
