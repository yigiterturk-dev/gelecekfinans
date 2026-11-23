# Market mini history empty state

The market sidebar now distinguishes an in-progress request from a completed response without enough history for a sparkline. Missing history displays `Grafik yok` with an accessible label instead of leaving `Yükleniyor...` visible indefinitely.

Live verification: the production build passed, the service is active, and the
home page returned HTTP 200. Missing sparkline history renders `Grafik yok`;
loading text remains limited to the initial request state.
