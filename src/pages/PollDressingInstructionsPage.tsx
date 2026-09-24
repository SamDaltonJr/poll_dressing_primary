import { Link } from 'react-router-dom';
import { useCampaign } from '../contexts/CampaignContext';

function formatDay(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatShort(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function PollDressingInstructionsPage() {
  const campaign = useCampaign();
  const root = `/c/${campaign.slug}`;
  const { earlyVotingStart, earlyVotingEnd, electionDay } = campaign;
  const electionEve = electionDay
    ? new Date(electionDay.getFullYear(), electionDay.getMonth(), electionDay.getDate() - 1)
    : undefined;

  return (
    <div className="instructions-page">
      <h1>How Poll Dressing Works</h1>
      <p className="instructions-subtitle">
        {campaign.raceLabel} · {campaign.electionLabel} — a step-by-step guide for volunteers
      </p>

      {/* === OVERVIEW === */}
      <section className="instructions-section">
        <h2>What Is Poll Dressing?</h2>
        <p>
          Poll dressing means putting up {campaign.candidateLastName} signs outside polling locations
          so voters see them on the way in. This app keeps volunteers from doubling up: you{' '}
          <strong>claim</strong> a site, <strong>put up signs</strong>, <strong>mark it dressed</strong>,
          and <strong>take the signs down</strong> after voting ends there.
        </p>
      </section>

      {/* === TIMING === */}
      {(earlyVotingStart || electionDay) && (
        <section className="instructions-section">
          <h2>Key Dates</h2>
          <div className="instructions-callout instructions-callout-warning">
            {earlyVotingStart && earlyVotingEnd && (
              <p>
                <strong>Early voting:</strong> {formatShort(earlyVotingStart)} – {formatShort(earlyVotingEnd)}.
                Your coordinator will confirm when to put up and take down signs at early voting sites.
              </p>
            )}
            {electionDay && electionEve && (
              <>
                <p>
                  <strong>Election Day: {formatDay(electionDay)}.</strong> Dress election day sites{' '}
                  <strong>only</strong> during one of these windows:
                </p>
                <ul>
                  <li><strong>{formatDay(electionEve)}:</strong> 7:00 PM – midnight</li>
                  <li><strong>{formatDay(electionDay)}:</strong> early morning, before polls open at 7:00 AM</li>
                </ul>
              </>
            )}
          </div>
        </section>
      )}

      {/* === HOW IT WORKS === */}
      <section className="instructions-section">
        <h2>Step by Step</h2>

        <div className="instructions-steps">
          <div className="instructions-step">
            <div className="instructions-step-number">1</div>
            <div className="instructions-step-content">
              <h3>Find a Site Near You</h3>
              <p>
                The first time you open the map, pick your area and it zooms to the polling locations
                near you. You can change it any time with the area button at the bottom of the map.
              </p>
              <ul>
                <li>Sites with a <strong>&#9733; star</strong> are the busiest in Texas. Start with those.</li>
                <li>
                  Use the <strong>search</strong> (the magnifying glass on phones) to find a site by name
                  or address.
                </li>
                <li>
                  The <strong>layers button</strong> (top-right) lets you pick a county and show or hide
                  site types.
                </li>
              </ul>
            </div>
          </div>

          <div className="instructions-step">
            <div className="instructions-step-number">2</div>
            <div className="instructions-step-content">
              <h3>Claim It</h3>
              <p>
                Tap a <span className="pin-dot pin-dot-red"></span> <strong>red (available)</strong> pin,
                then <strong>Claim This Location</strong>.
              </p>
              <ul>
                <li>
                  If asked, enter the <strong>volunteer code</strong> from your coordinator. You&rsquo;ll
                  only need it once per visit.
                </li>
                <li>
                  Fill in your <strong>name</strong>, <strong>phone</strong> and <strong>email</strong>.
                  This phone remembers them, so you won&rsquo;t retype them next time.
                </li>
              </ul>
              <p>
                The pin turns <span className="pin-dot pin-dot-amber"></span> <strong>amber</strong> so
                other volunteers know it&rsquo;s taken.
              </p>
              <div className="instructions-tip">
                <strong>Tip:</strong> After claiming, you&rsquo;ll see <strong>nearby unclaimed
                sites</strong>. Claiming a few close together makes an efficient route.
              </div>
            </div>
          </div>

          <div className="instructions-step">
            <div className="instructions-step-number">3</div>
            <div className="instructions-step-content">
              <h3>Get Signs</h3>
              <p>
                Pick up signs at a <span className="pin-dot pin-dot-blue-diamond"></span>{' '}
                <strong>blue sign pickup point</strong> on the map, or ask your coordinator.
              </p>
            </div>
          </div>

          <div className="instructions-step">
            <div className="instructions-step-number">4</div>
            <div className="instructions-step-content">
              <h3>Put Them Up &amp; Mark It Dressed</h3>
              <p>
                Tap <strong>Directions</strong> on the pin (or in My Locations) to navigate there. If the
                site has a <strong>Where to go</strong> note, it tells you which entrance or room voters use.
                Place signs <strong>outside the 100-foot electioneering marker</strong>, along the path
                voters take.
              </p>
              <ol>
                <li>Tap your <span className="pin-dot pin-dot-amber"></span> <strong>amber</strong> pin, or open <strong>My Locations</strong>.</li>
                <li>Tap <strong>Mark as Dressed</strong>.</li>
                <li>Enter <strong>how many signs</strong> you placed. Add a tip for the next volunteer if something was tricky.</li>
                <li>Tap <strong>Confirm Dressed</strong>.</li>
              </ol>
              <p>
                The pin turns <span className="pin-dot pin-dot-green"></span> <strong>green</strong>.
              </p>
            </div>
          </div>

          <div className="instructions-step">
            <div className="instructions-step-number">5</div>
            <div className="instructions-step-content">
              <h3>Take Them Down</h3>
              <p>
                After voting ends at your site, collect your signs. Then tap the green pin and choose{' '}
                <strong>Signs Retrieved</strong> (in My Locations it&rsquo;s <strong>Mark Retrieved</strong>).
                The pin turns{' '}
                <span className="pin-dot pin-dot-purple"></span> <strong>purple</strong>.
              </p>
            </div>
          </div>

          <div className="instructions-step">
            <div className="instructions-step-number">6</div>
            <div className="instructions-step-content">
              <h3>Report Problems</h3>
              <ul>
                <li>
                  <strong>Sign problem</strong> (on green pins): signs missing, damaged, or in the wrong spot.
                </li>
                <li>
                  <strong>Wrong info</strong> (on any pin): wrong address, name, or pin location.
                </li>
                <li>
                  <strong>+ Report missing site</strong> (bottom of the map): tap the map where a polling
                  site is missing, drag the pin to adjust, then confirm.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* === MY LOCATIONS === */}
      <section className="instructions-section">
        <h2>My Locations</h2>
        <p>
          <Link to={`${root}/my-locations`} className="instructions-link">My Locations</Link> (in the
          menu) lists every site you&rsquo;ve claimed. On this phone it opens straight to your list; on
          another device, look yourself up by the email or phone you claimed with.
        </p>
        <ul>
          <li><strong>To dress:</strong> <strong>Mark as Dressed</strong>, <strong>Directions</strong>, or <strong>Unclaim</strong> if you can&rsquo;t make it.</li>
          <li><strong>Dressed:</strong> <strong>Mark Retrieved</strong> once your signs are down.</li>
        </ul>
        <div className="instructions-tip">
          <strong>Tip:</strong> <strong>Get Directions</strong> at the top opens Google Maps with all your
          remaining sites as one route. With more than 10 sites it&rsquo;s split into batches.
        </div>
      </section>

      {/* === MAP PIN GUIDE === */}
      <section className="instructions-section">
        <h2>Map Pin Colors &amp; Markers</h2>
        <div className="instructions-legend">
          <div className="instructions-legend-item">
            <span className="pin-dot pin-dot-red"></span>
            <div>
              <strong>Red — Available</strong>
              <p>Nobody has claimed this site yet.</p>
            </div>
          </div>
          <div className="instructions-legend-item">
            <span className="pin-dot pin-dot-amber"></span>
            <div>
              <strong>Amber — Claimed</strong>
              <p>A volunteer is on it; signs aren&rsquo;t up yet.</p>
            </div>
          </div>
          <div className="instructions-legend-item">
            <span className="pin-dot pin-dot-green"></span>
            <div>
              <strong>Green — Dressed</strong>
              <p>Signs are up.</p>
            </div>
          </div>
          <div className="instructions-legend-item">
            <span className="pin-dot pin-dot-purple"></span>
            <div>
              <strong>Purple — Retrieved</strong>
              <p>Signs have been taken down.</p>
            </div>
          </div>
          <div className="instructions-legend-item">
            <span className="pin-dot pin-dot-blue-diamond"></span>
            <div>
              <strong>Blue diamond — Sign pickup</strong>
              <p>Where to pick up signs, with how many are available.</p>
            </div>
          </div>
          {campaign.bigSigns && (
            <div className="instructions-legend-item">
              <span className="pin-dot pin-dot-sign-box"></span>
              <div>
                <strong>White box — Big sign placement</strong>
                <p>Big signs logged through the Big Sign tab.</p>
              </div>
            </div>
          )}
        </div>
        <p className="instructions-hint">
          Bigger pins and pins with a &#9733; are the busiest early voting sites, so they matter most.
        </p>
      </section>

      {/* === SIGN PLACEMENT RULES === */}
      <section className="instructions-section">
        <h2>Sign Placement Rules</h2>
        <div className="instructions-callout instructions-callout-danger">
          <ul>
            <li>
              Signs must be <strong>OUTSIDE the 100-foot electioneering boundary</strong> (TX Election
              Code Sec. 61.003).
            </li>
            <li>
              No earlier than <strong>24 hours</strong> before voting begins at that location.
            </li>
            <li>
              Place on <strong>public right-of-way</strong> or <strong>private property with
              permission</strong>.
            </li>
            <li>
              <strong>Don&rsquo;t block</strong> sidewalks, ADA access, driveways, or sight lines at
              intersections.
            </li>
            <li>
              <strong>Take signs down</strong> after voting ends at that site.
            </li>
          </ul>
        </div>
      </section>

      {/* === TIPS === */}
      <section className="instructions-section">
        <h2>Tips &amp; Troubleshooting</h2>
        <div className="instructions-tip">
          <strong>Save to Home Screen:</strong> Tap Share → &ldquo;Add to Home Screen&rdquo; so the map
          is one tap away.
        </div>
        <div className="instructions-faq">
          <div className="instructions-faq-item">
            <strong>&ldquo;That code didn&rsquo;t work&rdquo;</strong>
            <p>Double-check the volunteer code with your coordinator. It&rsquo;s case-sensitive.</p>
          </div>
          <div className="instructions-faq-item">
            <strong>Can&rsquo;t find a site on the map?</strong>
            <p>
              Check the area button at the bottom of the map and the county in the layers panel, or
              search by name. If it&rsquo;s really missing, use &ldquo;+ Report missing site&rdquo;.
            </p>
          </div>
          <div className="instructions-faq-item">
            <strong>My Locations shows nothing</strong>
            <p>Use the same email or phone number you claimed with.</p>
          </div>
          <div className="instructions-faq-item">
            <strong>Can&rsquo;t make it to a site you claimed?</strong>
            <p>Open My Locations and tap <strong>Unclaim</strong> so someone else can take it.</p>
          </div>
        </div>
      </section>

      {/* === QUICK REFERENCE === */}
      <section className="instructions-section">
        <h2>Quick Reference</h2>
        <div className="instructions-quick-ref">
          <ol>
            <li>Tap a red pin near you → <strong>Claim This Location</strong></li>
            <li>Get signs from a blue sign pickup point or your coordinator</li>
            <li>Tap <strong>Directions</strong>, put signs up outside the 100-ft marker</li>
            <li>Tap <strong>Mark as Dressed</strong> and enter your sign count</li>
            <li>After voting ends there, take signs down → <strong>Signs Retrieved</strong></li>
            <li>Everything you&rsquo;ve claimed is in <Link to={`${root}/my-locations`} className="instructions-link">My Locations</Link></li>
          </ol>
        </div>
      </section>

      <div className="instructions-footer">
        <p>Questions, or need the volunteer code? Ask your campaign coordinator.</p>
        <Link to={root} className="btn btn-primary">Open the Map</Link>
      </div>
    </div>
  );
}
