import { Link } from 'react-router-dom';

export default function PollDressingInstructionsPage() {
  return (
    <div className="instructions-page">
      <h1>Poll Dressing Instructions</h1>
      <p className="instructions-subtitle">
        Election Day Voting Site Sign Placement — Step-by-Step Guide
      </p>

      {/* === OVERVIEW === */}
      <section className="instructions-section">
        <h2>What Is Poll Dressing?</h2>
        <p>
          Poll dressing means placing campaign signs at polling locations before voters arrive.
          This app helps coordinate volunteers so every site gets covered. You'll <strong>claim</strong> a
          location, <strong>drive there and place signs</strong>, then <strong>confirm</strong> in the app
          that the site is dressed.
        </p>
      </section>

      {/* === TIMING === */}
      <section className="instructions-section">
        <h2>When to Dress Election Day Sites</h2>
        <div className="instructions-callout instructions-callout-warning">
          <strong>Election Day: Tuesday, March 3, 2026</strong>
          <p>
            Dress sites <strong>ONLY</strong> during one of these windows:
          </p>
          <ul>
            <li><strong>Monday evening, March 2:</strong> 7:00 PM – 12:00 AM</li>
            <li><strong>Tuesday morning, March 3:</strong> Early morning before polls open at 7:00 AM</li>
          </ul>
          <p>
            Signs cannot be placed earlier than 24 hours before voting begins
            (TX Election Code Sec. 61.003).
          </p>
        </div>
      </section>

      {/* === HOW IT WORKS === */}
      <section className="instructions-section">
        <h2>How It Works — Claim → Place → Confirm</h2>

        <div className="instructions-steps">
          <div className="instructions-step">
            <div className="instructions-step-number">1</div>
            <div className="instructions-step-content">
              <h3>Open the App & Browse the Map</h3>
              <p>
                Visit the site or scan the QR code. You'll see an interactive map with colored
                circle pins for every polling location across Dallas, Tarrant, Denton, and Collin
                counties.
              </p>
              <p>
                Use the <strong>search bar</strong> (top-left) to find a specific location by name.
                Use the <strong>filter checkboxes</strong> (top-right) to show or hide location types.
              </p>
            </div>
          </div>

          <div className="instructions-step">
            <div className="instructions-step-number">2</div>
            <div className="instructions-step-content">
              <h3>Claim a Location</h3>
              <p>
                Tap any <span className="pin-dot pin-dot-red"></span> <strong>red (available)</strong> pin
                on the map, then tap <strong>"Claim This Location"</strong>.
              </p>
              <ul>
                <li>If prompted, enter the <strong>access code</strong> from your coordinator (one-time per session).</li>
                <li>Fill in your <strong>name</strong>, <strong>phone number</strong>, and <strong>email</strong>.</li>
                <li>Tap <strong>"Claim Location"</strong>.</li>
              </ul>
              <p>
                The pin turns <span className="pin-dot pin-dot-amber"></span> <strong>amber</strong> to
                show someone is assigned. Your info is saved for the session so you won't need to re-enter
                it for additional claims.
              </p>
              <div className="instructions-tip">
                <strong>Tip:</strong> After claiming, you'll see <strong>nearby unclaimed locations</strong> suggested
                below the confirmation. Consider claiming a few that are close together to build an efficient route!
              </div>
            </div>
          </div>

          <div className="instructions-step">
            <div className="instructions-step-number">3</div>
            <div className="instructions-step-content">
              <h3>Place Signs & Confirm Dressed</h3>
              <p>
                Drive to the location and place signs <strong>outside the 100-foot electioneering
                boundary</strong>. Then return to the app:
              </p>
              <ol>
                <li>Tap your now-<span className="pin-dot pin-dot-amber"></span> <strong>amber</strong> pin.</li>
                <li>Tap <strong>"Confirm Dressed"</strong>.</li>
                <li>Enter <strong>how many signs</strong> you placed.</li>
                <li>Tap <strong>"Confirm Dressed"</strong> to submit.</li>
              </ol>
              <p>
                The pin turns <span className="pin-dot pin-dot-green"></span> <strong>green</strong> and
                the status bar at the bottom of the map updates live.
              </p>
            </div>
          </div>

          <div className="instructions-step">
            <div className="instructions-step-number">4</div>
            <div className="instructions-step-content">
              <h3>Report Issues or Missing Locations</h3>
              <p>There are three types of reports you can file:</p>
              <ul>
                <li>
                  <strong>Report Issue</strong> (on green/dressed pins): Signs missing, damaged,
                  wrong location, or other problems.
                </li>
                <li>
                  <strong>Report Incorrect Info</strong> (on any pin): Wrong address, name, or
                  pin location.
                </li>
                <li>
                  <strong>"+ Report Missing Location"</strong> (button at bottom of map): Drop a pin
                  to add a polling site that isn't listed. Click the map to place the pin, drag to
                  adjust, then confirm.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* === MY LOCATIONS === */}
      <section className="instructions-section">
        <h2>Track Your Assignments — My Locations</h2>
        <p>
          The <Link to="/my-locations" className="instructions-link">My Locations</Link> page lets you
          quickly look up all the polling locations you've claimed.
        </p>
        <ol>
          <li>
            Tap <strong>"My Locations"</strong> in the navigation bar.
          </li>
          <li>
            Enter the <strong>email address</strong> or <strong>phone number</strong> you used when
            claiming locations.
          </li>
          <li>
            Tap <strong>"Look Up My Locations"</strong>.
          </li>
        </ol>
        <p>You'll see your locations organized into two groups:</p>
        <ul>
          <li><strong>Pending</strong> — Locations you've claimed but haven't confirmed dressed yet.</li>
          <li><strong>Dressed</strong> — Locations you've already confirmed with sign counts.</li>
        </ul>
        <div className="instructions-tip">
          <strong>Tip:</strong> For pending locations, tap the <strong>"Get Directions"</strong> button
          to open Google Maps with all your stops as a multi-stop route. If you have more than 10
          pending locations, directions are split into batches automatically.
        </div>
      </section>

      {/* === MAP PIN GUIDE === */}
      <section className="instructions-section">
        <h2>Map Pin Colors & Markers</h2>
        <div className="instructions-legend">
          <div className="instructions-legend-item">
            <span className="pin-dot pin-dot-red"></span>
            <div>
              <strong>Red — Available</strong>
              <p>No one has claimed this site yet.</p>
            </div>
          </div>
          <div className="instructions-legend-item">
            <span className="pin-dot pin-dot-amber"></span>
            <div>
              <strong>Amber — Claimed</strong>
              <p>A volunteer is assigned; signs not yet placed.</p>
            </div>
          </div>
          <div className="instructions-legend-item">
            <span className="pin-dot pin-dot-green"></span>
            <div>
              <strong>Green — Dressed</strong>
              <p>Signs confirmed on the ground.</p>
            </div>
          </div>
          <div className="instructions-legend-item">
            <span className="pin-dot pin-dot-blue-diamond"></span>
            <div>
              <strong>Blue Diamond "S" — Sign Distribution</strong>
              <p>Sign pickup/distribution points with available sign count.</p>
            </div>
          </div>
          <div className="instructions-legend-item">
            <span className="pin-dot pin-dot-sign-box"></span>
            <div>
              <strong>White Box "T" — Big Sign Placement</strong>
              <p>Big signs logged via the Submit tab.</p>
            </div>
          </div>
        </div>

        <h3>Pin Sizes (Early Voting Locations)</h3>
        <p>
          Early voting location pins are sized by Democratic primary turnout to help you prioritize:
        </p>
        <div className="instructions-sizes">
          <div className="instructions-size-item">
            <span className="size-indicator size-large"></span>
            <div>
              <strong>Large</strong> — 300+ Dem ballots (highest priority)
            </div>
          </div>
          <div className="instructions-size-item">
            <span className="size-indicator size-medium"></span>
            <div>
              <strong>Medium</strong> — 150–299 Dem ballots
            </div>
          </div>
          <div className="instructions-size-item">
            <span className="size-indicator size-small"></span>
            <div>
              <strong>Small</strong> — Under 150 Dem ballots
            </div>
          </div>
        </div>
        <p className="instructions-hint">
          Prioritize large pins first for maximum voter visibility.
        </p>

        <h3>Filter Checkboxes</h3>
        <p>
          Use the filter panel (top-right corner of the map) to toggle visibility of:
        </p>
        <ul>
          <li>Early Voting + Election Day (dual sites)</li>
          <li>Early Voting Only</li>
          <li>Election Day Only</li>
          <li>Sign Distribution Points</li>
          <li>Sign Placements</li>
        </ul>
      </section>

      {/* === SIGN PLACEMENT RULES === */}
      <section className="instructions-section">
        <h2>Sign Placement Rules</h2>
        <div className="instructions-callout instructions-callout-danger">
          <ul>
            <li>
              Signs must be placed <strong>OUTSIDE the 100-foot electioneering boundary</strong> (TX
              Election Code Sec. 61.003).
            </li>
            <li>
              No earlier than <strong>24 hours</strong> before voting begins at that location.
            </li>
            <li>
              Place on <strong>public right-of-way</strong> or <strong>private property with
              permission</strong>.
            </li>
            <li>
              <strong>Don't block</strong> sidewalks, ADA access, driveways, or sight lines at
              intersections.
            </li>
            <li>
              <strong>Remove signs</strong> after polls close.
            </li>
          </ul>
        </div>
      </section>

      {/* === TIPS === */}
      <section className="instructions-section">
        <h2>Tips & Troubleshooting</h2>
        <div className="instructions-tip">
          <strong>Save to Home Screen:</strong> Tap Share → "Add to Home Screen" for quick access.
          Works like a native app!
        </div>
        <div className="instructions-faq">
          <div className="instructions-faq-item">
            <strong>"Invalid access code"</strong>
            <p>Double-check the code with your coordinator. It's case-sensitive.</p>
          </div>
          <div className="instructions-faq-item">
            <strong>Can't find my location on the map?</strong>
            <p>Use the search bar or use "+ Report Missing Location" to add it.</p>
          </div>
          <div className="instructions-faq-item">
            <strong>My Locations shows no results</strong>
            <p>Make sure you're using the same email or phone number you used when claiming.</p>
          </div>
          <div className="instructions-faq-item">
            <strong>How do I un-claim a location?</strong>
            <p>Contact your coordinator — only admins can reassign claimed locations.</p>
          </div>
        </div>
      </section>

      {/* === QUICK REFERENCE === */}
      <section className="instructions-section">
        <h2>Quick Reference</h2>
        <div className="instructions-quick-ref">
          <ol>
            <li>Open the app → <strong>Map</strong> tab</li>
            <li>Tap a red pin → <strong>Claim This Location</strong></li>
            <li>Enter access code (first time only) + your name/phone/email</li>
            <li>Drive to the location, place signs outside 100-ft boundary</li>
            <li>Return to the app → tap your amber pin → <strong>Confirm Dressed</strong></li>
            <li>Check <Link to="/my-locations" className="instructions-link">My Locations</Link> for your full list + directions</li>
            <li>Repeat for each location!</li>
          </ol>
        </div>
      </section>

      <div className="instructions-footer">
        <p>
          Questions? Contact your campaign coordinator for the access code and any issues.
        </p>
        <Link to="/" className="btn btn-primary">Open the Map</Link>
      </div>
    </div>
  );
}
