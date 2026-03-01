import { Link } from 'react-router-dom';

export default function BigSignInstructionsPage() {
  return (
    <div className="instructions-page">
      <h1>Big Sign Installation Instructions</h1>
      <p className="instructions-subtitle">
        High-Visibility Sign Placement Guide — Intersections, Medians & Fences
      </p>

      {/* === OVERVIEW === */}
      <section className="instructions-section">
        <h2>What Are Big Signs?</h2>
        <p>
          Big signs are large campaign signs placed at high-visibility locations — busy intersections,
          medians, along fences, and major roads — to maximize exposure to drivers and pedestrians.
          Unlike poll dressing (placing signs at specific polling locations), big sign placement
          targets wherever the most people will see them.
        </p>
        <p>
          When you place a big sign, you log it on this site via the <strong>Submit</strong> tab so
          the team can track coverage across Dallas, Tarrant, Denton, and Collin counties.
        </p>
      </section>

      {/* === SIGN PICKUP === */}
      <section className="instructions-section">
        <h2>Where to Pick Up Signs</h2>
        <p>
          Contact one of the coordinators below to arrange sign pickup:
        </p>
        <div className="instructions-contacts">
          <div className="instructions-contact-card">
            <strong>Sam Dalton</strong>
            <a href="mailto:spdaltonjr@gmail.com">spdaltonjr@gmail.com</a>
            <a href="tel:+12146868608">(214) 686-8608</a>
          </div>
          <div className="instructions-contact-card">
            <strong>Rob Strobel</strong>
            <a href="mailto:rob@jamestalarico.com">rob@jamestalarico.com</a>
            <a href="tel:+18594898880">(859) 489-8880</a>
          </div>
        </div>
        <div className="instructions-tip">
          <strong>Tip:</strong> Sign distribution points are also shown on the map as
          blue diamond <strong>"S"</strong> markers with available sign counts. Check the map to find
          a pickup point near you.
        </div>
      </section>

      {/* === WHAT YOU NEED === */}
      <section className="instructions-section">
        <h2>What You Need</h2>
        <ul>
          <li>A smartphone (preferred) or computer with internet access</li>
          <li>The <strong>access code</strong> from your coordinator</li>
          <li>A camera (your phone camera works great)</li>
          <li>Signs + posting supplies (T-posts, zip ties, etc.)</li>
        </ul>
      </section>

      {/* === HOW TO SUBMIT === */}
      <section className="instructions-section">
        <h2>How to Submit a Sign Placement</h2>

        <div className="instructions-steps">
          <div className="instructions-step">
            <div className="instructions-step-number">1</div>
            <div className="instructions-step-content">
              <h3>Go to the Submit Page</h3>
              <p>
                Tap <Link to="/submit" className="instructions-link">Submit</Link> in the top navigation
                bar. You'll be asked for the <strong>access code</strong> — enter it and tap
                <strong> Enter</strong>. You only need to do this once per browser session.
              </p>
            </div>
          </div>

          <div className="instructions-step">
            <div className="instructions-step-number">2</div>
            <div className="instructions-step-content">
              <h3>Enter Your Info</h3>
              <p>
                Fill in your <strong>name</strong>, <strong>phone number</strong>, and <strong>email
                address</strong> so the team knows who placed the sign.
              </p>
            </div>
          </div>

          <div className="instructions-step">
            <div className="instructions-step-number">3</div>
            <div className="instructions-step-content">
              <h3>Set the Sign Location</h3>
              <p>You have three options — pick whichever works best:</p>
              <div className="instructions-options">
                <div className="instructions-option">
                  <strong>GPS</strong> (recommended when you're at the sign)
                  <p>Tap "Use My Current Location" and your phone will pinpoint your location automatically.</p>
                </div>
                <div className="instructions-option">
                  <strong>Address Search</strong>
                  <p>Type the address or intersection and select from suggestions.</p>
                </div>
                <div className="instructions-option">
                  <strong>Pin Drop</strong>
                  <p>Tap the map to place a pin exactly where the sign is. You can drag to adjust.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="instructions-step">
            <div className="instructions-step-number">4</div>
            <div className="instructions-step-content">
              <h3>Upload a Photo</h3>
              <p>
                Tap the photo upload area to either <strong>take a photo</strong> directly with your
                phone camera or <strong>choose an existing photo</strong> from your gallery.
              </p>
              <p className="instructions-hint">
                Photos are automatically compressed for fast uploads, even on slower connections.
              </p>
            </div>
          </div>

          <div className="instructions-step">
            <div className="instructions-step-number">5</div>
            <div className="instructions-step-content">
              <h3>Select Posting Method</h3>
              <p>Choose how the sign was posted:</p>
              <ul>
                <li><strong>Fence</strong> — Attached to an existing fence</li>
                <li><strong>T-Post</strong> — Mounted on a T-post driven into the ground</li>
                <li><strong>Other</strong> — Any other method (describe in notes)</li>
              </ul>
            </div>
          </div>

          <div className="instructions-step">
            <div className="instructions-step-number">6</div>
            <div className="instructions-step-content">
              <h3>Enter Sign Count</h3>
              <p>
                Enter the number of signs placed at this location.
              </p>
              <div className="instructions-tip">
                <strong>Note:</strong> Signs are single-sided. Use <strong>2 signs</strong> back-to-back
                at high-visibility locations so the sign is readable from both directions.
              </div>
            </div>
          </div>

          <div className="instructions-step">
            <div className="instructions-step-number">7</div>
            <div className="instructions-step-content">
              <h3>Add Notes (Optional)</h3>
              <p>Include any helpful details, such as:</p>
              <ul>
                <li>"Property owner gave permission"</li>
                <li>"High visibility corner, faces east on Main St"</li>
                <li>"Sign is on the median strip"</li>
                <li>"Near the intersection with Elm"</li>
              </ul>
            </div>
          </div>

          <div className="instructions-step">
            <div className="instructions-step-number">8</div>
            <div className="instructions-step-content">
              <h3>Submit!</h3>
              <p>
                Tap <strong>"Submit Sign Placement"</strong> and you're done! Your sign will appear on
                the map immediately as a white box <strong>"T"</strong> marker. Tap
                <strong> "Submit Another"</strong> to log the next sign without re-entering the access
                code.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* === WHERE TO PLACE === */}
      <section className="instructions-section">
        <h2>Where to Place Signs</h2>
        <ol>
          <li>
            <strong>Near polling locations</strong> — Check the map for red, amber, and green circle
            pins. Placing signs where voters will see them on their way to vote has the highest impact.
          </li>
          <li>
            <strong>High-traffic intersections</strong> — Busy corners and medians where cars stop at
            lights.
          </li>
          <li>
            <strong>Major roads and highways</strong> — Along routes with high visibility to drivers.
          </li>
          <li>
            <strong>Near schools, churches, and community centers</strong> — Many of these double as
            polling locations.
          </li>
          <li>
            <strong>Neighborhood entrances</strong> — Catch residents as they come and go.
          </li>
        </ol>
      </section>

      {/* === BEST PRACTICES === */}
      <section className="instructions-section">
        <h2>Placement Best Practices</h2>
        <ul>
          <li>
            <strong>Face the sign toward traffic</strong> so it's readable by drivers and pedestrians.
          </li>
          <li>
            <strong>Place on public right-of-way</strong> (the strip between the sidewalk and the
            street) or on private property <strong>with the owner's permission</strong>.
          </li>
          <li>
            <strong>Don't block sidewalks, driveways, or sight lines</strong> at intersections.
          </li>
          <li>
            <strong>Secure signs firmly</strong> — push T-posts fully into the ground and use zip
            ties on fences so signs don't blow over or come loose.
          </li>
          <li>
            <strong>Avoid utility poles, traffic signs, or government property</strong> — signs
            placed here may be removed.
          </li>
          <li>
            <strong>Check local ordinances</strong> — some cities have rules about sign size,
            placement distance from roads, or timing relative to elections.
          </li>
          <li>
            <strong>Use 2 signs back-to-back</strong> at high-traffic locations for visibility from
            both directions (remember, signs are single-sided).
          </li>
        </ul>
      </section>

      {/* === LEGAL RULES === */}
      <section className="instructions-section">
        <h2>Legal Requirements</h2>
        <div className="instructions-callout instructions-callout-danger">
          <ul>
            <li>
              Signs near polling locations must be <strong>OUTSIDE the 100-foot electioneering
              boundary</strong> (TX Election Code Sec. 61.003).
            </li>
            <li>
              No earlier than <strong>24 hours</strong> before voting begins at that location.
            </li>
            <li>
              Place on <strong>public right-of-way</strong> or <strong>private property with
              permission</strong>.
            </li>
            <li>
              <strong>Remove signs</strong> after polls close or as required by local ordinance.
            </li>
          </ul>
        </div>
      </section>

      {/* === VIEWING ON MAP === */}
      <section className="instructions-section">
        <h2>Viewing Signs on the Map</h2>
        <p>
          Submitted signs appear on the <Link to="/" className="instructions-link">Map</Link> as
          white box <strong>"T"</strong> markers. Tap any marker to see:
        </p>
        <ul>
          <li>Volunteer name</li>
          <li>Address</li>
          <li>Photo of the sign</li>
          <li>Posting method and sign count</li>
          <li>Notes</li>
        </ul>
        <p>
          Use the filter checkboxes (top-right of the map) to toggle "Sign Placements" on or off.
          The status bar at the bottom shows the total sign count.
        </p>
      </section>

      {/* === TROUBLESHOOTING === */}
      <section className="instructions-section">
        <h2>Troubleshooting</h2>
        <div className="instructions-faq">
          <div className="instructions-faq-item">
            <strong>"Invalid access code"</strong>
            <p>Double-check the code with your coordinator. It's case-sensitive.</p>
          </div>
          <div className="instructions-faq-item">
            <strong>GPS not working</strong>
            <p>
              Make sure location services are enabled and your browser has permission.
              You can also use address search or pin drop instead.
            </p>
          </div>
          <div className="instructions-faq-item">
            <strong>Photo won't upload</strong>
            <p>
              Make sure the file is an image (JPG, PNG, HEIC). Try taking a new photo directly
              from the form.
            </p>
          </div>
          <div className="instructions-faq-item">
            <strong>Sign isn't showing on map</strong>
            <p>
              It should appear immediately. Try refreshing the map page. Make sure "Sign Placements"
              is checked in the filter panel. If it still doesn't show, re-submit.
            </p>
          </div>
          <div className="instructions-faq-item">
            <strong>"Please set the sign location"</strong>
            <p>
              You need to set the location using GPS, address search, or pin drop before submitting.
            </p>
          </div>
        </div>
      </section>

      {/* === QUICK REFERENCE === */}
      <section className="instructions-section">
        <h2>Quick Reference</h2>
        <div className="instructions-quick-ref">
          <ol>
            <li>Pick up signs from Sam or Rob (contact info above)</li>
            <li>Go to <Link to="/submit" className="instructions-link">Submit</Link> tab</li>
            <li>Enter the <strong>access code</strong> (first time only)</li>
            <li>Fill in <strong>name</strong>, <strong>phone</strong>, <strong>email</strong></li>
            <li>Set <strong>location</strong> (GPS, address, or pin drop)</li>
            <li>Upload a <strong>photo</strong></li>
            <li>Select <strong>posting method</strong> and <strong>sign count</strong></li>
            <li>Tap <strong>"Submit Sign Placement"</strong></li>
            <li>Repeat for each sign!</li>
          </ol>
        </div>
      </section>

      <div className="instructions-footer">
        <p>
          Questions? Contact your campaign coordinator for the access code and any issues.
        </p>
        <div className="instructions-footer-actions">
          <Link to="/submit" className="btn btn-primary">Go to Submit</Link>
          <Link to="/" className="btn btn-secondary">Open the Map</Link>
        </div>
      </div>
    </div>
  );
}
