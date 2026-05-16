import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LayoutDashboard,
  Database,
  Briefcase,
  FileText,
  MessageSquare,
  Settings as SettingsIcon,
  Plus,
  X,
  ChevronRight,
  ChevronDown,
  Search,
  Edit3,
  Trash2,
  Upload,
  Sparkles,
  ArrowUpRight,
  Calendar,
  Building2,
  Target,
  TrendingUp,
  AlertCircle,
  Check,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Filter,
  ExternalLink,
  Archive,
  Compass,
  RefreshCw,
} from 'lucide-react';

// ============================================================================
// THROUGHLINE: Job Search OS
//
// PROTOTYPE FILE — serves as the design spec and integration document
// for the multi-agent build (see throughline-handoff.md).
//
// AGENT OWNERSHIP MAP
// -------------------
// This single-file prototype maps to the following agent territories during
// the parallel build. When porting to /app/(app)/* in Next.js, each section
// header below indicates which agent owns the translation.
//
//   FRONTEND AGENT     → all UI components, view shells, modals, primitives
//   BACKEND CORE AGENT → mockAlignmentAnalysis, mock document generators
//                        (these become POST /api/* routes)
//   AI INTEGRATION     → prompts and response shapes implied by the mocks
//   ATS ADAPTER        → seed data shape mirrors what the poller will produce
//   SECURITY AGENT     → API key storage, BYOK flow in SettingsView
//   FOUNDATION AGENT   → none of this file (Day 1 sequential work)
//   QA AGENT           → none of this file (writes against the ported app)
//
// INTEGRATION MARKERS
// -------------------
// Every mock function below has a TODO[Agent] comment indicating what
// replaces it at integration time. Frontend Agent ports preserving the
// mock interface; Backend Core swaps the implementation; nothing else moves.
//
// CONTRACT POINTERS
// -----------------
// All data shapes in this file should be lifted to /contracts/*.ts on
// Day 0 verbatim. The prototype is the source of truth for shapes until
// contracts are written; after that, contracts are the source of truth.
// ============================================================================

// ============================================================================
// CLIENT STORAGE LAYER
// AGENT: Frontend Agent owns the wrapper; Security Agent owns the encryption
//
// In production:
//   - User data → server via Prisma (Backend Core Agent)
//   - BYOK API key → browser localStorage encrypted (Security Agent)
//   - This module gets deleted once the Next.js app uses TanStack Query
// ============================================================================

// TODO[Frontend Agent]: replace with TanStack Query against /api/* endpoints
// TODO[Security Agent]: apiKey reads/writes must route through /lib/security/crypto.ts
const storage = {
  async get(key, fallback) {
    try {
      const r = await window.storage.get(key);
      return r ? JSON.parse(r.value) : fallback;
    } catch {
      return fallback;
    }
  },
  async set(key, value) {
    try {
      await window.storage.set(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage set failed', e);
      return false;
    }
  },
};

// --- Default state -----------------------------------------------------------
const blankSkillsDB = {
  fullName: '',
  headline: '',
  positioning: '',
  contact: { email: '', phone: '', location: '', linkedin: '', site: '' },
  targetRoles: [],
  awards: [],
  jobs: [],
  coreSkills: [],
  tools: [],
  methods: [],
  domains: [],
  keywords: [],
};

// Seed data: Elise Malin (preloaded from resume + project context).
// On first load, this populates the Skills DB. Persistent storage takes over after.
const eliseSeed = {
  fullName: 'Elise Malin',
  headline: 'Software Engineer & UI Developer',
  positioning:
    'Front-end engineer who turns internal tooling into measurable operational lift for ops, training, and field teams at enterprise scale.',
  contact: {
    email: 'elisemalin7@gmail.com',
    phone: '+1 480 666 1320',
    location: 'Tempe, Arizona',
    linkedin: '',
    site: 'pasteldawn.com',
  },
  targetRoles: [
    'Senior Full Stack Engineer',
    'Digital Solutions Engineer',
    'Senior Frontend Engineer',
  ],
  awards: [
    '2025 Award of Excellence at Discount Tire (one of three company-wide recipients)',
    'Employee of the Year at Tala Multimedia (2020)',
    'Employee of the Year at SmartWrap (2016)',
  ],
  jobs: [
    {
      id: 'J01',
      employer: 'Discount Tire',
      title: 'Frontend Developer II',
      startDate: '2021-07',
      endDate: '',
      location: 'Scottsdale, AZ',
      industry: 'Retail / Automotive Services',
      summary:
        'Design, develop, and test enterprise-wide web applications and training technology serving 25,000+ employees across 1,100+ retail locations.',
      projects: [
        {
          id: 'P01',
          name: 'Vision POS Training & Inventory System',
          problem:
            '25,000+ store associates needed to be trained on a new POS and inventory system without disrupting daily operations.',
          actions: [
            'Served as Program Lead for the rollout end-to-end',
            'Designed and built interactive simulations mirroring the production POS',
            'Developed mobile and desktop training modules in React',
            'Coordinated cross-functional delivery with training, operations, and IT',
          ],
          result: 'Onboarded 25,000+ store employees with a zero-disruption rollout.',
          metrics: { users: '25000', locations: '1100' },
          scope: 'Company-wide, 1,100+ retail locations',
          skills: ['React', 'JavaScript', 'Instructional design', 'Program management'],
          tools: ['React', 'SCORM', 'Kaltura'],
          methods: ['Agile', 'Cross-functional delivery'],
          domain: 'Enterprise training',
          keywords: ['POS training', 'simulation', 'eLearning', 'enterprise rollout'],
          recency: 5,
          relevance: ['leadership', 'frontend', 'training'],
          confidence: 0.95,
        },
        {
          id: 'P02',
          name: 'Alchemer Automation & Store Validation',
          problem:
            'Manual store validation workflows consumed thousands of hours of regional manager oversight.',
          actions: [
            'Built client-side and server-side components in JavaScript and Lua',
            'Integrated Alchemer via RESTful API',
            'Designed automated validation logic with conditional branching',
            'Tested endpoints and edge cases with Postman',
          ],
          result: 'Reduced manual oversight by 4,000+ man hours.',
          metrics: { hours_saved: '4000' },
          scope: 'Field operations across 1,100+ locations',
          skills: ['JavaScript', 'Lua', 'API integration'],
          tools: ['Alchemer', 'Postman', 'JavaScript', 'Lua'],
          methods: ['Test-driven validation'],
          domain: 'Operations automation',
          keywords: ['automation', 'API integration', 'validation', 'Alchemer'],
          recency: 5,
          relevance: ['fullstack', 'automation'],
          confidence: 0.95,
        },
        {
          id: 'P03',
          name: 'DTU Review Tracker (POC)',
          problem:
            'Performance and content review processes lacked structured tracking, SSO, and audit trail.',
          actions: [
            'Architected full-stack POC with React + TypeScript frontend and Node/Express backend',
            'Designed PostgreSQL schema with Prisma',
            'Integrated Okta SSO for enterprise authentication',
            'Wired AWS S3 for attachment storage',
          ],
          result:
            'Delivered an IT-validated proof of concept used as evidence for Digital Solutions Engineering reclassification.',
          metrics: {},
          scope: 'DTU Develop team and stakeholders',
          skills: ['Full-stack architecture', 'React', 'TypeScript', 'Node.js', 'PostgreSQL'],
          tools: ['React', 'TypeScript', 'Node.js', 'Express', 'PostgreSQL', 'Prisma', 'Okta', 'AWS S3'],
          methods: ['Discovery', 'Architecture design', 'POC delivery'],
          domain: 'Enterprise internal tools',
          keywords: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Prisma', 'SSO', 'AWS'],
          recency: 5,
          relevance: ['fullstack', 'architecture'],
          confidence: 0.95,
        },
        {
          id: 'P04',
          name: 'Employee Engagement Analytics Dashboard',
          problem:
            'Leadership had no real-time visibility into training completion and engagement across 25,000+ associates.',
          actions: [
            'Designed engagement metric model with training, ops, and L&D stakeholders',
            'Built a real-time analytics dashboard in React',
            'Integrated SCORM and Kaltura completion data',
          ],
          result:
            'Provided leadership with real-time engagement and completion visibility across 25,000+ store employees.',
          metrics: { users_tracked: '25000' },
          scope: 'Company-wide leadership',
          skills: ['React', 'Data visualization', 'Stakeholder alignment'],
          tools: ['React', 'SCORM', 'Kaltura'],
          methods: ['Agile'],
          domain: 'People analytics',
          keywords: ['analytics dashboard', 'engagement metrics', 'training completion'],
          recency: 5,
          relevance: ['frontend', 'analytics'],
          confidence: 0.9,
        },
        {
          id: 'P05',
          name: 'Code Review & Junior Developer Mentorship',
          problem:
            'Team needed sustained quality standards and growth paths for junior developers.',
          actions: [
            'Established code review standards and conducted reviews',
            'Mentored junior developers on best practices, code quality, and workflows',
            'Coached on Agile ceremonies and iterative delivery',
          ],
          result:
            'Improved code quality consistency and supported junior developer growth on the DTU Develop team.',
          metrics: {},
          scope: 'DTU Develop team',
          skills: ['Code review', 'Mentorship', 'Coaching'],
          tools: ['Git'],
          methods: ['Agile', 'Code review'],
          domain: 'Team leadership',
          keywords: ['mentorship', 'code review', 'leadership'],
          recency: 5,
          relevance: ['leadership'],
          confidence: 0.95,
        },
        {
          id: 'P06',
          name: 'Interactive Assessment Systems',
          problem:
            'Standard assessments could not capture skill nuance across role types and tenure levels.',
          actions: [
            'Designed branching and conditional assessment logic',
            'Built complex scoring rules with skip logic and dependent questions',
            'Validated end-to-end flows with Postman',
          ],
          result: 'Delivered tailored assessments that adapt to associate context and role.',
          metrics: {},
          scope: 'Training assessments for retail associates',
          skills: ['Conditional logic', 'Assessment design'],
          tools: ['Alchemer', 'Postman'],
          methods: ['Test-driven validation'],
          domain: 'Assessment / Training',
          keywords: ['assessment', 'branching logic', 'conditional logic'],
          recency: 4,
          relevance: ['frontend', 'training'],
          confidence: 0.9,
        },
      ],
    },
    {
      id: 'J02',
      employer: 'Tala Multimedia',
      title: 'Contract Frontend Developer',
      startDate: '2019-08',
      endDate: '2024-05',
      location: 'Remote',
      industry: 'Web development agency',
      summary:
        'Designed, developed, and managed 150+ client websites across stacks including WordPress, Strapi, and static builds.',
      projects: [
        {
          id: 'P01',
          name: '150+ Client Website Builds',
          problem:
            'Small and mid-sized clients needed custom websites across a wide range of CMS, design, and budget constraints.',
          actions: [
            'Designed in Figma and Adobe XD',
            'Built across WordPress, Strapi, and static HTML/CSS/JS',
            'Matched stack to client constraints and maintenance capacity',
          ],
          result: 'Delivered 150+ production client websites with stack appropriate to each engagement.',
          metrics: { client_sites: '150' },
          scope: 'Agency client portfolio',
          skills: ['Frontend development', 'Design systems', 'Client management'],
          tools: ['Figma', 'Adobe XD', 'WordPress', 'Strapi', 'HTML', 'CSS', 'JavaScript'],
          methods: ['Client discovery', 'Iterative delivery'],
          domain: 'Web development',
          keywords: ['WordPress', 'Strapi', 'Figma', 'frontend'],
          recency: 4,
          relevance: ['frontend', 'design'],
          confidence: 0.95,
        },
        {
          id: 'P02',
          name: 'Third-party API Integration',
          problem:
            'Clients needed payment processing, analytics, and content management integrated reliably into their stacks.',
          actions: [
            'Integrated third-party APIs for payment, analytics, and CMS',
            'Tested endpoints and contracts with Postman',
            'Designed error handling and retry strategies',
          ],
          result: 'Delivered reliable integrations across client sites with documented contracts.',
          metrics: {},
          scope: 'Client integrations',
          skills: ['API integration', 'Error handling'],
          tools: ['Postman', 'REST APIs'],
          methods: ['Contract testing'],
          domain: 'Integrations',
          keywords: ['API integration', 'payment processing', 'analytics'],
          recency: 3,
          relevance: ['fullstack'],
          confidence: 0.9,
        },
        {
          id: 'P03',
          name: 'Firebase / Firestore NoSQL Architecture',
          problem:
            'Real-time client applications needed sync, auth, and shared state without dedicated backend overhead.',
          actions: [
            'Designed NoSQL data models in Firestore',
            'Implemented real-time sync and authentication',
            'Built application state management on top of Firebase',
          ],
          result: 'Shipped real-time applications backed by Firebase/Firestore with auth and live state.',
          metrics: {},
          scope: 'Client applications',
          skills: ['NoSQL', 'Real-time sync', 'Auth'],
          tools: ['Firebase', 'Firestore'],
          methods: ['Realtime data modeling'],
          domain: 'Web applications',
          keywords: ['Firebase', 'Firestore', 'NoSQL', 'authentication'],
          recency: 3,
          relevance: ['fullstack'],
          confidence: 0.9,
        },
      ],
    },
    {
      id: 'J03',
      employer: 'SmartWrap Vehicle Wraps',
      title: 'Lead Graphic Designer',
      startDate: '2014-12',
      endDate: '2021-08',
      location: 'Arizona',
      industry: 'Vehicle wrap & signage',
      summary: 'Led design operations and mentored a junior design team across 4,000+ client projects.',
      projects: [
        {
          id: 'P01',
          name: 'Design Operations & Team Mentorship',
          problem:
            'High-volume design pipeline needed consistent quality and a path for junior designers to develop.',
          actions: [
            'Led design operations across 4,000+ client projects',
            'Managed client briefs, execution, and quality control',
            'Mentored junior designers and established review standards',
          ],
          result: 'Delivered 4,000+ client projects with consistent quality and a developed junior team.',
          metrics: { projects: '4000' },
          scope: 'Design team',
          skills: ['Design leadership', 'Mentorship', 'QA'],
          tools: ['Adobe Creative Suite'],
          methods: ['Brief management', 'Quality control'],
          domain: 'Design operations',
          keywords: ['Adobe Creative Suite', 'design operations', 'mentorship'],
          recency: 2,
          relevance: ['leadership', 'design'],
          confidence: 0.95,
        },
      ],
    },
  ],
  coreSkills: [
    'JavaScript',
    'React',
    'HTML',
    'CSS',
    'TypeScript',
    'PHP',
    'Laravel',
    'Python',
    'RESTful API Integration',
    'Cross-functional collaboration',
    'Junior developer mentorship',
    'Code review',
    'Project management',
    'Public speaking',
  ],
  tools: [
    'React',
    'Node.js',
    'Express',
    'PostgreSQL',
    'Prisma',
    'Okta',
    'AWS S3',
    'AWS CloudFront',
    'Postman',
    'Alchemer',
    'SCORM',
    'Kaltura',
    'Firebase',
    'Firestore',
    'WordPress',
    'Strapi',
    'Figma',
    'Adobe XD',
    'Adobe Creative Suite',
    'Git',
    'Lua',
  ],
  methods: ['Agile', 'Scrum', 'Code review', 'Cross-functional delivery', 'POC delivery', 'Mentorship'],
  domains: [
    'Enterprise training',
    'Operations automation',
    'Enterprise internal tools',
    'People analytics',
    'Assessment',
    'Web applications',
    'Web development',
    'Integrations',
    'Design operations',
  ],
  keywords: [
    'enterprise rollout',
    'internal tools',
    'API integration',
    'automation',
    'eLearning',
    'training systems',
    'SSO',
    'real-time analytics',
  ],
};

// ============================================================================
// SEED DATA
// AGENT: ATS Adapter Agent owns the real implementation
//
// The shape of each posting below mirrors what the ATS poller produces
// after normalize(). In production this seed disappears and DiscoveredPosting
// rows come from /jobs/poll.ts running daily against Greenhouse, Lever, Ashby.
// ============================================================================

// TODO[ATS Adapter Agent]: replace with rows from WatchlistCompany table
const watchlistSeed = [
  { id: 'w_1', company: 'Retool', atsProvider: 'greenhouse', atsSlug: 'retool', lastPolled: '2026-05-13T06:00:00Z' },
  { id: 'w_2', company: 'Linear', atsProvider: 'greenhouse', atsSlug: 'linear', lastPolled: '2026-05-13T06:00:00Z' },
  { id: 'w_3', company: 'Vercel', atsProvider: 'ashby', atsSlug: 'vercel', lastPolled: '2026-05-13T06:00:00Z' },
  { id: 'w_4', company: 'Anthropic', atsProvider: 'greenhouse', atsSlug: 'anthropic', lastPolled: '2026-05-13T06:00:00Z' },
  { id: 'w_5', company: 'Figma', atsProvider: 'ashby', atsSlug: 'figma', lastPolled: '2026-05-13T06:00:00Z' },
  { id: 'w_6', company: 'Stripe', atsProvider: 'greenhouse', atsSlug: 'stripe', lastPolled: '2026-05-13T06:00:00Z' },
  { id: 'w_7', company: 'Webflow', atsProvider: 'greenhouse', atsSlug: 'webflow', lastPolled: '2026-05-13T06:00:00Z' },
  { id: 'w_8', company: 'Notion', atsProvider: 'greenhouse', atsSlug: 'notion', lastPolled: '2026-05-13T06:00:00Z' },
  { id: 'w_9', company: 'Airtable', atsProvider: 'lever', atsSlug: 'airtable', lastPolled: '2026-05-13T06:00:00Z' },
  { id: 'w_10', company: 'HashiCorp', atsProvider: 'greenhouse', atsSlug: 'hashicorp', lastPolled: '2026-05-13T06:00:00Z' },
];

// TODO[ATS Adapter Agent]: replace with rows from DiscoveredPosting table
// TODO[Backend Core Agent]: alignment_score is computed post-poll via
//   /lib/ai/alignment.ts; see Discovery scoring §5.7 in handoff
// NOTE[Security Agent]: jobDescription is untrusted input; treat as
//   potential prompt injection vector when passing to AI workflows
const discoverySeed = [
  {
    id: 'disc_1',
    company: 'Retool',
    atsProvider: 'greenhouse',
    role: 'Solutions Engineer, Internal Tools',
    location: 'San Francisco / Remote (US)',
    remote: true,
    postedAt: '2026-05-12',
    url: 'https://job-boards.greenhouse.io/retool/jobs/example',
    salaryRange: '$170k to $230k',
    jobDescription:
      "Retool is hiring a Solutions Engineer for our Internal Tools practice. You'll partner with our largest customers (engineering, ops, and training teams) to architect internal applications on Retool. You will translate business requirements into shipped tooling, build reference implementations, and debug production deployments alongside customer engineering teams. We're looking for someone with deep React and TypeScript experience, SQL fluency, comfort with enterprise software environments, and a strong track record of shipping operations and training systems. Experience with cross-functional rollouts at scale is a major plus.",
    alignmentScore: 92,
    status: 'new',
  },
  {
    id: 'disc_2',
    company: 'Linear',
    atsProvider: 'greenhouse',
    role: 'Senior Frontend Engineer',
    location: 'Remote (Americas)',
    remote: true,
    postedAt: '2026-05-11',
    url: 'https://job-boards.greenhouse.io/linear/jobs/example',
    salaryRange: '$190k to $250k',
    jobDescription:
      'Linear is hiring a Senior Frontend Engineer to work on our core product. You will ship rapidly, own features end to end, and partner with design on tightly crafted interactions. We are looking for strong React and TypeScript fundamentals, design sensibility, and a portfolio of production frontend work at scale. We value craft, taste, and clear writing.',
    alignmentScore: 88,
    status: 'new',
  },
  {
    id: 'disc_3',
    company: 'Vercel',
    atsProvider: 'ashby',
    role: 'Senior Full Stack Engineer, Customer Engineering',
    location: 'Remote (US)',
    remote: true,
    postedAt: '2026-05-10',
    url: 'https://jobs.ashbyhq.com/vercel/example',
    salaryRange: '$180k to $240k',
    jobDescription:
      "Vercel is hiring a Senior Full Stack Engineer for our Customer Engineering team. You will work directly with enterprise customers, build reference implementations, debug production Next.js deployments, and contribute back into our core product. Deep React and Next.js experience, strong full stack JavaScript skills, and customer-facing technical experience are required. You'll work across the stack (frontend, API, and infrastructure) and translate complex enterprise needs into shipped solutions.",
    alignmentScore: 85,
    status: 'new',
  },
  {
    id: 'disc_4',
    company: 'Webflow',
    atsProvider: 'greenhouse',
    role: 'Senior Frontend Engineer, Apps Platform',
    location: 'Remote (US)',
    remote: true,
    postedAt: '2026-05-09',
    url: 'https://boards.greenhouse.io/webflow/jobs/example',
    salaryRange: '$175k to $225k',
    jobDescription:
      'Webflow is hiring a Senior Frontend Engineer for our Apps Platform team. You will build the frameworks and APIs that third-party developers use to extend Webflow. We need someone with strong React and TypeScript skills, API design experience, and interest in platform thinking and developer experience. Prior work on internal platforms, SDKs, or extension systems is a strong plus.',
    alignmentScore: 83,
    status: 'new',
  },
  {
    id: 'disc_5',
    company: 'Anthropic',
    atsProvider: 'greenhouse',
    role: 'Frontend Engineer, Claude for Work',
    location: 'San Francisco / NYC / Remote',
    remote: true,
    postedAt: '2026-05-08',
    url: 'https://job-boards.greenhouse.io/anthropic/jobs/example',
    salaryRange: '$200k to $260k',
    jobDescription:
      "Anthropic is hiring Frontend Engineers to build Claude.ai and our enterprise extensions. You'll work in React and TypeScript, ship features for millions of users, and partner closely with research, design, and product. We need strong frontend fundamentals, experience with complex stateful applications, real care for product quality, and the judgment to ship safely at scale. Background in enterprise software or internal tooling is welcome.",
    alignmentScore: 82,
    status: 'new',
  },
  {
    id: 'disc_6',
    company: 'Figma',
    atsProvider: 'ashby',
    role: 'Software Engineer, Internal Tools',
    location: 'San Francisco / NYC',
    remote: false,
    postedAt: '2026-05-08',
    url: 'https://jobs.ashbyhq.com/figma/example',
    salaryRange: '$180k to $240k',
    jobDescription:
      "Figma is hiring a Software Engineer for our Internal Tools team. You will build the tooling that lets Figma's GTM, ops, support, and training teams scale. React and TypeScript skills, comfort with full stack JavaScript and SQL, and the ability to scope ambiguous problems are required. A design background is a plus but not required.",
    alignmentScore: 80,
    status: 'new',
  },
  {
    id: 'disc_7',
    company: 'Stripe',
    atsProvider: 'greenhouse',
    role: 'Software Engineer, User Authentication',
    location: 'Remote (US/Canada)',
    remote: true,
    postedAt: '2026-05-07',
    url: 'https://boards.greenhouse.io/stripe/jobs/example',
    salaryRange: '$190k to $250k',
    jobDescription:
      "Stripe's User Authentication team is hiring a Software Engineer. You will work on identity, auth, SSO, and access control surfaces used by millions of businesses. React and TypeScript on the frontend, Ruby or Go on the backend, and a security mindset are required. Prior experience integrating SSO (Okta, Azure AD) and building authorization systems is highly valued.",
    alignmentScore: 78,
    status: 'new',
  },
  {
    id: 'disc_8',
    company: 'Airtable',
    atsProvider: 'lever',
    role: 'Senior Software Engineer, Solutions',
    location: 'San Francisco / Remote',
    remote: true,
    postedAt: '2026-05-06',
    url: 'https://jobs.lever.co/airtable/example',
    salaryRange: '$185k to $245k',
    jobDescription:
      'Airtable is hiring a Senior Software Engineer on the Solutions team. You will partner with our largest customers to build templated solutions, custom apps, and integrations on Airtable. React, JavaScript, SQL, and comfort presenting to non-technical stakeholders are required. Customer-facing engineering experience and prior internal-tools work are strong pluses.',
    alignmentScore: 72,
    status: 'new',
  },
  {
    id: 'disc_9',
    company: 'Notion',
    atsProvider: 'greenhouse',
    role: 'Software Engineer, Education',
    location: 'Remote (Americas)',
    remote: true,
    postedAt: '2026-05-05',
    url: 'https://boards.greenhouse.io/notion/jobs/example',
    salaryRange: '$160k to $215k',
    jobDescription:
      'Notion is hiring a Software Engineer for our Education team. You will work on features and integrations that help schools, students, and corporate L&D teams use Notion. React, TypeScript, and prior experience with K-12, higher-ed, or corporate training software are preferred. We are looking for someone who genuinely cares about learners.',
    alignmentScore: 71,
    status: 'new',
  },
  {
    id: 'disc_10',
    company: 'HashiCorp',
    atsProvider: 'greenhouse',
    role: 'Frontend Engineer, Cloud Platform',
    location: 'Remote (US)',
    remote: true,
    postedAt: '2026-05-04',
    url: 'https://boards.greenhouse.io/hashicorp/jobs/example',
    salaryRange: '$165k to $220k',
    jobDescription:
      "HashiCorp's Cloud Platform team is hiring a Frontend Engineer. You will build the management UI for our cloud product. Strong React experience is required, Ember.js familiarity is a plus, and prior infrastructure or DevOps backgrounds are helpful. You should be comfortable working in a large codebase across teams.",
    alignmentScore: 65,
    status: 'new',
  },
];

const STAGES = [
  { id: 'researching', label: 'Researching', tone: 'neutral' },
  { id: 'applied', label: 'Applied', tone: 'info' },
  { id: 'screen', label: 'Screen', tone: 'info' },
  { id: 'interview', label: 'Interview', tone: 'accent' },
  { id: 'offer', label: 'Offer', tone: 'success' },
  { id: 'rejected', label: 'Rejected', tone: 'muted' },
  { id: 'withdrawn', label: 'Withdrawn', tone: 'muted' },
];

// ============================================================================
// MOCK AI LAYER
// AGENT: AI Integration Agent + Backend Core Agent (joint ownership)
//
// During the parallel build, the Frontend Agent keeps calling these mock
// functions until integration day. They define the expected output shape
// that AI Integration must produce and that Backend Core must wrap in an
// API route.
// ============================================================================

// TODO[Backend Core Agent]: replace with POST /api/alignment
// TODO[AI Integration Agent]: implement /lib/ai/alignment.ts using
//   ALIGNMENT_SYSTEM prompt from /contracts/ai.ts
// CONTRACT: shape below mirrors AlignmentResponse in /contracts/api.ts
function mockAlignmentAnalysis(jobDescription, skillsDB) {
  const jd = (jobDescription || '').toLowerCase();
  const haystack = [
    ...skillsDB.coreSkills,
    ...skillsDB.tools,
    ...skillsDB.methods,
    ...skillsDB.domains,
    ...skillsDB.keywords,
  ].map((s) => s.toLowerCase());

  const tokens = Array.from(
    new Set(
      jd
        .replace(/[^a-z0-9+./\s-]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 2)
    )
  );
  const requirements = tokens.slice(0, 14).map((t) => {
    const matched = haystack.some(
      (h) => h.includes(t) || t.includes(h.split(' ')[0] || '')
    );
    return {
      term: t,
      strength: matched ? 7 + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 4),
      type: matched ? 'strong' : Math.random() > 0.6 ? 'partial' : 'missing',
    };
  });
  const score = Math.min(
    97,
    Math.round((requirements.filter((r) => r.type !== 'missing').length / requirements.length) * 100)
  );
  return {
    score,
    requirements,
    missingKeywords: requirements.filter((r) => r.type === 'missing').map((r) => r.term).slice(0, 5),
    recommendation:
      score >= 80
        ? 'Strong fit. Apply. Surface the partial matches more prominently in summary and bullets.'
        : score >= 60
        ? 'Good potential. Targeted edits to bullets and keyword density should lift this above 80.'
        : 'Weak fit on paper. Either reposition heavily or move on.',
  };
}

// --- Visual primitives -------------------------------------------------------
function Pill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-stone-800/60 text-stone-300 border-stone-700',
    info: 'bg-sky-950/40 text-sky-200 border-sky-900',
    accent: 'bg-amber-900/30 text-amber-200 border-amber-800/60',
    success: 'bg-emerald-950/40 text-emerald-200 border-emerald-900',
    muted: 'bg-stone-900/60 text-stone-500 border-stone-800',
    warn: 'bg-rose-950/40 text-rose-200 border-rose-900',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[10px] uppercase tracking-[0.12em] font-mono ${tones[tone] || tones.neutral}`}
    >
      {children}
    </span>
  );
}

function Card({ children, className = '', as: As = 'div' }) {
  return (
    <As
      className={`bg-stone-950/60 border border-stone-800/80 rounded-sm ${className}`}
    >
      {children}
    </As>
  );
}

function SectionLabel({ children, right }) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono">
        {children}
      </h3>
      {right}
    </div>
  );
}

function Stat({ label, value, sub, accent = false }) {
  return (
    <Card className="p-5">
      <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono mb-2">
        {label}
      </div>
      <div
        className={`text-4xl font-light tabular-nums ${accent ? 'text-amber-200' : 'text-stone-100'}`}
        style={{ fontFamily: '"Instrument Serif", serif' }}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-stone-500 mt-1 font-mono">{sub}</div>}
    </Card>
  );
}

function Button({ children, onClick, variant = 'primary', size = 'md', className = '', disabled }) {
  const base =
    'inline-flex items-center gap-2 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-amber-200 text-stone-950 hover:bg-amber-100',
    secondary: 'bg-stone-800 text-stone-100 hover:bg-stone-700 border border-stone-700',
    ghost: 'text-stone-300 hover:text-amber-200 hover:bg-stone-900/60',
    danger: 'bg-rose-950 text-rose-200 border border-rose-900 hover:bg-rose-900/40',
  };
  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 rounded-sm',
    md: 'text-sm px-3.5 py-2 rounded-sm',
    lg: 'text-sm px-5 py-3 rounded-sm',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono mb-1.5">
        {label}
      </div>
      {children}
      {hint && <div className="text-xs text-stone-600 mt-1">{hint}</div>}
    </label>
  );
}

function Input({ value, onChange, placeholder, type = 'text', mono = false }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-stone-900/80 border border-stone-800 rounded-sm px-3 py-2 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-200/60 focus:bg-stone-900 transition-colors ${mono ? 'font-mono text-sm' : 'text-sm'}`}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 4, mono = false }) {
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full bg-stone-900/80 border border-stone-800 rounded-sm px-3 py-2 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-200/60 focus:bg-stone-900 transition-colors resize-none ${mono ? 'font-mono text-sm' : 'text-sm'}`}
    />
  );
}

function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative bg-stone-950 border-t md:border border-stone-800 md:rounded-sm w-full ${wide ? 'md:max-w-3xl' : 'md:max-w-xl'} md:my-8 max-h-[92vh] overflow-y-auto`}
      >
        <div className="sticky top-0 bg-stone-950 border-b border-stone-800/80 px-5 py-3.5 flex items-center justify-between">
          <h2
            className="text-xl text-stone-100"
            style={{ fontFamily: '"Instrument Serif", serif' }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-stone-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// --- Nav ---------------------------------------------------------------------
// ============================================================================
// NAVIGATION & VIEW SHELLS
// AGENT: Frontend Agent
// In Next.js, each NAV.id becomes a route under /app/(app)/[id]/page.tsx
// ============================================================================
const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'skills', label: 'Skills DB', icon: Database },
  { id: 'discovery', label: 'Discovery', icon: Compass },
  { id: 'tracker', label: 'Tracker', icon: Briefcase },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'interview', label: 'Interviews', icon: MessageSquare },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

function Sidebar({ current, onChange }) {
  return (
    <aside className="hidden md:flex md:w-56 lg:w-64 shrink-0 border-r border-stone-900 bg-stone-950/60 flex-col">
      <div className="px-5 py-5 border-b border-stone-900">
        <div
          className="text-2xl text-amber-200 leading-none"
          style={{ fontFamily: '"Instrument Serif", serif' }}
        >
          Throughline
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-stone-600 font-mono mt-1">
          Job Search OS
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-colors ${
                active
                  ? 'bg-stone-900 text-amber-200'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-stone-900/50'
              }`}
            >
              <Icon size={15} strokeWidth={1.5} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-stone-900 text-[10px] uppercase tracking-[0.2em] text-stone-600 font-mono">
        v0.1 · prototype
      </div>
    </aside>
  );
}

function BottomNav({ current, onChange }) {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-stone-900 bg-stone-950/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-7">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`flex flex-col items-center justify-center py-2.5 gap-1 ${active ? 'text-amber-200' : 'text-stone-500'}`}
            >
              <Icon size={16} strokeWidth={1.5} />
              <span className="text-[9px] uppercase tracking-tight font-mono">
                {item.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ============================================================================
// VIEWS
// ============================================================================

// --- Dashboard ---------------------------------------------------------------
function Dashboard({ skillsDB, applications, discoveredJobs = [], onNavigate }) {
  const stats = useMemo(() => {
    const total = applications.length;
    const inFlight = applications.filter((a) =>
      ['applied', 'screen', 'interview'].includes(a.status)
    ).length;
    const interviews = applications.filter((a) => a.status === 'interview').length;
    const offers = applications.filter((a) => a.status === 'offer').length;
    const responseRate = total
      ? Math.round(
          (applications.filter((a) => !['researching', 'applied'].includes(a.status)).length / total) *
            100
        )
      : 0;
    return { total, inFlight, interviews, offers, responseRate };
  }, [applications]);

  const today = new Date().toISOString().slice(0, 10);
  const followUps = applications.filter((a) => a.followUpDate && a.followUpDate <= today);
  const recent = [...applications]
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .slice(0, 5);

  const setupComplete = skillsDB.fullName && skillsDB.jobs.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono mb-1">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          <h1
            className="text-4xl md:text-5xl text-stone-100"
            style={{ fontFamily: '"Instrument Serif", serif' }}
          >
            {skillsDB.fullName ? `Hello, ${skillsDB.fullName.split(' ')[0]}` : 'Set up your dossier'}
          </h1>
          {skillsDB.positioning && (
            <p className="text-stone-400 mt-2 italic max-w-2xl text-sm md:text-base">
              {skillsDB.positioning}
            </p>
          )}
        </div>
      </div>

      {!setupComplete && (
        <Card className="p-5 border-amber-900/60 bg-amber-950/10">
          <div className="flex items-start gap-3">
            <Sparkles size={16} className="text-amber-200 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="text-stone-100 font-medium mb-1">Get the system running</div>
              <p className="text-sm text-stone-400 mb-3">
                The whole thing leans on your skills database. Spend 30 minutes loading it once; every
                application after that takes minutes instead of hours.
              </p>
              <Button size="sm" onClick={() => onNavigate('skills')}>
                Build Skills DB <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Applied" value={stats.total} sub="total submissions" />
        <Stat label="In flight" value={stats.inFlight} sub="awaiting next move" />
        <Stat label="Interviews" value={stats.interviews} accent sub="active conversations" />
        <Stat label="Response %" value={`${stats.responseRate}%`} sub="any response" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <SectionLabel
            right={
              <button
                onClick={() => onNavigate('tracker')}
                className="text-[10px] uppercase tracking-[0.2em] text-amber-200 hover:text-amber-100 font-mono inline-flex items-center gap-1"
              >
                View all <ArrowUpRight size={11} />
              </button>
            }
          >
            Recent applications
          </SectionLabel>
          {recent.length === 0 ? (
            <div className="text-stone-600 text-sm py-6 text-center">
              No applications yet. Add one from the Tracker.
            </div>
          ) : (
            <div className="divide-y divide-stone-900">
              {recent.map((a) => {
                const stage = STAGES.find((s) => s.id === a.status);
                return (
                  <div
                    key={a.id}
                    className="py-3 flex items-center gap-3 cursor-pointer hover:bg-stone-900/30 -mx-2 px-2 rounded-sm"
                    onClick={() => onNavigate('tracker')}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-stone-100 truncate">{a.role || 'Untitled role'}</div>
                      <div className="text-xs text-stone-500 font-mono truncate">
                        {a.company || 'Unknown company'}
                      </div>
                    </div>
                    {typeof a.alignmentScore === 'number' && (
                      <div
                        className="text-sm tabular-nums font-mono w-12 text-right"
                        style={{
                          color:
                            a.alignmentScore >= 80
                              ? '#fcd34d'
                              : a.alignmentScore >= 60
                              ? '#a8a29e'
                              : '#78716c',
                        }}
                      >
                        {a.alignmentScore}%
                      </div>
                    )}
                    <Pill tone={stage?.tone}>{stage?.label}</Pill>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <SectionLabel>Today</SectionLabel>
          {followUps.length === 0 ? (
            <div className="text-stone-600 text-sm py-6">No follow-ups due.</div>
          ) : (
            <ul className="space-y-2.5">
              {followUps.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-2.5 text-sm cursor-pointer hover:text-amber-200"
                  onClick={() => onNavigate('tracker')}
                >
                  <Clock size={13} className="text-amber-200 mt-1 shrink-0" />
                  <div>
                    <div className="text-stone-200">{a.company}</div>
                    <div className="text-xs text-stone-500 font-mono">Follow up · {a.role}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <SectionLabel
          right={
            <button
              onClick={() => onNavigate('discovery')}
              className="text-[10px] uppercase tracking-[0.2em] text-amber-200 hover:text-amber-100 font-mono inline-flex items-center gap-1"
            >
              All discoveries <ArrowUpRight size={11} />
            </button>
          }
        >
          High-fit discoveries
        </SectionLabel>
        {(() => {
          const top = discoveredJobs
            .filter((j) => j.status === 'new' && j.alignmentScore >= 80)
            .sort((a, b) => b.alignmentScore - a.alignmentScore)
            .slice(0, 3);
          if (top.length === 0)
            return (
              <div className="text-stone-600 text-sm py-4 text-center">
                No high-fit postings in the queue right now.
              </div>
            );
          return (
            <div className="divide-y divide-stone-900">
              {top.map((j) => (
                <div
                  key={j.id}
                  className="py-3 flex items-center gap-3 cursor-pointer hover:bg-stone-900/30 -mx-2 px-2 rounded-sm"
                  onClick={() => onNavigate('discovery')}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-stone-100 truncate">{j.role}</div>
                    <div className="text-xs text-stone-500 font-mono truncate">
                      {j.company} · {j.location}
                    </div>
                  </div>
                  <div className="text-sm tabular-nums font-mono text-amber-200 w-12 text-right">
                    {j.alignmentScore}%
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </Card>

      <Card className="p-5">
        <SectionLabel>The compound effect</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-stone-400">
          <div>
            <div className="text-stone-200 mb-1">2-hour rule</div>
            <p>First two hours of the day, applications only. Don't research, don't browse. Submit.</p>
          </div>
          <div>
            <div className="text-stone-200 mb-1">Numbers game</div>
            <p>2-5% application-to-interview is normal. 100 applications, 2-5 interviews. Stay patient.</p>
          </div>
          <div>
            <div className="text-stone-200 mb-1">Track everything</div>
            <p>What gets measured improves. Every rejection is feedback. Adjust and resubmit.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// --- Skills Database ---------------------------------------------------------
function SkillsView({ skillsDB, setSkillsDB }) {
  const [editingProfile, setEditingProfile] = useState(false);
  const [addingJob, setAddingJob] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [addingProject, setAddingProject] = useState(null); // jobId
  const [editingProject, setEditingProject] = useState(null); // {jobId, projectId}
  const [expandedJobs, setExpandedJobs] = useState({});
  const [showImport, setShowImport] = useState(false);

  function updateField(field, value) {
    setSkillsDB({ ...skillsDB, [field]: value });
  }

  function updateContact(field, value) {
    setSkillsDB({ ...skillsDB, contact: { ...skillsDB.contact, [field]: value } });
  }

  function addOrUpdateJob(job) {
    const existing = skillsDB.jobs.find((j) => j.id === job.id);
    const jobs = existing
      ? skillsDB.jobs.map((j) => (j.id === job.id ? job : j))
      : [...skillsDB.jobs, { ...job, id: `J${String(skillsDB.jobs.length + 1).padStart(2, '0')}`, projects: [] }];
    setSkillsDB({ ...skillsDB, jobs });
  }

  function deleteJob(id) {
    if (!confirm('Delete this role and all its projects?')) return;
    setSkillsDB({ ...skillsDB, jobs: skillsDB.jobs.filter((j) => j.id !== id) });
  }

  function addOrUpdateProject(jobId, project) {
    setSkillsDB({
      ...skillsDB,
      jobs: skillsDB.jobs.map((j) => {
        if (j.id !== jobId) return j;
        const existing = j.projects.find((p) => p.id === project.id);
        const projects = existing
          ? j.projects.map((p) => (p.id === project.id ? project : p))
          : [...j.projects, { ...project, id: `P${String(j.projects.length + 1).padStart(2, '0')}` }];
        return { ...j, projects };
      }),
    });
  }

  function deleteProject(jobId, projectId) {
    if (!confirm('Delete this project?')) return;
    setSkillsDB({
      ...skillsDB,
      jobs: skillsDB.jobs.map((j) =>
        j.id === jobId ? { ...j, projects: j.projects.filter((p) => p.id !== projectId) } : j
      ),
    });
  }

  function toggleJobExpand(id) {
    setExpandedJobs((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1
            className="text-4xl text-stone-100"
            style={{ fontFamily: '"Instrument Serif", serif' }}
          >
            Skills Database
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            The source of truth. Every resume, cover letter, and interview pulls from here.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
            <Upload size={13} /> Import
          </Button>
          <Button size="sm" onClick={() => setAddingJob(true)}>
            <Plus size={14} /> Add role
          </Button>
        </div>
      </div>

      {/* Profile */}
      <Card className="p-5">
        <SectionLabel
          right={
            <button
              onClick={() => setEditingProfile(!editingProfile)}
              className="text-[10px] uppercase tracking-[0.2em] text-stone-500 hover:text-amber-200 font-mono inline-flex items-center gap-1"
            >
              {editingProfile ? 'Done' : 'Edit'}
            </button>
          }
        >
          Profile
        </SectionLabel>
        {editingProfile ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Full name">
              <Input value={skillsDB.fullName} onChange={(v) => updateField('fullName', v)} />
            </Field>
            <Field label="Headline">
              <Input
                value={skillsDB.headline}
                onChange={(v) => updateField('headline', v)}
                placeholder="e.g., Senior Full Stack Engineer"
              />
            </Field>
            <div className="md:col-span-2">
              <Field
                label="One-line positioning"
                hint="The sentence that runs through everything. Max ~25 words."
              >
                <Textarea
                  rows={2}
                  value={skillsDB.positioning}
                  onChange={(v) => updateField('positioning', v)}
                  placeholder="e.g., Front-end engineer who turns internal tooling into measurable lift for ops teams at scale."
                />
              </Field>
            </div>
            <Field label="Email">
              <Input value={skillsDB.contact?.email} onChange={(v) => updateContact('email', v)} />
            </Field>
            <Field label="Location">
              <Input value={skillsDB.contact?.location} onChange={(v) => updateContact('location', v)} />
            </Field>
            <Field label="LinkedIn">
              <Input value={skillsDB.contact?.linkedin} onChange={(v) => updateContact('linkedin', v)} mono />
            </Field>
            <Field label="Site / portfolio">
              <Input value={skillsDB.contact?.site} onChange={(v) => updateContact('site', v)} mono />
            </Field>
            <div className="md:col-span-2">
              <Field label="Awards & recognition" hint="One per line">
                <Textarea
                  rows={3}
                  value={(skillsDB.awards || []).join('\n')}
                  onChange={(v) =>
                    updateField(
                      'awards',
                      v.split('\n').map((s) => s.trim()).filter(Boolean)
                    )
                  }
                  placeholder="2025 Award of Excellence at Company X"
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Target roles" hint="Comma-separated">
                <Input
                  value={(skillsDB.targetRoles || []).join(', ')}
                  onChange={(v) =>
                    updateField(
                      'targetRoles',
                      v.split(',').map((s) => s.trim()).filter(Boolean)
                    )
                  }
                />
              </Field>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-2xl text-stone-100" style={{ fontFamily: '"Instrument Serif", serif' }}>
              {skillsDB.fullName || <span className="text-stone-600">Add your name</span>}
            </div>
            <div className="text-stone-400">
              {skillsDB.headline || <span className="text-stone-600">Add a headline</span>}
            </div>
            {skillsDB.positioning && (
              <div className="text-stone-300 italic max-w-3xl text-sm border-l-2 border-amber-200/40 pl-3 mt-3">
                {skillsDB.positioning}
              </div>
            )}
            <div className="text-xs text-stone-500 font-mono pt-2 flex flex-wrap gap-x-4 gap-y-1">
              {skillsDB.contact?.email && <span>{skillsDB.contact.email}</span>}
              {skillsDB.contact?.location && <span>{skillsDB.contact.location}</span>}
              {skillsDB.contact?.linkedin && <span>{skillsDB.contact.linkedin}</span>}
              {skillsDB.contact?.site && <span>{skillsDB.contact.site}</span>}
            </div>
            {(skillsDB.targetRoles || []).length > 0 && (
              <div className="pt-3 border-t border-stone-900 mt-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono mb-2">
                  Target roles
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {skillsDB.targetRoles.map((r, i) => (
                    <Pill key={i} tone="accent">
                      <Target size={9} /> {r}
                    </Pill>
                  ))}
                </div>
              </div>
            )}
            {(skillsDB.awards || []).length > 0 && (
              <div className="pt-3 border-t border-stone-900 mt-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono mb-2">
                  Awards & recognition
                </div>
                <ul className="space-y-1.5">
                  {skillsDB.awards.map((a, i) => (
                    <li key={i} className="text-sm text-stone-300 flex items-start gap-2">
                      <span className="text-amber-200 mt-0.5 shrink-0">◆</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Jobs */}
      <div>
        <SectionLabel>Roles & projects</SectionLabel>
        {skillsDB.jobs.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="text-stone-500 text-sm mb-4">No roles yet.</div>
            <Button size="sm" onClick={() => setAddingJob(true)}>
              <Plus size={14} /> Add your first role
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {skillsDB.jobs.map((job) => {
              const expanded = expandedJobs[job.id];
              return (
                <Card key={job.id}>
                  <div className="p-4 md:p-5">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleJobExpand(job.id)}
                        className="text-stone-500 hover:text-amber-200 mt-1 shrink-0"
                      >
                        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <div className="text-lg text-stone-100" style={{ fontFamily: '"Instrument Serif", serif' }}>
                            {job.title}
                          </div>
                          <div className="text-stone-400 text-sm">{job.employer}</div>
                        </div>
                        <div className="text-xs text-stone-500 font-mono mt-1">
                          {job.startDate} to {job.endDate || 'Present'} · {job.location}
                          {job.projects.length > 0 && ` · ${job.projects.length} project${job.projects.length === 1 ? '' : 's'}`}
                        </div>
                        {job.summary && expanded && (
                          <p className="text-stone-400 text-sm mt-2.5 max-w-3xl">{job.summary}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingJob(job)}
                          className="text-stone-500 hover:text-amber-200 p-1.5"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => deleteJob(job.id)}
                          className="text-stone-500 hover:text-rose-300 p-1.5"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="mt-4 pl-7 space-y-3">
                        {job.projects.map((p) => (
                          <div
                            key={p.id}
                            className="border-l border-stone-800 pl-4 group"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] text-stone-600 font-mono">{p.id}</span>
                                  <div className="text-stone-100 text-sm font-medium">{p.name}</div>
                                </div>
                                {p.problem && (
                                  <div className="text-xs text-stone-500 mb-1">
                                    <span className="text-stone-600 font-mono uppercase tracking-wider">Problem · </span>
                                    {p.problem}
                                  </div>
                                )}
                                {p.result && (
                                  <div className="text-xs text-stone-400 mb-2">
                                    <span className="text-amber-200/70 font-mono uppercase tracking-wider">Result · </span>
                                    {p.result}
                                  </div>
                                )}
                                {(p.skills || []).length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {p.skills.slice(0, 8).map((s, i) => (
                                      <Pill key={i}>{s}</Pill>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => setEditingProject({ jobId: job.id, project: p })}
                                  className="text-stone-500 hover:text-amber-200 p-1"
                                >
                                  <Edit3 size={12} />
                                </button>
                                <button
                                  onClick={() => deleteProject(job.id, p.id)}
                                  className="text-stone-500 hover:text-rose-300 p-1"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={() => setAddingProject(job.id)}
                          className="text-xs text-amber-200 hover:text-amber-100 font-mono uppercase tracking-[0.15em] flex items-center gap-1.5 ml-4 pt-1"
                        >
                          <Plus size={12} /> Add project
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Skill clouds */}
      {skillsDB.jobs.length > 0 && (
        <SkillsClouds skillsDB={skillsDB} setSkillsDB={setSkillsDB} />
      )}

      <JobModal
        open={addingJob || !!editingJob}
        onClose={() => {
          setAddingJob(false);
          setEditingJob(null);
        }}
        job={editingJob}
        onSave={(job) => {
          addOrUpdateJob(job);
          setAddingJob(false);
          setEditingJob(null);
        }}
      />

      <ProjectModal
        open={!!addingProject || !!editingProject}
        onClose={() => {
          setAddingProject(null);
          setEditingProject(null);
        }}
        project={editingProject?.project}
        onSave={(project) => {
          const jobId = addingProject || editingProject?.jobId;
          addOrUpdateProject(jobId, project);
          setAddingProject(null);
          setEditingProject(null);
        }}
      />

      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
      />
    </div>
  );
}

function SkillsClouds({ skillsDB, setSkillsDB }) {
  const aggregated = useMemo(() => {
    const skills = new Set(skillsDB.coreSkills || []);
    const tools = new Set(skillsDB.tools || []);
    const methods = new Set(skillsDB.methods || []);
    const domains = new Set(skillsDB.domains || []);
    skillsDB.jobs.forEach((j) => {
      j.projects.forEach((p) => {
        (p.skills || []).forEach((s) => skills.add(s));
        (p.tools || []).forEach((s) => tools.add(s));
        (p.methods || []).forEach((s) => methods.add(s));
        if (p.domain) domains.add(p.domain);
      });
    });
    return {
      skills: [...skills],
      tools: [...tools],
      methods: [...methods],
      domains: [...domains],
    };
  }, [skillsDB]);

  const groups = [
    { key: 'skills', label: 'Skills', items: aggregated.skills },
    { key: 'tools', label: 'Tools', items: aggregated.tools },
    { key: 'methods', label: 'Methods', items: aggregated.methods },
    { key: 'domains', label: 'Domains', items: aggregated.domains },
  ];

  return (
    <Card className="p-5">
      <SectionLabel>Aggregated index</SectionLabel>
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.key}>
            <div className="text-xs text-stone-500 font-mono uppercase tracking-wider mb-2">
              {g.label} · {g.items.length}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {g.items.length === 0 ? (
                <span className="text-stone-600 text-xs italic">None yet</span>
              ) : (
                g.items.map((s, i) => <Pill key={i}>{s}</Pill>)
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function JobModal({ open, onClose, job, onSave }) {
  const [form, setForm] = useState({
    id: '',
    employer: '',
    title: '',
    startDate: '',
    endDate: '',
    location: '',
    industry: '',
    summary: '',
    projects: [],
  });

  useEffect(() => {
    if (open) {
      setForm(
        job || {
          id: '',
          employer: '',
          title: '',
          startDate: '',
          endDate: '',
          location: '',
          industry: '',
          summary: '',
          projects: [],
        }
      );
    }
  }, [open, job]);

  function save() {
    if (!form.title || !form.employer) {
      alert('Title and employer are required.');
      return;
    }
    onSave(form);
  }

  return (
    <Modal open={open} onClose={onClose} title={job ? 'Edit role' : 'Add role'}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Title">
            <Input value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          </Field>
          <Field label="Employer">
            <Input value={form.employer} onChange={(v) => setForm({ ...form, employer: v })} />
          </Field>
          <Field label="Start date" hint="YYYY-MM or YYYY">
            <Input
              value={form.startDate}
              onChange={(v) => setForm({ ...form, startDate: v })}
              placeholder="2022-03"
              mono
            />
          </Field>
          <Field label="End date" hint="Leave blank for current">
            <Input
              value={form.endDate}
              onChange={(v) => setForm({ ...form, endDate: v })}
              placeholder="Present"
              mono
            />
          </Field>
          <Field label="Location">
            <Input value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
          </Field>
          <Field label="Industry">
            <Input value={form.industry} onChange={(v) => setForm({ ...form, industry: v })} />
          </Field>
        </div>
        <Field label="Summary" hint="1-2 sentences">
          <Textarea
            value={form.summary}
            onChange={(v) => setForm({ ...form, summary: v })}
            rows={3}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2 border-t border-stone-900">
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

function ProjectModal({ open, onClose, project, onSave }) {
  const [form, setForm] = useState({
    id: '',
    name: '',
    problem: '',
    actions: [],
    actionsText: '',
    result: '',
    metricsText: '',
    scope: '',
    skills: [],
    skillsText: '',
    tools: [],
    toolsText: '',
    methods: [],
    methodsText: '',
    domain: '',
    keywords: [],
    keywordsText: '',
    recency: 5,
    confidence: 0.9,
  });

  useEffect(() => {
    if (open) {
      setForm({
        id: project?.id || '',
        name: project?.name || '',
        problem: project?.problem || '',
        actions: project?.actions || [],
        actionsText: (project?.actions || []).join('\n'),
        result: project?.result || '',
        metricsText: project?.metrics ? Object.entries(project.metrics).map(([k, v]) => `${k}: ${v}`).join('\n') : '',
        scope: project?.scope || '',
        skills: project?.skills || [],
        skillsText: (project?.skills || []).join(', '),
        tools: project?.tools || [],
        toolsText: (project?.tools || []).join(', '),
        methods: project?.methods || [],
        methodsText: (project?.methods || []).join(', '),
        domain: project?.domain || '',
        keywords: project?.keywords || [],
        keywordsText: (project?.keywords || []).join(', '),
        recency: project?.recency || 5,
        confidence: project?.confidence || 0.9,
      });
    }
  }, [open, project]);

  function save() {
    if (!form.name) {
      alert('Project name is required.');
      return;
    }
    const parseList = (s) =>
      s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
    const parseMetrics = (s) => {
      const out = {};
      s.split('\n').forEach((line) => {
        const [k, ...rest] = line.split(':');
        if (k && rest.length) out[k.trim()] = rest.join(':').trim();
      });
      return out;
    };
    onSave({
      id: form.id,
      name: form.name,
      problem: form.problem,
      actions: form.actionsText.split('\n').map((s) => s.trim()).filter(Boolean),
      result: form.result,
      metrics: parseMetrics(form.metricsText),
      scope: form.scope,
      skills: parseList(form.skillsText),
      tools: parseList(form.toolsText),
      methods: parseList(form.methodsText),
      domain: form.domain,
      keywords: parseList(form.keywordsText),
      recency: form.recency,
      confidence: form.confidence,
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={project ? 'Edit project' : 'Add project'} wide>
      <div className="space-y-4">
        <Field label="Project name">
          <Input
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            placeholder="e.g., Internal Review Tool POC"
          />
        </Field>
        <Field label="Problem" hint="One sentence">
          <Textarea
            value={form.problem}
            onChange={(v) => setForm({ ...form, problem: v })}
            rows={2}
          />
        </Field>
        <Field label="Actions" hint="One per line, 3-6 verb-led bullets">
          <Textarea
            value={form.actionsText}
            onChange={(v) => setForm({ ...form, actionsText: v })}
            rows={4}
            placeholder={'Led discovery sessions with stakeholders\nDesigned the API contract\nImplemented React frontend with TypeScript'}
          />
        </Field>
        <Field label="Result" hint="Outcome-led sentence with one metric if possible">
          <Textarea
            value={form.result}
            onChange={(v) => setForm({ ...form, result: v })}
            rows={2}
          />
        </Field>
        <Field label="Metrics" hint="One per line. Format: name: value">
          <Textarea
            value={form.metricsText}
            onChange={(v) => setForm({ ...form, metricsText: v })}
            rows={3}
            mono
            placeholder={'users: 25000\ntime_saved_hours: 480\nreduction_percent: 35'}
          />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Skills" hint="Comma-separated">
            <Input value={form.skillsText} onChange={(v) => setForm({ ...form, skillsText: v })} />
          </Field>
          <Field label="Tools" hint="Comma-separated">
            <Input value={form.toolsText} onChange={(v) => setForm({ ...form, toolsText: v })} />
          </Field>
          <Field label="Methods" hint="Comma-separated">
            <Input value={form.methodsText} onChange={(v) => setForm({ ...form, methodsText: v })} />
          </Field>
          <Field label="Domain">
            <Input value={form.domain} onChange={(v) => setForm({ ...form, domain: v })} />
          </Field>
        </div>
        <Field label="Keywords" hint="Comma-separated, for ATS match">
          <Input value={form.keywordsText} onChange={(v) => setForm({ ...form, keywordsText: v })} />
        </Field>
        <div className="flex justify-end gap-2 pt-2 border-t border-stone-900">
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

// TODO[Backend Core Agent]: POST /api/skills/ingest
// TODO[AI Integration Agent]: /lib/ai/skills-ingest.ts with INGEST_SYSTEM prompt;
//   returns Zod-validated SkillsDB shape; retry once on validation failure
// NOTE[Security Agent]: resume text is untrusted input; sanitize before
//   passing to AI workflows
function ImportModal({ open, onClose }) {
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);

  function handleParse() {
    setParsing(true);
    setTimeout(() => {
      setParsing(false);
      alert(
        'Mock: in production this calls Claude with the resume builder prompt and writes structured data into your Skills DB. See handoff doc §5.'
      );
      onClose();
    }, 1200);
  }

  return (
    <Modal open={open} onClose={onClose} title="Import resume or LinkedIn" wide>
      <div className="space-y-4">
        <div className="text-sm text-stone-400">
          Paste resume text, LinkedIn export, or both. The parser will extract roles, projects, skills,
          tools, methods, and metrics into your database. Multiple sources get deduplicated automatically.
        </div>
        <Textarea
          value={text}
          onChange={setText}
          rows={12}
          placeholder="Paste resume text or LinkedIn profile content here..."
          mono
        />
        <div className="text-xs text-stone-600 font-mono">
          {text.length.toLocaleString()} characters
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-stone-900">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleParse} disabled={!text || parsing}>
            <Sparkles size={14} /> {parsing ? 'Parsing...' : 'Parse with Claude'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// --- Tracker -----------------------------------------------------------------
function TrackerView({ applications, setApplications, skillsDB }) {
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState(null);

  function addApplication(app) {
    const id = `app_${Date.now()}`;
    const now = new Date().toISOString();
    setApplications([
      ...applications,
      {
        ...app,
        id,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }

  function updateApp(id, patch) {
    setApplications(
      applications.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a))
    );
  }

  function deleteApp(id) {
    if (!confirm('Delete this application?')) return;
    setApplications(applications.filter((a) => a.id !== id));
    setDetail(null);
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return applications;
    if (filter === 'active')
      return applications.filter((a) => ['applied', 'screen', 'interview'].includes(a.status));
    return applications.filter((a) => a.status === filter);
  }, [applications, filter]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
    [filtered]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-4xl text-stone-100" style={{ fontFamily: '"Instrument Serif", serif' }}>
            Tracker
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Every application, every stage. What gets measured improves.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={14} /> New application
        </Button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All' },
          { id: 'active', label: 'Active' },
          ...STAGES,
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setFilter(s.id)}
            className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm border whitespace-nowrap ${
              filter === s.id
                ? 'bg-stone-800 border-amber-200/40 text-amber-200'
                : 'border-stone-800 text-stone-500 hover:text-stone-300'
            }`}
          >
            {s.label}
            <span className="ml-2 text-stone-600">
              {s.id === 'all'
                ? applications.length
                : s.id === 'active'
                ? applications.filter((a) => ['applied', 'screen', 'interview'].includes(a.status)).length
                : applications.filter((a) => a.status === s.id).length}
            </span>
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-stone-500 text-sm mb-4">
            {applications.length === 0
              ? 'No applications yet. Add your first one.'
              : 'No applications match this filter.'}
          </div>
          {applications.length === 0 && (
            <Button onClick={() => setAddOpen(true)}>
              <Plus size={14} /> New application
            </Button>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-2.5 border-b border-stone-900 text-[10px] uppercase tracking-[0.2em] text-stone-600 font-mono">
            <div className="col-span-4">Role / Company</div>
            <div className="col-span-2">Stage</div>
            <div className="col-span-2">Alignment</div>
            <div className="col-span-2">Applied</div>
            <div className="col-span-2">Follow-up</div>
          </div>
          <div className="divide-y divide-stone-900">
            {sorted.map((a) => {
              const stage = STAGES.find((s) => s.id === a.status);
              return (
                <button
                  key={a.id}
                  onClick={() => setDetail(a)}
                  className="w-full text-left hover:bg-stone-900/40 transition-colors"
                >
                  <div className="grid grid-cols-12 gap-3 px-4 md:px-5 py-3.5 items-center">
                    <div className="col-span-12 md:col-span-4 min-w-0">
                      <div className="text-stone-100 text-sm truncate">{a.role || 'Untitled'}</div>
                      <div className="text-xs text-stone-500 font-mono truncate">
                        {a.company || '—'}
                      </div>
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <Pill tone={stage?.tone}>{stage?.label}</Pill>
                    </div>
                    <div className="col-span-6 md:col-span-2 font-mono text-sm tabular-nums">
                      {typeof a.alignmentScore === 'number' ? (
                        <span
                          style={{
                            color:
                              a.alignmentScore >= 80
                                ? '#fcd34d'
                                : a.alignmentScore >= 60
                                ? '#d6d3d1'
                                : '#78716c',
                          }}
                        >
                          {a.alignmentScore}%
                        </span>
                      ) : (
                        <span className="text-stone-600">—</span>
                      )}
                    </div>
                    <div className="hidden md:block col-span-2 text-xs text-stone-500 font-mono">
                      {a.appliedDate || '—'}
                    </div>
                    <div className="hidden md:block col-span-2 text-xs text-stone-500 font-mono">
                      {a.followUpDate || '—'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <AddApplicationModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={addApplication}
        skillsDB={skillsDB}
      />

      <ApplicationDetail
        application={detail}
        onClose={() => setDetail(null)}
        onUpdate={(patch) => {
          updateApp(detail.id, patch);
          setDetail({ ...detail, ...patch });
        }}
        onDelete={() => deleteApp(detail.id)}
        skillsDB={skillsDB}
      />
    </div>
  );
}

function AddApplicationModal({ open, onClose, onSave, skillsDB }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    company: '',
    role: '',
    url: '',
    location: '',
    remote: false,
    salaryRange: '',
    jobDescription: '',
    status: 'researching',
    appliedDate: '',
    followUpDate: '',
    notes: '',
    source: '',
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1);
        setAnalysis(null);
        setForm({
          company: '',
          role: '',
          url: '',
          location: '',
          remote: false,
          salaryRange: '',
          jobDescription: '',
          status: 'researching',
          appliedDate: '',
          followUpDate: '',
          notes: '',
          source: '',
        });
      }, 200);
    }
  }, [open]);

  function runAnalysis() {
    setAnalyzing(true);
    setTimeout(() => {
      const result = mockAlignmentAnalysis(form.jobDescription, skillsDB);
      setAnalysis(result);
      setAnalyzing(false);
      setStep(3);
    }, 1100);
  }

  function save() {
    onSave({
      ...form,
      alignmentScore: analysis?.score,
      alignmentAnalysis: analysis,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New application" wide>
      <div className="flex gap-1 mb-5">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-0.5 flex-1 ${step >= n ? 'bg-amber-200' : 'bg-stone-800'}`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono">
            Step 1 of 3 · The basics
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Company">
              <Input value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
            </Field>
            <Field label="Role">
              <Input value={form.role} onChange={(v) => setForm({ ...form, role: v })} />
            </Field>
            <Field label="Job URL">
              <Input value={form.url} onChange={(v) => setForm({ ...form, url: v })} mono />
            </Field>
            <Field label="Source" hint="LinkedIn, referral, direct, etc.">
              <Input value={form.source} onChange={(v) => setForm({ ...form, source: v })} />
            </Field>
            <Field label="Location">
              <Input value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
            </Field>
            <Field label="Salary range">
              <Input value={form.salaryRange} onChange={(v) => setForm({ ...form, salaryRange: v })} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-stone-900">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => setStep(2)} disabled={!form.company || !form.role}>
              Next <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono">
            Step 2 of 3 · Job description
          </div>
          <Field
            label="Paste the full job description"
            hint="Used for alignment scoring and ATS keyword extraction. Skip if you don't have it yet."
          >
            <Textarea
              value={form.jobDescription}
              onChange={(v) => setForm({ ...form, jobDescription: v })}
              rows={12}
              mono
            />
          </Field>
          <div className="text-xs text-stone-600 font-mono">
            {form.jobDescription.length.toLocaleString()} characters
          </div>
          <div className="flex justify-between gap-2 pt-3 border-t border-stone-900">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <div className="flex gap-2">
              {form.jobDescription ? (
                <Button onClick={runAnalysis} disabled={analyzing}>
                  <Sparkles size={14} /> {analyzing ? 'Analyzing...' : 'Run alignment'}
                </Button>
              ) : (
                <Button onClick={() => setStep(3)} variant="secondary">
                  Skip
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono">
            Step 3 of 3 · Review & save
          </div>

          {analysis && (
            <Card className="p-4 border-amber-900/50 bg-amber-950/10">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-amber-200 font-mono">
                  Alignment
                </div>
                <div className="text-3xl font-mono tabular-nums text-amber-200">{analysis.score}%</div>
              </div>
              <p className="text-sm text-stone-300 mb-3">{analysis.recommendation}</p>
              {analysis.missingKeywords.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono mb-1.5">
                    Missing keywords (top 5)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.missingKeywords.map((k, i) => (
                      <Pill key={i} tone="warn">
                        {k}
                      </Pill>
                    ))}
                  </div>
                </div>
              )}
              <div className="text-[10px] text-stone-600 font-mono mt-3 italic">
                Mock analysis. In production this is a Claude API call against your full Skills DB.
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Stage">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-stone-900/80 border border-stone-800 rounded-sm px-3 py-2 text-stone-100 text-sm focus:outline-none focus:border-amber-200/60"
              >
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Applied date">
              <Input
                value={form.appliedDate}
                onChange={(v) => setForm({ ...form, appliedDate: v })}
                type="date"
                mono
              />
            </Field>
            <Field label="Follow-up date">
              <Input
                value={form.followUpDate}
                onChange={(v) => setForm({ ...form, followUpDate: v })}
                type="date"
                mono
              />
            </Field>
          </div>

          <Field label="Notes">
            <Textarea
              value={form.notes}
              onChange={(v) => setForm({ ...form, notes: v })}
              rows={3}
            />
          </Field>

          <div className="flex justify-between gap-2 pt-3 border-t border-stone-900">
            <Button variant="ghost" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={save}>Save application</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ApplicationDetail({ application, onClose, onUpdate, onDelete, skillsDB }) {
  const [showJD, setShowJD] = useState(false);
  if (!application) return null;
  const a = application;
  const stage = STAGES.find((s) => s.id === a.status);

  return (
    <Modal open={!!application} onClose={onClose} title={a.role || 'Application'} wide>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-stone-100 text-lg">{a.role}</div>
            <div className="text-stone-500 font-mono text-sm">{a.company}</div>
          </div>
          <select
            value={a.status}
            onChange={(e) => onUpdate({ status: e.target.value })}
            className="bg-stone-900 border border-stone-800 rounded-sm px-3 py-1.5 text-sm text-stone-100"
          >
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {typeof a.alignmentScore === 'number' && (
          <Card className="p-4">
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono">
                Alignment
              </div>
              <div
                className="text-3xl font-mono tabular-nums"
                style={{
                  color:
                    a.alignmentScore >= 80
                      ? '#fcd34d'
                      : a.alignmentScore >= 60
                      ? '#d6d3d1'
                      : '#78716c',
                }}
              >
                {a.alignmentScore}%
              </div>
            </div>
            {a.alignmentAnalysis?.recommendation && (
              <p className="text-sm text-stone-400">{a.alignmentAnalysis.recommendation}</p>
            )}
            {a.alignmentAnalysis?.missingKeywords?.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono mb-1.5">
                  Missing keywords
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {a.alignmentAnalysis.missingKeywords.map((k, i) => (
                    <Pill key={i} tone="warn">
                      {k}
                    </Pill>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Applied date">
            <Input
              value={a.appliedDate}
              onChange={(v) => onUpdate({ appliedDate: v })}
              type="date"
              mono
            />
          </Field>
          <Field label="Follow-up date">
            <Input
              value={a.followUpDate}
              onChange={(v) => onUpdate({ followUpDate: v })}
              type="date"
              mono
            />
          </Field>
        </div>

        <Field label="Notes">
          <Textarea value={a.notes} onChange={(v) => onUpdate({ notes: v })} rows={4} />
        </Field>

        {a.jobDescription && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono">
                Job description
              </div>
              <button
                onClick={() => setShowJD(!showJD)}
                className="text-stone-500 hover:text-amber-200 text-xs font-mono"
              >
                {showJD ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            {showJD && (
              <pre className="text-xs text-stone-400 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                {a.jobDescription}
              </pre>
            )}
          </Card>
        )}

        <Card className="p-4 bg-stone-900/30">
          <SectionLabel>Actions</SectionLabel>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <button className="flex items-center gap-2 px-3 py-2 border border-stone-800 rounded-sm hover:border-amber-200/40 text-stone-300 hover:text-amber-200">
              <Sparkles size={13} /> Generate resume
            </button>
            <button className="flex items-center gap-2 px-3 py-2 border border-stone-800 rounded-sm hover:border-amber-200/40 text-stone-300 hover:text-amber-200">
              <Sparkles size={13} /> Draft cover letter
            </button>
            <button className="flex items-center gap-2 px-3 py-2 border border-stone-800 rounded-sm hover:border-amber-200/40 text-stone-300 hover:text-amber-200">
              <Sparkles size={13} /> Interview prep
            </button>
            <button className="flex items-center gap-2 px-3 py-2 border border-stone-800 rounded-sm hover:border-amber-200/40 text-stone-300 hover:text-amber-200">
              <Copy size={13} /> Copy alignment prompt
            </button>
          </div>
          <div className="text-[10px] text-stone-600 font-mono mt-3 italic">
            These trigger Claude API calls in production. Wired up post-handoff.
          </div>
        </Card>

        <div className="flex justify-between pt-3 border-t border-stone-900">
          <Button variant="danger" size="sm" onClick={onDelete}>
            <Trash2 size={13} /> Delete
          </Button>
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}

// --- Markdown renderer (minimal, prototype-grade) ---------------------------
function Markdown({ children }) {
  const text = children || '';
  const lines = text.split('\n');
  const blocks = [];
  let listBuffer = [];
  const flushList = () => {
    if (listBuffer.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc ml-5 my-2 space-y-1 text-sm text-stone-300">
          {listBuffer.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };
  const renderInline = (str) => {
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) =>
      p.startsWith('**') && p.endsWith('**') ? (
        <strong key={i} className="text-stone-100">
          {p.slice(2, -2)}
        </strong>
      ) : (
        <span key={i}>{p}</span>
      )
    );
  };
  lines.forEach((line, i) => {
    if (line.startsWith('# ')) {
      flushList();
      blocks.push(
        <h1
          key={i}
          className="text-3xl text-stone-100 mt-4 mb-2"
          style={{ fontFamily: '"Instrument Serif", serif' }}
        >
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith('## ')) {
      flushList();
      blocks.push(
        <h2
          key={i}
          className="text-xl text-stone-100 mt-4 mb-2"
          style={{ fontFamily: '"Instrument Serif", serif' }}
        >
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      flushList();
      blocks.push(
        <h3 key={i} className="text-sm uppercase tracking-[0.15em] text-amber-200 font-mono mt-3 mb-1.5">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      listBuffer.push(line.slice(2));
    } else if (line.trim() === '') {
      flushList();
      blocks.push(<div key={i} className="h-2" />);
    } else {
      flushList();
      blocks.push(
        <p key={i} className="text-sm text-stone-300 my-1.5 leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }
  });
  flushList();
  return <div className="max-w-none">{blocks}</div>;
}

// ============================================================================
// MOCK DOCUMENT GENERATORS
// AGENT: AI Integration Agent + Backend Core Agent (joint ownership)
//
// Each function below maps to an AI workflow and a corresponding API route.
// Frontend Agent calls these via /lib/mock-api.ts during the parallel sprint.
// ============================================================================

// TODO[Backend Core Agent]: POST /api/documents/resume
// TODO[AI Integration Agent]: /lib/ai/resume.ts using RESUME_SYSTEM prompt
// CONTRACT: returns markdown string per DocumentBody contract
function mockResume(skillsDB, app) {
  const role = app?.role || skillsDB.headline || 'Role';
  const company = app?.company ? ` (targeting ${app.company})` : '';
  const top = skillsDB.jobs.slice(0, 3);
  const summary =
    skillsDB.positioning ||
    `${skillsDB.headline || 'Engineer'} with experience across enterprise internal tooling.`;
  const skillsLine = [...skillsDB.coreSkills.slice(0, 8), ...skillsDB.tools.slice(0, 8)].join(' · ');
  const expBlocks = top
    .map((j) => {
      const projects = j.projects
        .slice(0, 3)
        .map((p) => `- ${p.result || p.name}${p.metrics && Object.keys(p.metrics).length ? ` (${Object.entries(p.metrics).map(([k, v]) => `${k}: ${v}`).join(', ')})` : ''}`)
        .join('\n');
      return `### ${j.title} at ${j.employer}\n${j.startDate} to ${j.endDate || 'Present'} · ${j.location}\n\n${projects}`;
    })
    .join('\n\n');
  return `# ${skillsDB.fullName || 'Your name'}
${role}${company}

${skillsDB.contact?.email || ''} · ${skillsDB.contact?.location || ''} · ${skillsDB.contact?.site || ''}

## Summary
${summary}

## Skills
${skillsLine}

## Experience
${expBlocks}

${(skillsDB.awards || []).length ? `## Awards\n${skillsDB.awards.map((a) => `- ${a}`).join('\n')}` : ''}
`;
}

// TODO[Backend Core Agent]: POST /api/documents/cover-letter
// TODO[AI Integration Agent]: /lib/ai/cover-letter.ts (multi-turn capable)
function mockCoverLetter(skillsDB, app) {
  const name = skillsDB.fullName || 'Your name';
  const role = app?.role || 'this role';
  const company = app?.company || 'your company';
  const sample = skillsDB.jobs[0]?.projects[0];
  return `# Cover Letter

Dear ${company} hiring team,

I'm writing about the ${role} opening. ${skillsDB.positioning || 'I build internal tools that turn business requirements into measurable operational lift.'}

${
  sample
    ? `In my current role I led ${sample.name.toLowerCase()}: ${sample.result || sample.problem}.`
    : ''
} The work translated directly into outcomes the business could measure, which is the kind of contribution I want to make at ${company}.

What draws me to this role specifically is the chance to apply the same approach at a different scale. I would bring a structured, evidence-led practice to your team from day one.

### Skills and capabilities that align
- ${skillsDB.coreSkills.slice(0, 3).join('\n- ')}
- ${skillsDB.tools.slice(0, 3).join('\n- ')}

I would welcome the chance to discuss how this background fits.

Sincerely,
${name}
`;
}

// TODO[Backend Core Agent]: POST /api/documents/ninety-day-plan
// TODO[AI Integration Agent]: /lib/ai/ninety-day.ts (one-shot)
function mockNinetyDay(skillsDB, app) {
  return `# 90-Day Plan: ${app?.role || 'Target role'} at ${app?.company || 'Company'}

## Days 1-30 · Learn the system
- Map stakeholders, tooling, and the active backlog
- Sit in on team ceremonies and shadow current owners of adjacent surfaces
- Ship one small, low-risk improvement to demonstrate working style
- Identify the two highest-leverage problems worth a structured proposal

## Days 31-60 · Earn the room
- Lead one cross-functional initiative end to end
- Establish a measurement baseline so future work is provably impactful
- Begin pairing with junior engineers and contributing to code review standards
- Write up a short retrospective for the team's reference

## Days 61-90 · Compound
- Take ownership of one durable system or workstream
- Document a roadmap for the next two quarters with measurable outcomes
- Establish recurring touchpoints with stakeholder leadership
- Build the conditions for the next person to ramp faster than you did
`;
}

// TODO[Backend Core Agent]: POST /api/documents/dossier
// TODO[AI Integration Agent]: /lib/ai/dossier.ts with web_search tool enabled
// NOTE[Security Agent]: web_search results may contain prompt injection;
//   sanitize the company name and clip search results to 5k tokens
function mockDossier(app) {
  const company = app?.company || 'Company';
  return `# ${company} Dossier

## What they do
*(In production this is a one-shot Claude call with web search enabled.)* A summary of the company's products, services, and primary business model would appear here, written from current public sources.

## How they make money
Primary revenue lines, customer segments, and pricing posture.

## Recent signals
- Recent news, leadership changes, strategic shifts
- Product launches or pivots in the last 12 months
- Tech stack signals from job postings and public engineering content

## Likely priorities for this role
Inferred from the JD and the company's current situation. What problems is this role most likely being hired to solve?

## Smart questions to ask
- About strategy
- About the team
- About success metrics in the first 90 days
`;
}

// --- Documents View ---------------------------------------------------------
function DocumentsView({ documents, setDocuments, applications, skillsDB }) {
  const [filter, setFilter] = useState('all');
  const [generating, setGenerating] = useState(false);
  const [genKind, setGenKind] = useState('resume');
  const [genAppId, setGenAppId] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);

  const kinds = [
    { id: 'resume', label: 'Resumes' },
    { id: 'cover_letter', label: 'Cover letters' },
    { id: 'ninety_day', label: '90-day plans' },
    { id: 'dossier', label: 'Dossiers' },
  ];

  const filtered = useMemo(() => {
    return [...documents]
      .filter((d) => filter === 'all' || d.kind === filter)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [documents, filter]);

  function runGeneration() {
    setBusy(true);
    setTimeout(() => {
      const app = applications.find((a) => a.id === genAppId);
      let body = '';
      let title = '';
      if (genKind === 'resume') {
        body = mockResume(skillsDB, app);
        title = `Resume for ${app?.role || 'general'}${app?.company ? ` (${app.company})` : ''}`;
      } else if (genKind === 'cover_letter') {
        body = mockCoverLetter(skillsDB, app);
        title = `Cover letter for ${app?.company || 'draft'}`;
      } else if (genKind === 'ninety_day') {
        body = mockNinetyDay(skillsDB, app);
        title = `90-day plan for ${app?.company || 'draft'}`;
      } else {
        body = mockDossier(app);
        title = `Dossier for ${app?.company || 'company'}`;
      }
      const doc = {
        id: `doc_${Date.now()}`,
        kind: genKind,
        title,
        body,
        applicationId: genAppId || null,
        createdAt: new Date().toISOString(),
      };
      setDocuments([doc, ...documents]);
      setBusy(false);
      setGenerating(false);
      setPreview(doc);
    }, 1000);
  }

  function deleteDoc(id) {
    if (!confirm('Delete this document?')) return;
    setDocuments(documents.filter((d) => d.id !== id));
    if (preview?.id === id) setPreview(null);
  }

  function copyDoc(body) {
    navigator.clipboard?.writeText(body);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-4xl text-stone-100" style={{ fontFamily: '"Instrument Serif", serif' }}>
            Documents
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Tailored resumes, cover letters, 90-day plans, and company dossiers. Pulls from your Skills DB.
          </p>
        </div>
        <Button onClick={() => setGenerating(true)}>
          <Sparkles size={14} /> Generate
        </Button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm border whitespace-nowrap ${
            filter === 'all'
              ? 'bg-stone-800 border-amber-200/40 text-amber-200'
              : 'border-stone-800 text-stone-500 hover:text-stone-300'
          }`}
        >
          All <span className="ml-2 text-stone-600">{documents.length}</span>
        </button>
        {kinds.map((k) => (
          <button
            key={k.id}
            onClick={() => setFilter(k.id)}
            className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm border whitespace-nowrap ${
              filter === k.id
                ? 'bg-stone-800 border-amber-200/40 text-amber-200'
                : 'border-stone-800 text-stone-500 hover:text-stone-300'
            }`}
          >
            {k.label}
            <span className="ml-2 text-stone-600">
              {documents.filter((d) => d.kind === k.id).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText size={28} className="text-stone-700 mx-auto mb-3" strokeWidth={1.25} />
          <div className="text-stone-400 text-sm mb-1">
            {documents.length === 0 ? 'No documents yet.' : 'No documents match this filter.'}
          </div>
          {documents.length === 0 && (
            <div className="mt-4">
              <Button onClick={() => setGenerating(true)}>
                <Sparkles size={14} /> Generate your first document
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((d) => {
            const app = applications.find((a) => a.id === d.applicationId);
            return (
              <Card key={d.id} className="p-4 group cursor-pointer hover:border-stone-700" as="div">
                <div onClick={() => setPreview(d)}>
                  <div className="flex items-center gap-2 mb-2">
                    <Pill tone="accent">
                      {kinds.find((k) => k.id === d.kind)?.label.replace(/s$/, '') || d.kind}
                    </Pill>
                    <span className="text-[10px] text-stone-600 font-mono">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div
                    className="text-lg text-stone-100 mb-1"
                    style={{ fontFamily: '"Instrument Serif", serif' }}
                  >
                    {d.title}
                  </div>
                  {app && (
                    <div className="text-xs text-stone-500 font-mono">
                      {app.company} · {app.role}
                    </div>
                  )}
                  <div className="text-xs text-stone-500 mt-2 line-clamp-2">
                    {d.body.replace(/[#*]/g, '').slice(0, 140)}...
                  </div>
                </div>
                <div className="flex gap-1 mt-3 pt-3 border-t border-stone-900">
                  <button
                    onClick={() => copyDoc(d.body)}
                    className="text-xs text-stone-500 hover:text-amber-200 px-2 py-1 font-mono uppercase tracking-wider"
                  >
                    <Copy size={11} className="inline mr-1" /> Copy
                  </button>
                  <button
                    onClick={() => deleteDoc(d.id)}
                    className="text-xs text-stone-500 hover:text-rose-300 px-2 py-1 font-mono uppercase tracking-wider"
                  >
                    <Trash2 size={11} className="inline mr-1" /> Delete
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Generate modal */}
      <Modal
        open={generating}
        onClose={() => !busy && setGenerating(false)}
        title="Generate document"
      >
        <div className="space-y-4">
          <Field label="Document type">
            <div className="grid grid-cols-2 gap-2">
              {kinds.map((k) => (
                <button
                  key={k.id}
                  onClick={() => setGenKind(k.id)}
                  className={`px-3 py-2.5 text-sm border rounded-sm text-left ${
                    genKind === k.id
                      ? 'border-amber-200/60 bg-amber-950/20 text-amber-200'
                      : 'border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  {k.label.replace(/s$/, '')}
                </button>
              ))}
            </div>
          </Field>
          <Field
            label="Tied to application"
            hint={
              applications.length === 0
                ? 'Add an application in the Tracker first for tailored output.'
                : 'Pulls the JD and alignment data for tailoring.'
            }
          >
            <select
              value={genAppId}
              onChange={(e) => setGenAppId(e.target.value)}
              className="w-full bg-stone-900/80 border border-stone-800 rounded-sm px-3 py-2 text-stone-100 text-sm focus:outline-none focus:border-amber-200/60"
            >
              <option value="">— None (general) —</option>
              {applications.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.company} · {a.role}
                </option>
              ))}
            </select>
          </Field>
          <div className="text-[10px] text-stone-600 font-mono italic">
            Mock generation. Production wires this to Claude with your Skills DB and JD as context.
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-stone-900">
            <Button variant="ghost" onClick={() => setGenerating(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={runGeneration} disabled={busy}>
              <Sparkles size={14} /> {busy ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview modal */}
      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.title || 'Document'}
        wide
      >
        {preview && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-900">
              <div className="flex items-center gap-2">
                <Pill tone="accent">{kinds.find((k) => k.id === preview.kind)?.label.replace(/s$/, '')}</Pill>
                <span className="text-[10px] text-stone-600 font-mono">
                  {new Date(preview.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex gap-1.5">
                <Button variant="secondary" size="sm" onClick={() => copyDoc(preview.body)}>
                  <Copy size={12} /> Copy
                </Button>
                <Button variant="danger" size="sm" onClick={() => deleteDoc(preview.id)}>
                  <Trash2 size={12} /> Delete
                </Button>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto pr-2">
              <Markdown>{preview.body}</Markdown>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// --- Interview View ---------------------------------------------------------
function InterviewView({ applications, skillsDB, documents, setDocuments }) {
  const [tab, setTab] = useState('upcoming');
  const [prep, setPrep] = useState(null);

  const upcoming = useMemo(
    () => applications.filter((a) => ['screen', 'interview'].includes(a.status)),
    [applications]
  );

  // Auto-derive STAR-style stories from projects across all jobs
  const stories = useMemo(() => {
    const out = [];
    skillsDB.jobs.forEach((j) => {
      j.projects.forEach((p) => {
        if (p.problem && p.result) {
          out.push({
            id: `${j.id}-${p.id}`,
            title: p.name,
            employer: j.employer,
            situation: `At ${j.employer}: ${p.problem}`,
            task: `As ${j.title}, I owned the response.`,
            action: (p.actions || []).join(' '),
            result: p.result,
            tags: p.relevance || [],
            skills: p.skills || [],
          });
        }
      });
    });
    return out;
  }, [skillsDB]);

  const dossiers = documents.filter((d) => d.kind === 'dossier');

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-4xl text-stone-100" style={{ fontFamily: '"Instrument Serif", serif' }}>
            Interviews
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Dossiers, story library, and mock interviews. Pulls from Skills DB and Tracker.
          </p>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
          { id: 'stories', label: 'Stories', count: stories.length },
          { id: 'dossiers', label: 'Dossiers', count: dossiers.length },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm border whitespace-nowrap ${
              tab === t.id
                ? 'bg-stone-800 border-amber-200/40 text-amber-200'
                : 'border-stone-800 text-stone-500 hover:text-stone-300'
            }`}
          >
            {t.label} <span className="ml-2 text-stone-600">{t.count}</span>
          </button>
        ))}
      </div>

      {tab === 'upcoming' && (
        <>
          {upcoming.length === 0 ? (
            <Card className="p-12 text-center">
              <MessageSquare size={28} className="text-stone-700 mx-auto mb-3" strokeWidth={1.25} />
              <div className="text-stone-400 text-sm mb-1">
                No applications in screen or interview stage.
              </div>
              <div className="text-stone-600 text-xs font-mono mt-1">
                Move an application to Screen or Interview in the Tracker.
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {upcoming.map((a) => {
                const stage = STAGES.find((s) => s.id === a.status);
                return (
                  <Card
                    key={a.id}
                    className="p-4 cursor-pointer hover:border-stone-700"
                    as="div"
                  >
                    <div onClick={() => setPrep(a)}>
                      <div className="flex items-center justify-between mb-2">
                        <Pill tone={stage?.tone}>{stage?.label}</Pill>
                        {typeof a.alignmentScore === 'number' && (
                          <span
                            className="text-sm font-mono tabular-nums"
                            style={{
                              color: a.alignmentScore >= 80 ? '#fcd34d' : '#d6d3d1',
                            }}
                          >
                            {a.alignmentScore}%
                          </span>
                        )}
                      </div>
                      <div
                        className="text-lg text-stone-100"
                        style={{ fontFamily: '"Instrument Serif", serif' }}
                      >
                        {a.role}
                      </div>
                      <div className="text-xs text-stone-500 font-mono mt-1">{a.company}</div>
                      <div className="mt-3 pt-3 border-t border-stone-900 text-xs text-amber-200/80 font-mono uppercase tracking-wider flex items-center gap-1">
                        <Sparkles size={11} /> Open prep
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'stories' && (
        <>
          {stories.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="text-stone-500 text-sm">
                Add projects with problem and result fields to generate stories.
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-stone-500 font-mono">
                Auto-generated from your project entries. Each one is a STAR-shaped story.
              </div>
              {stories.map((s) => (
                <Card key={s.id} className="p-4">
                  <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
                    <div>
                      <div
                        className="text-lg text-stone-100"
                        style={{ fontFamily: '"Instrument Serif", serif' }}
                      >
                        {s.title}
                      </div>
                      <div className="text-xs text-stone-500 font-mono">{s.employer}</div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {s.tags.map((t, i) => (
                        <Pill key={i}>{t}</Pill>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 mt-3 text-sm">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-amber-200 font-mono mr-2">
                        Situation
                      </span>
                      <span className="text-stone-300">{s.situation}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-amber-200 font-mono mr-2">
                        Action
                      </span>
                      <span className="text-stone-300">{s.action}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-amber-200 font-mono mr-2">
                        Result
                      </span>
                      <span className="text-stone-300">{s.result}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'dossiers' && (
        <>
          {dossiers.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="text-stone-500 text-sm mb-1">No dossiers yet.</div>
              <div className="text-stone-600 text-xs font-mono">
                Generate one from the Documents tab.
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dossiers.map((d) => (
                <Card key={d.id} className="p-4">
                  <div className="text-[10px] text-stone-500 font-mono uppercase tracking-wider mb-1">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-lg text-stone-100" style={{ fontFamily: '"Instrument Serif", serif' }}>
                    {d.title}
                  </div>
                  <div className="text-xs text-stone-500 line-clamp-3 mt-2">
                    {d.body.replace(/[#*]/g, '').slice(0, 200)}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <InterviewPrepModal
        application={prep}
        onClose={() => setPrep(null)}
        skillsDB={skillsDB}
        stories={stories}
        documents={documents}
        setDocuments={setDocuments}
      />
    </div>
  );
}

function InterviewPrepModal({ application, onClose, skillsDB, stories, documents, setDocuments }) {
  const [tab, setTab] = useState('dossier');
  const [chat, setChat] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    if (application) {
      setTab('dossier');
      // Seed the mock interview with an opener
      setChat([
        {
          role: 'interviewer',
          text: `Thanks for making the time. To start: walk me through your most relevant experience for the ${application.role} role.`,
        },
      ]);
      setChatInput('');
    }
  }, [application?.id]);

  function generateDossier() {
    if (!application) return;
    const existing = documents.find(
      (d) => d.kind === 'dossier' && d.applicationId === application.id
    );
    if (existing) {
      alert('A dossier already exists for this application. Open it from the Documents tab.');
      return;
    }
    const body = mockDossier(application);
    const doc = {
      id: `doc_${Date.now()}`,
      kind: 'dossier',
      title: `Dossier for ${application.company}`,
      body,
      applicationId: application.id,
      createdAt: new Date().toISOString(),
    };
    setDocuments([doc, ...documents]);
    alert('Dossier generated. View it in the Documents tab.');
  }

  function sendChat() {
    if (!chatInput.trim()) return;
    const userMsg = { role: 'user', text: chatInput };
    setChat([...chat, userMsg]);
    setChatInput('');
    setThinking(true);
    setTimeout(() => {
      const followups = [
        'Good. Drill into the trickiest part of that. What broke and how did you handle it?',
        'Walk me through how you decided the scope. What did you cut?',
        'Tell me about a stakeholder who pushed back. What was the disagreement and how did it resolve?',
        'What would you do differently if you had to do that work again?',
        'How did you measure success? Who saw the metric?',
      ];
      const next = followups[Math.floor(Math.random() * followups.length)];
      setChat((prev) => [...prev, { role: 'interviewer', text: next }]);
      setThinking(false);
    }, 900);
  }

  if (!application) return null;
  const dossierDoc = documents.find(
    (d) => d.kind === 'dossier' && d.applicationId === application.id
  );

  return (
    <Modal open={!!application} onClose={onClose} title={`${application.company} Prep`} wide>
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="text-lg text-stone-100"
            style={{ fontFamily: '"Instrument Serif", serif' }}
          >
            {application.role}
          </div>
          <Pill tone={STAGES.find((s) => s.id === application.status)?.tone}>
            {STAGES.find((s) => s.id === application.status)?.label}
          </Pill>
        </div>

        <div className="flex gap-1.5">
          {[
            { id: 'dossier', label: 'Dossier' },
            { id: 'mock', label: 'Mock Interview' },
            { id: 'stories', label: 'Stories' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm border ${
                tab === t.id
                  ? 'bg-stone-800 border-amber-200/40 text-amber-200'
                  : 'border-stone-800 text-stone-500 hover:text-stone-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'dossier' && (
          <div>
            {dossierDoc ? (
              <div className="max-h-[55vh] overflow-y-auto pr-2">
                <Markdown>{dossierDoc.body}</Markdown>
              </div>
            ) : (
              <Card className="p-8 text-center">
                <div className="text-stone-400 text-sm mb-3">
                  No dossier yet for {application.company}.
                </div>
                <Button onClick={generateDossier}>
                  <Sparkles size={14} /> Generate dossier
                </Button>
                <div className="text-[10px] text-stone-600 font-mono mt-4 italic">
                  In production: one-shot Claude call with web search enabled. Cached 7 days.
                </div>
              </Card>
            )}
          </div>
        )}

        {tab === 'mock' && (
          <div>
            <div className="bg-stone-900/40 border border-stone-800 rounded-sm h-[50vh] overflow-y-auto p-4 space-y-3">
              {chat.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[80%] ${m.role === 'user' ? 'ml-auto text-right' : ''}`}
                >
                  <div className="text-[10px] text-stone-600 font-mono uppercase tracking-wider mb-1">
                    {m.role === 'user' ? 'You' : 'Interviewer'}
                  </div>
                  <div
                    className={`text-sm p-3 rounded-sm ${
                      m.role === 'user'
                        ? 'bg-amber-950/30 border border-amber-900/40 text-stone-200'
                        : 'bg-stone-800/60 border border-stone-700/40 text-stone-200'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="text-[10px] text-stone-500 font-mono">Interviewer thinking...</div>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <Textarea
                value={chatInput}
                onChange={setChatInput}
                rows={2}
                placeholder="Type your answer..."
              />
              <Button onClick={sendChat} disabled={!chatInput.trim() || thinking}>
                Send
              </Button>
            </div>
            <div className="text-[10px] text-stone-600 font-mono mt-2 italic">
              Mock interview. In production: streaming Claude conversation with role and JD context.
            </div>
          </div>
        )}

        {tab === 'stories' && (
          <div className="max-h-[55vh] overflow-y-auto space-y-3 pr-2">
            <div className="text-xs text-stone-500 font-mono">
              Stories most likely to fit this role, ranked by tag overlap.
            </div>
            {stories.slice(0, 8).map((s) => (
              <div key={s.id} className="border-l-2 border-amber-200/40 pl-3 py-1">
                <div className="text-stone-100 text-sm">{s.title}</div>
                <div className="text-xs text-stone-500 mt-1">{s.result}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ============================================================================
// DISCOVERY VIEW
// AGENT: Frontend Agent
// Routes to: /app/(app)/discovery/page.tsx
//
// CROSS-LAYER DEPENDENCIES (all called via mock during parallel sprint):
//   - watchlist CRUD     → Backend Core: /api/watchlist
//   - poll trigger       → Backend Core: /api/discovery/poll (manual trigger)
//   - draft application  → Backend Core: POST /api/applications (creates row)
//                          + POST /api/documents/resume
//                          + POST /api/documents/cover-letter
// ============================================================================
function DiscoveryView({
  discoveredJobs,
  setDiscoveredJobs,
  watchlist,
  setWatchlist,
  applications,
  setApplications,
  documents,
  setDocuments,
  skillsDB,
  onNavigate,
}) {
  const [tab, setTab] = useState('queue');
  const [filter, setFilter] = useState('new');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [preview, setPreview] = useState(null);
  const [drafting, setDrafting] = useState(false);
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [polling, setPolling] = useState(false);

  const filteredJobs = useMemo(() => {
    return [...discoveredJobs]
      .filter((j) => filter === 'all' || j.status === filter)
      .filter((j) => companyFilter === 'all' || j.company === companyFilter)
      .sort((a, b) => (b.alignmentScore || 0) - (a.alignmentScore || 0));
  }, [discoveredJobs, filter, companyFilter]);

  const companies = useMemo(
    () => Array.from(new Set(discoveredJobs.map((j) => j.company))).sort(),
    [discoveredJobs]
  );

  const counts = useMemo(
    () => ({
      new: discoveredJobs.filter((j) => j.status === 'new').length,
      drafted: discoveredJobs.filter((j) => j.status === 'drafted').length,
      dismissed: discoveredJobs.filter((j) => j.status === 'dismissed').length,
      all: discoveredJobs.length,
    }),
    [discoveredJobs]
  );

  function draftApplication(job) {
    setDrafting(true);
    setTimeout(() => {
      const now = new Date().toISOString();
      const appId = `app_${Date.now()}`;
      const newApp = {
        id: appId,
        company: job.company,
        role: job.role,
        url: job.url,
        location: job.location,
        remote: job.remote,
        salaryRange: job.salaryRange,
        jobDescription: job.jobDescription,
        status: 'researching',
        appliedDate: '',
        followUpDate: '',
        notes: `Discovered via ${job.atsProvider}. Application drafted from Discovery queue.`,
        source: `Discovery (${job.atsProvider})`,
        alignmentScore: job.alignmentScore,
        alignmentAnalysis: mockAlignmentAnalysis(job.jobDescription, skillsDB),
        createdAt: now,
        updatedAt: now,
      };
      setApplications([...applications, newApp]);

      const resume = mockResume(skillsDB, newApp);
      const coverLetter = mockCoverLetter(skillsDB, newApp);
      const baseId = Date.now();
      const newDocs = [
        {
          id: `doc_${baseId}_resume`,
          kind: 'resume',
          title: `Resume for ${job.role} (${job.company})`,
          body: resume,
          applicationId: appId,
          createdAt: now,
        },
        {
          id: `doc_${baseId}_cl`,
          kind: 'cover_letter',
          title: `Cover letter for ${job.company}`,
          body: coverLetter,
          applicationId: appId,
          createdAt: now,
        },
      ];
      setDocuments([...newDocs, ...documents]);

      setDiscoveredJobs(
        discoveredJobs.map((j) =>
          j.id === job.id ? { ...j, status: 'drafted', applicationId: appId } : j
        )
      );

      setDrafting(false);
      setPreview(null);
      setToast({
        message: `Drafted for ${job.company}: resume + cover letter ready in Tracker.`,
        appId,
      });
      setTimeout(() => setToast(null), 5000);
    }, 1200);
  }

  function dismissJob(jobId) {
    setDiscoveredJobs(
      discoveredJobs.map((j) => (j.id === jobId ? { ...j, status: 'dismissed' } : j))
    );
  }

  function restoreJob(jobId) {
    setDiscoveredJobs(discoveredJobs.map((j) => (j.id === jobId ? { ...j, status: 'new' } : j)));
  }

  function removeFromWatchlist(id) {
    if (!confirm('Stop polling this company?')) return;
    setWatchlist(watchlist.filter((w) => w.id !== id));
  }

  function addToWatchlist(entry) {
    setWatchlist([
      ...watchlist,
      { ...entry, id: `w_${Date.now()}`, lastPolled: new Date().toISOString() },
    ]);
    setAddCompanyOpen(false);
  }

  function pollNow() {
    setPolling(true);
    setTimeout(() => {
      setWatchlist(
        watchlist.map((w) => ({ ...w, lastPolled: new Date().toISOString() }))
      );
      setPolling(false);
      setToast({ message: 'Polled all watchlist companies. No new postings.', appId: null });
      setTimeout(() => setToast(null), 4000);
    }, 1400);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-4xl text-stone-100" style={{ fontFamily: '"Instrument Serif", serif' }}>
            Discovery
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Polls your company watchlist for new postings and scores them against your Skills DB.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={pollNow} disabled={polling}>
            <RefreshCw size={13} className={polling ? 'animate-spin' : ''} />
            {polling ? 'Polling...' : 'Poll now'}
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Watching" value={watchlist.length} sub="companies" />
        <Stat
          label="High fit"
          value={discoveredJobs.filter((j) => j.alignmentScore >= 80 && j.status === 'new').length}
          accent
          sub="score ≥ 80"
        />
        <Stat label="Drafted" value={counts.drafted} sub="in tracker" />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'queue', label: 'Queue' },
          { id: 'watchlist', label: 'Watchlist' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm border whitespace-nowrap ${
              tab === t.id
                ? 'bg-stone-800 border-amber-200/40 text-amber-200'
                : 'border-stone-800 text-stone-500 hover:text-stone-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'queue' && (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex gap-1.5 flex-wrap">
              {[
                { id: 'new', label: 'New', count: counts.new },
                { id: 'drafted', label: 'Drafted', count: counts.drafted },
                { id: 'dismissed', label: 'Dismissed', count: counts.dismissed },
                { id: 'all', label: 'All', count: counts.all },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm border whitespace-nowrap ${
                    filter === f.id
                      ? 'bg-stone-800 border-amber-200/40 text-amber-200'
                      : 'border-stone-800 text-stone-500 hover:text-stone-300'
                  }`}
                >
                  {f.label} <span className="ml-2 text-stone-600">{f.count}</span>
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono">
                Company
              </span>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="bg-stone-900/80 border border-stone-800 rounded-sm px-3 py-1.5 text-stone-100 text-xs focus:outline-none focus:border-amber-200/60"
              >
                <option value="all">All</option>
                {companies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredJobs.length === 0 ? (
            <Card className="p-12 text-center">
              <Compass size={28} className="text-stone-700 mx-auto mb-3" strokeWidth={1.25} />
              <div className="text-stone-400 text-sm">
                {discoveredJobs.length === 0
                  ? 'No postings yet. Add companies to the watchlist.'
                  : 'No postings match this filter.'}
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-2.5 border-b border-stone-900 text-[10px] uppercase tracking-[0.2em] text-stone-600 font-mono">
                <div className="col-span-5">Role / Company</div>
                <div className="col-span-2">Location</div>
                <div className="col-span-2">Posted</div>
                <div className="col-span-1">Fit</div>
                <div className="col-span-2">Status</div>
              </div>
              <div className="divide-y divide-stone-900">
                {filteredJobs.map((j) => (
                  <button
                    key={j.id}
                    onClick={() => setPreview(j)}
                    className="w-full text-left hover:bg-stone-900/40 transition-colors"
                  >
                    <div className="grid grid-cols-12 gap-3 px-4 md:px-5 py-3.5 items-center">
                      <div className="col-span-12 md:col-span-5 min-w-0">
                        <div className="text-stone-100 text-sm truncate">{j.role}</div>
                        <div className="text-xs text-stone-500 font-mono truncate">
                          {j.company} · {j.atsProvider}
                        </div>
                      </div>
                      <div className="hidden md:block col-span-2 text-xs text-stone-400 truncate">
                        {j.location}
                      </div>
                      <div className="hidden md:block col-span-2 text-xs text-stone-500 font-mono">
                        {j.postedAt}
                      </div>
                      <div className="col-span-3 md:col-span-1">
                        <div
                          className="text-sm font-mono tabular-nums"
                          style={{
                            color:
                              j.alignmentScore >= 80
                                ? '#fcd34d'
                                : j.alignmentScore >= 60
                                ? '#d6d3d1'
                                : '#78716c',
                          }}
                        >
                          {j.alignmentScore}%
                        </div>
                      </div>
                      <div className="col-span-9 md:col-span-2 flex justify-end md:justify-start">
                        {j.status === 'new' && <Pill tone="accent">New</Pill>}
                        {j.status === 'drafted' && <Pill tone="success">Drafted</Pill>}
                        {j.status === 'dismissed' && <Pill tone="muted">Dismissed</Pill>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {tab === 'watchlist' && (
        <>
          <div className="flex items-center justify-between">
            <div className="text-xs text-stone-500 font-mono">
              {watchlist.length} {watchlist.length === 1 ? 'company' : 'companies'} polled daily
            </div>
            <Button size="sm" onClick={() => setAddCompanyOpen(true)}>
              <Plus size={13} /> Add company
            </Button>
          </div>

          {watchlist.length === 0 ? (
            <Card className="p-12 text-center">
              <Building2 size={28} className="text-stone-700 mx-auto mb-3" strokeWidth={1.25} />
              <div className="text-stone-400 text-sm mb-3">No companies on your watchlist.</div>
              <Button onClick={() => setAddCompanyOpen(true)}>
                <Plus size={14} /> Add your first company
              </Button>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="divide-y divide-stone-900">
                {watchlist.map((w) => {
                  const open = discoveredJobs.filter(
                    (j) => j.company === w.company && j.status !== 'dismissed'
                  ).length;
                  return (
                    <div key={w.id} className="px-4 md:px-5 py-3.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-stone-100 text-sm">{w.company}</div>
                        <div className="text-xs text-stone-500 font-mono">
                          {w.atsProvider} / {w.atsSlug}
                        </div>
                      </div>
                      <div className="text-xs text-stone-500 font-mono hidden sm:block">
                        Last polled {new Date(w.lastPolled).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-amber-200 font-mono tabular-nums">
                        {open} {open === 1 ? 'role' : 'roles'}
                      </div>
                      <button
                        onClick={() => removeFromWatchlist(w.id)}
                        className="text-stone-500 hover:text-rose-300 p-1.5"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <Card className="p-5 bg-stone-900/30">
            <SectionLabel>How polling works</SectionLabel>
            <p className="text-sm text-stone-400">
              Once daily, a background job queries each company's public ATS endpoint for new
              postings. Each new posting is scored against your Skills DB and surfaces here. We only
              poll public APIs published by the ATS provider (Greenhouse, Lever, Ashby, Workday).
              No scraping, no automated submission.
            </p>
          </Card>
        </>
      )}

      {/* Preview / draft modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.role || 'Posting'} wide>
        {preview && (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between flex-wrap gap-3">
              <div>
                <div className="text-lg text-stone-100" style={{ fontFamily: '"Instrument Serif", serif' }}>
                  {preview.role}
                </div>
                <div className="text-xs text-stone-500 font-mono">
                  {preview.company} · {preview.location} · posted {preview.postedAt}
                </div>
              </div>
              <div
                className="text-3xl font-mono tabular-nums"
                style={{
                  color:
                    preview.alignmentScore >= 80
                      ? '#fcd34d'
                      : preview.alignmentScore >= 60
                      ? '#d6d3d1'
                      : '#78716c',
                }}
              >
                {preview.alignmentScore}%
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-stone-500 font-mono">
              <span>{preview.atsProvider}</span>
              {preview.remote && <span>· remote</span>}
              {preview.salaryRange && <span>· {preview.salaryRange}</span>}
            </div>

            <a
              href={preview.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-200 hover:text-amber-100 font-mono uppercase tracking-wider inline-flex items-center gap-1"
            >
              View original posting <ExternalLink size={11} />
            </a>

            <Card className="p-4 bg-stone-900/40 max-h-[40vh] overflow-y-auto">
              <p className="text-sm text-stone-300 leading-relaxed whitespace-pre-wrap">
                {preview.jobDescription}
              </p>
            </Card>

            {preview.status === 'drafted' ? (
              <Card className="p-4 border-emerald-900/50 bg-emerald-950/10">
                <div className="text-sm text-emerald-200 mb-2">
                  Application already drafted for this posting.
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setPreview(null);
                    onNavigate('tracker');
                  }}
                >
                  Open in Tracker <ChevronRight size={13} />
                </Button>
              </Card>
            ) : (
              <div className="flex flex-col md:flex-row justify-end gap-2 pt-3 border-t border-stone-900">
                <Button
                  variant="ghost"
                  onClick={() => {
                    dismissJob(preview.id);
                    setPreview(null);
                  }}
                  disabled={drafting}
                >
                  Dismiss
                </Button>
                {preview.status === 'dismissed' && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      restoreJob(preview.id);
                      setPreview(null);
                    }}
                  >
                    Restore to queue
                  </Button>
                )}
                <Button onClick={() => draftApplication(preview)} disabled={drafting}>
                  <Sparkles size={14} />
                  {drafting ? 'Drafting...' : 'Draft application'}
                </Button>
              </div>
            )}
            <div className="text-[10px] text-stone-600 font-mono italic">
              Drafting generates a tailored resume and cover letter using your Skills DB, creates a
              Tracker entry at "Researching", and links everything together. You still hit submit on
              the company's own site.
            </div>
          </div>
        )}
      </Modal>

      <AddCompanyModal
        open={addCompanyOpen}
        onClose={() => setAddCompanyOpen(false)}
        onSave={addToWatchlist}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-40">
          <div className="bg-stone-900 border border-amber-200/40 rounded-sm shadow-2xl p-4">
            <div className="text-sm text-stone-100 mb-2">{toast.message}</div>
            {toast.appId && (
              <button
                onClick={() => {
                  setToast(null);
                  onNavigate('tracker');
                }}
                className="text-xs text-amber-200 hover:text-amber-100 font-mono uppercase tracking-wider"
              >
                Open in Tracker <ChevronRight size={11} className="inline" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// TODO[Backend Core Agent]: POST /api/watchlist (calls AtsAdapter.validateSlug)
// TODO[ATS Adapter Agent]: validateSlug must hit the real provider endpoint
//   and return clear error messages for the user
function AddCompanyModal({ open, onClose, onSave }) {
  const [form, setForm] = useState({ company: '', atsProvider: 'greenhouse', atsSlug: '' });

  useEffect(() => {
    if (open) setForm({ company: '', atsProvider: 'greenhouse', atsSlug: '' });
  }, [open]);

  function save() {
    if (!form.company || !form.atsSlug) {
      alert('Company name and ATS slug are both required.');
      return;
    }
    onSave(form);
  }

  const providerHints = {
    greenhouse: 'e.g., for boards.greenhouse.io/anthropic, slug is "anthropic"',
    lever: 'e.g., for jobs.lever.co/airtable, slug is "airtable"',
    ashby: 'e.g., for jobs.ashbyhq.com/vercel, slug is "vercel"',
    workday: 'e.g., subdomain like "mycompany" from mycompany.wd5.myworkdayjobs.com',
  };

  return (
    <Modal open={open} onClose={onClose} title="Add company to watchlist">
      <div className="space-y-4">
        <Field label="Company name">
          <Input
            value={form.company}
            onChange={(v) => setForm({ ...form, company: v })}
            placeholder="Anthropic"
          />
        </Field>
        <Field label="ATS provider">
          <select
            value={form.atsProvider}
            onChange={(e) => setForm({ ...form, atsProvider: e.target.value })}
            className="w-full bg-stone-900/80 border border-stone-800 rounded-sm px-3 py-2 text-stone-100 text-sm focus:outline-none focus:border-amber-200/60"
          >
            <option value="greenhouse">Greenhouse</option>
            <option value="lever">Lever</option>
            <option value="ashby">Ashby</option>
            <option value="workday">Workday</option>
          </select>
        </Field>
        <Field label="Slug or subdomain" hint={providerHints[form.atsProvider]}>
          <Input
            value={form.atsSlug}
            onChange={(v) => setForm({ ...form, atsSlug: v.trim() })}
            mono
            placeholder="anthropic"
          />
        </Field>
        <div className="text-[10px] text-stone-600 font-mono italic">
          In production, save validates the slug by polling the ATS endpoint and confirming it
          returns jobs.
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-stone-900">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save & poll</Button>
        </div>
      </div>
    </Modal>
  );
}

// --- Settings ----------------------------------------------------------------
function SettingsView({ apiKey, setApiKey, dailyTarget, setDailyTarget, onReset }) {
  const [showKey, setShowKey] = useState(false);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl text-stone-100" style={{ fontFamily: '"Instrument Serif", serif' }}>
          Settings
        </h1>
      </div>

      <Card className="p-5">
        <SectionLabel>Anthropic API key</SectionLabel>
        {/* TODO[Security Agent]: encrypt at rest with passphrase-derived key */}
        {/* TODO[Security Agent]: add "last 4 chars + created date" meta storage */}
        {/* CONTRACT: LOCAL_STORAGE_KEYS.apiKey from /contracts/storage.ts */}
        <p className="text-sm text-stone-400 mb-3">
          Throughline is bring-your-own-key. Your key is stored locally and used only for AI calls. Get
          one at{' '}
          <span className="text-amber-200 font-mono">console.anthropic.com</span>.
        </p>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={apiKey}
              onChange={setApiKey}
              placeholder="sk-ant-..."
              type={showKey ? 'text' : 'password'}
              mono
            />
          </div>
          <button
            onClick={() => setShowKey(!showKey)}
            className="text-stone-500 hover:text-amber-200 px-2"
          >
            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </Card>

      <Card className="p-5">
        <SectionLabel>Daily target</SectionLabel>
        <p className="text-sm text-stone-400 mb-3">
          Applications per day during active search. Used by the dashboard streak tracker.
        </p>
        <div className="w-32">
          <Input value={dailyTarget} onChange={setDailyTarget} type="number" mono />
        </div>
      </Card>

      <Card className="p-5">
        <SectionLabel>Data</SectionLabel>
        <p className="text-sm text-stone-400 mb-3">
          All data is stored locally in the artifact's persistent storage. Export and backup will ship
          with the deployable.
        </p>
        <Button variant="danger" size="sm" onClick={onReset}>
          <Archive size={13} /> Reset all data
        </Button>
      </Card>
    </div>
  );
}

// ============================================================================
// ROOT
// ============================================================================
// ============================================================================
// ROOT APP
// AGENT: Frontend Agent (view orchestration) + Foundation Agent (auth/routing shell)
//
// In production, this component is split into:
//   - /app/(auth)/layout.tsx   → Foundation Agent: Clerk-gated layout
//   - /app/(app)/layout.tsx    → Frontend Agent: sidebar, bottom nav, header
//   - /app/(app)/[view]/page.tsx → Frontend Agent: each route renders one view
// State management migrates from useState + window.storage to:
//   - Zustand for client state (sidebar collapse, modal state, etc.)
//   - TanStack Query for server state (skillsDB, applications, etc.)
// ============================================================================
export default function App() {
  const [route, setRoute] = useState('dashboard');
  const [skillsDB, setSkillsDBState] = useState(blankSkillsDB);
  const [applications, setApplicationsState] = useState([]);
  const [documents, setDocumentsState] = useState([]);
  const [discoveredJobs, setDiscoveredJobsState] = useState([]);
  const [watchlist, setWatchlistState] = useState([]);
  const [apiKey, setApiKeyState] = useState('');
  const [dailyTarget, setDailyTargetState] = useState(5);
  const [loaded, setLoaded] = useState(false);

  // Load from persistent storage
  useEffect(() => {
    (async () => {
      const sdb = await storage.get('throughline:skillsDB', eliseSeed);
      const apps = await storage.get('throughline:applications', []);
      const docs = await storage.get('throughline:documents', []);
      const disc = await storage.get('throughline:discoveredJobs', discoverySeed);
      const wl = await storage.get('throughline:watchlist', watchlistSeed);
      const key = await storage.get('throughline:apiKey', '');
      const target = await storage.get('throughline:dailyTarget', 5);
      setSkillsDBState(sdb || eliseSeed);
      setApplicationsState(apps || []);
      setDocumentsState(docs || []);
      setDiscoveredJobsState(disc || discoverySeed);
      setWatchlistState(wl || watchlistSeed);
      setApiKeyState(key || '');
      setDailyTargetState(target || 5);
      setLoaded(true);
    })();
  }, []);

  // Auto-save
  const setSkillsDB = useCallback((v) => {
    setSkillsDBState(v);
    storage.set('throughline:skillsDB', v);
  }, []);
  const setApplications = useCallback((v) => {
    setApplicationsState(v);
    storage.set('throughline:applications', v);
  }, []);
  const setDocuments = useCallback((v) => {
    setDocumentsState(v);
    storage.set('throughline:documents', v);
  }, []);
  const setDiscoveredJobs = useCallback((v) => {
    setDiscoveredJobsState(v);
    storage.set('throughline:discoveredJobs', v);
  }, []);
  const setWatchlist = useCallback((v) => {
    setWatchlistState(v);
    storage.set('throughline:watchlist', v);
  }, []);
  const setApiKey = useCallback((v) => {
    setApiKeyState(v);
    storage.set('throughline:apiKey', v);
  }, []);
  const setDailyTarget = useCallback((v) => {
    setDailyTargetState(v);
    storage.set('throughline:dailyTarget', v);
  }, []);

  function reset() {
    if (!confirm('Delete all local data?')) return;
    setSkillsDB(blankSkillsDB);
    setApplications([]);
    setDocuments([]);
    setDiscoveredJobs([]);
    setWatchlist([]);
    setApiKey('');
    setDailyTarget(5);
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-stone-600 font-mono text-xs uppercase tracking-[0.2em]">Loading...</div>
      </div>
    );
  }

  const currentNav = NAV.find((n) => n.id === route);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;500&display=swap');
        body { background: #0c0a09; }
        .font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
        ::selection { background: #fcd34d; color: #0c0a09; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.6); cursor: pointer; }
        select { -webkit-appearance: none; appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='2'%3e%3cpath d='m6 9 6 6 6-6'/%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 0.5rem center; background-size: 1rem; padding-right: 2rem; }
      `}</style>

      <div className="flex min-h-screen">
        <Sidebar current={route} onChange={setRoute} />

        <main className="flex-1 min-w-0 pb-24 md:pb-12">
          {/* Mobile header */}
          <header className="md:hidden sticky top-0 z-20 bg-stone-950/95 backdrop-blur border-b border-stone-900 px-4 py-3 flex items-center justify-between">
            <div className="text-lg text-amber-200" style={{ fontFamily: '"Instrument Serif", serif' }}>
              Throughline
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono">
              {currentNav?.label}
            </div>
          </header>

          <div className="px-4 md:px-8 lg:px-12 py-6 md:py-10 max-w-6xl">
            {route === 'dashboard' && (
              <Dashboard
                skillsDB={skillsDB}
                applications={applications}
                discoveredJobs={discoveredJobs}
                onNavigate={setRoute}
              />
            )}
            {route === 'skills' && <SkillsView skillsDB={skillsDB} setSkillsDB={setSkillsDB} />}
            {route === 'discovery' && (
              <DiscoveryView
                discoveredJobs={discoveredJobs}
                setDiscoveredJobs={setDiscoveredJobs}
                watchlist={watchlist}
                setWatchlist={setWatchlist}
                applications={applications}
                setApplications={setApplications}
                documents={documents}
                setDocuments={setDocuments}
                skillsDB={skillsDB}
                onNavigate={setRoute}
              />
            )}
            {route === 'tracker' && (
              <TrackerView
                applications={applications}
                setApplications={setApplications}
                skillsDB={skillsDB}
              />
            )}
            {route === 'documents' && (
              <DocumentsView
                documents={documents}
                setDocuments={setDocuments}
                applications={applications}
                skillsDB={skillsDB}
              />
            )}
            {route === 'interview' && (
              <InterviewView
                applications={applications}
                skillsDB={skillsDB}
                documents={documents}
                setDocuments={setDocuments}
              />
            )}
            {route === 'settings' && (
              <SettingsView
                apiKey={apiKey}
                setApiKey={setApiKey}
                dailyTarget={dailyTarget}
                setDailyTarget={setDailyTarget}
                onReset={reset}
              />
            )}
          </div>
        </main>
      </div>

      <BottomNav current={route} onChange={setRoute} />
    </div>
  );
}
