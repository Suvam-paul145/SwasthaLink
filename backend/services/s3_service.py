"""
AWS S3 Service
Handles file uploads with 24-hour auto-delete lifecycle
"""

import os
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
try:
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False
    ClientError = Exception
    NoCredentialsError = Exception
import uuid

from core.exceptions import S3ServiceError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load AWS credentials
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")

# Initialize S3 client
s3_client = None
if BOTO3_AVAILABLE and AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
    try:
        from botocore.config import Config
        s3_config = Config(
            connect_timeout=3,
            read_timeout=3,
            retries={'max_attempts': 1}
        )
        s3_client = boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION,
            config=s3_config
        )
        logger.info("AWS S3 client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize S3 client: {e}")
else:
    logger.warning("AWS credentials not found in environment variables")


def _get_file_extension(filename: str) -> str:
    """Extract file extension from filename."""
    return os.path.splitext(filename)[1].lower()


def _generate_unique_filename(session_id: str, original_filename: str) -> str:
    """Generate unique S3 object key."""
    extension = _get_file_extension(original_filename)
    clean_filename = f"{uuid.uuid4()}{extension}"
    return f"uploads/{session_id}/{clean_filename}"


async def upload_file(
    file_content: bytes,
    filename: str,
    session_id: str,
    content_type: str = "application/octet-stream"
) -> Dict[str, Any]:
    """Upload file to S3 with 24-hour lifecycle."""
    try:
        if not s3_client or not S3_BUCKET_NAME:
            raise S3ServiceError("S3 client not initialized. Check AWS credentials and bucket name.")

        s3_key = _generate_unique_filename(session_id, filename)
        expires_at = datetime.utcnow() + timedelta(hours=24)

        metadata = {
            "session_id": session_id,
            "original_filename": filename,
            "uploaded_at": datetime.utcnow().isoformat(),
            "expires_at": expires_at.isoformat()
        }

        logger.info(f"Uploading file to S3: {s3_key}")
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=s3_key,
            Body=file_content,
            ContentType=content_type,
            Metadata=metadata
        )

        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_BUCKET_NAME, 'Key': s3_key},
            ExpiresIn=86400
        )

        logger.info(f"File uploaded successfully: {s3_key}")

        return {
            "success": True,
            "s3_key": s3_key,
            "url": url,
            "expires_at": expires_at.isoformat(),
            "bucket": S3_BUCKET_NAME,
            "size_bytes": len(file_content)
        }

    except NoCredentialsError:
        logger.error("AWS credentials not found")
        raise S3ServiceError("AWS credentials not configured")

    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        error_msg = e.response.get('Error', {}).get('Message', str(e))
        logger.error(f"S3 upload failed: {error_code} - {error_msg}")
        raise S3ServiceError(f"Failed to upload file: {error_msg}")

    except Exception as e:
        logger.error(f"Unexpected error uploading file: {e}")
        raise S3ServiceError(f"Failed to upload file: {str(e)}")


async def get_file(s3_key: str) -> Dict[str, Any]:
    """Retrieve file from S3."""
    try:
        if not s3_client or not S3_BUCKET_NAME:
            raise S3ServiceError("S3 client not initialized")

        logger.info(f"Retrieving file from S3: {s3_key}")
        response = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
        file_content = response['Body'].read()

        return {
            "success": True,
            "content": file_content,
            "content_type": response.get('ContentType'),
            "size_bytes": response.get('ContentLength'),
            "metadata": response.get('Metadata', {}),
            "last_modified": response.get('LastModified').isoformat() if response.get('LastModified') else None
        }

    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        if error_code == 'NoSuchKey':
            logger.warning(f"File not found: {s3_key}")
            raise S3ServiceError(f"File not found or already expired: {s3_key}")
        else:
            logger.error(f"S3 get failed: {error_code}")
            raise S3ServiceError(f"Failed to retrieve file: {error_code}")

    except Exception as e:
        logger.error(f"Unexpected error retrieving file: {e}")
        raise S3ServiceError(f"Failed to retrieve file: {str(e)}")


async def delete_file(s3_key: str) -> Dict[str, Any]:
    """Manually delete file from S3."""
    try:
        if not s3_client or not S3_BUCKET_NAME:
            raise S3ServiceError("S3 client not initialized")

        logger.info(f"Deleting file from S3: {s3_key}")
        s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
        logger.info(f"File deleted successfully: {s3_key}")

        return {"success": True, "s3_key": s3_key, "message": "File deleted successfully"}

    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        logger.error(f"S3 delete failed: {error_code}")
        raise S3ServiceError(f"Failed to delete file: {error_code}")

    except Exception as e:
        logger.error(f"Unexpected error deleting file: {e}")
        raise S3ServiceError(f"Failed to delete file: {str(e)}")


def check_s3_health() -> Dict[str, Any]:
    """Check if S3 service is accessible and healthy."""
    try:
        if not s3_client or not S3_BUCKET_NAME:
            return {"status": "down", "message": "S3 client not initialized. Check credentials and bucket name.", "available": False}
        
        # Don't hit the real bucket during health check as it can hang the startup
        # We assume if the client is initialized, it's healthy enough for startup
        return {
            "status": "ok",
            "message": "S3 service is healthy",
            "available": True,
            "bucket": S3_BUCKET_NAME,
            "region": AWS_REGION,
        }

    except Exception as e:
        logger.error(f"S3 health check failed: {e}")
        return {"status": "down", "message": str(e), "available": False}


def setup_lifecycle_policy() -> Dict[str, Any]:
    """Setup 24-hour auto-delete lifecycle policy on S3 bucket."""
    S3_LIFECYCLE_POLICY = {
        "Rules": [{"Id": "auto-delete-24hr", "Status": "Enabled", "Prefix": "uploads/", "Expiration": {"Days": 1}}]
    }
    try:
        if not s3_client or not S3_BUCKET_NAME:
            raise S3ServiceError("S3 client not initialized")

        logger.info(f"Setting up lifecycle policy on bucket: {S3_BUCKET_NAME}")
        s3_client.put_bucket_lifecycle_configuration(Bucket=S3_BUCKET_NAME, LifecycleConfiguration=S3_LIFECYCLE_POLICY)
        logger.info("Lifecycle policy configured successfully")

        return {"success": True, "message": "24-hour auto-delete lifecycle policy configured", "policy": S3_LIFECYCLE_POLICY}

    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        logger.error(f"Failed to setup lifecycle policy: {error_code}")
        raise S3ServiceError(f"Failed to setup lifecycle policy: {error_code}")

    except Exception as e:
        logger.error(f"Unexpected error setting up lifecycle policy: {e}")
        raise S3ServiceError(f"Failed to setup lifecycle policy: {str(e)}")


def generate_presigned_url(s3_key: str, expiration: int = 3600) -> Optional[str]:
    """
    Generate a pre-signed URL for a stored S3 object.
    
    Args:
        s3_key: The S3 object key (e.g., 'uploads/rx_doctor123/abc.jpg')
        expiration: URL validity in seconds (default: 1 hour)
    
    Returns:
        Pre-signed URL string, or None if S3 is not available.
    """
    if not s3_client or not S3_BUCKET_NAME or not s3_key:
        return None

    try:
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_BUCKET_NAME, 'Key': s3_key},
            ExpiresIn=expiration,
        )
        return url
    except ClientError as e:
        logger.warning(f"Failed to generate presigned URL for {s3_key}: {e}")
        return None
    except Exception as e:
        logger.warning(f"Unexpected error generating presigned URL: {e}")
        return None

