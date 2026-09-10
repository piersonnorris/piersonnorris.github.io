/* ============================================================
   PNAtlasData — the knowledge atlas: what Pierce has learned,
   where he learned it, and how the lessons link up.

   SOURCE OF TRUTH: docs/CONTENT.md. Every claim here traces to a
   line in that file — §3 (timeline, with its *Takeaway:* lines),
   §4 (skills) and §7 (the numbers cleared for publication). Note
   titles reuse Pierce's own documented wording wherever a takeaway
   exists, so the page quotes him rather than paraphrasing him.
   When CONTENT.md changes, change this file to match.

   PUBLICATION BOUNDARY (CONTENT.md §3b + §7 "Never on the site"):
   no portfolio dollar values, share counts or holdings; no client
   names or addresses; no Screencastify client names, internal
   channel figures or vendor tool names. Nothing marked [OPEN] in
   CONTENT.md is asserted as fact here — Student Maintenance LLC is
   left out entirely, and the Oasis → True North relationship is
   described as two dated chapters, not a rebrand.

   Note shape is deliberately PNGraphify-compatible ({id,title,body,
   tags}) so the graph view is the real link graph of this content,
   not a decorative stand-in. [[Double brackets]] are real links and
   must match another note's title exactly.
   ============================================================ */
(function (global) {
  'use strict';

  var DOMAINS = [
    { id: 'ops',     label: 'Operations & leadership', color: '#5FAE5A' },
    { id: 'sales',   label: 'Sales & local marketing', color: '#E8A33D' },
    { id: 'finance', label: 'Finance & markets',       color: '#4CC9F0' },
    { id: 'ai',      label: 'AI & automation',         color: '#c084fc' },
    { id: 'web',     label: 'Web & tools',             color: '#37d7c2' },
    { id: 'study',   label: 'School & language',       color: '#a9bcd6' }
  ];

  /* Where a lesson was actually learned — the atlas's second axis. */
  var SOURCES = [
    { id: 'truenorth',  label: 'True North Services LLC', when: '2026' },
    { id: 'oasis',      label: 'Oasis Exterior Cleaning', when: '2023' },
    { id: 'castify',    label: 'Screencastify',           when: 'Jun–Aug 2026' },
    { id: 'portfolio',  label: 'Self-directed portfolio', when: 'since 2020' },
    { id: 'elon',       label: 'Elon University',         when: 'since 2023' },
    { id: 'site',       label: 'This site',               when: '2026' }
  ];

  var NOTES = [
    /* ---------------- operations ---------------- */
    {
      id: 'no-form',
      title: 'No form, no distribution',
      domain: 'ops', source: 'truenorth', learned: '2026-06',
      tags: ['systems', 'process', 'control'],
      evidence: ['3 forms', '1 master sheet'],
      body: 'Putting the company on a documented operating system meant one path per lead and three mandatory forms behind it — ' +
        'quote scheduling, quote result and pricing, end-of-job report — all feeding a single master sheet that tracks leads, ' +
        'quotes, closed jobs, scheduling, payments, applicants, referral partners, manager performance, equipment and a weekly ' +
        'scorecard. The rule that makes it stick is a money rule, not a paperwork rule: no form, no distribution. ' +
        'It only works because [[One path per lead]] leaves nowhere else for a job to go, and because [[Managers who own the risk]] ' +
        'gives the person filling it in something to lose.'
    },
    {
      id: 'one-path',
      title: 'One path per lead',
      domain: 'ops', source: 'truenorth', learned: '2026-04',
      tags: ['systems', 'process'],
      evidence: ['lead → paid, 8 steps'],
      body: 'Lead → Form 1 (quote scheduling and assignment) → appointment → Form 2 (scope, before photos, price, labor and ' +
        'materials estimate, payment terms, close probability) → approval → job → Form 3 (actual hours, materials, after photos, ' +
        'property condition, damage, upsells, equipment) → invoice → paid. One route, no side doors. ' +
        'The forms are what make [[No form, no distribution]] enforceable and what turn close rate into ' +
        '[[A number you can actually see]].'
    },
    {
      id: 'training-is-qc',
      title: 'The training is the quality control',
      domain: 'ops', source: 'truenorth', learned: '2026-05',
      tags: ['training', 'standards'],
      evidence: ['3 services', '6 steps each'],
      body: 'The head-manager service training covers power washing, paver-sand reapplication and window washing — each written as ' +
        'a six-step field procedure with its own do’s and don’ts. Pierce’s own takeaway: you can’t inspect your way to a standard ' +
        'you never wrote down. Written standards are also what let [[Managers who own the risk]] run crews without supervision, ' +
        'and what [[From hustle to institution]] is actually made of.'
    },
    {
      id: 'managers-risk',
      title: 'Managers who own the risk',
      domain: 'ops', source: 'truenorth', learned: '2026-04',
      tags: ['structure', 'incentives'],
      evidence: ['20/5/5/70 split', 'team of 4+'],
      body: 'True North runs a manager-contractor model: managers are independent contractors who own their crews, their scheduling ' +
        'and their execution risk. Of gross, 20% company / 5% backend / 5% lead fee / 70% manager. Managers sign a scope-and-' +
        'indemnification agreement, and jobs over $500 need a signed client agreement. Ownership of the risk is what makes ' +
        '[[Floors before growth]] hold at the point of sale, where the pressure to discount actually lands.'
    },
    {
      id: 'all-hands',
      title: 'Run the company meeting like a launch',
      domain: 'ops', source: 'truenorth', learned: '2026-07',
      tags: ['leadership', 'standards'],
      evidence: ['9 parts', 'Jul 17 2026'],
      body: 'The first company all-hands, co-presented with the operations lead, ran nine parts: the quote process end to end, ' +
        'a live site walkthrough, a LinkedIn team-spotlight program, a written marketing do’s-and-don’ts (before and after on ' +
        'every post, same angle, natural light, teammates credited, never a client’s address) and a referral incentive. ' +
        'It is [[Price face to face]] and [[Incentives that pay on completion]] taught in one room instead of one memo.'
    },
    {
      id: 'hustle-institution',
      title: 'From hustle to institution',
      domain: 'ops', source: 'truenorth', learned: '2026-05',
      tags: ['structure', 'leadership'],
      evidence: ['LLC, Apr–May 2026'],
      body: 'Incorporating meant a filing, an operations and risk framework, a written priority roadmap and a service-boundary ' +
        'matrix that says what the company does directly, what it refers out (roofing, plumbing, electrical, large tree work, ' +
        'licensed trades) and what needs approval. Pierce’s own takeaway: docs, training and structure that run without you in ' +
        'the room. The proof is an operations lead running weekly ops calls he is not on. ' +
        'Built out of [[The training is the quality control]], [[No form, no distribution]] and [[Managers who own the risk]].'
    },

    /* ---------------- sales & marketing ---------------- */
    {
      id: 'sell-before-brand',
      title: 'Sold a service before picking a major',
      domain: 'sales', source: 'oasis', learned: '2023-05',
      tags: ['sales', 'local-marketing'],
      evidence: ['50+ clients', '+68% growth'],
      body: 'Oasis Exterior Cleaning, founded May 2023 on the Chicago North Shore: power washing and window washing sold with ' +
        'flyers, Nextdoor posts and door knocking, run with a crew of high-school and college students. First summer — 50+ clients, ' +
        'five-figure revenue, +68% customer growth from hand-built local marketing. The distribution instinct here is the same one ' +
        '[[Under-concentrated, not under-worked]] later put a number on.'
    },
    {
      id: 'price-face-to-face',
      title: 'Price face to face',
      domain: 'sales', source: 'truenorth', learned: '2026-07',
      tags: ['sales', 'pricing'],
      evidence: ['quote process, step 2'],
      body: 'The documented quote process: respond as True North and capture name and address, price it face to face with your ' +
        'reasoning, log it in the quote form, send a formal quote, book it and brief the crew. Saying the reasoning out loud is ' +
        'what keeps [[Floors before growth]] from quietly collapsing into a discount, and the log is what feeds ' +
        '[[No form, no distribution]].'
    },
    {
      id: 'under-concentrated',
      title: 'Under-concentrated, not under-worked',
      domain: 'sales', source: 'castify', learned: '2026-07',
      tags: ['marketing', 'distribution', 'diagnosis'],
      evidence: ['76 posts audited', '1 anchor → 8 placements'],
      body: 'A 76-post distribution audit reframed the marketing problem: the team was not producing too little, it was spreading ' +
        'what it produced too thin. The proposal — a Content Waterfall: one ungated anchor asset repurposed into eight placements, ' +
        'with a single named distribution owner. Same diagnostic habit as [[Find the problem in someone’s actual Tuesday]], ' +
        'pointed at a channel instead of a workflow.'
    },
    {
      id: 'referral-completion',
      title: 'Incentives that pay on completion',
      domain: 'sales', source: 'truenorth', learned: '2026-07',
      tags: ['incentives', 'referrals'],
      evidence: ['$10 minimum per client'],
      body: 'The referral incentive is a $10 minimum per client — paid only once the client is landed and the job is completed. ' +
        'Paying on the outcome rather than the introduction is the same principle as [[Managers who own the risk]], scaled down ' +
        'to a single payout.'
    },

    /* ---------------- finance ---------------- */
    {
      id: 'floors',
      title: 'Floors before growth',
      domain: 'finance', source: 'truenorth', learned: '2026-04',
      tags: ['unit-economics', 'pricing'],
      evidence: ['$100 job floor', '30%+ margin target'],
      body: 'Documented pricing floors: a $100 minimum job, a 30%-plus manager margin target, and a pricing-floor check before ' +
        'anything is quoted. A floor written down before the conversation is a different thing from a floor remembered during it — ' +
        'which is why it travels with [[Price face to face]] and is enforced by [[Managers who own the risk]].'
    },
    {
      id: 'visible-number',
      title: 'A number you can actually see',
      domain: 'finance', source: 'truenorth', learned: '2026-08',
      tags: ['measurement', 'systems'],
      evidence: ['close rate, visible'],
      body: 'The post-quote form feeds a responses sheet, which makes close rate a visible number instead of a feeling. ' +
        'The same move as [[Track your own money]] and the reason [[Forms to sheets is plumbing that pays]] earns its keep: ' +
        'measurement is a build task, not an attitude.'
    },
    {
      id: 'track-own-money',
      title: 'Track your own money',
      domain: 'finance', source: 'portfolio', learned: '2020-08',
      tags: ['investing', 'measurement'],
      evidence: ['5 platforms', 'since 2020'],
      body: 'Self-directed investing since August 2020 across equities, options and crypto on five platforms, with a monthly-tab ' +
        'spreadsheet behind it and a gated dashboard on this site reading from it. No holdings, values or share counts are ever ' +
        'published — see [[Encrypt in the browser, not on a server]] for how that line is actually enforced in code.'
    },
    {
      id: 'cash-order',
      title: 'Cash has an order of preference',
      domain: 'finance', source: 'truenorth', learned: '2026-05',
      tags: ['cash', 'policy'],
      evidence: ['bank → cash → card'],
      body: 'Bank transfer first, cash second, card third, with card fees passed through flat. Revenue lands in the LLC account ' +
        'and distributions go out biweekly — but only once documentation, disputes and refunds have settled. Which is the money ' +
        'half of [[No form, no distribution]].'
    },

    /* ---------------- AI & automation ---------------- */
    {
      id: 'actual-tuesday',
      title: 'Find the problem in someone’s actual Tuesday',
      domain: 'ai', source: 'castify', learned: '2026-06',
      tags: ['method', 'diagnosis', 'workflow'],
      evidence: ['7 workflows', '6 departments', '48 hours'],
      body: 'The method, in Pierce’s own words: find the problem in someone’s actual Tuesday, get sign-off, build it with them, ' +
        'ship it. Don’t start with the tool. One three-round mapping prompt dropped in a shared folder had department leaders map ' +
        'their own work — trigger, middle, hand-offs, friction, root cause — and returned seven workflows across six departments ' +
        'in 48 hours, with exactly one meeting added. What came back was [[A person acting as the API]].'
    },
    {
      id: 'person-as-api',
      title: 'A person acting as the API',
      domain: 'ai', source: 'castify', learned: '2026-06',
      tags: ['diagnosis', 'workflow'],
      evidence: ['7 of 7 workflows'],
      body: 'All seven mapped workflows shared one failure: a person acting as the API between systems that don’t talk. ' +
        'Once that is the diagnosis, the fix stops being "add a tool" and starts being "close the gap" — sometimes with software, ' +
        'sometimes with [[Sometimes the fix is a policy]]. Found by [[Find the problem in someone’s actual Tuesday]].'
    },
    {
      id: 'removes-the-part',
      title: 'AI removes the part nobody wanted to do',
      domain: 'ai', source: 'castify', learned: '2026-07',
      tags: ['method', 'automation'],
      evidence: ['30 min → 5 min', '3 modules live'],
      body: 'Pierce’s takeaway from building Castify OS: AI doesn’t replace the workflow, it removes the part of the workflow ' +
        'nobody wanted to do. Nine weeks from idea to platform — a Proposal Generator taking deal context in and a client-ready ' +
        'branded PDF plus editable .docx out (30 minutes to 5 per proposal), an outbound email agent, and a traffic and AI-referral ' +
        'analytics view. See [[Approval-gated by design]] for the line it does not cross.'
    },
    {
      id: 'approval-gated',
      title: 'Approval-gated by design',
      domain: 'ai', source: 'castify', learned: '2026-07',
      tags: ['automation', 'trust', 'guardrails'],
      evidence: ['never auto-sends'],
      body: 'The outbound email agent reads pending contacts from a sheet, researches them and drafts into Gmail — and stops there. ' +
        'Approval-gated by design: it never auto-sends. A gate written into the design is worth more than a policy written after an ' +
        'incident, and it is the same instinct behind [[Encrypt in the browser, not on a server]].'
    },
    {
      id: 'policy-not-build',
      title: 'Sometimes the fix is a policy',
      domain: 'ai', source: 'castify', learned: '2026-07',
      tags: ['workflow', 'restraint'],
      evidence: ['0 tools built', '1 saved filter'],
      body: 'The engineering sprint-review fix was a hard-cutoff policy and one saved filter — no tool build at all. ' +
        'The three shipped fixes together took one afternoon to build, including the finance AR collections one that took a ' +
        '4–8 hour weekly task under 15 minutes. Knowing when not to build is part of [[Find the problem in someone’s actual Tuesday]].'
    },

    /* ---------------- web & tools ---------------- */
    {
      id: 'plain-html',
      title: 'Plain HTML outlives frameworks',
      domain: 'web', source: 'site', learned: '2026-08',
      tags: ['engineering', 'craft'],
      evidence: ['no build step'],
      body: 'This site is hand-written HTML and CSS with no framework and no build step, dark by design and crawlable on purpose. ' +
        'The True North company site is the same idea on Netlify with a custom domain. Nothing here needs a toolchain resurrected ' +
        'in five years to keep working — which is the same durability argument as [[Spec it first, then let the build be boring]].'
    },
    {
      id: 'encrypt-browser',
      title: 'Encrypt in the browser, not on a server',
      domain: 'web', source: 'site', learned: '2026-08',
      tags: ['privacy', 'engineering', 'guardrails'],
      evidence: ['5 platforms, 1 toggle'],
      body: 'The notes vault ships as an encrypted payload and decrypts in the visitor’s own browser behind a PIN — there is ' +
        'no server to trust and nothing readable in the repo. The portfolio tracker started there too, then in September 2026 ' +
        'went the other way: the figures now sit in the page in the clear, with a censor toggle that stars out every number ' +
        'saying how much is held while leaving market prices legible. That is a different trade, not a stronger one — a toggle ' +
        'is a courtesy to whoever is reading over your shoulder, and View Source is still View Source. Worth knowing which of ' +
        'the two you are actually relying on: see [[Track your own money]] and [[Approval-gated by design]].'
    },
    {
      id: 'forms-to-sheets',
      title: 'Forms to sheets is plumbing that pays',
      domain: 'web', source: 'truenorth', learned: '2026-06',
      tags: ['automation', 'systems'],
      evidence: ['90+ photo library'],
      body: 'True North’s digital infrastructure, built May–August 2026: a hand-built company site, a lead-capture form mapped to ' +
        'service categories, a post-quote form feeding a responses sheet, a 90-plus photo marketing library and SMS-automation ' +
        'scoping. Unglamorous plumbing is what turns [[One path per lead]] into [[A number you can actually see]].'
    },
    {
      id: 'spec-first',
      title: 'Spec it first, then let the build be boring',
      domain: 'web', source: 'site', learned: '2026-08',
      tags: ['method', 'engineering', 'ai'],
      evidence: ['spec → build'],
      body: 'This site was specified with one AI assistant and built with another, against a written content file where every ' +
        'public claim traces to a document and anything unconfirmed is marked open rather than invented. The spec is where the ' +
        'thinking goes; the build should be the boring part. Same discipline as [[The training is the quality control]], ' +
        'aimed at software.'
    },

    /* ---------------- school & language ---------------- */
    {
      id: 'dual-major',
      title: 'Two majors, four years, one company running',
      domain: 'study', source: 'elon', learned: '2023-08',
      tags: ['education', 'finance'],
      evidence: ['class of 2027'],
      body: 'Elon University since August 2023: a Finance and Accounting dual major with minors in Entrepreneurship and Mandarin ' +
        'Chinese, carried while the exterior-services business ran back-to-back summers and then incorporated. ' +
        'The accounting half is why [[Floors before growth]] and [[Cash has an order of preference]] read like accounting rules ' +
        'rather than opinions.'
    },
    {
      id: 'mandarin',
      title: 'Mandarin, past the textbook',
      domain: 'study', source: 'elon', learned: '2023-08',
      tags: ['language', 'education'],
      evidence: ['near-fluent'],
      body: 'Mandarin Chinese to near-fluency, carried as a minor alongside Entrepreneurship. Listed on the skills grid next to ' +
        'English, and the one item on this atlas that took the longest and automates the least. ' +
        'Part of [[Two majors, four years, one company running]].'
    }
  ];

  global.PNAtlasData = { domains: DOMAINS, sources: SOURCES, notes: NOTES, updated: '2026-09-07' };
})(typeof window !== 'undefined' ? window : globalThis);
