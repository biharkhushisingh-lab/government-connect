# AWS Production Deployment Strategy

To deploy the **Corruption-Free Government Contractor System** to a scalable, production environment on AWS, follow this recommended architecture.

## 🏗️ Architecture Overview

The system follows a typical 3-tier architecture with dedicated services for AI and Blockchain integration.

### Data Flow
1.  **Client Request** → **AWS Application Load Balancer (ALB)** (HTTPS/SSL Termination)
2.  **ALB** → **Nginx Proxy** (Reverse Proxy / Gateway)
3.  **Nginx** → Routes:
    *   `/api/*` → **Node.js Backend** (ECS Service)
    *   `/analyze` → **FastAPI AI Service** (ECS Service)
4.  **Backend** ↔ **AWS RDS** (PostgreSQL Database)
5.  **Backend** ↔ **AWS ElastiCache** (Redis for Session/Rate Limiting)
6.  **Backend** ↔ **Blockchain Node** (EC2 / Infura / Alchemy)
7.  **Logs/Metrics** → **Amazon CloudWatch**

## ☁️ Recommended AWS Services / Configuration

| Component | AWS Service | Configuration Notes |
| :--- | :--- | :--- |
| **Backend API** | **Amazon ECS (Fargate)** | Auto-scaling based on CPU/Memory. ~2-4 Tasks minimum. |
| **AI Service** | **Amazon ECS (Fargate)** | Dedicated task definition. Consider GPU instances if model complexity grows, though Fargate CPU is fine for current load. |
| **Database** | **Amazon RDS (PostgreSQL)** | Use Multi-AZ for high availability. Enable automated backups. PostgreSQL 14+. |
| **Caching** | **Amazon ElastiCache (Redis)** | Cluster mode disabled (for simple session/cache needs). t3.micro/small is sufficient for MVP. |
| **Object Storage** | **Amazon S3** | Store contractor uploaded documents/images. Ensure strict bucket policies (private by default). |
| **Monitoring** | **Amazon CloudWatch** | Set up alarms for High CPU, 5xx Errors, and Slow DB Queries. |
| **Secrets** | **AWS Secrets Manager** | Store `DB_PASS`, `JWT_SECRET`, `BLOCKCHAIN_PRIVATE_KEY` here. Inject as env vars in ECS. |
| **Load Balancing** | **Application Load Balancer** | Handles SSL (ACM Certificate), Health Checks. |

## 🚀 CI/CD Pipeline (GitHub Actions)

The included workflow (`.github/workflows/deploy.yml`) handles automation:

1.  **Trigger**: Push to `main` branch.
2.  **Test**: Runs unit tests (ensure `npm test` and `pytest` pass).
3.  **Build**: Creates Docker images for Backend and AI Service.
4.  **Push**: Uploads images to **Amazon ECR** (Elastic Container Registry).
5.  **Deploy**: Updates **Amazon ECS** Service with new image tag.

### Prerequisite Setup for CI/CD:
1.  **IAM User**: Create an IAM user with permissions for ECR and ECS.
2.  **GitHub Secrets**: Add `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` to repo secrets.
3.  **ECR Repos**: Create `gov-backend` and `gov-ai-service` repositories manually or via Terraform.
4.  **ECS Cluster**: Create empty cluster `gov-cluster` and services.

## 🔒 Security Checklist

- [ ] **VPC**: Ensure ECS Tasks run in private subnets; ALB in public subnets.
- [ ] **Security Groups**:
    -   RDS allows access ONLY from ECS Security Group.
    -   ElastiCache allows access ONLY from ECS Security Group.
    -   ALB allows HTTPS (443) from `0.0.0.0/0`.
- [ ] **WAF**: Enable AWS WAF on the ALB to block SQL Injection / XSS attempts.
- [ ] **IAM Roles**: Use Task Execution Roles with minimal permissions (only access needed Secrets/S3 buckets).
