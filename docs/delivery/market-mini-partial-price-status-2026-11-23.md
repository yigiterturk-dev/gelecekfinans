# Market mini partial price status

The sidebar status now checks whether all five listed markets have a finite positive price. It reports missing prices and older client responses with an amber status; the green state means all prices arrived within the recent-response window, not that every provider's underlying observation is real time. The green label says `Yakın zamanda veri alındı` to describe that limit. The changing status is exposed as a polite, atomic live region for screen-reader users.

Live verification: the production build passed and the service is active. The
home page returned HTTP 200; `/api/fiyatlar` returned HTTP 200 with usable
positive prices. Missing fields still produce the amber partial-data label.
