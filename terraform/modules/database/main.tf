resource "random_password" "db_password" {
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_db_instance" "postgres" {
  identifier                  = "${var.project_name}-${var.environment}-postgres"
  engine                      = "postgres"
  engine_version              = "16.3"
  instance_class              = var.instance_class
  allocated_storage           = var.allocated_storage
  max_allocated_storage       = 50
  storage_type                = "gp3"
  storage_encrypted           = true
  kms_key_id                  = var.kms_key_arn
  multi_az                    = var.environment == "prod"
  db_name                     = "dyslexia_db"
  username                    = "dyslexia_admin"
  password                    = random_password.db_password.result
  db_subnet_group_name        = var.db_subnet_group_name
  vpc_security_group_ids      = [var.rds_security_group_id]
  publicly_accessible         = false
  auto_minor_version_upgrade  = true
  backup_retention_period     = var.environment == "prod" ? 30 : 7
  deletion_protection         = var.environment == "prod"
  skip_final_snapshot         = var.environment != "prod"
  final_snapshot_identifier   = "${var.project_name}-${var.environment}-final-snapshot"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-postgres"
  })
}

# AWS Secrets Manager Secret storing Database URL
resource "aws_secretsmanager_secret" "db_secret" {
  name                    = "${var.project_name}/${var.environment}/database"
  kms_key_id              = var.kms_key_arn
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-db-secret"
  })
}

resource "aws_secretsmanager_secret_version" "db_secret_val" {
  secret_id = aws_secretsmanager_secret.db_secret.id
  secret_string = jsonencode({
    DATABASE_URL = "postgres://${aws_db_instance.postgres.username}:${random_password.db_password.result}@${aws_db_instance.postgres.endpoint}/${aws_db_instance.postgres.db_name}"
    DB_HOST      = aws_db_instance.postgres.address
    DB_PORT      = aws_db_instance.postgres.port
    DB_NAME      = aws_db_instance.postgres.db_name
    DB_USER      = aws_db_instance.postgres.username
    DB_PASSWORD  = random_password.db_password.result
  })
}

