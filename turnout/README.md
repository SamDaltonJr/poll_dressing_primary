# Turnout data

`turnout-march-primary-2026.csv` holds in-person early votes per site in the March 3, 2026
primary, for loading under **Admin → Import Locations → Turnout numbers**. That screen ranks
early-voting sites statewide for the Priority Sites tab and the map. It isn't bundled into the app.

- Each `source` value is the county report the row came from.
- Rows marked `estimated`, and why:
  - **Harris:** the county's final per-site report isn't online, so the Feb 25 numbers are scaled to the final EV roster totals (Dem 211,389 / Rep 121,621).
  - **Collin:** only Dem counts survive (from the archived primary app), so total = Dem × 132,310 / 63,237.
  - **Denton:** no primary per-site file, so its Nov 2024 general numbers are scaled to the primary's in-person total (115,312).
- Montgomery's report uses town codes. They're mapped to 2026 site names by address city, and "Woodlands" → Kevin Brady Library is inferred.
- Travis has no site list imported yet; load it before loading turnout.
- Hays, Bell, Galveston, Jefferson, Lubbock and McLennan publish no per-site counts, so they have no rows.
