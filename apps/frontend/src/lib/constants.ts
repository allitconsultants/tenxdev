export const siteConfig = {
  name: 'tenxdev',
  title: 'tenxdev.ai - 10x Development, 1/4 Time, 1/4 Cost',
  description:
    'AI-powered software development company. With AI, our 10x developers and infrastructure engineers complete projects in 1/4 of the time at 1/4 of the cost.',
  url: 'https://tenxdev.ai',
  ogImage: 'https://tenxdev.ai/og-image.png',
  links: {
    github: 'https://github.com/tenxdev',
    linkedin: 'https://linkedin.com/company/tenxdev',
  },
};

export const navigation = {
  main: [
    { name: 'Services', href: '/services' },
    { name: 'Industries', href: '/industries' },
    { name: 'Case Studies', href: '/case-studies' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Contact', href: '/contact' },
  ],
  services: [
    {
      name: 'AI-Powered Development',
      href: '/services/ai-development',
      description: 'Accelerate development with AI-assisted coding',
    },
    {
      name: 'Infrastructure Engineering',
      href: '/services/infrastructure',
      description: 'Cloud-native infrastructure with IaC',
    },
    {
      name: 'DevOps Automation',
      href: '/services/devops',
      description: 'CI/CD pipelines and automation',
    },
    {
      name: 'Cloud Architecture',
      href: '/services/cloud',
      description: 'Multi-cloud solutions on AWS, Azure, GCP',
    },
    {
      name: 'Platform Engineering',
      href: '/services/platform',
      description: 'Internal developer platforms',
    },
    {
      name: 'Consulting & Training',
      href: '/services/consulting',
      description: 'Expert guidance and team training',
    },
  ],
  footer: {
    services: [
      { name: 'AI Development', href: '/services/ai-development' },
      { name: 'Infrastructure', href: '/services/infrastructure' },
      { name: 'DevOps', href: '/services/devops' },
      { name: 'Cloud Architecture', href: '/services/cloud' },
    ],
    company: [
      { name: 'About', href: '/about' },
      { name: 'Industries', href: '/industries' },
      { name: 'Case Studies', href: '/case-studies' },
      { name: 'Contact', href: '/contact' },
    ],
    resources: [
      { name: 'Blog', href: '/blog' },
      { name: 'Documentation', href: '/docs' },
      { name: 'Newsletter', href: '/newsletter' },
    ],
    legal: [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
    ],
  },
};

export const services = [
  {
    id: 'ai-development',
    name: 'AI-Powered Development',
    description:
      'Leverage AI to accelerate development cycles, improve code quality, and reduce time to market.',
    icon: 'Sparkles',
    features: [
      'AI-assisted code generation',
      'Automated testing and review',
      'Intelligent refactoring',
      'Documentation automation',
    ],
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure Engineering',
    description:
      'Build robust, scalable infrastructure using Infrastructure as Code and cloud-native technologies.',
    icon: 'Server',
    features: [
      'Terraform & Pulumi',
      'Kubernetes orchestration',
      'Multi-cloud architecture',
      'Cost optimization',
    ],
  },
  {
    id: 'devops',
    name: 'DevOps Automation',
    description:
      'Streamline your development workflow with modern CI/CD pipelines and automation.',
    icon: 'GitBranch',
    features: [
      'CI/CD pipeline design',
      'GitOps workflows',
      'Release automation',
      'Monitoring & observability',
    ],
  },
  {
    id: 'cloud',
    name: 'Cloud Architecture',
    description:
      'Design and implement cloud solutions across AWS, Azure, and GCP.',
    icon: 'Cloud',
    features: [
      'AWS, Azure, GCP expertise',
      'Serverless architectures',
      'Microservices design',
      'Security best practices',
    ],
  },
  {
    id: 'platform',
    name: 'Platform Engineering',
    description:
      'Build internal developer platforms that boost productivity and standardize workflows.',
    icon: 'Layers',
    features: [
      'Developer portals',
      'Self-service platforms',
      'Golden paths',
      'Developer experience',
    ],
  },
  {
    id: 'consulting',
    name: 'Consulting & Training',
    description:
      'Expert guidance and hands-on training to upskill your team.',
    icon: 'GraduationCap',
    features: [
      'Architecture reviews',
      'Team training',
      'Best practices workshops',
      'Technology roadmaps',
    ],
  },
];

export const stats = [
  { value: '4x', label: 'Faster Delivery' },
  { value: '75%', label: 'Cost Reduction' },
  { value: '10x', label: 'Developer Productivity' },
  { value: '99.9%', label: 'Uptime SLA' },
];

export const techStack = [
  { name: 'Terraform', category: 'Infrastructure' },
  { name: 'Kubernetes', category: 'Orchestration' },
  { name: 'Docker', category: 'Containers' },
  { name: 'AWS', category: 'Cloud' },
  { name: 'Azure', category: 'Cloud' },
  { name: 'GCP', category: 'Cloud' },
  { name: 'GitHub Actions', category: 'CI/CD' },
  { name: 'ArgoCD', category: 'GitOps' },
];
