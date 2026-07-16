import type {
  OfficeLocation,
  BusinessUnit,
  Department,
  Team,
  Domain,
  Forest,
  BusinessService,
  Application,
  Database,
  NetworkZone,
  ServerCategory,
  Environment,
} from './types'

export const COMPANY_NAME = 'NexusCore Industries'

export const OFFICE_LOCATIONS: OfficeLocation[] = [
  { id: 'hq-nyc', city: 'New York', country: 'USA', timezone: 'America/New_York', address: '100 Cybersecurity Ave, NY 10001', isHeadquarters: true },
  { id: 'sfo', city: 'San Francisco', country: 'USA', timezone: 'America/Los_Angeles', address: '200 Innovation Dr, SF 94105', isHeadquarters: false },
  { id: 'lon', city: 'London', country: 'UK', timezone: 'Europe/London', address: '30 Thames St, London EC2N 2AN', isHeadquarters: false },
  { id: 'fra', city: 'Frankfurt', country: 'Germany', timezone: 'Europe/Berlin', address: 'Mainzer Landstr 50, 60325 Frankfurt', isHeadquarters: false },
  { id: 'syd', city: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney', address: '1 Macquarie St, Sydney NSW 2000', isHeadquarters: false },
  { id: 'sgp', city: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore', address: '1 Raffles Place, Singapore 048616', isHeadquarters: false },
  { id: 'tok', city: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo', address: '2-1 Marunouchi, Chiyoda City, Tokyo 100-0005', isHeadquarters: false },
]

export const BUSINESS_UNITS: BusinessUnit[] = [
  { id: 'bu-corp', name: 'Corporate Operations', code: 'CORP', headOfficeId: 'hq-nyc', description: 'Enterprise governance, finance, HR, legal, and executive leadership' },
  { id: 'bu-tech', name: 'Technology Solutions', code: 'TECH', headOfficeId: 'sfo', description: 'Product engineering, cloud infrastructure, platform services, and IT operations' },
  { id: 'bu-fin', name: 'Financial Services', code: 'FIN', headOfficeId: 'lon', description: 'Banking, payments, risk analytics, and capital market solutions' },
  { id: 'bu-health', name: 'Healthcare Systems', code: 'HLTH', headOfficeId: 'fra', description: 'Health informatics, patient data platforms, and clinical systems' },
  { id: 'bu-defense', name: 'Defense & Security', code: 'DEF', headOfficeId: 'syd', description: 'National security solutions, secure communications, and threat intelligence' },
]

export const DEPARTMENTS: Department[] = [
  { id: 'dept-exec', name: 'Executive Leadership', code: 'EXEC', businessUnitId: 'bu-corp', headOfficeId: 'hq-nyc', description: 'C-Suite and corporate strategy' },
  { id: 'dept-hr', name: 'Human Resources', code: 'HR', businessUnitId: 'bu-corp', headOfficeId: 'hq-nyc', description: 'Workforce management and talent acquisition' },
  { id: 'dept-finance', name: 'Finance & Accounting', code: 'FIN', businessUnitId: 'bu-corp', headOfficeId: 'hq-nyc', description: 'Financial planning, audit, and compliance' },
  { id: 'dept-legal', name: 'Legal & Compliance', code: 'LEGAL', businessUnitId: 'bu-corp', headOfficeId: 'hq-nyc', description: 'Regulatory compliance and legal counsel' },
  { id: 'dept-eng', name: 'Software Engineering', code: 'ENG', businessUnitId: 'bu-tech', headOfficeId: 'sfo', description: 'Core product and platform engineering' },
  { id: 'dept-infra', name: 'Infrastructure & Cloud', code: 'INFRA', businessUnitId: 'bu-tech', headOfficeId: 'sfo', description: 'Data center, cloud, and network operations' },
  { id: 'dept-secops', name: 'Security Operations', code: 'SECOPS', businessUnitId: 'bu-tech', headOfficeId: 'sfo', description: 'SOC, incident response, and identity security' },
  { id: 'dept-data', name: 'Data & Analytics', code: 'DATA', businessUnitId: 'bu-tech', headOfficeId: 'sfo', description: 'Data engineering, BI, and ML platforms' },
  { id: 'dept-banking', name: 'Banking Platforms', code: 'BANK', businessUnitId: 'bu-fin', headOfficeId: 'lon', description: 'Core banking and payment systems' },
  { id: 'dept-risk', name: 'Risk & Analytics', code: 'RISK', businessUnitId: 'bu-fin', headOfficeId: 'lon', description: 'Fraud detection and risk modeling' },
  { id: 'dept-clinical', name: 'Clinical Systems', code: 'CLIN', businessUnitId: 'bu-health', headOfficeId: 'fra', description: 'EMR, lab systems, and clinical data' },
  { id: 'dept-pharma', name: 'Pharma Informatics', code: 'PHARMA', businessUnitId: 'bu-health', headOfficeId: 'fra', description: 'Drug discovery and trial management' },
  { id: 'dept-cyber', name: 'Cyber Operations', code: 'CYBER', businessUnitId: 'bu-defense', headOfficeId: 'syd', description: 'Offensive and defensive cyber capabilities' },
  { id: 'dept-intel', name: 'Threat Intelligence', code: 'INTEL', businessUnitId: 'bu-defense', headOfficeId: 'syd', description: 'Threat research and intelligence analysis' },
]

export const TEAMS: Team[] = [
  { id: 'team-frontend', name: 'Frontend Platform', code: 'FE', departmentId: 'dept-eng', officeId: 'sfo', description: 'Web and mobile client engineering' },
  { id: 'team-backend', name: 'Backend Services', code: 'BE', departmentId: 'dept-eng', officeId: 'sfo', description: 'API and microservice development' },
  { id: 'team-platform', name: 'Platform Engineering', code: 'PLAT', departmentId: 'dept-infra', officeId: 'sfo', description: 'Internal developer platform and tooling' },
  { id: 'team-cloudops', name: 'Cloud Operations', code: 'CLOUD', departmentId: 'dept-infra', officeId: 'hq-nyc', description: 'Multi-cloud infrastructure management' },
  { id: 'team-neteng', name: 'Network Engineering', code: 'NET', departmentId: 'dept-infra', officeId: 'hq-nyc', description: 'Network architecture and SDN' },
  { id: 'team-identity', name: 'Identity & Access', code: 'IAM', departmentId: 'dept-secops', officeId: 'sfo', description: 'IAM, SSO, and directory services' },
  { id: 'team-soc', name: 'Security Operations Center', code: 'SOC', departmentId: 'dept-secops', officeId: 'syd', description: '24/7 monitoring and incident response' },
  { id: 'team-dataeng', name: 'Data Engineering', code: 'DE', departmentId: 'dept-data', officeId: 'sfo', description: 'Data pipelines and lake architecture' },
  { id: 'team-ml', name: 'Machine Learning', code: 'ML', departmentId: 'dept-data', officeId: 'sfo', description: 'ML model development and MLOps' },
  { id: 'team-payments', name: 'Payments Platform', code: 'PAY', departmentId: 'dept-banking', officeId: 'lon', description: 'Payment processing and settlement' },
  { id: 'team-fraud', name: 'Fraud Detection', code: 'FD', departmentId: 'dept-risk', officeId: 'lon', description: 'Real-time fraud analytics' },
  { id: 'team-emr', name: 'EMR Platform', code: 'EMR', departmentId: 'dept-clinical', officeId: 'fra', description: 'Electronic medical records system' },
  { id: 'team-trials', name: 'Clinical Trials', code: 'TRIAL', departmentId: 'dept-pharma', officeId: 'fra', description: 'Trial management and compliance' },
  { id: 'team-redteam', name: 'Red Team', code: 'RED', departmentId: 'dept-cyber', officeId: 'syd', description: 'Adversarial simulation and pentesting' },
  { id: 'team-threat', name: 'Threat Research', code: 'TR', departmentId: 'dept-intel', officeId: 'syd', description: 'Threat actor tracking and IoC analysis' },
]

export const FORESTS: Forest[] = [
  { id: 'forest-corp', name: 'NexusCore Corporate Forest', rootDomain: 'nexuscore.com', domainIds: ['dom-corp', 'dom-tech', 'dom-fin', 'dom-health', 'dom-defense'] },
]

export const DOMAINS: Domain[] = [
  { id: 'dom-corp', dnsName: 'nexuscore.com', netBiosName: 'NEXUSCORP', type: 'Windows', businessUnitId: 'bu-corp', isPrimary: true, forestId: 'forest-corp' },
  { id: 'dom-tech', dnsName: 'nexustech.local', netBiosName: 'NEXTECH', type: 'Windows', businessUnitId: 'bu-tech', isPrimary: false, forestId: 'forest-corp' },
  { id: 'dom-fin', dnsName: 'nexusfin.local', netBiosName: 'NEXFIN', type: 'Windows', businessUnitId: 'bu-fin', isPrimary: false, forestId: 'forest-corp' },
  { id: 'dom-health', dnsName: 'nexushealth.local', netBiosName: 'NEXHEALTH', type: 'Windows', businessUnitId: 'bu-health', isPrimary: false, forestId: 'forest-corp' },
  { id: 'dom-defense', dnsName: 'nexusdefense.local', netBiosName: 'NEXDEF', type: 'Windows', businessUnitId: 'bu-defense', isPrimary: false, forestId: 'forest-corp' },
  { id: 'dom-linux-corp', dnsName: 'linux.nexuscore.io', netBiosName: '', type: 'Linux', businessUnitId: 'bu-tech', isPrimary: false },
  { id: 'dom-linux-dev', dnsName: 'dev.nexuscore.io', netBiosName: '', type: 'Linux', businessUnitId: 'bu-tech', isPrimary: false },
  { id: 'dom-cloud', dnsName: 'nexuscore.onmicrosoft.com', netBiosName: 'NEXUSCLOUD', type: 'Cloud', businessUnitId: 'bu-corp', isPrimary: false },
]

export const BUSINESS_SERVICES: BusinessService[] = [
  { id: 'svc-crm', name: 'Enterprise CRM', code: 'CRM', owningDepartmentId: 'dept-exec', criticality: 'Critical', sla: '99.99%', description: 'Customer relationship management platform' },
  { id: 'svc-erp', name: 'Enterprise Resource Planning', code: 'ERP', owningDepartmentId: 'dept-finance', criticality: 'Critical', sla: '99.99%', description: 'Core financial and resource planning system' },
  { id: 'svc-hris', name: 'HR Information System', code: 'HRIS', owningDepartmentId: 'dept-hr', criticality: 'High', sla: '99.9%', description: 'Workforce management and payroll' },
  { id: 'svc-iam', name: 'Identity & Access Management', code: 'IAM', owningDepartmentId: 'dept-secops', criticality: 'Critical', sla: '99.999%', description: 'Centralized IAM and directory platform' },
  { id: 'svc-payments', name: 'Payment Processing', code: 'PAY', owningDepartmentId: 'dept-banking', criticality: 'Critical', sla: '99.999%', description: 'Real-time payment authorization and settlement' },
  { id: 'svc-emr', name: 'Electronic Medical Records', code: 'EMR', owningDepartmentId: 'dept-clinical', criticality: 'Critical', sla: '99.999%', description: 'Patient record and clinical data platform' },
  { id: 'svc-intel', name: 'Threat Intelligence Platform', code: 'TIP', owningDepartmentId: 'dept-intel', criticality: 'High', sla: '99.9%', description: 'Threat data aggregation and analysis' },
]

export const APPLICATIONS: Application[] = [
  { id: 'app-portal', name: 'Employee Portal', code: 'EP', owningTeamId: 'team-frontend', businessServiceId: 'svc-hris', platform: 'Web', technology: 'React / Node.js', description: 'Employee self-service web portal' },
  { id: 'app-crm', name: 'CRM Web App', code: 'CRM-W', owningTeamId: 'team-frontend', businessServiceId: 'svc-crm', platform: 'Web', technology: 'Next.js / Java', description: 'Sales and customer management interface' },
  { id: 'app-erp-api', name: 'ERP Core API', code: 'ERP-A', owningTeamId: 'team-backend', businessServiceId: 'svc-erp', platform: 'API', technology: 'Java / Spring Boot', description: 'Core ERP business logic API' },
  { id: 'app-idp', name: 'Identity Provider', code: 'IDP', owningTeamId: 'team-identity', businessServiceId: 'svc-iam', platform: 'API', technology: 'Go / OAuth2', description: 'OAuth2/OIDC identity provider service' },
  { id: 'app-payments', name: 'Payment Gateway', code: 'PGW', owningTeamId: 'team-payments', businessServiceId: 'svc-payments', platform: 'API', technology: 'Java / Quarkus', description: 'Payment authorization and routing engine' },
  { id: 'app-emr', name: 'EMR Clinical Portal', code: 'EMR-P', owningTeamId: 'team-emr', businessServiceId: 'svc-emr', platform: 'Web', technology: 'Angular / .NET', description: 'Clinical data visualization and entry' },
  { id: 'app-tip', name: 'Threat Intelligence Dashboard', code: 'TIP-D', owningTeamId: 'team-threat', businessServiceId: 'svc-intel', platform: 'Web', technology: 'React / Python', description: 'Threat analyst investigation dashboard' },
]

export const DATABASES: Database[] = [
  { id: 'db-crm', name: 'CRM Primary', engine: 'Oracle', owningTeamId: 'team-backend', applicationIds: ['app-crm', 'app-erp-api'], environment: 'Production', description: 'Customer and transaction data' },
  { id: 'db-erp-fin', name: 'ERP Financial', engine: 'Oracle', owningTeamId: 'team-backend', applicationIds: ['app-erp-api'], environment: 'Production', description: 'General ledger and financial records' },
  { id: 'db-idp', name: 'Identity Store', engine: 'PostgreSQL', owningTeamId: 'team-identity', applicationIds: ['app-idp'], environment: 'Production', description: 'User credentials and profile data' },
  { id: 'db-payments', name: 'Payment Ledger', engine: 'PostgreSQL', owningTeamId: 'team-payments', applicationIds: ['app-payments'], environment: 'Production', description: 'Payment transaction ledger' },
  { id: 'db-emr-clinical', name: 'Clinical Records', engine: 'SQLServer', owningTeamId: 'team-emr', applicationIds: ['app-emr'], environment: 'Production', description: 'Patient clinical data warehouse' },
  { id: 'db-tip', name: 'Threat Intelligence', engine: 'MongoDB', owningTeamId: 'team-threat', applicationIds: ['app-tip'], environment: 'Production', description: 'Threat indicators and reports' },
  { id: 'db-dev-postgres', name: 'Development PostgreSQL', engine: 'PostgreSQL', owningTeamId: 'team-platform', applicationIds: [], environment: 'Development', description: 'Shared dev database cluster' },
]

export const NETWORK_ZONES: NetworkZone[] = [
  { id: 'zone-corp', name: 'Corporate Network', cidr: '10.0.0.0/16', purpose: 'Corporate LAN and office connectivity', environment: 'Production' },
  { id: 'zone-prod', name: 'Production Network', cidr: '10.10.0.0/16', purpose: 'Production application and data traffic', environment: 'Production' },
  { id: 'zone-dmz', name: 'DMZ Network', cidr: '10.20.0.0/16', purpose: 'Public-facing services and edge proxies', environment: 'DMZ' },
  { id: 'zone-dev', name: 'Development Network', cidr: '10.30.0.0/16', purpose: 'Non-production development environments', environment: 'Development' },
  { id: 'zone-test', name: 'Testing Network', cidr: '10.40.0.0/16', purpose: 'QA, staging, and integration testing', environment: 'Testing' },
  { id: 'zone-mgmt', name: 'Management Network', cidr: '10.99.0.0/16', purpose: 'Out-of-band management and monitoring', environment: 'Production' },
]

export const SERVER_CATEGORIES: ServerCategory[] = [
  { id: 'cat-web', name: 'Web Server', code: 'WEB', description: 'HTTP/HTTPS application and proxy servers' },
  { id: 'cat-app', name: 'Application Server', code: 'APP', description: 'Business logic and middleware runtime' },
  { id: 'cat-db', name: 'Database Server', code: 'DB', description: 'Relational and NoSQL database hosts' },
  { id: 'cat-dc', name: 'Domain Controller', code: 'DC', description: 'Active Directory domain controllers' },
  { id: 'cat-file', name: 'File Server', code: 'FILE', description: 'Network file shares and storage' },
  { id: 'cat-backup', name: 'Backup Server', code: 'BKUP', description: 'Backup infrastructure and media servers' },
  { id: 'cat-mon', name: 'Monitoring Server', code: 'MON', description: 'Observability, logging, and alerting' },
  { id: 'cat-build', name: 'Build & CI/CD', code: 'CI', description: 'Build agents, runners, and artifact repos' },
  { id: 'cat-edge', name: 'Edge / Gateway', code: 'EDGE', description: 'API gateways, load balancers, reverse proxies' },
]

export const ENVIRONMENTS: Environment[] = [
  { id: 'env-prod', name: 'Production', code: 'PRD', description: 'Live customer-facing production environment', riskLevel: 'Critical' },
  { id: 'env-test', name: 'Testing', code: 'TST', description: 'QA and user acceptance testing', riskLevel: 'Medium' },
  { id: 'env-dev', name: 'Development', code: 'DEV', description: 'Engineering development and feature branches', riskLevel: 'Low' },
  { id: 'env-dmz', name: 'DMZ', code: 'DMZ', description: 'Demilitarized zone for public-facing services', riskLevel: 'High' },
]

export const ROLE_HIERARCHY = [
  { level: 1, title: 'Chief / C-Suite', description: 'CEO, CTO, CFO, CISO — executive leadership' },
  { level: 2, title: 'Vice President', description: 'VP of Engineering, VP of Product, VP of Security' },
  { level: 3, title: 'Director', description: 'Director of Platform, Director of IAM, Director of Finance' },
  { level: 4, title: 'Senior Manager', description: 'Senior Engineering Manager, Senior Security Manager' },
  { level: 5, title: 'Manager', description: 'Engineering Manager, Product Manager, Team Lead' },
  { level: 6, title: 'Team Lead', description: 'Technical Lead, Squad Lead, Scrum Master' },
  { level: 7, title: 'Senior Individual Contributor', description: 'Staff Engineer, Principal Architect, Senior Analyst' },
  { level: 8, title: 'Individual Contributor', description: 'Software Engineer, Analyst, Administrator' },
  { level: 9, title: 'Junior / Associate', description: 'Junior Engineer, Intern, Trainee' },
]

export const ADMIN_HIERARCHY = [
  { level: 1, title: 'Global Administrator', scope: 'Entire organization — all domains and systems' },
  { level: 2, title: 'Domain Administrator', scope: 'Single AD domain — full control' },
  { level: 3, title: 'Business Unit Administrator', scope: 'BU-level resources and users' },
  { level: 4, title: 'Department Administrator', scope: 'Department-level OUs and groups' },
  { level: 5, title: 'Team Administrator', scope: 'Team-level service accounts and permissions' },
  { level: 6, title: 'Operator', scope: 'Read-write on assigned resources, no user management' },
  { level: 7, title: 'Auditor', scope: 'Read-only access to logs and configurations' },
]

export const ACCESS_HIERARCHY = [
  { level: 1, label: 'Full Control', description: 'Create, read, update, delete, assign permissions' },
  { level: 2, label: 'Write', description: 'Create and modify resources, no permission delegation' },
  { level: 3, label: 'Execute', description: 'Run processes, trigger workflows, no data modification' },
  { level: 4, label: 'Read', description: 'View resources and metadata' },
  { level: 5, label: 'No Access', description: 'Explicit deny' },
]
