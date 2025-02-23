import boto3
from config.env_handler import (
    AWS_ACCESS_KEY_ID,
    AWS_BUCKET_NAME,
    AWS_REGION,
    AWS_SECRET_ACCESS_KEY,
)


class S3Service:
    s3_client: boto3.client
    bucket_name: str

    def __init__(self):
        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION,
        )
        self.bucket_name = AWS_BUCKET_NAME

    def get_file_url(self, key: str):
        return self.s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket_name, "Key": key},
            ExpiresIn=3600,  # 1 hour
        )

    def upload_file(self, file_path: str, key: str):
        self.s3_client.upload_file(file_path, self.bucket_name, key)

    def download_file(self, key: str, file_path: str):
        self.s3_client.download_file(self.bucket_name, key, file_path)
