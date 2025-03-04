import os
import uuid
import zipfile
from pathlib import Path

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

    def get_file_url(self, key: str, expires_in: int = 3600):
        return self.s3_client.generate_presigned_url(
            "get_object", Params={"Bucket": self.bucket_name, "Key": key}, ExpiresIn=expires_in
        )

    def upload_file(self, file_path: str, key: str):
        self.s3_client.upload_file(file_path, self.bucket_name, key)

    def download_file(self, key: str, file_path: str):
        self.s3_client.download_file(self.bucket_name, key, file_path)


async def create_files_for_s3_json_content(data_json: dict, s3_folder_name: str):
    temp_dir = Path("/tmp") / str(uuid.uuid4())
    temp_dir.mkdir(parents=True, exist_ok=True)

    for item in data_json["structure"]:
        if item["type"] == "file":
            file_path = temp_dir / item["path"].replace("./", "")
            file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(file_path, "w") as f:
                f.write(item["content"])

    zip_path = temp_dir / "project.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(temp_dir):
            for file in files:
                if file != "project.zip":
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, temp_dir)
                    zipf.write(file_path, arcname)

    return zip_path


async def upload_zip_to_s3(zip_path: str, s3_folder_name: str):
    s3_service = S3Service()
    s3_service.upload_file(file_path=zip_path, key=f"{s3_folder_name}/project.zip")

    return s3_service.get_file_url(key=f"{s3_folder_name}/project.zip")
